// Lane registry: `push-patch` (default) and `glp1`. GLP-1 stays dark (entry null -> callers return 503)
// until glp1-prices.json exists (written by infra/scripts/rx-refill-prices-lib.mjs) with the sku's price.
import { pushPatchEntry } from './push-patch';

declare const require: ((id: string) => unknown) | undefined;

export type Lane = 'push-patch' | 'glp1';
export const GLP1_SKUS = ['glp1-sema', 'glp1-tirzep', 'glp1-reta'] as const;
export const GLP1_PRODUCT_NAMES: Record<string, string> = {
  'glp1-sema': 'GLP-1 · Sema (semaglutide)',
  'glp1-tirzep': 'GLP-2 · Tirzep (tirzepatide)',
  'glp1-reta': 'GLP-3 · Reta (retatrutide)',
};
// Shape (same as push-patch-prices.json): one-time ids at top level, 28-day recurring ids under `refill`:
// { test: {sku: id}, live: {sku: id}, refill: { test: {sku: id}, live: {sku: id} } }
export type Glp1Prices = {
  test?: Record<string, string>;
  live?: Record<string, string>;
  refill?: { test?: Record<string, string>; live?: Record<string, string> };
};

export const parseLane = (x: unknown): Lane | null => (x === undefined || x === null || x === 'push-patch' ? 'push-patch' : x === 'glp1' ? 'glp1' : null);
export const isGlp1Sku = (s: string | undefined): boolean => !!s && (GLP1_SKUS as readonly string[]).includes(s);

let override: Glp1Prices | null | undefined;
export const setGlp1PricesForTest = (p: Glp1Prices | null | undefined): void => { override = p; };

function load(): Glp1Prices | null {
  if (override !== undefined) return override;
  try {
    // Bundled by esbuild when the file exists; a missing file throws here and GLP-1 stays dark.
    return (require ? require('./glp1-prices.json') : null) as Glp1Prices | null;
  } catch {
    return null;
  }
}

export function glp1Entry(skuId: string, mode: 'test' | 'live', autoShip: boolean) {
  if (!isGlp1Sku(skuId)) return null;
  const p = load();
  const priceId = autoShip ? p?.refill?.[mode]?.[skuId] : p?.[mode]?.[skuId];
  if (!priceId) return null;
  return {
    priceId,
    mode: (autoShip ? 'subscription' : 'payment') as 'payment' | 'subscription',
    shipping: true,
    successUrl: 'https://www.my4mlife.com/go/glp-1/thank-you',
    cancelUrl: 'https://www.my4mlife.com/go/glp-1',
  };
}

export function laneEntry(lane: Lane, skuId: string, mode: 'test' | 'live', autoShip: boolean) {
  if (lane === 'glp1') return glp1Entry(skuId, mode, autoShip);
  const e = pushPatchEntry(skuId, mode);
  return e ? { ...e, mode: e.mode as 'payment' | 'subscription' } : null;
}
