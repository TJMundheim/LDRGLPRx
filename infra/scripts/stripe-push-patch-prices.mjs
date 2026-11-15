#!/usr/bin/env node
// Idempotent Stripe Product + Price setup for the Genesis Push Patch (7 blends x test/live).
//   node infra/scripts/stripe-push-patch-prices.mjs --dry-run   (default; read/list calls only)
//   node infra/scripts/stripe-push-patch-prices.mjs --apply     (creates missing objects, writes JSON)
//   --refill            ensure a recurring 6-week price per SKU (lookup `<sku>-6w`), ids under `refill` in the JSON
//   --mode test|live    limit to one Stripe mode (default: both)
// Never archives or deletes anything. Keys: Secrets Manager `all-stripe-keys` (us-east-2),
// same key names as @my4mlife/stripe-client: stripe-test-secret / stripe-live-secret.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildRefillPriceParams, refillLookupKey, mergeRefillIds, mergeOneTimeIds, planRefill } from './stripe-push-patch-prices-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pkgDir = path.join(root, 'lambdas/_shared/stripe-client/');
const require = createRequire(pkgDir + 'package.json');
const Stripe = require('stripe');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const API_VERSION = '2025-02-24.acacia';
const OUT = path.join(root, 'lambdas/_shared/push-patch-checkout/src/push-patch-prices.json');

// Copy of the P1-A catalog (website/src/data/pushPatch.ts). Keep in sync.
const BLENDS = [
  ['push-patch-nad-ghk', 'NAD+ Restore', 'NAD+ 1300 mg / GHK-Cu 5 mg', 700],
  ['push-patch-bpc-nad-ghk', 'Repair', 'BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg', 650],
  ['push-patch-kpv-nad-ghk', 'Calm Gut', 'KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg', 650],
  ['push-patch-nad-motsc-ghk', 'Metabolic', 'NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg', 795],
  ['push-patch-enhanced-glow', 'Enhanced Glow', 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg', 650],
  ['push-patch-wolverine', 'Wolverine', 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg', 650],
  ['push-patch-glutathione-ghk', 'Glutathione Radiance', 'Glutathione 500 mg / GHK-Cu 5 mg', 550],
].map(([skuId, name, formula, priceUsd]) => ({ skuId, name, formula, priceUsd }));

const args = process.argv.slice(2);
const apply = args.includes('--apply');
if (apply && args.includes('--dry-run')) { console.error('Pass only one of --dry-run / --apply'); process.exit(2); }

const refillMode = args.includes('--refill');
const mi = args.indexOf('--mode');
const onlyMode = mi >= 0 ? args[mi + 1] : undefined;
if (mi >= 0 && !['test', 'live'].includes(onlyMode)) { console.error('--mode must be test or live'); process.exit(2); }
const modes = onlyMode ? [onlyMode] : ['test', 'live'];

const sm = new SecretsManagerClient({ region: 'us-east-2' });
const secret = await sm.send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }));
const keys = JSON.parse(secret.SecretString);

const result = { test: {}, live: {} };
const refill = { test: {}, live: {} };
let planned = 0;

