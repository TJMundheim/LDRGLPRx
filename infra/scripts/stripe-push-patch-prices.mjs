#!/usr/bin/env node
// Idempotent Stripe Product + Price setup for the Genesis Push Patch (7 blends x test/live).
//   node infra/scripts/stripe-push-patch-prices.mjs --dry-run   (default; read/list calls only)
//   node infra/scripts/stripe-push-patch-prices.mjs --apply     (creates missing objects, writes JSON)
// Never archives or deletes anything. Keys: Secrets Manager `all-stripe-keys` (us-east-2),
// same key names as @my4mlife/stripe-client: stripe-test-secret / stripe-live-secret.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pkgDir = path.join(root, 'lambdas/_shared/stripe-client/');
const require = createRequire(pkgDir + 'package.json');
const Stripe = require('stripe');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const API_VERSION = '2025-02-24.acacia';
const OUT = path.join(root, 'lambdas/create-checkout-session/src/push-patch-prices.json');

// Copy of the P1-A catalog (website/src/data/pushPatch.ts). Keep in sync.
const BLENDS = [
  ['push-patch-nad-ghk', 'NAD+ Restore', 'NAD+ 1300 mg / GHK-Cu 5 mg', 650],
  ['push-patch-bpc-nad-ghk', 'Repair', 'BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg', 650],
  ['push-patch-kpv-nad-ghk', 'Calm Gut', 'KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg', 650],
  ['push-patch-nad-motsc-ghk', 'Metabolic', 'NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg', 650],
  ['push-patch-enhanced-glow', 'Enhanced Glow', 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg', 650],
  ['push-patch-wolverine', 'Wolverine', 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg', 650],
  ['push-patch-glutathione-ghk', 'Glutathione Glow', 'Glutathione 500 mg / GHK-Cu 5 mg', 550],
].map(([skuId, name, formula, priceUsd]) => ({ skuId, name, formula, priceUsd }));

const args = process.argv.slice(2);
const apply = args.includes('--apply');
if (apply && args.includes('--dry-run')) { console.error('Pass only one of --dry-run / --apply'); process.exit(2); }

const sm = new SecretsManagerClient({ region: 'us-east-2' });
const secret = await sm.send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }));
const keys = JSON.parse(secret.SecretString);

const result = { test: {}, live: {} };
let planned = 0;

for (const mode of ['test', 'live']) {
  const key = keys[`stripe-${mode}-secret`];
  if (!key) throw new Error(`stripe-${mode}-secret missing in all-stripe-keys`);
  const stripe = new Stripe(key, { apiVersion: API_VERSION });

  for (const b of BLENDS) {
    const tag = `[${mode}] ${b.skuId}`;
    const existing = (await stripe.prices.list({ lookup_keys: [b.skuId], limit: 1 })).data[0];
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
  writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
} else {
  console.log(`DRY RUN: ${planned} planned lines, nothing written.`);
}
