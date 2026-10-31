// node --test infra/scripts/push-patch-partner*.test.mjs
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { monthBounds, isPayable, monthRows, partnerCents, parseBlends } from './push-patch-partner-month.mjs';
import { renderStatement } from './push-patch-partner-statements.mjs';
import { isConnectDisabled, transferParams, runOnboard, runPay } from './push-patch-partner-connect.mjs';

const partner = { id: 'promo_a', code: 'GLOWSPA', metadata: { partner: 'true', business: 'Glow Spa', email: 'owner@glow.test', commission: '150' } };
const NAMES = { 'push-patch-nad-motsc-ghk': 'Metabolic', 'push-patch-enhanced-glow': 'Enhanced Glow' };
const sess = (id, created, sku, extra = {}) => ({
  id, created, status: 'complete', payment_status: 'paid', amount_total: 20000, metadata: { skuIds: sku },
  customer_details: { name: 'Jane Client', email: 'jane@client.test' }, customer_email: 'jane@client.test',
  discounts: [{ promotion_code: 'promo_a' }], payment_intent: { latest_charge: { amount_refunded: 0 } }, ...extra,
});

test('monthBounds: America/Chicago month edges, CDT and CST', () => {
  const b = monthBounds('2026-10'); // CDT (UTC-5) all month; ends before the Nov 1 midnight CT
  assert.equal(b.gte, Date.parse('2026-10-01T05:00:00Z') / 1000);
  assert.equal(b.lte, Date.parse('2026-11-01T05:00:00Z') / 1000 - 1);
  const d = monthBounds('2026-11'); // Nov 1 is CDT, Dec 1 is CST (UTC-6)
  assert.equal(d.gte, Date.parse('2026-11-01T05:00:00Z') / 1000);
  assert.equal(d.lte, Date.parse('2026-12-01T06:00:00Z') / 1000 - 1);
  assert.equal(monthBounds('2026-12').lte, Date.parse('2027-01-01T06:00:00Z') / 1000 - 1);
});

test('monthBounds rejects bad input', () => {
  for (const m of ['2026-13', '2026-1', 'oct', undefined]) assert.throws(() => monthBounds(m), /YYYY-MM/);
});

test('isPayable: paid, not refunded', () => {
  assert.equal(isPayable(sess('cs_1', 1, 'x')), true);
  assert.equal(isPayable(sess('cs_1', 1, 'x', { payment_status: 'unpaid' })), false);
  assert.equal(isPayable(sess('cs_1', 1, 'x', { status: 'open' })), false);
  assert.equal(isPayable(sess('cs_1', 1, 'x', { payment_intent: { latest_charge: { refunded: true, amount_refunded: 20000 } } })), false);
  assert.equal(isPayable(sess('cs_1', 1, 'x', { payment_intent: { latest_charge: { amount_refunded: 5000 } } })), true);
});

test('monthRows: only this partner, payable, sorted; date in CT, blend name, id suffix, commission', () => {
  const t1 = Date.parse('2026-11-01T03:30:00Z') / 1000; // Oct 31 22:30 CT
  const t2 = Date.parse('2026-10-05T15:00:00Z') / 1000;
  const rows = monthRows(partner, [
    sess('cs_live_abcdef123456', t1, 'push-patch-enhanced-glow'),
    sess('cs_live_zzzzzz654321', t2, 'push-patch-nad-motsc-ghk'),
    sess('cs_other', t2, 'push-patch-nad-motsc-ghk', { discounts: [{ promotion_code: 'promo_b' }] }),
    sess('cs_unpaid', t2, 'push-patch-nad-motsc-ghk', { payment_status: 'unpaid' }),
    sess('cs_refunded', t2, 'push-patch-nad-motsc-ghk', { payment_intent: { latest_charge: { refunded: true, amount_refunded: 20000 } } }),
  ], NAMES);
  assert.deepEqual(rows, [
    { date: '2026-10-05', blend: 'Metabolic', orderRef: '654321', cents: 15000 },
    { date: '2026-10-31', blend: 'Enhanced Glow', orderRef: '123456', cents: 15000 },
  ]);
  assert.equal(partnerCents(rows), 30000);
});

