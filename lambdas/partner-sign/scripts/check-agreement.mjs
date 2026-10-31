// Build guard: fail loudly if the agreement is missing, unversioned, or has unknown placeholders.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const f = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/legal/My_4M_Life_Partner_Agreement.md');
const KNOWN = ['BUSINESS', 'SIGNER_NAME', 'SIGNER_TITLE', 'PARTNER_CODE', 'CLIENT_OFFER', 'COMMISSION', 'EFFECTIVE_DATE'];
const fail = (m) => { console.error(`BUILD FAILED: ${m}`); process.exit(1); };

if (!existsSync(f)) fail(`${f} is missing. The partner agreement must exist before partner-sign can be built.`);
const md = readFileSync(f, 'utf8');
if (!/Version\s+PA-[\w-]+/.test(md)) fail('agreement has no "Version PA-..." line.');
const unknown = [...new Set([...md.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].filter((k) => !KNOWN.includes(k));
if (unknown.length) fail(`agreement has unknown placeholders: ${unknown.join(', ')}`);
console.log('agreement OK');
