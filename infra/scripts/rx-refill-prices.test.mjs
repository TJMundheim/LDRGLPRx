// node --test infra/scripts/rx-refill-prices.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RX_PRICES, productParams, priceParams, planPrice, mergeRxIds, parseRxArgs } from './rx-refill-prices-lib.mjs';

const g = RX_PRICES['gut-brain-rx'];

test('catalog matches decision-core rx-products.ts (lookup keys, interval, name) and carries no ingredients', () => {
  const ts = readFileSync(new URL('../../lambdas/_shared/push-patch-decision-core/src/rx-products.ts', import.meta.url), 'utf8');
  for (const s of [g.name, g.lookupKeys.once, g.lookupKeys.recurring, `intervalDays: ${g.intervalDays}`]) assert.ok(ts.includes(s), s);
  assert.equal(g.amountCents, 12500);
  assert.doesNotMatch(JSON.stringify(RX_PRICES), /bpc|glutamine|aloe/i);
});

test('productParams: name + metadata kind rx-refill', () => {
  assert.deepEqual(productParams('gut-brain-rx'), { name: 'Gut-Brain Rx', metadata: { kind: 'rx-refill', product: 'gut-brain-rx' } });
});

test('priceParams: one-time $125 and recurring every 30 days', () => {
  const once = priceParams('gut-brain-rx', 'once', 'prod_1');
  assert.deepEqual([once.unit_amount, once.lookup_key, once.recurring, once.product, once.currency], [12500, 'gut-brain-rx-once', undefined, 'prod_1', 'usd']);
  const rec = priceParams('gut-brain-rx', 'recurring', 'prod_1');
  assert.deepEqual(rec.recurring, { interval: 'day', interval_count: 30 });
  assert.equal(rec.lookup_key, 'gut-brain-rx-30d');
  assert.equal(rec.unit_amount, 12500);
  assert.deepEqual(rec.metadata, { kind: 'rx-refill', product: 'gut-brain-rx' });
  assert.equal(priceParams('gut-brain-rx', 'once', 'p', true).transfer_lookup_key, true);
  assert.throws(() => priceParams('nope', 'once', 'p'));
});

test('planPrice: create / exists / reprice', () => {
  assert.equal(planPrice('gut-brain-rx', 'once', undefined).action, 'create');
  assert.equal(planPrice('gut-brain-rx', 'once', { unit_amount: 12500 }).action, 'exists');
  assert.equal(planPrice('gut-brain-rx', 'once', { unit_amount: 9900 }).action, 'reprice');
  assert.equal(planPrice('gut-brain-rx', 'recurring', { unit_amount: 12500, recurring: { interval: 'day', interval_count: 30 } }).action, 'exists');
  assert.equal(planPrice('gut-brain-rx', 'recurring', { unit_amount: 12500, recurring: { interval: 'week', interval_count: 4 } }).action, 'reprice');
  assert.equal(planPrice('gut-brain-rx', 'once', { unit_amount: 12500, recurring: { interval: 'day', interval_count: 30 } }).action, 'reprice');
});

test('mergeRxIds keeps other modes/products', () => {
  const m = mergeRxIds({ test: { other: { once: 'a' } }, live: {} }, 'test', 'gut-brain-rx', { once: 'p1', recurring: 'p2' });
  assert.deepEqual(m, { test: { other: { once: 'a' }, 'gut-brain-rx': { once: 'p1', recurring: 'p2' } }, live: {} });
});

test('parseRxArgs: dry run default, --rx required known, mode test|live', () => {
  assert.deepEqual(parseRxArgs(['--rx', 'gut-brain-rx']), { rx: 'gut-brain-rx', apply: false, mode: 'test' });
  assert.deepEqual(parseRxArgs(['--rx', 'gut-brain-rx', '--apply', '--mode', 'live']), { rx: 'gut-brain-rx', apply: true, mode: 'live' });
  assert.throws(() => parseRxArgs([]), /--rx/);
  assert.throws(() => parseRxArgs(['--rx', 'nope']), /unknown/);
  assert.throws(() => parseRxArgs(['--rx', 'gut-brain-rx', '--mode', 'prod']), /mode/);
  assert.throws(() => parseRxArgs(['--rx', 'gut-brain-rx', '--apply', '--dry-run']), /only one/i);
});

// ---- GLP-1 ----
import { GLP1_SKUS, rxTargets, mergeGlp1Ids } from './rx-refill-prices-lib.mjs';

test('GLP-1 catalog: 3 SKUs, $375 one-time + $375 every 28 days, keys from sku id', () => {
  assert.deepEqual(GLP1_SKUS, ['glp1-sema', 'glp1-tirzep', 'glp1-reta']);
  const names = ['GLP-1 · Sema (semaglutide), 1 month', 'GLP-2 · Tirzep (tirzepatide), 1 month', 'GLP-3 · Reta (retatrutide), 1 month'];
  GLP1_SKUS.forEach((id, i) => {
    const c = RX_PRICES[id];
    assert.equal(c.name, names[i]);
    assert.equal(c.amountCents, 37500);
    assert.equal(c.intervalDays, 28);
    assert.deepEqual(c.lookupKeys, { once: `${id}-once`, recurring: `${id}-28d` });
    assert.deepEqual(priceParams(id, 'once', 'p').recurring, undefined);
    assert.deepEqual(priceParams(id, 'recurring', 'p').recurring, { interval: 'day', interval_count: 28 });
    assert.equal(priceParams(id, 'recurring', 'p').unit_amount, 37500);
    assert.equal(planPrice(id, 'recurring', { unit_amount: 37500, recurring: { interval: 'day', interval_count: 28 } }).action, 'exists');
  });
});

test('rxTargets: glp1 expands to 3 skus (6 prices); single ids pass through', () => {
  assert.deepEqual(rxTargets('glp1'), GLP1_SKUS);
  assert.deepEqual(rxTargets('gut-brain-rx'), ['gut-brain-rx']);
  assert.equal(parseRxArgs(['--rx', 'glp1']).rx, 'glp1');
});

test('mergeGlp1Ids: Push Patch shape {test,live,refill:{test,live}}, keeps other entries', () => {
  let m = mergeGlp1Ids({}, 'test', 'glp1-sema', { once: 'o1', recurring: 'r1' });
  assert.deepEqual(m, { test: { 'glp1-sema': 'o1' }, live: {}, refill: { test: { 'glp1-sema': 'r1' }, live: {} } });
  m = mergeGlp1Ids(m, 'live', 'glp1-reta', { once: 'o3', recurring: 'r3' });
  m = mergeGlp1Ids(m, 'test', 'glp1-tirzep', { once: 'o2', recurring: 'r2' });
  assert.deepEqual(m.test, { 'glp1-sema': 'o1', 'glp1-tirzep': 'o2' });
  assert.deepEqual(m.refill.live, { 'glp1-reta': 'r3' });
  assert.deepEqual(mergeGlp1Ids(m, 'test', 'glp1-sema', { once: 'o1' }).refill.test['glp1-sema'], 'r1');
});
