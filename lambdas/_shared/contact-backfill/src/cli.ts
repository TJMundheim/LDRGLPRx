import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { deriveContactId } from '@my4mlife/contact-id';
import { upsertContact, type ContactUpsertInput } from '@my4mlife/contact-upsert';
import { fromCognitoUser, fromPatientRecord, fromStripeCustomer, prepare } from './map';
import { REGION, cognitoUsers, patientRecords, stripeCustomers } from './sources';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
if (apply && args.includes('--dry-run')) { console.error('Pick one of --dry-run or --apply'); process.exit(2); }
const ri = args.indexOf('--report');
const report = ri >= 0 && args[ri + 1] ? path.resolve(args[ri + 1]) : undefined;
function insideRepo(p: string): boolean {
  for (let d = process.cwd(); ; d = path.dirname(d)) {
    if (existsSync(path.join(d, '.git'))) { const r = path.relative(d, p); return !r.startsWith('..') && !path.isAbsolute(r); }
    if (path.dirname(d) === d) return false;
  }
}
if (ri >= 0 && (!report || insideRepo(report))) { console.error('--report needs a path outside the repo'); process.exit(2); }

const table = process.env.CONTACT_TABLE ?? 'Contact';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });
const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const sources: [string, () => Promise<ContactUpsertInput[]>][] = [
  ['backfill:stripe', async () => (await stripeCustomers()).map(fromStripeCustomer)],
  ['backfill:cognito', async () => (await cognitoUsers()).map(fromCognitoUser)],
  ['backfill:patient-record', async () => (await patientRecords(ddb)).map(fromPatientRecord)],
];

const planned: ContactUpsertInput[] = [];
const rowsOut: string[] = [];
let errors = 0;
for (const [name, load] of sources) {
  const { rows, skippedTest, invalid } = prepare(await load());
  let isNew = 0, existing = 0, done = 0;
  for (const row of rows) {
    if (apply) {
      try { await upsertContact(ddb, row, { table }); done++; } catch { errors++; }
      continue;
    }
    const got = await ddb.send(new GetCommand({ TableName: table, Key: { contactId: deriveContactId(row.email) }, ProjectionExpression: 'contactId' }));
    if (got.Item) existing++; else { isNew++; planned.push(row); }
  }
  rowsOut.push(apply ? `${name}\ttotal=${rows.length}\tupserted=${done}\tskippedTest=${skippedTest}\tinvalid=${invalid}`
    : `${name}\ttotal=${rows.length}\tnew=${isNew}\texisting=${existing}\tskippedTest=${skippedTest}\tinvalid=${invalid}`);
}
console.log(`mode=${apply ? 'APPLY' : 'DRY-RUN'} table=${table}\n${rowsOut.join('\n')}${apply ? `\nerrors=${errors}` : ''}`);
if (report) {
  writeFileSync(report, ['email,firstName,lastName,source', ...planned.map((r) => [r.email, r.firstName, r.lastName, r.source].map(csv).join(','))].join('\n') + '\n');
  console.log(`report: ${planned.length} planned new rows written`);
}
if (errors) process.exit(1);
