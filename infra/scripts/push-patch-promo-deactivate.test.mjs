// node --test infra/scripts/push-patch-promo-deactivate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchActive, reportLines, runDeactivate } from './push-patch-promo-deactivate.mjs';

const promo = (o = {}) => ({ id: 'promo_1', code: 'YEAREND', active: true, times_redeemed: 3, expires_at: null, coupon: { id: 'cpn_1', name: 'Push Patch $150 off' }, ...o });
const fmt = (t) => (t ? `T${t}` : '-');

test('matchActive: case-insensitive, active only', () => {
  const rows = [promo(), promo({ id: 'promo_2', code: 'yearend' }), promo({ id: 'promo_3', active: false }), promo({ id: 'promo_4', code: 'OTHER' })];
  assert.deepEqual(matchActive(rows, 'yearEnd').map((p) => p.id), ['promo_1', 'promo_2']);
  assert.deepEqual(matchActive(rows, 'NOPE'), []);
});

test('reportLines: code, ids, coupon name, redeemed, expires', () => {
  const [l] = reportLines([promo({ expires_at: 5 })], fmt);
  for (const s of ['YEAREND', 'promo_1', 'cpn_1', 'Push Patch $150 off', 'redeemed=3', 'expires=T5']) assert.ok(l.includes(s), s);
});

const mk = (data) => {
  const calls = { list: [], update: [] };
  const stripe = { promotionCodes: {
    list: (a) => { calls.list.push(a); return { data }; },
    update: async (id, p) => { calls.update.push([id, p]); return { ...promo({ id }), ...p }; },
  } };
  return { stripe, calls };
};
const ctx = (stripe, apply, logs) => ({ stripe, tag: '[t]', apply, fmt, log: (m) => logs.push(m) });

test('dry run: lists, does not update', async () => {
  const { stripe, calls } = mk([promo()]); const logs = [];
  assert.equal(await runDeactivate({ ...ctx(stripe, false, logs), word: 'yearend' }), 0);
  assert.deepEqual(calls.list[0], { code: 'yearend', active: true, limit: 100 });
  assert.equal(calls.update.length, 0);
  assert.ok(logs.join('\n').includes('would deactivate'));
});

test('apply: updates active:false only', async () => {
  const { stripe, calls } = mk([promo()]); const logs = [];
  assert.equal(await runDeactivate({ ...ctx(stripe, true, logs), word: 'YEAREND' }), 0);
  assert.deepEqual(calls.update, [['promo_1', { active: false }]]);
  assert.ok(logs.join('\n').includes('active=false'));
});

test('no match: exit 1 with message, no update', async () => {
  const { stripe, calls } = mk([]); const errs = [];
  assert.equal(await runDeactivate({ ...ctx(stripe, true, []), word: 'YEAREND', err: (m) => errs.push(m) }), 1);
  assert.equal(calls.update.length, 0);
  assert.ok(errs[0].includes('No active promotion code'));
});
