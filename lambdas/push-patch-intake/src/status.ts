// GET ?session_id= -> where the buyer's order is. 'complete': the encounter exists. 'processing': a live
// pending intake awaits finalize (the thank-you page polls). 'needs-form': legacy or expired -> post-payment form.
import { resolveContactId } from '@my4mlife/contact-id';
import type { PaidSession } from './record';
import { encounterExists } from './record';
import { getPending } from './pending';
import { stripeShipTo, type ShipTo } from './ship';

export type OrderStatus = { status: 'complete' | 'processing' } | { status: 'needs-form'; shipTo?: ShipTo };

export async function orderStatus(session: PaidSession): Promise<OrderStatus> {
  const contactId = resolveContactId({ metadataContactId: session.metadata?.['contactId'], email: session.customer_details?.email })!;
  if (await encounterExists(contactId, session.id)) return { status: 'complete' };
  const intakeId = session.metadata?.['intakeId']?.trim();
  if (intakeId && (await getPending(contactId, intakeId))) return { status: 'processing' };
  // Legacy form: the buyer confirms the Stripe address (absent -> the form asks for one).
  const shipTo = stripeShipTo(session.shipping_details);
  return shipTo ? { status: 'needs-form', shipTo } : { status: 'needs-form' };
}
