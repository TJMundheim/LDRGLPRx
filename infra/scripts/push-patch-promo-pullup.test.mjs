// node --test infra/scripts/push-patch-promo-pullup.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PULLUP_KEY, ssmName, buildParams, runPullupCoupon } from './push-patch-promo-pullup.mjs';

const existing = { id: 'cpn_x', name: 'Pull-Up Challenge 50% off', metadata: { key: 'pullup-50' } };
const other = { id: 'cpn_o', metadata: { key: 'push-patch-150' } };

const mk = (coupons) => {
  const calls = { create: [], ssm: [] };
  const stripe = {
    coupons: {
      list: () => (async function* () { for (const c of coupons) yield c; })(),
      create: async (p) => { calls.create.push(p); return { id: 'cpn_new', ...p }; },
    },
  };
  const ssm = { send: async (cmd) => { calls.ssm.push(cmd.input); return {}; } };
  return { stripe, ssm, calls };
};
const base = (o, apply, logs) => ({ ...o, mode: 'test', tag: '[t]', apply, products: ['prod_a'], describe: (c) => `D:${c.id}`, log: (m) => logs.push(m), makeSsmCommand: (input) => ({ input }) });

test('ssmName and buildParams', () => {
  assert.equal(PULLUP_KEY, 'pullup-50');
  assert.equal(ssmName('live'), '/my4mlife/pullup/coupon-id-live');
  assert.deepEqual(buildParams(['p1']), { name: 'Pull-Up Challenge 50% off', percent_off: 50, duration: 'once', applies_to: { products: ['p1'] }, metadata: { key: 'pullup-50' } });
});

test('dry run, not found: would create, no writes', async () => {
  const m = mk([other]); const logs = [];
  await runPullupCoupon(base(m, false, logs));
  assert.equal(m.calls.create.length, 0); assert.equal(m.calls.ssm.length, 0);
  const out = logs.join('\n');
  assert.ok(out.includes('would create') && out.includes('percent_off') && out.includes('would write SSM /my4mlife/pullup/coupon-id-test'));
});

test('dry run, found: prints coupon, skips creation, would write SSM', async () => {
  const m = mk([other, existing]); const logs = [];
  await runPullupCoupon(base(m, false, logs));
  const out = logs.join('\n');
  assert.ok(out.includes('D:cpn_x') && out.includes('would write SSM'));
  assert.equal(m.calls.create.length, 0); assert.equal(m.calls.ssm.length, 0);
});

test('apply, not found: creates then writes SSM', async () => {
  const m = mk([]); const logs = [];
  await runPullupCoupon(base(m, true, logs));
  assert.deepEqual(m.calls.create, [buildParams(['prod_a'])]);
  assert.deepEqual(m.calls.ssm, [{ Name: '/my4mlife/pullup/coupon-id-test', Value: 'cpn_new', Type: 'String', Overwrite: true }]);
});

test('apply, found: no create, writes existing id', async () => {
  const m = mk([existing]); const logs = [];
  await runPullupCoupon(base(m, true, logs));
  assert.equal(m.calls.create.length, 0);
  assert.equal(m.calls.ssm[0].Value, 'cpn_x');
});
