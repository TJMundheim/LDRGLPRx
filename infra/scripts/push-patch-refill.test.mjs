// node --test infra/scripts/push-patch-refill.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { signLink, buildLinkUrl, buildAuth, partnerRefFromSession, grantProblem, parseArgs, RX_PRODUCTS } from './push-patch-refill-lib.mjs';

test('signature matches the lambda sig.ts vector', () => {
  assert.equal(signLink('c1', 'pp-cs_1', 2000000000, 'test-key'), 'df544e2799bddff07ed06d3bdbf5cea1fd08e3250b1073d48810c9f91da3b1c8');
});

test('buildLinkUrl: params, expiry and signature', () => {
  const { url, exp } = buildLinkUrl({ contactId: 'c1', encounterId: 'pp-cs_1', days: 14, key: 'k', now: 1_000_000_000_000 });
  assert.equal(exp, 1_000_000_000 + 14 * 86400);
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, 'https://www.my4mlife.com/reorder');
  assert.equal(u.searchParams.get('c'), 'c1');
  assert.equal(u.searchParams.get('e'), 'pp-cs_1');
  assert.equal(u.searchParams.get('sig'), signLink('c1', 'pp-cs_1', exp, 'k'));
  assert.throws(() => buildLinkUrl({ contactId: 'c', encounterId: 'e', days: 0, key: 'k' }));
});

test('buildAuth: one year, active, optional fields', () => {
  const a = buildAuth({ refills: 8, sku: 's', authorizedBy: 'TJ', partnerRef: 'GLOW', now: new Date('2026-11-15T00:00:00Z') });
  assert.equal(a.expiresAt, '2027-11-15T00:00:00.000Z');
  assert.deepEqual([a.status, a.mode, a.refillsUsed, a.intervalWeeks, a.partnerRef], ['active', 'on-demand', 0, 6, 'GLOW']);
  assert.equal('signedByProviderId' in a, false);
  assert.equal(buildAuth({ refills: 1, sku: 's', authorizedBy: 'x', providerId: 'p' }).signedByProviderId, 'p');
});

test('partnerRefFromSession: metadata wins, then partner promo code', () => {
  assert.equal(partnerRefFromSession({ metadata: { partnerRef: 'AB' } }), 'AB');
  assert.equal(partnerRefFromSession({ discounts: [{ promotion_code: { code: 'GLOW', metadata: { partner: 'true' } } }] }), 'GLOW');
  assert.equal(partnerRefFromSession({ discounts: [{ promotion_code: { code: 'X', metadata: {} } }, { promotion_code: 'promo_1' }] }), undefined);
});

test('grantProblem mirrors grantRefills rules', () => {
  const shipTo = { name: 'A B', line1: '1 A St', city: 'Austin', state: 'TX', postalCode: '78701' };
  assert.equal(grantProblem({ lane: 'push-patch', state: 'script-written', shipTo }), null);
  assert.match(grantProblem({ lane: 'push-patch', state: 'script-written' }), /no shipTo/);
  assert.match(grantProblem(undefined), /not a push-patch/);
  assert.match(grantProblem({ lane: 'push-patch', state: 'sent-to-provider' }), /not script-written/);
  assert.match(grantProblem({ lane: 'push-patch', state: 'script-written', refundStatus: 'refunded' }), /refund/);
});

test('parseArgs', () => {
  const o = parseArgs(['grant', '--contact', 'c', '--encounter', 'e', '--refills', '8', '--authorized-by', 'TJ', '--apply']);
  assert.equal(o.apply, true); assert.equal(o.mode, 'test'); assert.equal(o.flags.refills, 8);
  assert.throws(() => parseArgs(['grant', '--contact', 'c']), /required/);
  assert.throws(() => parseArgs(['grant', '--contact', 'c', '--encounter', 'e', '--refills', '0', '--authorized-by', 'x']), /refills/);
  assert.throws(() => parseArgs(['link', '--contact', 'c', '--encounter', 'e', '--mode', 'prod']), /mode/);
  assert.equal(parseArgs(['link', '--contact', 'c', '--encounter', 'e', '--days', '7']).flags.days, '7');
  assert.throws(() => parseArgs(['nope']), /usage/);
});