for (const mode of modes) {
  const key = keys[`stripe-${mode}-secret`];
  if (!key) throw new Error(`stripe-${mode}-secret missing in all-stripe-keys`);
  const stripe = new Stripe(key, { apiVersion: API_VERSION });

  if (refillMode) {
    for (const b of BLENDS) {
      const tag = `[${mode}] ${b.skuId}-6w`;
      const oneTime = (await stripe.prices.list({ lookup_keys: [b.skuId], limit: 1 })).data[0];
      const existingRefill = (await stripe.prices.list({ lookup_keys: [refillLookupKey(b.skuId)], limit: 1 })).data[0];
      const plan = planRefill({ oneTime, existingRefill });
      const dollars = plan.amount / 100;
      if (plan.action === 'skip') { console.log(`${tag}: SKIP (${plan.reason}; run without --refill first)`); continue; }
      if (plan.action === 'exists') {
        refill[mode][b.skuId] = existingRefill.id;
        console.log(`${tag}: EXISTS price ${existingRefill.id} ($${dollars} every 6 weeks) - no action`);
      } else if (!apply) {
        if (existingRefill) refill[mode][b.skuId] = existingRefill.id;
        console.log(`${tag}: WOULD ${plan.action === 'create' ? 'create' : `reprice ${existingRefill.id} ${existingRefill.unit_amount} -> ${plan.amount} (new price, lookup_key transferred)`} recurring price $${dollars} USD every 6 weeks on product ${oneTime.product}`);
      } else {
        const price = await stripe.prices.create(buildRefillPriceParams({
          skuId: b.skuId, productId: oneTime.product, unitAmount: plan.amount, transfer: plan.action === 'reprice',
        }));
        refill[mode][b.skuId] = price.id;
        console.log(`${tag}: ${plan.action === 'create' ? 'CREATED' : 'REPRICED'} price ${price.id} ($${dollars} every 6 weeks)`);
      }
      planned++;
    }
    continue;
  }

  for (const b of BLENDS) {
    const tag = `[${mode}] ${b.skuId}`;
    const existing = (await stripe.prices.list({ lookup_keys: [b.skuId], limit: 1 })).data[0];
    const catalogName = `Push Patch — ${b.name} (6-week set)`;
    // Rename an existing product whose name drifted from the catalog (never archive/delete).
    const found = (await stripe.products.search({ query: `metadata['skuId']:'${b.skuId}'`, limit: 1 })).data[0]
      ?? (existing ? await stripe.products.retrieve(existing.product) : undefined);
    if (found && found.name !== catalogName) {
      if (apply) {
        await stripe.products.update(found.id, { name: catalogName });
        console.log(`${tag}: RENAMED product ${found.id} "${found.name}" -> "${catalogName}"`);
      } else {
        console.log(`${tag}: WOULD rename product ${found.id} "${found.name}" -> "${catalogName}"`);
      }
    }
    if (existing && existing.unit_amount !== b.priceUsd * 100) {
      // Reprice: Stripe prices are immutable, so create a new one and move the lookup_key to it.
      // The old price stays (not archived) but is no longer referenced.
      if (!apply) {
        console.log(`${tag}: WOULD reprice ${existing.id} ${existing.unit_amount} -> ${b.priceUsd * 100} (new price, lookup_key transferred)`);
        result[mode][b.skuId] = existing.id;
      } else {
        const price = await stripe.prices.create({
          product: existing.product, currency: 'usd', unit_amount: b.priceUsd * 100,
          lookup_key: b.skuId, transfer_lookup_key: true, metadata: { skuId: b.skuId },
        });
        result[mode][b.skuId] = price.id;
        console.log(`${tag}: REPRICED ${existing.id} -> ${price.id} ($${b.priceUsd})`);
      }
      planned++;
      continue;
    }
    if (existing) {
      result[mode][b.skuId] = existing.id;
      console.log(`${tag}: EXISTS price ${existing.id} (${existing.unit_amount} ${existing.currency}, product ${existing.product}) - no action`);
      planned++;
      continue;
    }
    let product = (await stripe.products.search({ query: `metadata['skuId']:'${b.skuId}'`, limit: 1 })).data[0];
    const productName = `Push Patch — ${b.name} (6-week set)`;
    const cents = b.priceUsd * 100;
    if (!apply) {
      console.log(`${tag}: WOULD ${product ? `reuse product ${product.id}` : `create product "${productName}" (${b.formula})`} + create price $${b.priceUsd} USD one-time lookup_key=${b.skuId}`);
      planned++;
      continue;
    }
    if (!product) {
      product = await stripe.products.create({
        name: productName,
        description: b.formula,
        metadata: { skuId: b.skuId },
      });
    }
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: cents,
      lookup_key: b.skuId,
      metadata: { skuId: b.skuId },
    });
    result[mode][b.skuId] = price.id;
    console.log(`${tag}: CREATED product ${product.id} price ${price.id}`);
    planned++;
  }
}

if (apply) {
  const existing = JSON.parse(readFileSync(OUT, 'utf8'));
  const merged = refillMode
    ? mergeRefillIds(existing, refill)
    : mergeOneTimeIds(existing, { test: onlyMode === 'live' ? existing.test : result.test, live: onlyMode === 'test' ? existing.live : result.live });
  writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
} else {
  console.log(`DRY RUN: ${planned} planned lines, nothing written.`);
}
