#!/usr/bin/env node
// One-patient referral summary for a treating provider, emailed to TJ's HIPAA inbox
// (he forwards it). Everything stays inside AWS: PatientRecords → Bedrock (narrative)
// → email-sender. This script NEVER prints PHI — only item counts and the send result.
//
// Usage:
//   node infra/scripts/provider-referral-summary.mjs <contactId> --purpose "RPA Muse IV, Dr. Molina's clinic, Oct 29" \
//     [--to drtj@my4mlife.com] [--dry-run]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../lambdas/coordinator-brief/package.json', import.meta.url));
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const REGION = 'us-east-2';
const MODEL = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const args = process.argv.slice(2);
const contactId = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : d; };
const purpose = opt('--purpose', '');
const to = opt('--to', 'drtj@my4mlife.com');
const dry = args.includes('--dry-run');
if (!contactId || !purpose) { console.error('usage: <contactId> --purpose "..." [--to email] [--dry-run]'); process.exit(2); }

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const items = (await ddb.send(new QueryCommand({ TableName: 'PatientRecords', KeyConditionExpression: 'contactId = :c', ExpressionAttributeValues: { ':c': contactId } }))).Items ?? [];
const record = items.find((i) => i.sk === 'record');
if (!record) { console.error('no record for contactId'); process.exit(1); }
const latest = (p) => items.filter((i) => i.sk.startsWith(p)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
const brief = latest('brief#'), plan = latest('plan#'), encounter = latest('encounter#');
const parse = (j) => { try { return typeof j === 'string' ? JSON.parse(j) : j ?? null; } catch { return j; } };
const src = {
  purpose, demographics: record.demographics ?? null, history: record.history ?? null,
  screeningAnswers: record.screeningAnswers ?? null, encounter: encounter ? { category: encounter.category, visitType: encounter.visitType, state: encounter.state, createdAt: encounter.createdAt } : null,
  preCallBrief: brief ? parse(brief.json) : null, planOfAction: plan ? parse(plan.json) : null,
};
console.log(`found: record=1 brief=${brief ? 1 : 0} plan=${plan ? 1 : 0} encounters=${items.filter((i) => i.sk.startsWith('encounter#')).length}`);

const prompt = `You are preparing a referral summary for a treating physician (Dr. Molina) who will see this patient in clinic.
Write a concise, professional clinical narrative in plain prose for a physician reader, using ONLY the facts in the JSON below.
Never invent, infer, or embellish any diagnosis, medication, dose, value, or history. If something is missing, say "not recorded".
If planOfAction is null, state clearly: "No written plan of action is on file; Dr. TJ will add his plan when forwarding."
Use these headings exactly, each followed by short paragraphs or bullet points:
Reason for referral; Patient snapshot; Presenting concerns and goals; Relevant medical history (conditions, medications, allergies); Screening highlights; Plan of action; Items to confirm at the visit.
Output plain text only (no markdown symbols other than "- " bullets). Headings on their own line.
JSON:
${JSON.stringify(src)}`;

let narrative = '(narrative not generated in dry run)';
if (!dry) {
  const br = new BedrockRuntimeClient({ region: REGION });
  const out = await br.send(new ConverseCommand({ modelId: MODEL, messages: [{ role: 'user', content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 2000, temperature: 0 } }));
  narrative = (out.output?.message?.content ?? []).map((c) => c.text ?? '').join('').trim();
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const HEADINGS = new Set(['Reason for referral', 'Patient snapshot', 'Presenting concerns and goals', 'Relevant medical history (conditions, medications, allergies)', 'Screening highlights', 'Plan of action', 'Items to confirm at the visit']);
const narrHtml = narrative.split('\n').map((l) => l.trim()).filter(Boolean).map((l) =>
  HEADINGS.has(l.replace(/:$/, '')) ? `<h3 style="font-size:15px;margin:18px 0 6px;color:#1A2E1E">${esc(l.replace(/:$/, ''))}</h3>`
  : l.startsWith('- ') ? `<p style="margin:0 0 4px 14px">&bull; ${esc(l.slice(2))}</p>` : `<p style="margin:0 0 8px">${esc(l)}</p>`).join('');
const block = (title, obj) => `<h3 style="font-size:14px;margin:18px 0 6px">${esc(title)}</h3>` + (obj == null ? '<p style="margin:0;color:#777">Not on file.</p>'
  : `<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#f6f6f4;padding:10px;border-radius:6px;margin:0">${esc(JSON.stringify(obj, null, 2))}</pre>`);
const d = record.demographics ?? {};
const name = [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Patient';
const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:720px">
<p style="margin:0 0 4px;color:#666;font-size:12px">CONFIDENTIAL — PHI. Prepared for Dr. Molina via Dr. TJ (My4MLife). Forward only to a HIPAA-compliant inbox.</p>
<h2 style="font-size:19px;margin:6px 0 2px">Referral summary: ${esc(name)}</h2>
<p style="margin:0 0 14px;color:#444">${esc(purpose)}</p>
${narrHtml}
<hr style="border:none;border-top:1px solid #ccc;margin:22px 0 8px">
<p style="margin:0;color:#666;font-size:12px">Source records (verbatim from the My4MLife patient record) — for verification:</p>
${block('Pre-call brief', src.preCallBrief)}${block('Plan of action', src.planOfAction)}${block('Medical history', src.history)}${block('Screening answers', src.screeningAnswers)}${block('Demographics', src.demographics)}${block('Encounter', src.encounter)}
<p style="margin:18px 0 0;color:#888;font-size:11px">Narrative drafted by AI (AWS Bedrock) from the record above; verify against the source records. Generated ${new Date().toISOString()}.</p></div>`;
const text = `CONFIDENTIAL — PHI. Referral summary: ${name}\n${purpose}\n\n${narrative}\n\n(Source records are in the HTML version of this email.)\n`;

if (dry) { console.log(`dry run: narrative skipped; html ${html.length} chars; would send to ${to}`); process.exit(0); }
const payload = { kind: 'info', from: 'drtj', to, subject: `Referral summary — ${name} — ${purpose}`, html, text };
const res = await new LambdaClient({ region: REGION }).send(new InvokeCommand({ FunctionName: 'my4mlife-email-sender', Payload: Buffer.from(JSON.stringify(payload)) }));
const body = JSON.parse(Buffer.from(res.Payload ?? []).toString() || '{}');
console.log(res.FunctionError ? `send FAILED (${res.FunctionError})` : `sent to ${to} (narrative ${narrative.length} chars) id=${body.id ?? '?'}`);
