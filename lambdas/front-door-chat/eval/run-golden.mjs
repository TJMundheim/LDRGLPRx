#!/usr/bin/env node
// Runs the golden set against a deployed front-door chat endpoint.
//
//   CHAT_URL=https://api.my4mlife.com/api/chat node eval/run-golden.mjs
//
// Scores each item on four checks:
//   exit   — the expected exit link (/assessment or /consult) is present
//   forbid — none of the forbidden strings appear
//   must   — at least one of mustContainAny appears (when specified)
//   links  — every URL in the answer is on the allowlist
// Prints a table and exits non-zero if any check fails.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHAT_URL = process.env.CHAT_URL;
if (!CHAT_URL) { console.error('CHAT_URL is not set.'); process.exit(2); }

const golden = JSON.parse(readFileSync(join(HERE, 'golden.json'), 'utf8'));
const allowPath = existsSync(join(HERE, '..', 'src', 'allowlist.json'))
  ? join(HERE, '..', 'src', 'allowlist.json')
  : join(HERE, 'allowlist.json');
const allow = JSON.parse(readFileSync(allowPath, 'utf8'));
const allowed = new Set(
  allow.origins.flatMap((o) => allow.paths.map((p) => `${o}${p === '/' ? '' : p}`.replace(/\/$/, ''))),
);

const EXIT_PATH = { assessment: '/assessment', consult: '/consult' };
const urlsIn = (s) => (s.match(/https?:\/\/[^\s)<>"'\]]+/g) ?? []).map((u) => u.replace(/[.,]$/, ''));

async function ask(q) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: q, history: [] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return String(json.reply ?? json.answer ?? json.message ?? '');
}

function score(answer, expect) {
  const lower = answer.toLowerCase();
  const fails = [];

  if (expect.exit !== 'none' && !answer.includes(EXIT_PATH[expect.exit])) {
    fails.push(`missing ${expect.exit} exit`);
  }
  for (const bad of expect.mustNotContain ?? []) {
    if (lower.includes(bad.toLowerCase())) fails.push(`forbidden: "${bad}"`);
  }
  if (expect.mustContainAny?.length) {
    const hit = expect.mustContainAny.some((s) => lower.includes(s.toLowerCase()));
    if (!hit) fails.push(`none of: ${expect.mustContainAny.join(' | ')}`);
  }
  if (expect.allowedLinksOnly) {
    for (const u of urlsIn(answer)) {
      if (!allowed.has(u.replace(/\/$/, '').split('?')[0])) fails.push(`off-allowlist link: ${u}`);
    }
  }
  return fails;
}

const pad = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

const results = [];
for (const [i, item] of golden.items.entries()) {
  let fails;
  try {
    fails = score(await ask(item.q), item.expect);
  } catch (err) {
    fails = [`request failed: ${err.message}`];
  }
  results.push({ n: i + 1, q: item.q, fails });
  console.log(`${String(i + 1).padStart(2)}  ${fails.length ? 'FAIL' : 'pass'}  ${pad(item.q, 62)}${fails.length ? '  ' + fails.join('; ') : ''}`);
}

const failed = results.filter((r) => r.fails.length);
console.log(`\n${results.length - failed.length}/${results.length} passed.`);
if (failed.length) {
  console.log('\nFailures:');
  for (const f of failed) console.log(`  ${f.n}. ${f.q}\n     ${f.fails.join('\n     ')}`);
  process.exit(1);
}
