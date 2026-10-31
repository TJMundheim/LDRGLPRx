// node --test infra/scripts/push-patch-partner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePayouts, parseRef, COUPONS } from './push-patch-partner.mjs';

const codes = [
  { id: 'promo_a', code: 'GLOWSPA', metadata: { partner: 'true', business: 'Glow Spa', commission: '100' } },
  { id: 'promo_b', code: 'IVBAR', metadata: { partner: 'true', business: 'IV Bar', commission: '75' } },
];
const sess = (promo, total, charge, extra = {}) => ({
  status: 'complete', payment_status: 'paid', amount_total: total, discounts: [{ promotion_code: promo }],
  payment_intent: { latest_charge: charge }, ...extra,
});

test('counts paid orders, sums gross collected, commission = orders x commission', () => {
  const rows = summarizePayouts(codes, [sess('promo_a', 20000, { amount_refunded: 0 }), sess('promo_a', 15000, { amount_refunded: 0 }), sess('promo_b', 9000, null)]);
  assert.deepEqual(rows.find((r) => r.code === 'GLOWSPA'), { business: 'Glow Spa', code: 'GLOWSPA', orders: 2, gross: 35000, commission: 20000 });
  assert.deepEqual(rows.find((r) => r.code === 'IVBAR'), { business: 'IV Bar', code: 'IVBAR', orders: 1, gross: 9000, commission: 7500 });
});

test('excludes fully refunded charges and unpaid / non-partner sessions', () => {
  const rows = summarizePayouts(codes, [
    sess('promo_a', 20000, { refunded: true, amount_refunded: 20000 }),
    sess('promo_a', 20000, { amount_refunded: 20000 }),
    sess('promo_a', 20000, { amount_refunded: 0 }, { payment_status: 'unpaid' }),
    sess('promo_zzz', 20000, { amount_refunded: 0 }),
    sess('promo_a', 20000, { amount_refunded: 5000 }),
  ]);
  assert.equal(rows.find((r) => r.code === 'GLOWSPA').orders, 1);
});

test('a partner with no orders still appears with zeros; promotion_code may be an object', () => {
  const rows = summarizePayouts(codes, [sess({ id: 'promo_a' }, 100, null)]);
  assert.equal(rows.find((r) => r.code === 'IVBAR').orders, 0);
  assert.equal(rows.find((r) => r.code === 'GLOWSPA').orders, 1);
});

test('coupon definitions and arg parsing', () => {
  assert.deepEqual(COUPONS.map((c) => [c.key, c.cents]), [['push-patch-partner-50', 5000], ['push-patch-partner-100', 10000]]);
  assert.equal(parseRef(' glow-spa '), 'GLOW-SPA');
  assert.equal(parseRef('x y'), undefined);
});
