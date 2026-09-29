#!/usr/bin/env node
// Builds the static retrieval index for the AI front door.
//
//   pnpm --filter ./lambdas/front-door-chat run build-index      (or: node scripts/build-index.mjs)
//
// Reads corpus.json, turns every source into plain text, chunks it by markdown
// heading and then into ~700-token windows with 80-token overlap, embeds each
// chunk with Bedrock Titan Text Embeddings v2 (us-east-2), and writes:
//   index/chunks.json       full index (with vectors) — loaded by the Lambda
//   index/chunks.meta.json  same without vectors — for eyeballing/diffing
// Idempotent: rerunning regenerates both files from source.
//
// Deps: @aws-sdk/client-bedrock-runtime + node built-ins only.

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const HERE = dirname(fileURLToPath(import.meta.url));
const LAMBDA_DIR = join(HERE, '..');
const REPO_ROOT = join(LAMBDA_DIR, '..', '..');

const MODEL_ID = 'amazon.titan-embed-text-v2:0';
const DIMS = 1024;
const REGION = process.env.AWS_REGION || 'us-east-2';
const MAX_TOKENS = 700;   // ~ chunk size
const OVERLAP = 80;       // ~ token overlap between windows
const CHARS_PER_TOKEN = 4; // crude but stable estimate
const DRY_RUN = process.argv.includes('--dry-run');

const abs = (p) => join(REPO_ROOT, p);
const approxTokens = (s) => Math.ceil(s.length / CHARS_PER_TOKEN);

// ---------------------------------------------------------------- text extraction

/** Strips HTML to readable text, preferring <main> when present. */
function htmlToText(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let body = main ? main[1] : (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html);
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(h[1-6]|p|li|div|section|tr|br)>/gi, '\n')
    .replace(/<(h[1-6])[^>]*>/gi, '\n## ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(body)
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
}

function decodeEntities(s) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’',
    lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…' };
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n] ?? named[n.toLowerCase()] ?? m);
}

/** Falls back to the .astro source: drop frontmatter, then treat the rest as HTML. */
function astroToText(src) {
  return htmlToText(src.replace(/^---[\s\S]*?\n---\n/, ''));
}

