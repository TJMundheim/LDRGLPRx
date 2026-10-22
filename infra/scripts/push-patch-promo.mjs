#!/usr/bin/env node
// Push Patch promo admin: one $150-off Coupon (Push Patch products only) + many Promotion Codes.
//   node infra/scripts/push-patch-promo.mjs coupon  [--mode live|test] [--apply]
//   node infra/scripts/push-patch-promo.mjs code WORD [--expires YYYY-MM-DD] [--max N] [--first-order]
//                                                     [--note "who it's for"] [--mode live|test] [--apply]
//   node infra/scripts/push-patch-promo.mjs list    [--mode live|test]
//   node infra/scripts/push-patch-promo.mjs report  [--since YYYY-MM-DD] [--mode live|test]
// Dry run by default (read/list calls only); --apply writes. --mode defaults to test.
// Never deletes or archives. Keys: Secrets Manager `all-stripe-keys` (us-east-2); never printed.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'lambdas/_shared/stripe-client/') + 'package.json');
const Stripe = require('stripe');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const API_VERSION = '2025-02-24.acacia';
const COUPON_KEY = 'push-patch-150';
const COUPON_NAME = 'Push Patch $150 off';
const TZ = 'America/Chicago';
const PRICES = JSON.parse(readFileSync(path.join(root, 'lambdas/_shared/push-patch-checkout/src/push-patch-prices.json'), 'utf8'));
const SKUS = Object.keys(PRICES.test);

const argv = process.argv.slice(2);
const cmd = argv[0];
const flagVal = (n) => { const i = argv.indexOf(n); return i < 0 ? undefined : argv[i + 1]; };
const has = (n) => argv.includes(n);
const die = (m) => { console.error(m); process.exit(2); };

const mode = flagVal('--mode') ?? 'test';
if (!['live', 'test'].includes(mode)) die('--mode must be live or test');
const apply = has('--apply');
if (!['coupon', 'code', 'list', 'report'].includes(cmd)) die('Usage: push-patch-promo.mjs coupon|code WORD|list|report [--mode live|test] [--apply]');

const secret = await new SecretsManagerClient({ region: 'us-east-2' }).send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }));
const key = JSON.parse(secret.SecretString)[`stripe-${mode}-secret`];
if (!key) throw new Error(`stripe-${mode}-secret missing in all-stripe-keys`);
const stripe = new Stripe(key, { apiVersion: API_VERSION });
const tag = `[${mode}${apply ? ' APPLY' : ' dry-run'}]`;

const fmt = (ts) => (ts ? new Date(ts * 1000).toLocaleString('en-US', { timeZone: TZ, hour12: false }) + ' CT' : '-');
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;

// HH:MM:SS America/Chicago on YYYY-MM-DD -> unix seconds (DST-safe: try both CT offsets).
function chicagoTime(date, hms, flag) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) die(`${flag} must be YYYY-MM-DD`);
  for (const off of [5, 6]) {
    const t = Date.parse(`${date}T${hms}Z`) + off * 3600e3;
    if (new Date(t).toLocaleString('sv-SE', { timeZone: TZ, hourCycle: 'h23' }) === `${date} ${hms}`) return t / 1000;
  }
  die(`Could not resolve ${date} ${hms} ${TZ}`);
}

async function pushPatchProducts() {
  const prices = (await stripe.prices.list({ lookup_keys: SKUS, limit: 100 })).data;
  const byKey = new Map(prices.map((p) => [p.lookup_key, p.product]));
  const missing = SKUS.filter((s) => !byKey.has(s));
  if (missing.length) throw new Error(`No ${mode} price for lookup_key(s): ${missing.join(', ')}`);
  return [...new Set(SKUS.map((s) => byKey.get(s)))];
}

async function findCoupon() {
  for await (const c of stripe.coupons.list({ limit: 100, expand: ['data.applies_to'] })) if (c.metadata?.key === COUPON_KEY) return c;
  return undefined;
}

async function allCodes(coupon) {
  const out = [];
  for await (const p of stripe.promotionCodes.list({ coupon: coupon.id, limit: 100 })) out.push(p);
  return out;
}

const describe = (c) => `${c.id} "${c.name}" ${usd(c.amount_off)} ${c.currency?.toUpperCase()} ${c.duration} products=${(c.applies_to?.products ?? []).length}`;

