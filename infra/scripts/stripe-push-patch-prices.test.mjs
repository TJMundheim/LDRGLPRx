// node --test infra/scripts/stripe-push-patch-prices.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRefillPriceParams, mergeRefillIds, mergeOneTimeIds, planRefill, refillLookupKey } from './stripe-push-patch-prices-lib.mjs';

test('refill params: recurring 6 weeks, lookup key, metadata', () => {
  assert.deepEqual(buildRefillPriceParams({ skuId: 'push-patch-wolverine', productId: 'prod_1', unitAmount: 65000 }), {
    product: 'prod_1', currency: 'usd', unit_amount: 65000,
    recurring: { interval: 'week', interval_count: 6 },
    lookup_key: 'push-patch-wolverine-6w',
    metadata: { kind: 'push-patch-refill', skuId: 'push-patch-wolverine' },
  });
  assert.equal(refillLookupKey('a'), 'a-6w');
});
test('refill params: transfer flag only on reprice', () => {
  const p = buildRefillPriceParams({ skuId: 's', productId: 'p', unitAmount: 1, transfer: true });
  assert.equal(p.transfer_lookup_key, true);
});
test('mergeRefillIds preserves one-time keys and other refill ids', () => {
  const existing = { test: { a: 'p1' }, live: { a: 'p2' }, refill: { test: { a: 'old', b: 'keep' }, live: {} } };
  const out = mergeRefillIds(existing, { test: { a: 'new' }, live: {} });
  assert.deepEqual(out.test, { a: 'p1' });
  assert.deepEqual(out.live, { a: 'p2' });
  assert.deepEqual(out.refill, { test: { a: 'new', b: 'keep' }, live: {} });
});
test('mergeRefillIds creates refill when absent', () => {
  const out = mergeRefillIds({ test: {}, live: {} }, { test: { a: 'x' } });
  assert.deepEqual(out.refill, { test: { a: 'x' }, live: {} });
});
test('mergeOneTimeIds preserves refill key', () => {
  const out = mergeOneTimeIds({ test: {}, live: {}, refill: { test: { a: 'r' }, live: {} } }, { test: { a: 'p' }, live: {} });
  assert.deepEqual(out.refill, { test: { a: 'r' }, live: {} });
  assert.deepEqual(out.test, { a: 'p' });
});
test('planRefill: create / exists / reprice / skip', () => {
  const oneTime = { unit_amount: 65000 };
  const rec = { interval: 'week', interval_count: 6 };
  assert.equal(planRefill({ oneTime }).action, 'create');
  assert.equal(planRefill({ oneTime, existingRefill: { unit_amount: 65000, recurring: rec } }).action, 'exists');
  assert.equal(planRefill({ oneTime, existingRefill: { unit_amount: 60000, recurring: rec } }).action, 'reprice');
  assert.equal(planRefill({ oneTime: undefined }).action, 'skip');
});