function markdownToText(md, startAt) {
  let text = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  if (startAt) {
    const i = text.indexOf(startAt);
    if (i > -1) text = text.slice(i);
    else console.warn(`  ! startAt marker not found: ${JSON.stringify(startAt)} — using whole file`);
  }
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\\pagebreak\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sourceText(src) {
  if (src.kind === 'site') {
    if (src.dist && existsSync(abs(src.dist))) return htmlToText(readFileSync(abs(src.dist), 'utf8'));
    return astroToText(readFileSync(abs(src.path), 'utf8'));
  }
  return markdownToText(readFileSync(abs(src.path), 'utf8'), src.startAt);
}

// ---------------------------------------------------------------- chunking

/** Splits text into {title, body} sections at markdown headings. */
function sections(text, fallbackTitle) {
  const out = [];
  let title = fallbackTitle;
  let buf = [];
  const push = () => { const b = buf.join('\n').trim(); if (b) out.push({ title, body: b }); buf = []; };
  for (const line of text.split('\n')) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { push(); title = h[2].replace(/[*_`]/g, '').trim() || fallbackTitle; continue; }
    buf.push(line);
  }
  push();
  return out.length ? out : [{ title: fallbackTitle, body: text }];
}

/** Windows a section body into ~MAX_TOKENS chunks with OVERLAP tokens of carry-over. */
function windows(body) {
  if (approxTokens(body) <= MAX_TOKENS) return [body];
  const words = body.split(/\s+/);
  const perWindow = Math.floor((MAX_TOKENS * CHARS_PER_TOKEN) / 6);   // ~6 chars/word
  const step = Math.max(1, perWindow - Math.floor((OVERLAP * CHARS_PER_TOKEN) / 6));
  const out = [];
  for (let i = 0; i < words.length; i += step) {
    const w = words.slice(i, i + perWindow).join(' ').trim();
    if (w) out.push(w);
    if (i + perWindow >= words.length) break;
  }
  return out;
}

function chunkSource(src) {
  const text = sourceText(src);
  const out = [];
  for (const sec of sections(text, src.title)) {
    for (const w of windows(sec.body)) {
      if (approxTokens(w) < 20) continue;   // skip nav scraps / stray lines
      out.push({
        id: `${src.id}#${out.length}`,
        source: src.kind,
        title: sec.title.slice(0, 160),
        url: src.url ?? null,
        text: `${sec.title}\n\n${w}`.trim(),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- embedding

const client = new BedrockRuntimeClient({ region: REGION });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embed(text) {
  const body = JSON.stringify({ inputText: text.slice(0, 40000), dimensions: DIMS, normalize: true });
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await client.send(new InvokeModelCommand({
        modelId: MODEL_ID, contentType: 'application/json', accept: 'application/json', body,
      }));
      const parsed = JSON.parse(new TextDecoder().decode(res.body));
      if (!Array.isArray(parsed.embedding) || parsed.embedding.length !== DIMS) {
        throw new Error(`unexpected embedding shape: ${parsed.embedding?.length}`);
      }
      return parsed.embedding.map((v) => Number(v.toFixed(5)));
    } catch (err) {
      const retryable = /Throttl|TooManyRequests|ServiceUnavailable|Timeout|ModelNotReady/i.test(
        `${err.name} ${err.message}`);
      if (!retryable || attempt === 5) throw err;
      await sleep(500 * 2 ** attempt);
    }
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const manifest = JSON.parse(readFileSync(join(LAMBDA_DIR, 'corpus.json'), 'utf8'));
  const sources = manifest.sources.filter((s) => existsSync(abs(s.path)) || (s.dist && existsSync(abs(s.dist))));
  const missing = manifest.sources.length - sources.length;
  if (missing) console.warn(`! ${missing} manifest source(s) missing on disk — skipped`);

  const chunks = [];
  for (const src of sources) {
    const c = chunkSource(src);
    console.log(`${src.id}: ${c.length} chunks`);
    chunks.push(...c);
  }
  console.log(`\nTotal chunks: ${chunks.length}`);

  const outDir = join(LAMBDA_DIR, 'index');
  mkdirSync(outDir, { recursive: true });
  const metaPath = join(outDir, 'chunks.meta.json');
  const builtAt = new Date().toISOString();
  writeFileSync(metaPath, JSON.stringify({ model: MODEL_ID, dims: DIMS, builtAt, chunks }, null, 2) + '\n');
  console.log(`Wrote ${metaPath}`);

  if (DRY_RUN) { console.log('--dry-run: skipped embedding.'); return; }

  const embedded = [];

  const outPath = join(outDir, 'chunks.json');
  // Reuse vectors for chunks whose text is unchanged since the last build, so a
  // FAQ or page edit re-embeds only what changed (a full build takes ~25 minutes).
  const prior = new Map();
  if (existsSync(outPath) && !process.env.REBUILD_ALL) {
    try {
      const old = JSON.parse(readFileSync(outPath, 'utf8'));
      if (old.model === MODEL_ID && old.dims === DIMS) for (const c of old.chunks) prior.set(c.text, c.vec);
    } catch { /* unreadable prior index: embed everything */ }
  }
  let reused = 0;
  for (let i = 0; i < chunks.length; i++) {
    const cached = prior.get(chunks[i].text);
    if (cached) reused++;
    embedded.push({ ...chunks[i], vec: cached ?? await embed(chunks[i].text) });
    if ((i + 1) % 50 === 0 || i === chunks.length - 1) {
      process.stdout.write(`\rEmbedded ${i + 1}/${chunks.length}`);
    }
  }
  process.stdout.write('\n');
  writeFileSync(outPath, JSON.stringify({ model: MODEL_ID, dims: DIMS, builtAt, chunks: embedded }));
  console.log(`reused ${reused} vectors, embedded ${embedded.length - reused} new`);
  const mb = (statSync(outPath).size / 1e6).toFixed(1);
  console.log(`Wrote ${outPath} (${mb} MB, ${embedded.length} chunks)`);
}

main().catch((err) => { console.error(`\nBuild failed: ${err.name}: ${err.message}`); process.exit(1); });
