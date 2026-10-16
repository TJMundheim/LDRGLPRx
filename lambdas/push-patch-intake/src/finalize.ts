// Invoked synchronously by order-handler-core ({ mode:'finalize', sessionId, intakeId }) after Stripe
// confirms payment. Moves the pending intake through the shared hand-off. Replay-safe: the conditional
// encounter put means a repeat is 'already'. A failed hand-off rolls back and THROWS so Stripe retries.
import { resolveContactId } from '@my4mlife/contact-id';
import { paidSession } from './http';
import { stripeShipTo } from './ship';
import { encounterExists } from './record';
import { getPending, deletePending } from './pending';
import { submitIntake } from './submit';

export type FinalizeResult = { result: 'ok' | 'already' | 'missing' };

export async function finalize(sessionId: string, intakeId: string): Promise<FinalizeResult> {
  const paid = await paidSession(sessionId);
  if (!paid) throw new Error('payment not found for this session');
  const { session, sku } = paid;
  const contactId = resolveContactId({ metadataContactId: session.metadata?.['contactId'], email: session.customer_details?.email })!;

  // The pending item is deleted on success, so a replay must see the encounter first.
  if (await encounterExists(contactId, session.id)) return { result: 'already' };
  const pending = await getPending(contactId, intakeId);
  if (!pending) return { result: 'missing' };
  const shipTo = stripeShipTo(session.shipping_details);
  if (!shipTo) return { result: 'missing' };

  const out = await submitIntake({
    contactId, session, sku, shipTo, body: pending,
    name: `${pending.firstName} ${pending.lastName}`.trim(), email: pending.email,
    consentAt: pending.signedAt, ip: pending.ip, userAgent: pending.userAgent, stampMarker: false,
  });
  if (out === 'already') return { result: 'already' };
  if (out !== 'ok') throw new Error(`push-patch finalize failed: ${out}`);
  await deletePending(contactId, intakeId);
  return { result: 'ok' };
}
