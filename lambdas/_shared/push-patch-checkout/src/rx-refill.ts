// Stripe price ids for non-Push-Patch Rx refills (written by infra/scripts/rx-refill-prices.mjs).
import catalog from './rx-refill-prices.json';

export function rxRefillPriceId(product: string, kind: 'once' | 'recurring', mode: 'test' | 'live'): string | undefined {
  const table = (catalog as Record<string, Record<string, Record<string, string> | undefined> | undefined>)[mode];
  if (!product || !table || !Object.prototype.hasOwnProperty.call(table, product)) return undefined;
  return table[product]?.[kind] || undefined;
}
