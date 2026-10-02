// GET  /api/push-patch-intake?session_id= — the Stripe ship-to, for the buyer to confirm.
// POST /api/push-patch-intake — post-purchase async visit intake.
// Gate on a paid push-patch Stripe session -> encounter (idempotent) -> record
// + consent -> packet -> ONE provider email with one-tap Approve/Decline.
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { resolveContactId } from '@my4mlife/contact-id';
import { validateBody } from './validate';
import { parseScreening } from './screening';
import { reply, paidSession } from './http';
import { resolveShipTo, stripeShipTo } from './ship';
import {
  encounterIdFor, createEncounter, deleteEncounter, upsertRecord,
} from './record';
import { markIntakeSubmitted } from './marker';
import { generatePacket, sendProviderReview } from './provider-email';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers?.['origin'] ?? event.headers?.['Origin'];
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);
  if (event.requestContext?.http?.method === 'GET') {
    const id = event.queryStringParameters?.['session_id'];
    if (!id) return reply(400, { error: 'session_id required' }, origin);
    const p = await paidSession(id);
    if (!p) return reply(402, { error: 'payment not found for this session' }, origin);
    const shipTo = stripeShipTo(p.session.shipping_details);
    return shipTo ? reply(200, { shipTo }, origin) : reply(404, { error: 'no shipping address on this order' }, origin);
  }
  if (!event.body) return reply(400, { error: 'missing body' }, origin);

  let raw: unknown;
  try { raw = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }
  const v = validateBody(raw);
  if (!v.ok) return reply(400, { error: v.error }, origin);
  const { body } = v;

  const paid = await paidSession(body.sessionId);
  if (!paid) return reply(402, { error: 'payment not found for this session' }, origin);
  const { session, sku } = paid;
  const shipTo = resolveShipTo(body.shipping, session.shipping_details);
  if (!shipTo) return reply(400, { error: 'shipping address required' }, origin);

  // Same resolution as order-handler-core (metadata.contactId first) so the pending marker key matches.
  const contactId = resolveContactId({ metadataContactId: session.metadata?.['contactId'], email: session.customer_details?.email })!;
  const encounterId = encounterIdFor(session.id);
  const ts = new Date().toISOString();
  const screening = parseScreening(session.metadata);
  const pi = session.payment_intent;
  const paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? '');

  let created = false;
  try {
    if ((await createEncounter({ contactId, encounterId, sku, sessionId: session.id, paymentIntentId, shipTo, ts })) === 'duplicate') {
      return reply(200, { ok: true, alreadySubmitted: true, encounterId }, origin);
    }
    created = true;
    await upsertRecord({ contactId, session, body, shipTo, screening, ts });
  } catch (e) {
    console.error('[push-patch-intake] record write failed', { sessionId: session.id, error: String(e) });
    if (created) await deleteEncounter(contactId, encounterId);
    return reply(500, { error: 'could not save your submission' }, origin);
  }

  try {
    const packetUrl = await generatePacket(contactId, encounterId);
    await sendProviderReview({
      contactId, encounterId, sku, packetUrl,
      patientName: session.customer_details?.name ?? '',
      screening,
    });
  } catch (e) {
    console.error('[push-patch-intake] provider hand-off failed', { sessionId: session.id, error: String(e) });
    await deleteEncounter(contactId, encounterId);
    return reply(502, { error: 'could not reach the reviewing physician; please resubmit' }, origin);
  }

  await markIntakeSubmitted(contactId, session.id, ts);
  return reply(200, { ok: true, encounterId }, origin);
};
