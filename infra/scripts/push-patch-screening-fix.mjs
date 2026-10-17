#!/usr/bin/env node
// Correct the push-patch safety-screen display bug (2026-10-17): parseScreening stored the knockout answers
// seizures/pacemaker/pregnant as denied.includes(k) (inverted), so every cleared patient read "Yes".
//   node infra/scripts/push-patch-screening-fix.mjs --dry-run   (default; read-only AWS calls, prints counts only)
//   node infra/scripts/push-patch-screening-fix.mjs --apply      (requires TJ's OK)
// Recomputes answers.seizures/pacemaker/pregnant = !denied.includes(k) on PatientRecords sk='record' items with
// screeningAnswers.pushPatch (version != 'none') and a `denied` array. Touches ONLY those three nested fields,
// conditional on the item still existing, and writes an audit item per corrected record. Idempotent.
// Never prints names, emails, contact ids or answers.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'lambdas/push-patch-intake/package.json'));
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-2';
const TABLE = 'PatientRecords';
const KEYS = ['seizures', 'pacemaker', 'pregnant'];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
if (apply && args.includes('--dry-run')) { console.error('Pick one of --dry-run or --apply'); process.exit(2); }

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });

const items = [];
let ExclusiveStartKey;
do {
  const res = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'sk = :r AND attribute_exists(screeningAnswers.pushPatch)',
    ExpressionAttributeValues: { ':r': 'record' },
    ProjectionExpression: 'contactId, screeningAnswers.pushPatch',
    ExclusiveStartKey,
  }));
  items.push(...(res.Items ?? []));
  ExclusiveStartKey = res.LastEvaluatedKey;
} while (ExclusiveStartKey);

const c = { scanned: 0, noScreening: 0, notEvaluable: 0, alreadyCorrect: 0, needCorrection: 0, corrected: 0, errors: 0 };
let seq = 0;
for (const item of items) {
  c.scanned++;
  const pp = item.screeningAnswers?.pushPatch;
  if (!pp || !pp.version || pp.version === 'none') { c.noScreening++; continue; }
  if (!Array.isArray(pp.denied) || !pp.answers || typeof pp.answers !== 'object') { c.notEvaluable++; continue; }
  const to = Object.fromEntries(KEYS.map((k) => [k, !pp.denied.includes(k)]));
  const from = Object.fromEntries(KEYS.map((k) => [k, pp.answers[k]]));
  if (KEYS.every((k) => from[k] === to[k])) { c.alreadyCorrect++; continue; }
  c.needCorrection++;
  if (!apply) continue;
  const at = new Date().toISOString();
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { contactId: item.contactId, sk: 'record' },
      UpdateExpression: 'SET ' + KEYS.map((k) => `screeningAnswers.pushPatch.answers.#${k} = :${k}`).join(', '),
      ConditionExpression: 'attribute_exists(contactId) AND attribute_exists(screeningAnswers.pushPatch.answers)',
      ExpressionAttributeNames: Object.fromEntries(KEYS.map((k) => [`#${k}`, k])),
      ExpressionAttributeValues: Object.fromEntries(KEYS.map((k) => [`:${k}`, to[k]])),
    }));
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        contactId: item.contactId,
        sk: `audit#${at}#${String(seq++ % 10000).padStart(4, '0')}`,
        action: 'screening.display-corrected',
        at,
        detail: { from, to },
      },
      ConditionExpression: 'attribute_not_exists(sk)',
    }));
    c.corrected++;
  } catch (e) {
    c.errors++;
    console.error('record failed:', e?.name ?? 'error'); // never log record data
  }
}

console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
console.log(`records with screeningAnswers.pushPatch scanned: ${c.scanned}`);
console.log(`no screening (version none): ${c.noScreening}`);
console.log(`not evaluable (no denied array / answers map): ${c.notEvaluable}`);
console.log(`already correct: ${c.alreadyCorrect}`);
console.log(`${apply ? 'needing correction' : 'needing correction (would update)'}: ${c.needCorrection}`);
if (apply) { console.log(`corrected: ${c.corrected}`); console.log(`errors: ${c.errors}`); }
process.exit(apply && c.errors ? 1 : 0);
