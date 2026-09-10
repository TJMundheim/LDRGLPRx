#!/usr/bin/env node
// Guards the built /consult page against regressions: exactly 5 numbered
// wizard steps, and the two required API calls + care-coordinator category
// string must survive the build.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist', 'consult', 'index.html');

let html;
try {
  html = readFileSync(distPath, 'utf8');
} catch (err) {
  console.error(`check:consult FAILED — could not read ${distPath}: ${err.message}`);
  process.exit(1);
}

const failures = [];

// Match numbered step sections only (data-step="1".."5") — excludes the
// `data-step="' + n + '"` string-concat literals inside the inline <script>.
const stepMatches = html.match(/data-step="\d+"/g) || [];
if (stepMatches.length !== 5) {
  failures.push(`expected exactly 5 occurrences of data-step="N" (N=1..5), found ${stepMatches.length}: ${JSON.stringify(stepMatches)}`);
}

for (let n = 1; n <= 5; n++) {
  const needle = `data-step="${n}"`;
  if (!html.includes(needle)) {
    failures.push(`missing ${needle}`);
  }
}

if (!html.includes('/api/contact-form')) {
  failures.push('missing /api/contact-form');
}

if (!html.includes('/api/patient-record-intake')) {
  failures.push('missing /api/patient-record-intake');
}

if (!html.includes('care-coordinator')) {
  failures.push('missing care-coordinator');
}

if (failures.length) {
  console.error('check:consult FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('check:consult OK — 5 steps (1..5), contact-form + patient-record-intake + care-coordinator all present.');
