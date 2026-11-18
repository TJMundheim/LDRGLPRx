// Pure helpers for rx-refill-prices.mjs (tested in rx-refill-prices.test.mjs).
// Mirrors lambdas/_shared/push-patch-decision-core/src/rx-products.ts (names, intervals, lookup keys); the test cross-checks it.
export const RX_PRICES = {
  'gut-brain-rx': { name: 'Gut-Brain Rx', amountCents: 12500, intervalDays: 30, lookupKeys: { recurring: 'gut-brain-rx-30d', once: 'gut-brain-rx-once' } },
};
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
  need(o.rx);
  if (!['test', 'live'].includes(o.mode)) throw new Error('--mode must be test or live');
  return o;
}
