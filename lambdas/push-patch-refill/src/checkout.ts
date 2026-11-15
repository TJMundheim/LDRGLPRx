import { getStripeClient } from '@my4mlife/stripe-client';
import { pushPatchEntry, refillPriceId } from '@my4mlife/push-patch-checkout';

export type Mode = 'auto' | 'one';
export const stripeMode = (): 'test' | 'live' => (process.env.STRIPE_MODE === 'live' ? 'live' : 'test');
const base = () => process.env.REFILL_BASE_URL ?? 'https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/push-patch-refill';
const priceFor = (sku: string, mode: Mode): string | undefined =>
  mode === 'auto' ? refillPriceId(sku, stripeMode()) : pushPatchEntry(sku, stripeMode())?.priceId;

export interface Input { contactId: string; encounterId: string; sku: string; email: string; partnerRef?: string; mode: Mode }

/** Stripe Checkout params. Ship-to comes from the parent encounter, so no address collection. Null if the price is not configured. */
export function buildParams(i: Input): Record<string, unknown> | null {
  const price = priceFor(i.sku, i.mode);
  if (!price) return null;
  const metadata = { kind: 'push-patch-refill', contactId: i.contactId, encounterId: i.encounterId, skuIds: i.sku,
    ...(i.partnerRef ? { partnerRef: i.partnerRef } : {}), changeAnswer: 'no', mode: i.mode };
  return {
    mode: i.mode === 'auto' ? 'subscription' : 'payment',
    line_items: [{ price, quantity: 1 }],
    customer_email: i.email, metadata,
    success_url: `${base()}?done=1`, cancel_url: `${base()}?done=0`,
    ...(i.mode === 'auto' ? { subscription_data: { metadata } } : { customer_creation: 'always', payment_intent_data: { receipt_email: i.email } }),
  };
}

/** Per-box price label like "$650", from the Stripe price amount. Undefined on any failure. */
export async function priceLabel(sku: string, mode: Mode): Promise<string | undefined> {
  const id = priceFor(sku, mode);
  if (!id) return undefined;
  try {
    const cents = (await (await getStripeClient()).prices.retrieve(id)).unit_amount;
    return cents == null ? undefined : `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
  } catch { return undefined; }
}

export async function createCheckout(i: Input, exp: number): Promise<string | null> {
  const params = buildParams(i);
  if (!params) return null;
  const s = await (await getStripeClient()).checkout.sessions.create(params as never, { idempotencyKey: `refill-${i.encounterId}-${exp}-${i.mode}` });
  return s.url ?? null;
}
