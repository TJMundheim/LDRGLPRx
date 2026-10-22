import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { toCsv } from './csv';
import { SEGMENTS, segmentContacts, type ContactItem } from './segments';
import { REGION } from './sources';

const table = process.env.CONTACT_TABLE ?? 'Contact';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function scanAll(): Promise<ContactItem[]> {
  const out: ContactItem[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do { // read-only: Scan only, never a write
    const res = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey }));
    out.push(...((res.Items ?? []) as ContactItem[]));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out;
}

const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local
const dir = path.join(homedir(), 'Downloads', `my4mlife-exports-${today}`);
const items = await scanAll();
const segments = segmentContacts(items);
mkdirSync(dir, { recursive: true });
console.log(`table=${table} scanned=${items.length} excluded=${items.length - segments['all-contacts'].length}`);
for (const name of SEGMENTS) {
  writeFileSync(path.join(dir, `${name}.csv`), toCsv(segments[name]), { mode: 0o600 });
  console.log(`${name}\t${segments[name].length}`);
}
console.log(`written to ${dir}`);
