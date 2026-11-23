#!/usr/bin/env node
// Idempotent: renames the Stripe product behind glp1-reta-once / glp1-reta-28d to "GLP-3 · Reta, 1 month" and scrubs
// "retatrutide" from its description. Never creates or deletes anything.
//   node infra/scripts/stripe-rename-glp1-reta.mjs --mode test|live [--dry-run | --apply]   (default: dry run)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const NAME = 'GLP-3 · Reta, 1 month';
const KEYS = ['glp1-reta-once', 'glp1-reta-28d'];
const args = process.argv.slice(2);
const mi = args.indexOf('--mode');
const mode = mi >= 0 ? args[mi + 1] : 'test';
if (!['test', 'live'].includes(mode)) { console.error('--mode must be test or live'); process.exit(2); }
const apply = args.includes('--apply') && !args.includes('--dry-run');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'lambdas/_shared/stripe-client/') + 'package.json');
const Stripe = req('stripe');
const { SecretsManagerClient, GetSecretValueCommand } = req('@aws-sdk/client-secrets-manager');
const keys = JSON.parse((await new SecretsManagerClient({ region: 'us-east-2' }).send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }))).SecretString);
const key = keys[`stripe-${mode}-secret`];
if (!key) throw new Error(`stripe-${mode}-secret missing in all-stripe-keys`);
const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });

const ids = new Set();
for (const lk of KEYS) for (const p of (await stripe.prices.list({ lookup_keys: [lk], limit: 1 })).data) ids.add(typeof p.product === 'string' ? p.product : p.product.id);
if (!ids.size) console.log(`[${mode}] no prices found for ${KEYS.join(', ')} - nothing to do`);
for (const id of ids) {
  const prod = await stripe.products.retrieve(id);
  const update = {};
  if (prod.name !== NAME) update.name = NAME;
  if (/retatrutide/i.test(prod.description ?? '')) update.description = prod.description.replace(/\s*\(?retatrutide\)?/gi, '').trim() || '';
  if (!Object.keys(update).length) { console.log(`[${mode}] ${id} "${prod.name}": already clean - no action`); continue; }
  console.log(`[${mode}] ${id} "${prod.name}": ${apply ? 'UPDATING' : 'WOULD update'} ${JSON.stringify(update)}`);
  if (apply) await stripe.products.update(id, update);
}
if (!apply) console.log('DRY RUN: nothing written.');
