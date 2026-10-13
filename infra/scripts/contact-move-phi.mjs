#!/usr/bin/env node
// Move assessment answers/scores off the marketing Contact table into Users (TJ decision 2026-10-13).
//   node infra/scripts/contact-move-phi.mjs --dry-run   (default; read-only AWS calls, prints counts only)
//   node infra/scripts/contact-move-phi.mjs --apply     (requires TJ's OK; copies to Users, then REMOVEs from Contact)
// Matching: Contact.email (lowercased) == Users.primaryEmail (lowercased); Users has no email GSI (25 rows),
// so Users is scanned once (id + primaryEmail only). Zero or >1 Users matches => "no Users match", row untouched.
// Never deletes a row, never touches other attributes, never prints emails/names/answers.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'lambdas/audit-complete/package.json'));
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-2';
const CONTACT = 'Contact';
const USERS = 'Users';
const FIELDS = ['intakeAnswers', 'auditTop3', 'auditCompletedAt'];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
if (apply && args.includes('--dry-run')) { console.error('Pick one of --dry-run or --apply'); process.exit(2); }

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });

async function scanAll(params) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new ScanCommand({ ...params, ExclusiveStartKey }));
    items.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

// Users stores these three fields as JSON strings (audit-complete seedUserProfile); match that on copy.
const toUsersValue = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
const norm = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

const users = await scanAll({
  TableName: USERS,
  ProjectionExpression: 'id, primaryEmail, intakeAnswers, auditTop3, auditCompletedAt',
});
const byEmail = new Map();
for (const u of users) {
  const k = norm(u.primaryEmail);
  if (!k) continue;
  byEmail.set(k, [...(byEmail.get(k) ?? []), u]);
}

const contacts = await scanAll({
  TableName: CONTACT,
  ProjectionExpression: 'contactId, email, ' + FIELDS.join(', '),
  FilterExpression: FIELDS.map((f) => `attribute_exists(${f})`).join(' OR '),
});

const c = { rowsFound: 0, wouldCopyFields: 0, alreadyInUsersFields: 0, noUsersMatchRows: 0, wouldRemoveRows: 0, errors: 0 };
for (const row of contacts) {
  c.rowsFound++;
  const matches = byEmail.get(norm(row.email)) ?? [];
  if (matches.length !== 1) { c.noUsersMatchRows++; continue; }
  const user = matches[0];
  const present = FIELDS.filter((f) => row[f] !== undefined);
  const missing = present.filter((f) => user[f] === undefined);
  c.wouldCopyFields += missing.length;
  c.alreadyInUsersFields += present.length - missing.length;
  c.wouldRemoveRows++;
  if (!apply) continue;
  try {
    if (missing.length) {
      await ddb.send(new UpdateCommand({
        TableName: USERS,
        Key: { id: user.id },
        UpdateExpression: 'SET ' + missing.map((f) => `#${f} = if_not_exists(#${f}, :${f})`).join(', '),
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeNames: Object.fromEntries(missing.map((f) => [`#${f}`, f])),
        ExpressionAttributeValues: Object.fromEntries(missing.map((f) => [`:${f}`, toUsersValue(row[f])])),
      }));
    }
    await ddb.send(new UpdateCommand({
      TableName: CONTACT,
      Key: { contactId: row.contactId },
      UpdateExpression: 'REMOVE ' + present.join(', '),
      ConditionExpression: 'attribute_exists(contactId)',
    }));
  } catch (e) {
    c.errors++;
    console.error('row failed:', e?.name ?? 'error'); // never log row data
  }
}

console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
console.log(`Users rows scanned (id+email only): ${users.length}`);
console.log(`Contact rows found with ${FIELDS.join('/')}: ${c.rowsFound}`);
console.log(`${apply ? 'copied' : 'would-copy'} (fields): ${c.wouldCopyFields}`);
console.log(`already-in-Users (fields): ${c.alreadyInUsersFields}`);
console.log(`no-Users-match (rows left untouched): ${c.noUsersMatchRows}`);
console.log(`${apply ? 'removed' : 'would-remove'} from Contact (rows): ${c.wouldRemoveRows}`);
if (apply) console.log(`errors: ${c.errors}`);
process.exit(apply && c.errors ? 1 : 0);
