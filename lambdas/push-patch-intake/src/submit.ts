// Shared hand-off for an intake, used by the legacy post-payment POST and by finalize:
// conditional encounter -> record -> consents -> packet -> ONE provider email -> contact -> signed copy.
import { encounterIdFor, createEncounter, deleteEncounter, upsertRecord, type PaidSession } from './record';
import { parseScreening } from './screening';
import { captureContact } from './contact';
import { markIntakeSubmitted } from './marker';
import { recordConsents, sendSignedCopy } from './consent';
import { generatePacket, sendProviderReview } from './provider-email';
import type { HealthFields } from './validate';
import type { ShipTo } from './ship';

export type SubmitResult = 'ok' | 'already' | 'record-failed' | 'handoff-failed';

export interface SubmitInput {
  contactId: string; session: PaidSession; sku: string; shipTo: ShipTo; body: HealthFields;
  name: string; email: string;
  /** When the buyer signed (consent time); the record/encounter timestamps are always "now". */
  consentAt: string; ip?: string; userAgent?: string;
  /** Legacy path only: stamp the Touchpoints marker. Finalize leaves it to order-handler. */
  stampMarker: boolean;
}

export async function submitIntake(i: SubmitInput): Promise<SubmitResult> {
  const { contactId, session, sku, shipTo, body, name, email } = i;
  const encounterId = encounterIdFor(session.id);
  const ts = new Date().toISOString();
  const screening = parseScreening(session.metadata);
  const testOrder = session.metadata?.['test_price'] === 'true';
  const pi = session.payment_intent;
  const paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? '');

  let created = false;
  try {
    if ((await createEncounter({
      contactId, encounterId, sku, sessionId: session.id, paymentIntentId, shipTo, ts,
      amountCents: session.amount_total, currency: session.currency, testOrder,
    })) === 'duplicate') return 'already';
    created = true;
    await upsertRecord({ contactId, name, email, body, shipTo, screening, ts, consentAt: i.consentAt });
  } catch (e) {
    console.error('[push-patch-intake] record write failed', { sessionId: session.id, error: String(e) });
    if (created) await deleteEncounter(contactId, encounterId);
    return 'record-failed';
  }

  // Consents first so the packet and provider email can show them; a failed write never blocks the hand-off.
  const consentLine = await recordConsents({ contactId, encounterId, typedName: body.consentName, at: i.consentAt, ip: i.ip, userAgent: i.userAgent });
  try {
    const packetUrl = await generatePacket(contactId, encounterId);
    await sendProviderReview({ contactId, encounterId, sku, packetUrl, consentLine, patientName: name, screening, testOrder });
  } catch (e) {
    console.error('[push-patch-intake] provider hand-off failed', { sessionId: session.id, error: String(e) });
    await deleteEncounter(contactId, encounterId);
    return 'handoff-failed';
  }

  if (i.stampMarker) await markIntakeSubmitted(contactId, session.id, ts);
  const cleanEmail = email.trim().toLowerCase();
  await captureContact({ email: cleanEmail, fullName: name, phone: body.phone });
  await sendSignedCopy({ typedName: body.consentName, at: i.consentAt, email: cleanEmail, name });
  return 'ok';
}