test('monthRows: unknown sku falls back to "Push Patch"; promotion_code object ok; default commission $100', () => {
  const p = { ...partner, metadata: { partner: 'true' } };
  const rows = monthRows(p, [sess('cs_abc123', 1, 'mystery', { discounts: [{ promotion_code: { id: 'promo_a' } }] })], NAMES);
  assert.deepEqual(rows.map((r) => [r.blend, r.cents]), [['Push Patch', 10000]]);
});

test('parseBlends reads skuId/name pairs from pushPatch.ts source', () => {
  const src = "skuId: 'push-patch-wolverine',\n    name: 'Wolverine',\n skuId: 'push-patch-nad-ghk',\n    name: 'NAD+ Restore',";
  assert.deepEqual(parseBlends(src), { 'push-patch-wolverine': 'Wolverine', 'push-patch-nad-ghk': 'NAD+ Restore' });
});

test('renderStatement: rows, total, payment line, and never any client identity', () => {
  const rows = [{ date: '2026-10-05', blend: 'Metabolic', orderRef: '654321', cents: 15000 }, { date: '2026-10-31', blend: 'Enhanced Glow', orderRef: '123456', cents: 15000 }];
  const s = renderStatement(partner, rows, '2026-10');
  assert.match(s.subject, /October 2026/);
  assert.match(s.subject, /Glow Spa/);
  assert.equal(s.to, 'owner@glow.test');
  for (const part of [s.text, s.html]) {
    assert.match(part, /2026-10-05/);
    assert.match(part, /Metabolic/);
    assert.match(part, /654321/);
    assert.match(part, /\$300\.00/);
    assert.match(part, /Payment by the 15th via Stripe\./);
    assert.doesNotMatch(part, /jane|Jane|client\.test/);
  }
});

test('renderStatement escapes the business name in html', () => {
  const s = renderStatement({ ...partner, metadata: { ...partner.metadata, business: '<b>X&Y</b>' } }, [], '2026-10');
  assert.doesNotMatch(s.html, /<b>X/);
});

test('isConnectDisabled recognizes the Stripe signup error only', () => {
  assert.equal(isConnectDisabled({ type: 'StripeInvalidRequestError', message: "You can only create new accounts if you've signed up for Connect, which you can do at https://dashboard.stripe.com/connect." }), true);
  assert.equal(isConnectDisabled({ type: 'StripeInvalidRequestError', message: 'No such account: acct_1' }), false);
  assert.equal(isConnectDisabled(new Error('boom')), false);
});

test('transferParams: amount, destination, description, metadata, idempotency key', () => {
  const { params, opts } = transferParams(partner, 'acct_123', 30000, '2026-10');
  assert.deepEqual(params, { amount: 30000, currency: 'usd', destination: 'acct_123', description: 'Push Patch partner commissions 2026-10 (GLOWSPA)', metadata: { code: 'GLOWSPA', month: '2026-10' } });
  assert.deepEqual(opts, { idempotencyKey: 'GLOWSPA-2026-10' });
});

