// node --test infra/scripts/push-patch-promo-coupon.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { couponProblem } from './push-patch-promo-coupon.mjs';

test('couponProblem: valid coupon -> null', () => {
  assert.equal(couponProblem({ id: 'c1', valid: true }), null);
});
test('couponProblem: missing coupon', () => {
  assert.match(couponProblem(undefined, 'c1'), /c1.*not found/);
});
test('couponProblem: invalid (expired/maxed) coupon', () => {
  assert.match(couponProblem({ id: 'c1', valid: false }), /c1.*not valid/);
});
