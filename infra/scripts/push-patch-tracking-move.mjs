#!/usr/bin/env node
// One-off: move trackingNumber/carrier/shippedAt from one Push Patch encounter to another (tracking was stamped on the wrong order).
//   node infra/scripts/push-patch-tracking-move.mjs --contact ID --from <encounter sk> --to <encounter sk> [--apply]
// Dry run by default. On --apply: stamps `to` (only if it has no tracking and is script-written), then on `from`
// removes the tracking and sets shippedUntracked: true (legacy order shipped without a recorded tracking number).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs, movePlan, buildMove } from './push-patch-tracking-move-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const die = (m) => { console.error(m); process.exit(2); };
let o;
try { o = parseArgs(process.argv.slice(2)); } catch (e) { die(e.message); }

const req = createRequire(path.join(root, 'lambdas/push-patch-tracking/') + 'package.json');
const { DynamoDBClient } = req('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = req('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-2' }));
const TableName = 'PatientRecords';
const get = async (sk) => (await ddb.send(new GetCommand({ TableName, Key: { contactId: o.contact, sk } }))).Item;
const show = (label, e) => console.log(`${label}: ${e ? JSON.stringify({ state: e.state, trackingNumber: e.trackingNumber, carrier: e.carrier, shippedAt: e.shippedAt, shippedUntracked: e.shippedUntracked, genesisOrderSentAt: e.genesisOrderSentAt }) : 'not found'}`);

const from = await get(o.from), to = await get(o.to);
console.log(`contact ${o.contact}\nfrom sk ${o.from}\nto   sk ${o.to}`);
show('BEFORE from', from); show('BEFORE to  ', to);
const problem = movePlan(from, to);
if (problem) die(`REFUSED: ${problem}`);
const now = new Date().toISOString();
const [upTo, upFrom] = buildMove(o.contact, o.from, o.to, from, now);
console.log(`PLAN: move ${from.carrier} ${from.trackingNumber} (shippedAt ${from.shippedAt}) from -> to; set shippedUntracked=true on from`);
if (!o.apply) { console.log('DRY RUN: nothing written. Re-run with --apply to write.'); process.exit(0); }
await ddb.send(new UpdateCommand({ TableName, ...upTo }));
await ddb.send(new UpdateCommand({ TableName, ...upFrom }));
show('AFTER from', await get(o.from)); show('AFTER to  ', await get(o.to));
