import { describe, it, expect } from 'vitest';
import prices from './push-patch-prices.json';
import { buildPushPatchSessionParams } from './session-params';

const testPrices = (prices as Record<string, Record<string, string>>).test;
const SKU = 'push-patch-wolverine';
const screenMeta = { screen_v: 'pp-screen-v2', screen_area: 'yes', screen_denied: 'seizures,pacemaker,pregnant', screen_placement: 'woundOrScar:no', screen_at: '2026-10-15T00:00:00.000Z' };
const base = { skuId: SKU, mode: 'test' as const, contactId: 'c_abc', intakeId: 'int_123', screenMeta };

describe('buildPushPatchSessionParams', () => {
  it('returns null for a non-Push-Patch sku or a missing price', () => {
    expect(buildPushPatchSessionParams({ ...base, skuId: 'biome-ns-ultra' })).toBeNull();
    expect(buildPushPatchSessionParams({ ...base, skuId: 'push-patch-nope' })).toBeNull();
  });

  it('uses catalog price, payment mode, shipping, urls', () => {
    const p = buildPushPatchSessionParams(base)!;
    expect(p.mode).toBe('payment');
    expect(p.line_items).toEqual([{ price: testPrices[SKU], quantity: 1 }]);
    expect(p.success_url).toBe(`https://www.my4mlife.com/go/push-patch/thank-you?session_id={CHECKOUT_SESSION_ID}&sku=${SKU}`);
    expect(p.cancel_url).toBe(`https://www.my4mlife.com/go/push-patch?sku=${SKU}`);
    expect(p.shipping_address_collection).toEqual({ allowed_countries: ['US'] });
  });

  it('prefills customer_email and receipt_email when an email is given', () => {
    const p = buildPushPatchSessionParams({ ...base, email: 'a@b.co' })!;
    expect(p.customer_email).toBe('a@b.co');
    expect(p.payment_intent_data).toEqual({ receipt_email: 'a@b.co' });
  });

  it('omits email fields when no email', () => {
    const p = buildPushPatchSessionParams(base)!;
    expect(p.customer_email).toBeUndefined();
    expect(p.payment_intent_data).toBeUndefined();
  });

  it('metadata carries contactId, intakeId, sku, wear, screen_* and isDemo', () => {
    const p = buildPushPatchSessionParams(base)!;
    expect(p.metadata).toMatchObject({ contactId: 'c_abc', intakeId: 'int_123', skuIds: SKU, wear: '12h', ...screenMeta, isDemo: 'true' });
    expect(buildPushPatchSessionParams({ ...base, mode: 'live' })!.metadata.isDemo).toBe('false');
  });

  it('includes firstName and phone in metadata only when given', () => {
    expect(buildPushPatchSessionParams(base)!.metadata).not.toHaveProperty('firstName');
    expect(buildPushPatchSessionParams(base)!.metadata).not.toHaveProperty('phone');
    const p = buildPushPatchSessionParams({ ...base, firstName: 'Sam', phone: '5125550100' })!;
    expect(p.metadata).toMatchObject({ firstName: 'Sam', phone: '5125550100' });
  });

  it('phone collection is on without a phone and off with one', () => {
    expect(buildPushPatchSessionParams(base)!.phone_number_collection).toEqual({ enabled: true });
    expect(buildPushPatchSessionParams({ ...base, phone: '5125550100' })!.phone_number_collection).toBeUndefined();
  });

  it('test price replaces the line item and is flagged in metadata', () => {
    const testPrice = { currency: 'usd' as const, unit_amount: 200 as const, product_data: { name: 'x' } };
    const p = buildPushPatchSessionParams({ ...base, testPrice })!;
    expect(p.line_items).toEqual([{ price_data: testPrice, quantity: 1 }]);
    expect(p.metadata.test_price).toBe('true');
    expect(buildPushPatchSessionParams(base)!.metadata).not.toHaveProperty('test_price');
  });

  it('asks for promotional-email consent only when STRIPE_PROMO_CONSENT=on', () => {
    expect(buildPushPatchSessionParams(base)!).not.toHaveProperty('consent_collection');
    process.env['STRIPE_PROMO_CONSENT'] = 'on';
    try {
      expect(buildPushPatchSessionParams(base)!.consent_collection).toEqual({ promotions: 'auto' });
    } finally {
      delete process.env['STRIPE_PROMO_CONSENT'];
    }
  });

  it('keeps the existing top-level params unchanged (consent_collection off by default)', () => {
    const p = buildPushPatchSessionParams({ ...base, email: 'a@b.co' })!;
    expect(Object.keys(p).sort()).toEqual([
      'cancel_url', 'customer_email', 'line_items', 'metadata', 'mode',
      'payment_intent_data', 'phone_number_collection', 'shipping_address_collection', 'success_url',
    ]);
  });
});
