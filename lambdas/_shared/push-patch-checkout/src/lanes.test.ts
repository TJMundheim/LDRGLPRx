import { describe, it, expect, afterEach } from 'vitest';
import { laneEntry, glp1Entry, isGlp1Sku, parseLane, setGlp1PricesForTest, GLP1_SKUS, GLP1_PRODUCT_NAMES } from './lanes';
import { buildLaneSessionParams } from './session-params';

const prices = {
  test: { 'glp1-sema': 'price_o_sema', 'glp1-tirzep': 'price_o_tirz', 'glp1-reta': 'price_o_reta' },
  live: {},
  refill: { test: { 'glp1-sema': 'price_r_sema', 'glp1-tirzep': 'price_r_tirz' }, live: {} },
};
const screenMeta = { screen_v: 'glp1-screen-v1', screen_denied: 'pancreatitis' };
const base = { lane: 'glp1' as const, skuId: 'glp1-sema', mode: 'test' as const, contactId: 'c1', intakeId: 'i1', screenMeta };

afterEach(() => setGlp1PricesForTest(undefined));

describe('lane registry', () => {
  it('parseLane defaults to push-patch', () => {
    expect(parseLane(undefined)).toBe('push-patch');
    expect(parseLane('push-patch')).toBe('push-patch');
    expect(parseLane('glp1')).toBe('glp1');
    expect(parseLane('bogus')).toBeNull();
  });
  it('sku helpers', () => {
    expect(GLP1_SKUS).toEqual(['glp1-sema', 'glp1-tirzep', 'glp1-reta']);
    expect(isGlp1Sku('glp1-reta')).toBe(true);
    expect(isGlp1Sku('push-patch-wolverine')).toBe(false);
    expect(GLP1_PRODUCT_NAMES['glp1-sema']).toMatch(/Sema/);
  });
  it('no product display name contains retatrutide', () => {
    for (const n of Object.values(GLP1_PRODUCT_NAMES)) expect(n).not.toMatch(/retatrutide/i);
    expect(GLP1_PRODUCT_NAMES['glp1-reta']).toBe('GLP-3 · Reta');
  });
  it('glp1 is dark (null) when prices are missing', () => {
    setGlp1PricesForTest(null);
    expect(glp1Entry('glp1-sema', 'test', false)).toBeNull();
    expect(laneEntry('glp1', 'glp1-sema', 'test', false)).toBeNull();
  });
  it('price file absent -> null (GLP-1 dark)', () => {
    setGlp1PricesForTest(null);
    expect(glp1Entry('glp1-sema', 'test', false)).toBeNull();
  });
  it('resolves once / recurring prices', () => {
    setGlp1PricesForTest(prices);
    expect(glp1Entry('glp1-sema', 'test', false)).toMatchObject({ priceId: 'price_o_sema', mode: 'payment' });
    expect(glp1Entry('glp1-sema', 'test', true)).toMatchObject({ priceId: 'price_r_sema', mode: 'subscription' });
    expect(glp1Entry('glp1-reta', 'test', true)).toBeNull(); // missing recurring
    expect(glp1Entry('glp1-sema', 'live', false)).toBeNull();
    expect(glp1Entry('glp1-nope', 'test', false)).toBeNull();
  });
  it('push-patch lane still resolves', () => {
    expect(laneEntry('push-patch', 'push-patch-wolverine', 'test', false)).toMatchObject({ mode: 'payment' });
  });
});

describe('buildLaneSessionParams glp1', () => {
  it('null when dark', () => {
    setGlp1PricesForTest(null);
    expect(buildLaneSessionParams(base)).toBeNull();
  });
  it('payment mode one-time', () => {
    setGlp1PricesForTest(prices);
    const p = buildLaneSessionParams(base)!;
    expect(p.mode).toBe('payment');
    expect(p.line_items).toEqual([{ price: 'price_o_sema', quantity: 1 }]);
    expect(p.success_url).toBe('https://www.my4mlife.com/go/glp-1/thank-you?session_id={CHECKOUT_SESSION_ID}&sku=glp1-sema');
    expect(p.cancel_url).toBe('https://www.my4mlife.com/go/glp-1?sku=glp1-sema');
    expect(p.metadata).toMatchObject({ lane: 'glp1', skuIds: 'glp1-sema', contactId: 'c1', isDemo: 'true', autoShip: 'false' });
    expect(p.metadata).not.toHaveProperty('wear');
    expect(p.shipping_address_collection).toEqual({ allowed_countries: ['US'] });
  });
  it('autoShip -> subscription mode, recurring price', () => {
    setGlp1PricesForTest(prices);
    const p = buildLaneSessionParams({ ...base, autoShip: true, email: 'a@b.co' })!;
    expect(p.mode).toBe('subscription');
    expect(p.line_items).toEqual([{ price: 'price_r_sema', quantity: 1 }]);
    expect(p.metadata.autoShip).toBe('true');
    expect(p.customer_email).toBe('a@b.co');
    expect(p.payment_intent_data).toBeUndefined();
  });
  it('promo codes, partner and discounts skipped', () => {
    setGlp1PricesForTest(prices);
    process.env['STRIPE_PROMO_CODES'] = 'on';
    const p = buildLaneSessionParams({ ...base, promotionCodeId: 'promo_1', partnerRef: 'x' })!;
    delete process.env['STRIPE_PROMO_CODES'];
    expect(p.allow_promotion_codes).toBeUndefined();
    expect(p.discounts).toBeUndefined();
    expect(p.metadata).not.toHaveProperty('partnerRef');
  });
  it('push-patch lane default unchanged (no lane metadata)', () => {
    const p = buildLaneSessionParams({ ...base, lane: undefined, skuId: 'push-patch-wolverine' })!;
    expect(p.metadata.wear).toBe('12h');
    expect(p.metadata).not.toHaveProperty('lane');
  });
});
