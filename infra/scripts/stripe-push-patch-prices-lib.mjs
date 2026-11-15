// Pure helpers for stripe-push-patch-prices.mjs (no Stripe/AWS imports; unit-tested).

export const REFILL_INTERVAL = { interval: 'week', interval_count: 6 };
export const refillLookupKey = (skuId) => `${skuId}-6w`;

// Params for stripe.prices.create of the recurring 6-week refill price.
export function buildRefillPriceParams({ skuId, productId, unitAmount, transfer = false }) {
  const p = {
    product: productId,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { ...REFILL_INTERVAL },
    lookup_key: refillLookupKey(skuId),
    metadata: { kind: 'push-patch-refill', skuId },
  };
  if (transfer) p.transfer_lookup_key = true;
  return p;
}

// Merge ids into the prices JSON: test/live one-time keys are untouched; only `refill` is replaced per mode.
export function mergeRefillIds(existing, refillResult) {
  const prev = existing.refill ?? {};
  const refill = { test: { ...(prev.test ?? {}) }, live: { ...(prev.live ?? {}) } };
  for (const mode of ['test', 'live']) Object.assign(refill[mode], refillResult[mode] ?? {});
  return { ...existing, refill };
}

// Merge one-time ids, preserving any other top-level key (e.g. `refill`).
export function mergeOneTimeIds(existing, result) {
  return { ...existing, test: result.test, live: result.live };
}

// Decide what to do for a SKU's refill price. existingRefill: Stripe price or undefined.
export function planRefill({ oneTime, existingRefill }) {
  if (!oneTime) return { action: 'skip', reason: 'no one-time price' };
  const amount = oneTime.unit_amount;
  if (!existingRefill) return { action: 'create', amount };
  const same = existingRefill.unit_amount === amount
    && existingRefill.recurring?.interval === REFILL_INTERVAL.interval
    && existingRefill.recurring?.interval_count === REFILL_INTERVAL.interval_count;
  return same ? { action: 'exists', amount } : { action: 'reprice', amount };
}
