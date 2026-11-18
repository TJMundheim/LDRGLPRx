#!/usr/bin/env node
// Idempotent Stripe Product + prices for a manual-pharmacy Rx refill product (e.g. Gut-Brain Rx: $125 one-time + $125 every 30 days).
//   node infra/scripts/rx-refill-prices.mjs --rx gut-brain-rx                     (dry run, default: list calls only)
//   node infra/scripts/rx-refill-prices.mjs --rx gut-brain-rx --apply --mode test  (creates missing objects, writes the catalog JSON)
// --mode test|live (default test). Never archives or deletes anything. Ids go to
// lambdas/_shared/push-patch-checkout/src/rx-refill-prices.json ({test:{<product>:{once,recurring}}, live:{...}}).
// Keys: Secrets Manager `all-stripe-keys` (us-east-2), same names as @my4mlife/stripe-client.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RX_PRICES, productParams, priceParams, planPrice, mergeRxIds, parseRxArgs } from './rx-refill-prices-lib.mjs';

let o;
try { o = parseRxArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'lambdas/_shared/push-patch-checkout/src/rx-refill-prices.json');
const req = createRequire(path.join(root, 'lambdas/_shared/stripe-client/') + 'package.json');
const Stripe = req('stripe');
const { SecretsManagerClient, GetSecretValueCommand } = req('@aws-sdk/client-secrets-manager');

const keys = JSON.parse((await new SecretsManagerClient({ region: 'us-east-2' }).send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }))).SecretString);
const key = keys[`stripe-${o.mode}-secret`];
if (!key) throw new Error(`stripe-${o.mode}-secret missing in all-stripe-keys`);
const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });

const cat = RX_PRICES[o.rx];
const found = {};
for (const kind of ['once', 'recurring']) found[kind] = (await stripe.prices.list({ lookup_keys: [cat.lookupKeys[kind]], limit: 1 })).data[0];
let productId = found.once?.product ?? found.recurring?.product
  ?? (await stripe.products.search({ query: `metadata['product']:'${o.rx}' AND metadata['kind']:'rx-refill'`, limit: 1 })).data[0]?.id;

const ids = {};
for (const kind of ['once', 'recurring']) {
  const tag = `[${o.mode}] ${cat.lookupKeys[kind]}`;
  const plan = planPrice(o.rx, kind, found[kind]);
  if (plan.action === 'exists') { ids[kind] = found[kind].id; console.log(`${tag}: EXISTS ${found[kind].id} - no action`); continue; }
  if (!o.apply) {
    console.log(`${tag}: WOULD ${plan.action} $${cat.amountCents / 100} ${kind === 'once' ? 'one-time' : `every ${cat.intervalDays} days`} on ${productId ?? `new product "${cat.name}"`}`);
    if (found[kind]) ids[kind] = found[kind].id;
    continue;
  }
  if (!productId) { productId = (await stripe.products.create(productParams(o.rx))).id; console.log(`[${o.mode}] CREATED product ${productId}`); }
  const price = await stripe.prices.create(priceParams(o.rx, kind, productId, plan.action === 'reprice'));
  ids[kind] = price.id;
  console.log(`${tag}: ${plan.action === 'create' ? 'CREATED' : 'REPRICED'} ${price.id}`);
}
if (o.apply) {
  const merged = mergeRxIds(JSON.parse(readFileSync(OUT, 'utf8')), o.mode, o.rx, ids);
  writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
} else console.log('DRY RUN: nothing written.');
