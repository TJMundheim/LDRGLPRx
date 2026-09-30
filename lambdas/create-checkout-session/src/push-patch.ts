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

export type Wear = '12h' | '14h';

export function isPushPatchSku(skuId: string | undefined): boolean {
  return !!skuId && PUSH_PATCH_SKUS.has(skuId);
}

export function parseWear(x: unknown): Wear | null {
  return x === '12h' || x === '14h' ? x : null;
}

export function pushPatchEntry(skuId: string, mode: 'test' | 'live') {
  const table = (prices as Record<string, Record<string, string> | undefined>)[mode];
  const priceId = table?.[skuId];
  if (!priceId) return null;
  return {
    priceId,
    mode: 'payment' as const,
    shipping: true,
    successUrl: 'https://www.my4mlife.com/thank-you',
    cancelUrl: 'https://www.my4mlife.com/go/push-patch',
  };
}
