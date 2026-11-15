import prices from './push-patch-prices.json';

const PUSH_PATCH_SKUS = new Set([
  'push-patch-nad-ghk',
  'push-patch-bpc-nad-ghk',
  'push-patch-kpv-nad-ghk',
  'push-patch-nad-motsc-ghk',
  'push-patch-enhanced-glow',
  'push-patch-wolverine',
  'push-patch-glutathione-ghk',
]);

export type Wear = '12h';

export function isPushPatchSku(skuId: string | undefined): boolean {
  return !!skuId && PUSH_PATCH_SKUS.has(skuId);
}

// Push Patch is 12-hour only; a missing wear defaults to 12h.
export function parseWear(x: unknown): Wear | null {
  return x === undefined || x === null || x === '12h' ? '12h' : null;
}

// Recurring 6-week refill price id (written by stripe-push-patch-prices.mjs --refill).
export function refillPriceId(skuId: string, mode: 'test' | 'live'): string | undefined {
  const refill = (prices as { refill?: Record<string, Record<string, string> | undefined> }).refill;
  return refill?.[mode]?.[skuId] || undefined;
}

export function pushPatchEntry(skuId: string, mode: 'test' | 'live') {
  const table = (prices as unknown as Record<string, Record<string, string> | undefined>)[mode];
  const priceId = table?.[skuId];
  if (!priceId) return null;
  return {
    priceId,
    mode: 'payment' as const,
    shipping: true,
    successUrl: 'https://www.my4mlife.com/go/push-patch/thank-you',
    cancelUrl: 'https://www.my4mlife.com/go/push-patch',
  };
}