// --- flows against a fake Stripe ---
const list = (items) => ({ [Symbol.asyncIterator]: async function* () { yield* items; } });
const usd = (c) => `$${(c / 100).toFixed(2)}`;
const fake = (over = {}) => {
  const calls = [];
  return { calls, accounts: { create: async (p) => { calls.push(['accounts.create', p]); return { id: 'acct_1' }; } },
    accountLinks: { create: async (p) => { calls.push(['accountLinks.create', p]); return { url: 'https://connect.stripe.test/x' }; } },
    promotionCodes: { list: () => list([partner]), update: async (id, p) => { calls.push(['promotionCodes.update', id, p]); } },
    transfers: { list: () => list([]), create: async (p, o) => { calls.push(['transfers.create', p, o]); return { id: 'tr_1' }; } },
    checkout: { sessions: { list: () => list([sess('cs_x_abcdef', Date.parse('2026-10-05T15:00:00Z') / 1000, 'push-patch-enhanced-glow')]) } }, ...over };
};
const ctx = (stripe, apply, flags = {}) => ({ stripe, tag: '[t]', apply, usd, die: (m) => { throw new Error(m); }, argv: ['connect-onboard', 'glowspa'], root: new URL('../..', import.meta.url).pathname.replace(/\/$/, ''), flagVal: (n) => flags[n], has: (n) => n in flags });

test('connect-onboard dry run writes nothing; apply creates account, link, saves metadata', async () => {
  const dry = fake(); await runOnboard(ctx(dry, false));
  assert.deepEqual(dry.calls, []);
  const live = fake(); await runOnboard(ctx(live, true));
  assert.deepEqual(live.calls.map((c) => c[0]), ['accounts.create', 'accountLinks.create', 'promotionCodes.update']);
  assert.equal(live.calls[0][1].type, 'express');
  assert.equal(live.calls[1][1].type, 'account_onboarding');
  assert.deepEqual(live.calls[2], ['promotionCodes.update', 'promo_a', { metadata: { connectAccountId: 'acct_1', connectOnboardingUrl: 'https://connect.stripe.test/x' } }]);
});

test('connect-onboard reuses an existing connectAccountId', async () => {
  const s = fake({ promotionCodes: { list: () => list([{ ...partner, metadata: { ...partner.metadata, connectAccountId: 'acct_9' } }]), update: async () => {} } });
  await runOnboard(ctx(s, true));
  assert.deepEqual(s.calls.map((c) => c[0]), ['accountLinks.create']);
  assert.equal(s.calls[0][1].account, 'acct_9');
});

test('connect disabled -> prints the TJ message and exits 3', async () => {
  const exit = mock.method(process, 'exit', (c) => { throw new Error(`exit:${c}`); });
  const err = mock.method(console, 'error', () => {});
  const s = fake({ accounts: { create: async () => { throw Object.assign(new Error("You can only create new accounts if you've signed up for Connect"), { type: 'StripeInvalidRequestError' }); } } });
  await assert.rejects(runOnboard(ctx(s, true)), /exit:3/);
  assert.match(err.mock.calls[0].arguments[0], /Stripe Dashboard → Connect → Get started/);
  exit.mock.restore(); err.mock.restore();
});

test('payouts --pay: skips partners without Connect, transfers with idempotency key when applied', async () => {
  const noConnect = fake(); await runPay(ctx(noConnect, true, { '--month': '2026-10' }));
  assert.deepEqual(noConnect.calls, []);
  const withConnect = fake({ promotionCodes: { list: () => list([{ ...partner, metadata: { ...partner.metadata, connectAccountId: 'acct_9' } }]) } });
  await runPay(ctx(withConnect, false, { '--month': '2026-10' }));
  assert.deepEqual(withConnect.calls, []);
  await runPay(ctx(withConnect, true, { '--month': '2026-10' }));
  assert.equal(withConnect.calls[0][1].amount, 15000);
  assert.deepEqual(withConnect.calls[0][2], { idempotencyKey: 'GLOWSPA-2026-10' });
});

test('payouts --pay skips a month already transferred', async () => {
  const s = fake({ promotionCodes: { list: () => list([{ ...partner, metadata: { ...partner.metadata, connectAccountId: 'acct_9' } }]) }, transfers: { list: () => list([{ metadata: { code: 'GLOWSPA', month: '2026-10' } }]), create: async () => { throw new Error('should not transfer'); } } });
  await runPay(ctx(s, true, { '--month': '2026-10' }));
});