test('buildAuth with --product: manual fulfillment, catalog interval, sku = product id, no intervalWeeks; Push Patch auth unchanged', () => {
  const now = new Date('2026-11-18T00:00:00Z');
  const a = buildAuth({ refills: 2, authorizedBy: 'Dr TJ', product: 'gut-brain-rx', now });
  assert.deepEqual(a, { refillsAuthorized: 2, refillsUsed: 0, sku: 'gut-brain-rx', product: 'gut-brain-rx', fulfillment: 'manual', intervalDays: 30,
    expiresAt: '2027-11-18T00:00:00.000Z', authorizedBy: 'Dr TJ', authorizedAt: now.toISOString(), mode: 'on-demand', status: 'active' });
  const pp = buildAuth({ refills: 8, sku: 's', authorizedBy: 'TJ', now });
  for (const k of ['fulfillment', 'product', 'intervalDays']) assert.equal(k in pp, false);
  assert.equal(pp.intervalWeeks, 6);
  assert.throws(() => buildAuth({ refills: 2, authorizedBy: 'x', product: 'nope', now }), /unknown product/);
});

test('catalog mirrors decision-core rx-products.ts', async () => {
  const { readFileSync } = await import('node:fs');
  const ts = readFileSync(new URL('../../lambdas/_shared/push-patch-decision-core/src/rx-products.ts', import.meta.url), 'utf8');
  assert.ok(ts.includes(RX_PRODUCTS['gut-brain-rx'].name) && ts.includes('intervalDays: 30'));
});

test('grantProblem for a manual product: any non-push-patch lane, fulfilled or script-written, no refund, shipTo not required', () => {
  const p = 'gut-brain-rx';
  assert.equal(grantProblem({ lane: 'leaky-gut', state: 'fulfilled' }, p), null);
  assert.equal(grantProblem({ lane: 'leaky-gut', state: 'script-written' }, p), null);
  assert.match(grantProblem({ lane: 'leaky-gut', state: 'sent-to-provider' }, p), /not fulfilled or script-written/);
  assert.match(grantProblem({ lane: 'leaky-gut', state: 'fulfilled', refundStatus: 'refunded' }, p), /refund/);
  assert.match(grantProblem({ lane: 'push-patch', state: 'script-written' }, p), /push-patch/);
  assert.match(grantProblem(undefined, p), /not found|not an eligible/);
  assert.match(grantProblem({ lane: 'leaky-gut', state: 'fulfilled' }, 'nope'), /unknown product/);
});

test('grantProblem without a product is unchanged for fulfilled non-push-patch encounters', () => {
  assert.match(grantProblem({ lane: 'leaky-gut', state: 'fulfilled' }), /not a push-patch/);
});

test('parseArgs: --product accepted on grant, refuses unknown, ignored need for provider-id', () => {
  const o = parseArgs(['grant', '--contact', 'c', '--encounter', 'e', '--refills', '2', '--product', 'gut-brain-rx', '--authorized-by', 'Dr TJ', '--expires', '2027-06-30']);
  assert.equal(o.flags.product, 'gut-brain-rx'); assert.equal(o.flags.expires, '2027-06-30');
  assert.throws(() => parseArgs(['grant', '--contact', 'c', '--encounter', 'e', '--refills', '2', '--product', 'nope', '--authorized-by', 'x']), /unknown product/);
  assert.throws(() => parseArgs(['grant', '--contact', 'c', '--encounter', 'e', '--refills', '2', '--authorized-by', 'x', '--expires', 'soon']), /expires/);
  assert.throws(() => parseArgs(['link', '--contact', 'c', '--encounter', 'e', '--product', 'gut-brain-rx']), /product/);
});

test('buildAuth --expires overrides the one-year default', () => {
  const a = buildAuth({ refills: 2, authorizedBy: 'x', product: 'gut-brain-rx', expires: '2027-06-30', now: new Date('2026-11-18T00:00:00Z') });
  assert.equal(a.expiresAt, '2027-06-30T23:59:59.000Z');
});
