import { describe, it, expect } from 'vitest';
import { rxRefillPriceId } from './index.js';
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
