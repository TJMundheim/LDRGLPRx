// Pure helpers for rx-refill-prices.mjs (tested in rx-refill-prices.test.mjs).
// Mirrors lambdas/_shared/push-patch-decision-core/src/rx-products.ts (names, intervals, lookup keys); the test cross-checks it.
export const RX_PRICES = {
  'gut-brain-rx': { name: 'Gut-Brain Rx', amountCents: 12500, intervalDays: 30, lookupKeys: { recurring: 'gut-brain-rx-30d', once: 'gut-brain-rx-once' } },
};
export const GLP1_SKUS = ['glp1-sema', 'glp1-tirzep', 'glp1-reta'];
// One-time $375 + $375 every 28 days per product. Written to glp1-prices.json (Push Patch shape), not rx-refill-prices.json.
for (const [id, name] of [['glp1-sema', 'GLP-1 · Sema (semaglutide), 1 month'], ['glp1-tirzep', 'GLP-2 · Tirzep (tirzepatide), 1 month'], ['glp1-reta', 'GLP-3 · Reta (retatrutide), 1 month']]) {
  RX_PRICES[id] = { name, amountCents: 37500, intervalDays: 28, lookupKeys: { recurring: `${id}-28d`, once: `${id}-once` } };
}
/** --rx value -> product ids to ensure ('glp1' = all three). */
export const rxTargets = (rx) => (rx === 'glp1' ? [...GLP1_SKUS] : [rx]);
const need = (id) => { const p = Object.hasOwn(RX_PRICES, id) ? RX_PRICES[id] : undefined; if (!p) throw new Error(`unknown rx product ${id}`); return p; };
const meta = (id) => ({ kind: 'rx-refill', product: id });

export const productParams = (id) => ({ name: need(id).name, metadata: meta(id) });

export function priceParams(id, kind, productId, transfer = false) {
  const p = need(id);
  const o = { product: productId, currency: 'usd', unit_amount: p.amountCents, lookup_key: p.lookupKeys[kind], metadata: meta(id) };
  if (kind === 'recurring') o.recurring = { interval: 'day', interval_count: p.intervalDays };
  if (transfer) o.transfer_lookup_key = true;
  return o;
}

/** existing: Stripe price (found by lookup key) or undefined. */
export function planPrice(id, kind, existing) {
  const p = need(id);
  if (!existing) return { action: 'create' };
  const rec = existing.recurring;
  const same = existing.unit_amount === p.amountCents && (kind === 'once'
    ? !rec : rec?.interval === 'day' && rec?.interval_count === p.intervalDays);
  return { action: same ? 'exists' : 'reprice' };
}

export function mergeRxIds(existing, mode, product, ids) {
  const out = { test: { ...(existing.test ?? {}) }, live: { ...(existing.live ?? {}) } };
  out[mode][product] = { ...(out[mode][product] ?? {}), ...ids };
  return out;
}

/** Push Patch prices-file shape: {test:{sku:once}, live:{...}, refill:{test:{sku:recurring}, live:{...}}}. */
export function mergeGlp1Ids(existing, mode, sku, ids) {
  const out = { test: { ...(existing.test ?? {}) }, live: { ...(existing.live ?? {}) }, refill: { test: { ...(existing.refill?.test ?? {}) }, live: { ...(existing.refill?.live ?? {}) } } };
  if (ids.once) out[mode][sku] = ids.once;
  if (ids.recurring) out.refill[mode][sku] = ids.recurring;
  return out;
}

export function parseRxArgs(argv) {
  const o = { rx: undefined, apply: false, mode: 'test' };
  let dry = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--dry-run') dry = true;
    else if (a === '--rx' || a === '--mode') { const v = argv[++i]; if (!v || v.startsWith('--')) throw new Error(`${a} needs a value`); if (a === '--rx') o.rx = v; else o.mode = v; }
    else throw new Error(`unexpected argument ${a}`);
  }
  if (o.apply && dry) throw new Error('pass only one of --dry-run / --apply');
  if (!o.rx) throw new Error('--rx <product> is required');
  rxTargets(o.rx).forEach(need);
  if (!['test', 'live'].includes(o.mode)) throw new Error('--mode must be test or live');
  return o;
}
