import { describe, it, expect } from 'vitest';
import { rxRefillPriceId } from './index.js';
import { setGlp1PricesForTest } from './lanes';
import catalog from './rx-refill-prices.json';

describe('rxRefillPriceId', () => {
  it('undefined for unknown product / kind / empty', () => {
    expect(rxRefillPriceId('nope', 'once', 'test')).toBeUndefined();
    expect(rxRefillPriceId('', 'recurring', 'live')).toBeUndefined();
    expect(rxRefillPriceId('toString', 'once', 'test')).toBeUndefined();
  });
  it('reads ids from the catalog json for every entry', () => {
    const c = catalog as Record<string, Record<string, Record<string, string>>>;
    for (const mode of ['test', 'live'] as const)
      for (const [product, kinds] of Object.entries(c[mode] ?? {}))
        for (const [kind, id] of Object.entries(kinds)) expect(rxRefillPriceId(product, kind as 'once' | 'recurring', mode)).toBe(id);
  });
  it('gut-brain-rx test ids exist after the test-mode price script ran', () => {
    expect(rxRefillPriceId('gut-brain-rx', 'once', 'test')).toMatch(/^price_/);
    expect(rxRefillPriceId('gut-brain-rx', 'recurring', 'test')).toMatch(/^price_/);
  });
});

describe('rxRefillPriceId for GLP-1 (reorder links read glp1-prices.json)', () => {
  it('once = the one-time price, recurring = the 28-day price; undefined while prices are absent', () => {
    setGlp1PricesForTest({ test: { 'glp1-sema': 'price_once' }, refill: { test: { 'glp1-sema': 'price_28d' } } });
    expect(rxRefillPriceId('glp1-sema', 'once', 'test')).toBe('price_once');
    expect(rxRefillPriceId('glp1-sema', 'recurring', 'test')).toBe('price_28d');
    expect(rxRefillPriceId('glp1-sema', 'once', 'live')).toBeUndefined();
    setGlp1PricesForTest(null);
    expect(rxRefillPriceId('glp1-sema', 'once', 'test')).toBeUndefined();
    setGlp1PricesForTest(undefined);
  });
});
