#!/usr/bin/env node
// Idempotent Stripe Product + prices for a manual-pharmacy Rx refill product (e.g. Gut-Brain Rx: $125 one-time + $125 every 30 days).
//   node infra/scripts/rx-refill-prices.mjs --rx gut-brain-rx                     (dry run, default: list calls only)
//   node infra/scripts/rx-refill-prices.mjs --rx gut-brain-rx --apply --mode test  (creates missing objects, writes the catalog JSON)
//   node infra/scripts/rx-refill-prices.mjs --rx glp1 [--apply] --mode test|live   (3 GLP-1 products x [$375 once + $375 every 28 days])
// --mode test|live (default test). Never archives or deletes anything. Ids go to
// lambdas/_shared/push-patch-checkout/src/rx-refill-prices.json ({test:{<product>:{once,recurring}}, live:{...}}),
// or for --rx glp1 to glp1-prices.json in the Push Patch shape ({test:{sku:once}, live:{...}, refill:{test:{sku:recurring}, live:{...}}}).
// Keys: Secrets Manager `all-stripe-keys` (us-east-2), same names as @my4mlife/stripe-client.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { RX_PRICES, productParams, priceParams, planPrice, mergeRxIds, mergeGlp1Ids, rxTargets, parseRxArgs } from './rx-refill-prices-lib.mjs';

let o;
try { o = parseRxArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const isGlp1 = o.rx === 'glp1';
const OUT = path.join(root, 'lambdas/_shared/push-patch-checkout/src', isGlp1 ? 'glp1-prices.json' : 'rx-refill-prices.json');
const req = createRequire(path.join(root, 'lambdas/_shared/stripe-client/') + 'package.json');
const Stripe = req('stripe');
const { SecretsManagerClient, GetSecretValueCommand } = req('@aws-sdk/client-secrets-manager');

const keys = JSON.parse((await new SecretsManagerClient({ region: 'us-east-2' }).send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }))).SecretString);
const key = keys[`stripe-${o.mode}-secret`];
if (!key) throw new Error(`stripe-${o.mode}-secret missing in all-stripe-keys`);
const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });

const results = {};
for (const sku of rxTargets(o.rx)) {
  const cat = RX_PRICES[sku];
  const found = {};
  for (const kind of ['once', 'recurring']) found[kind] = (await stripe.prices.list({ lookup_keys: [cat.lookupKeys[kind]], limit: 1 })).data[0];
  let productId = found.once?.product ?? found.recurring?.product
    ?? (await stripe.products.search({ query: `metadata['product']:'${sku}' AND metadata['kind']:'rx-refill'`, limit: 1 })).data[0]?.id;
  const ids = {};
  for (const kind of ['once', 'recurring']) {
    const tag = `[${o.mode}] ${cat.lookupKeys[kind]}`;
    const plan = planPrice(sku, kind, found[kind]);
    if (plan.action === 'exists') { ids[kind] = found[kind].id; console.log(`${tag}: EXISTS ${found[kind].id} - no action`); continue; }
    if (!o.apply) {
      console.log(`${tag}: WOULD ${plan.action} $${cat.amountCents / 100} ${kind === 'once' ? 'one-time' : `every ${cat.intervalDays} days`} on ${productId ?? `new product "${cat.name}"`}`);
      if (found[kind]) ids[kind] = found[kind].id;
      continue;
    }
    if (!productId) { productId = (await stripe.products.create(productParams(sku))).id; console.log(`[${o.mode}] CREATED product ${productId}`); }
    const price = await stripe.prices.create(priceParams(sku, kind, productId, plan.action === 'reprice'));
    ids[kind] = price.id;
    console.log(`${tag}: ${plan.action === 'create' ? 'CREATED' : 'REPRICED'} ${price.id}`);
  }
  results[sku] = ids;
}
if (o.apply) {
  let out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  for (const [sku, ids] of Object.entries(results)) out = (isGlp1 ? mergeGlp1Ids : mergeRxIds)(out, o.mode, sku, ids);
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
} else console.log('DRY RUN: nothing written.');
