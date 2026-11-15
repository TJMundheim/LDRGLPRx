#!/usr/bin/env node
// Push Patch refills admin. Dry run by default; --apply writes. --mode test|live (default test) picks the Stripe account.
//   node infra/scripts/push-patch-refill.mjs find  --email E
//   node infra/scripts/push-patch-refill.mjs grant --contact ID --encounter ENC --refills 8 --authorized-by "Name" [--provider-id X] [--mode live] [--apply]
//   node infra/scripts/push-patch-refill.mjs link  --contact ID --encounter ENC [--days 14]      (prints a signed URL; sends nothing)
// grant: eligibility = push-patch lane, state script-written, no refundStatus (same as grantRefills); writes refillAuth with a condition on state.
// grant reads the original Checkout session (account picked from its cs_live_/cs_test_ prefix) for partner attribution.
// Keys: Secrets Manager `all-stripe-keys` and SSM /my4mlife/push-patch/refill-hmac-key (us-east-2); never printed.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseArgs, buildAuth, buildLinkUrl, partnerRefFromSession, grantProblem } from './push-patch-refill-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REGION = 'us-east-2';
const TABLE = 'PatientRecords';
const KEY_PARAM = '/my4mlife/push-patch/refill-hmac-key';
const die = (m) => { console.error(m); process.exit(2); };

let o;
try { o = parseArgs(process.argv.slice(2)); } catch (e) { die(e.message); }
const encId = (s) => String(s).replace(/^encounter#/, '');

const req = createRequire(path.join(root, 'lambdas/push-patch-refill/') + 'package.json');
const { DynamoDBClient } = req('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } = req('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = req('@aws-sdk/client-ssm');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function stripeClient() {
  const sreq = createRequire(path.join(root, 'lambdas/_shared/stripe-client/') + 'package.json');
  const Stripe = sreq('stripe');
  const { SecretsManagerClient, GetSecretValueCommand } = sreq('@aws-sdk/client-secrets-manager');
  const s = await new SecretsManagerClient({ region: REGION }).send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }));
  return new Stripe(JSON.parse(s.SecretString)[`stripe-${o.mode}-secret`], { apiVersion: '2025-02-24.acacia' });
}
const getEnc = async (c, e) => (await ddb.send(new GetCommand({ TableName: TABLE, Key: { contactId: c, sk: `encounter#${encId(e)}` } }))).Item;

if (o.cmd === 'find') {
  // Same derivation as @my4mlife/contact-id deriveContactId (uuid v5 over the lowercased email).
  const uuid = createRequire(path.join(root, 'lambdas/_shared/contact-id/') + 'package.json')('uuid');
  const contactId = uuid.v5(o.flags.email.trim().toLowerCase(), 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0');
  const r = await ddb.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'contactId = :c AND begins_with(sk, :p)', ExpressionAttributeValues: { ':c': contactId, ':p': 'encounter#' } }));
  console.log(`contactId: ${contactId}`);
  for (const e of (r.Items ?? []).filter((x) => x.lane === 'push-patch')) {
    const a = e.refillAuth;
    console.log(`  ${e.sk.slice(10)}  state=${e.state}  sku=${e.sku}  created=${e.createdAt ?? '-'}  refill=${a ? `${a.status} ${a.refillsUsed}/${a.refillsAuthorized} exp ${a.expiresAt.slice(0, 10)} mode=${a.mode}` : 'none'}`);
  }
} else if (o.cmd === 'grant') {
  const f = o.flags;
  const enc = await getEnc(f.contact, f.encounter);
  const bad = grantProblem(enc);
  if (bad) die(`Refusing: ${bad}`);
  if (enc.refillAuth) console.log(`NOTE: this encounter already has refillAuth (${enc.refillAuth.status}, ${enc.refillAuth.refillsUsed}/${enc.refillAuth.refillsAuthorized}); --apply would overwrite it.`);
  if (!enc.sessionId) die('Refusing: encounter has no sessionId to derive partner attribution from');
  // The original session's prefix decides the Stripe account; an explicit --mode that disagrees is refused.
  const sessMode = enc.sessionId.startsWith('cs_live_') ? 'live' : enc.sessionId.startsWith('cs_test_') ? 'test' : o.mode;
  if (o.flags.mode && o.flags.mode !== sessMode) die(`Refusing: --mode ${o.flags.mode} but the original session is ${sessMode} mode`);
  o.mode = sessMode;
  const stripe = await stripeClient();
  const session = await stripe.checkout.sessions.retrieve(enc.sessionId);
  for (const d of session.discounts ?? []) if (typeof d.promotion_code === 'string') d.promotion_code = await stripe.promotionCodes.retrieve(d.promotion_code);
  const auth = buildAuth({ refills: f.refills, sku: enc.sku, authorizedBy: f['authorized-by'], providerId: f['provider-id'], partnerRef: partnerRefFromSession(session) });
  console.log(JSON.stringify(auth, null, 2));
  if (!o.apply) { console.log('DRY RUN: nothing written. Re-run with --apply to write.'); }
  else {
    await ddb.send(new UpdateCommand({ TableName: TABLE, Key: { contactId: f.contact, sk: `encounter#${encId(f.encounter)}` },
      UpdateExpression: 'SET refillAuth = :a, updatedAt = :now', ConditionExpression: '#state = :sw AND attribute_not_exists(refundStatus)',
      ExpressionAttributeNames: { '#state': 'state' }, ExpressionAttributeValues: { ':a': auth, ':sw': 'script-written', ':now': new Date().toISOString() } }));
    console.log('Written.');
  }
} else if (o.cmd === 'link') {
  const key = (await new SSMClient({ region: REGION }).send(new GetParameterCommand({ Name: KEY_PARAM, WithDecryption: true }))).Parameter.Value;
  const { url, exp } = buildLinkUrl({ contactId: o.flags.contact, encounterId: encId(o.flags.encounter), days: Number(o.flags.days ?? 14), key });
  console.log(url);
  console.error(`Expires ${new Date(exp * 1000).toISOString()}. Nothing was sent.`);
}
