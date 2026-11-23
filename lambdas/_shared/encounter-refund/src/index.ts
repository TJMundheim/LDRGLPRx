// refundEncounter — admin-approved (or, later, automated) refund of a physician-declined Push Patch order.
// Callable from the refund-encounter-admin Lambda and, with AUTO_REFUND_ON_DECLINE, from push-patch-decision.
import { getStripeClient } from '@my4mlife/stripe-client';
import { load, claim, rollback, finalize } from './store';
import { sendRefundEmail } from './email';

export class RefundError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'RefundError'; }
}

export interface RefundArgs { contactId: string; encounterId: string; actor: string }
export interface RefundResult { ok: true; refundId: string; amountCents: number; emailSent: boolean }

function guard(enc: Record<string, any> | undefined): asserts enc is Record<string, any> {
  if (!enc) throw new RefundError('not_found', 'Encounter not found');
  if (enc.lane !== 'push-patch' && enc.lane !== 'glp1') throw new RefundError('wrong_lane', 'Only Push Patch and GLP-1 encounters can be refunded here');
  if (enc.state !== 'declined') throw new RefundError('not_declined', 'Encounter is not declined');
  if (enc.refundStatus !== 'pending') throw new RefundError('not_pending', `Refund is not pending (status: ${enc.refundStatus ?? 'none'})`);
  if (enc.genesisOrderSentAt) throw new RefundError('already_shipped', 'Order was already sent to fulfillment; no refund once shipped');
  // GLP-1 auto-ship checkouts have no session payment_intent (stored as ''): resolved from the subscription below.
  if (!enc.sessionId || (!enc.paymentIntentId && enc.lane !== 'glp1')) throw new RefundError('no_payment', 'Encounter has no payment to refund');
}

const idOf = (v: unknown): string | undefined => (typeof v === 'string' ? v : (v as { id?: string } | null)?.id) || undefined;

// Subscription-mode (auto-ship) checkout: the first charge is the subscription's first invoice. End the
// subscription first so no renewal bills, then return that invoice's payment intent.
async function subscriptionPayment(stripe: any, sessionId: string): Promise<string> {
  const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'invoice'] });
  const sub = s.subscription && typeof s.subscription === 'object' ? s.subscription : undefined;
  let inv = s.invoice ?? sub?.latest_invoice;
  if (typeof inv === 'string') inv = await stripe.invoices.retrieve(inv);
  const pi = idOf(inv?.payment_intent) ?? idOf(s.payment_intent);
  if (!pi) throw new RefundError('no_payment', 'No payment found for this auto-ship order');
  if (sub && sub.status !== 'canceled') await stripe.subscriptions.cancel(sub.id);
  return pi;
}

export async function refundEncounter({ contactId, encounterId, actor }: RefundArgs): Promise<RefundResult> {
  const { enc, record } = await load(contactId, encounterId);
  guard(enc);
  if (!(await claim(contactId, encounterId))) throw new RefundError('not_pending', 'Refund already in progress or no longer pending');

  let refund;
  try {
    const stripe = await getStripeClient({ modeOverride: 'live' });
    const paymentIntent: string = enc.paymentIntentId || (await subscriptionPayment(stripe, enc.sessionId));
    refund = await stripe.refunds.create(
      { payment_intent: paymentIntent },
      { idempotencyKey: `push-patch-refund-${enc.sessionId}` },
    );
  } catch (e) {
    await rollback(contactId, encounterId).catch(() => undefined);
    throw e;
  }

  // Money has moved. Do NOT roll back: leave 'processing' (Stripe's idempotency key makes a manual reset to 'pending' + retry safe).
  try {
    await finalize({ contactId, encounterId, refundId: refund.id, amountCents: refund.amount, actor });
  } catch (e) {
    throw new RefundError('finalize_failed', `Refund ${refund.id} issued but the record update failed: ${String(e)}`);
  }

  const demo = (record?.demographics ?? {}) as { email?: string; firstName?: string };
  let emailSent = false;
  if (demo.email) emailSent = await sendRefundEmail(demo.email, demo.firstName ?? '', enc.lane).then(() => true, () => false);
  return { ok: true, refundId: refund.id, amountCents: refund.amount, emailSent };
}
