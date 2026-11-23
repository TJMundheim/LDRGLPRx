// Non-Push-Patch prescriptions that refill through the "manual pharmacy" lane (TJ places the pharmacy order by hand).
// Patient-facing names only: never put ingredients/formulas in this catalog or in any email or log.
export interface RxProduct { name: string; intervalDays: number; fulfillment: 'manual'; lookupKeys: { recurring: string; once: string } }

export const RX_PRODUCTS: Record<string, RxProduct> = {
  'gut-brain-rx': { name: 'Gut-Brain Rx', intervalDays: 30, fulfillment: 'manual', lookupKeys: { recurring: 'gut-brain-rx-30d', once: 'gut-brain-rx-once' } },
  'glp1-sema': { name: 'GLP-1 · Sema (semaglutide)', intervalDays: 28, fulfillment: 'manual', lookupKeys: { recurring: 'glp1-sema-28d', once: 'glp1-sema-once' } },
  'glp1-tirzep': { name: 'GLP-2 · Tirzep (tirzepatide)', intervalDays: 28, fulfillment: 'manual', lookupKeys: { recurring: 'glp1-tirzep-28d', once: 'glp1-tirzep-once' } },
  'glp1-reta': { name: 'GLP-3 · Reta', intervalDays: 28, fulfillment: 'manual', lookupKeys: { recurring: 'glp1-reta-28d', once: 'glp1-reta-once' } },
};

export const rxProduct = (id: string | undefined): RxProduct | undefined =>
  id && Object.prototype.hasOwnProperty.call(RX_PRODUCTS, id) ? RX_PRODUCTS[id] : undefined;

/** Days between fills: the auth's own interval, 42 (six weeks) for Push Patch. */
export const refillIntervalDays = (a: { intervalDays?: number }): number => a.intervalDays ?? 42;
