import { describe, it, expect } from 'vitest';
import { refillPriceId, pushPatchEntry } from './index.js';
import prices from './push-patch-prices.json';

describe('refillPriceId', () => {
  it('returns undefined when the refill key or sku is missing', () => {
    expect(refillPriceId('push-patch-nonexistent', 'test')).toBeUndefined();
    expect(refillPriceId('', 'live')).toBeUndefined();
  });
  it('reads ids from the refill table when present', () => {
    const p = prices as { refill?: Record<string, Record<string, string>> };
    const tbl = p.refill?.test ?? {};
    for (const [sku, id] of Object.entries(tbl)) expect(refillPriceId(sku, 'test')).toBe(id);
  });
  it('pushPatchEntry is unaffected by refill ids', () => {
    const e = pushPatchEntry('push-patch-wolverine', 'test');
    expect(e?.mode).toBe('payment');
    expect(e?.priceId).toBe((prices as any).test['push-patch-wolverine']);
  });
});