if (cmd === 'coupon') {
  const products = await pushPatchProducts();
  const existing = await findCoupon();
  if (existing) {
    const same = [...(existing.applies_to?.products ?? [])].sort().join() === [...products].sort().join();
    console.log(`${tag} coupon EXISTS: ${describe(existing)} - no action`);
    if (!same) console.log('WARNING: applies_to.products differs from current Push Patch products (cannot be edited in Stripe; create a new coupon if needed).');
  } else {
    const params = { name: COUPON_NAME, amount_off: 15000, currency: 'usd', duration: 'once', metadata: { key: COUPON_KEY }, applies_to: { products } };
    if (!apply) console.log(`${tag} WOULD create coupon:\n${JSON.stringify(params, null, 2)}`);
    else console.log(`${tag} CREATED coupon: ${describe(await stripe.coupons.create(params))}`);
  }
} else if (cmd === 'code') {
  const word = argv[1]?.startsWith('--') ? undefined : argv[1];
  if (!word || !/^[A-Za-z0-9]{3,30}$/.test(word)) die('code needs a WORD (3-30 letters/digits): code <WORD> [--expires YYYY-MM-DD] [--max N] [--first-order] [--note "..."]');
  const code = word.toUpperCase();
  const coupon = await findCoupon();
  if (!coupon) die(`${tag} coupon ${COUPON_KEY} not found in ${mode}; run "coupon --apply" first.`);
  const dupes = (await stripe.promotionCodes.list({ code, limit: 10 })).data;
  if (dupes.length) die(`${tag} REFUSED: code ${code} already exists (${dupes.map((d) => `${d.id} active=${d.active}`).join(', ')}).`);
  const params = { coupon: coupon.id, code };
  if (flagVal('--note')) params.metadata = { note: flagVal('--note') };
  if (has('--expires')) params.expires_at = chicagoTime(flagVal('--expires'), '23:59:59', '--expires');
  if (has('--max')) {
    const n = Number(flagVal('--max'));
    if (!Number.isInteger(n) || n < 1) die('--max must be a positive integer');
    params.max_redemptions = n;
  }
  if (has('--first-order')) params.restrictions = { first_time_transaction: true };
  if (!apply) console.log(`${tag} WOULD create promotion code ${code}:\n${JSON.stringify({ ...params, expires_at: params.expires_at && `${params.expires_at} (${fmt(params.expires_at)})` }, null, 2)}`);
  else {
    const p = await stripe.promotionCodes.create(params);
    console.log(`${tag} CREATED ${p.code} (${p.id}) active=${p.active} expires=${fmt(p.expires_at)} max=${p.max_redemptions ?? '-'} first_order=${!!p.restrictions?.first_time_transaction} note="${p.metadata?.note ?? ''}"`);
  }
} else if (cmd === 'list') {
  const coupon = await findCoupon();
  if (!coupon) { console.log(`${tag} coupon ${COUPON_KEY} not found in ${mode} (run "coupon --apply" to create it). 0 codes.`); process.exit(0); }
  console.log(`${tag} coupon ${describe(coupon)}`);
  const codes = await allCodes(coupon);
  console.log(['CODE', 'ACTIVE', 'EXPIRES', 'MAX', 'REDEEMED', 'NOTE'].join('\t'));
  for (const p of codes) console.log([p.code, p.active, fmt(p.expires_at), p.max_redemptions ?? '-', p.times_redeemed, p.metadata?.note ?? ''].join('\t'));
  console.log(`${codes.length} code(s).`);
} else if (cmd === 'report') {
  const coupon = await findCoupon();
  if (!coupon) { console.log(`${tag} coupon ${COUPON_KEY} not found in ${mode}. Nothing to report.`); process.exit(0); }
  const gte = has('--since') ? chicagoTime(flagVal('--since'), '00:00:00', '--since') : coupon.created;
  const byId = new Map((await allCodes(coupon)).map((p) => [p.id, p.code]));
  const rows = new Map();
  const sessions = stripe.checkout.sessions.list({ created: { gte }, limit: 100, expand: ['data.payment_intent.latest_charge'] });
  for await (const s of sessions) {
    if (s.status !== 'complete' || s.payment_status !== 'paid') continue;
    for (const d of s.discounts ?? []) {
      const id = typeof d.promotion_code === 'string' ? d.promotion_code : d.promotion_code?.id;
      if (!byId.has(id)) continue;
      const r = rows.get(byId.get(id)) ?? { orders: 0, refunded: 0, gross: 0, discount: 0, partial: 0 };
      rows.set(byId.get(id), r);
      const ch = s.payment_intent?.latest_charge;
      const refunded = ch && typeof ch === 'object' ? ch.amount_refunded ?? 0 : 0;
      if (ch?.refunded || (s.amount_total > 0 && refunded >= s.amount_total)) { r.refunded++; continue; }
      r.orders++; r.gross += s.amount_subtotal ?? 0; r.discount += s.total_details?.amount_discount ?? 0; r.partial += refunded;
    }
  }
  console.log(`${tag} paid sessions since ${fmt(gte)} (refunded orders excluded from totals; partial refunds reduce NET)`);
  console.log(['CODE', 'ORDERS', 'REFUNDED', 'GROSS', 'DISCOUNT', 'NET'].join('\t'));
  for (const [c, r] of [...rows].sort()) console.log([c, r.orders, r.refunded, usd(r.gross), usd(r.discount), usd(r.gross - r.discount - r.partial)].join('\t'));
  if (!rows.size) console.log('(no paid orders used a code)');
}
