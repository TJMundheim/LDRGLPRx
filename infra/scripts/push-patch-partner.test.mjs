// node --test infra/scripts/push-patch-partner.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePayouts, parseRef, COUPONS, partnerCodeParams } from './push-patch-partner.mjs';

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

const cpt = { id: 'promo_cpt', code: 'CPT', metadata: { partner: 'true', business: 'Colleyville Physical Therapy', commission: '200', clientDiscount: '0' } };
const metaSess = (ref, extra = {}) => ({
  status: 'complete', payment_status: 'paid', amount_total: 25000, discounts: [], metadata: { partnerRef: ref },
  payment_intent: { latest_charge: { amount_refunded: 0 } }, ...extra,
});

test('no-discount partner: metadata-only sessions count at $200 each', () => {
  const rows = summarizePayouts([cpt], [metaSess('CPT'), metaSess('CPT'), metaSess('OTHER')]);
  assert.deepEqual(rows[0], { business: 'Colleyville Physical Therapy', code: 'CPT', orders: 2, gross: 50000, commission: 40000 });
});

test('a discount partner is NOT credited by metadata alone', () => {
  const rows = summarizePayouts(codes, [metaSess('GLOWSPA'), metaSess('IVBAR')]);
  assert.equal(rows.every((r) => r.orders === 0), true);
});

test('no-discount partner: refunded sessions excluded; no double count with discount match', () => {
  const rows = summarizePayouts([cpt], [
    metaSess('CPT', { payment_intent: { latest_charge: { refunded: true, amount_refunded: 25000 } } }),
    metaSess('CPT', { discounts: [{ promotion_code: 'promo_cpt' }] }),
  ]);
  assert.equal(rows[0].orders, 1);
});

test('partnerCodeParams: 50/100 params unchanged (no new keys)', () => {
  assert.deepEqual(partnerCodeParams({ code: 'GLOW', business: 'Glow', email: 'a@b.c', clientDiscount: '50', couponId: 'co_50' }),
    { coupon: 'co_50', code: 'GLOW', metadata: { partner: 'true', business: 'Glow', email: 'a@b.c', commission: '150', clientDiscount: '50' } });
  assert.deepEqual(partnerCodeParams({ code: 'GLOW', business: 'Glow', email: 'a@b.c', clientDiscount: '100', couponId: 'co_100', commission: '120' }),
    { coupon: 'co_100', code: 'GLOW', metadata: { partner: 'true', business: 'Glow', email: 'a@b.c', commission: '120', clientDiscount: '100' } });
});

test('partnerCodeParams: 0 discount is unredeemable, carries link, requires commission', () => {
  const p = partnerCodeParams({ code: 'CPT', business: 'CPT Biz', email: 'a@b.c', clientDiscount: '0', commission: '200', couponId: 'co_50', link: 'https://www.my4mlife.com/cpt' });
  assert.deepEqual(p, {
    coupon: 'co_50', code: 'CPT', restrictions: { minimum_amount: 99999999, minimum_amount_currency: 'usd' },
    metadata: { partner: 'true', business: 'CPT Biz', email: 'a@b.c', commission: '200', clientDiscount: '0', link: 'https://www.my4mlife.com/cpt' },
  });
  assert.equal(partnerCodeParams({ code: 'CPT', business: 'B', email: 'e', clientDiscount: '0', commission: '200', couponId: 'c' }).metadata.link, 'https://www.my4mlife.com/go/push-patch?ref=CPT');
  assert.throws(() => partnerCodeParams({ code: 'CPT', business: 'B', email: 'e', clientDiscount: '0', couponId: 'c' }), /--commission/);
  assert.throws(() => partnerCodeParams({ code: 'CPT', business: 'B', email: 'e', clientDiscount: '0', commission: '0', couponId: 'c' }), /--commission/);
  assert.throws(() => partnerCodeParams({ code: 'CPT', business: 'B', email: 'e', clientDiscount: '0', commission: '2.5', couponId: 'c' }), /--commission/);
  assert.throws(() => partnerCodeParams({ code: 'X', business: 'B', email: 'e', clientDiscount: '25', couponId: 'c' }), /client-discount/);
});
