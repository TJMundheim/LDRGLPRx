// Stripe price ids for non-Push-Patch Rx refills (written by infra/scripts/rx-refill-prices.mjs).
import catalog from './rx-refill-prices.json';
import { glp1PriceId, isGlp1Sku } from './lanes';

export function rxRefillPriceId(product: string, kind: 'once' | 'recurring', mode: 'test' | 'live'): string | undefined {
  if (isGlp1Sku(product)) return glp1PriceId(product, kind, mode); // GLP-1 reorders: prices live in glp1-prices.json
  const table = (catalog as Record<string, Record<string, Record<string, string> | undefined> | undefined>)[mode];
  if (!product || !table || !Object.prototype.hasOwnProperty.call(table, product)) return undefined;
  return table[product]?.[kind] || undefined;
}
