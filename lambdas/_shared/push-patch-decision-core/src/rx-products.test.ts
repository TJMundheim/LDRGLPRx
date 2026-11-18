import { describe, it, expect } from 'vitest';
import { rxProduct, RX_PRODUCTS, refillIntervalDays } from './rx-products';

describe('rx product catalog', () => {
  it('gut-brain-rx: $125-style manual 30-day product, no ingredient text anywhere', () => {
    expect(RX_PRODUCTS['gut-brain-rx']).toMatchObject({ name: 'Gut-Brain Rx', intervalDays: 30, fulfillment: 'manual',
      lookupKeys: { recurring: 'gut-brain-rx-30d', once: 'gut-brain-rx-once' } });
    expect(JSON.stringify(RX_PRODUCTS)).not.toMatch(/bpc|glutamine|aloe/i);
  });
  it('rxProduct returns undefined for unknown / missing ids', () => {
    expect(rxProduct('gut-brain-rx')?.name).toBe('Gut-Brain Rx');
    expect(rxProduct('nope')).toBeUndefined();
    expect(rxProduct(undefined)).toBeUndefined();
    expect(rxProduct('toString')).toBeUndefined();
  });
  it('refillIntervalDays: absent = 42 (Push Patch)', () => {
    expect(refillIntervalDays({})).toBe(42);
    expect(refillIntervalDays({ intervalDays: 30 })).toBe(30);
  });
});
