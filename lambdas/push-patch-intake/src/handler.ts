// POST /api/push-patch-intake — post-purchase async visit intake.
// Gate on a paid push-patch Stripe session -> encounter (idempotent) -> record
// + consent -> packet -> ONE provider email with one-tap Approve/Decline.
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getStripeClient } from '@my4mlife/stripe-client';
import { deriveContactId } from '@my4mlife/contact-id';
import { validateBody, screeningFlags } from './validate';
import {
  encounterIdFor, createEncounter, deleteEncounter, upsertRecord, type PaidSession,
} from './record';
import { markIntakeSubmitted } from './marker';
import { generatePacket, sendProviderReview } from './provider-email';

const ORIGINS = new Set([
  'https://my4mlife.com', 'https://www.my4mlife.com', 'https://app.my4mlife.com',
  'http://localhost:4321', 'http://localhost:5173',
]);

function reply(status: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: {
      'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://my4mlife.com',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      Vary: 'Origin',
      'Content-Type': 'application/json',
    },
    body: status === 204 ? '' : JSON.stringify(body),
  };
}

async function paidSession(sessionId: string): Promise<{ session: PaidSession; sku: string } | null> {
  try {
    const stripe = await getStripeClient();
    const session = (await stripe.checkout.sessions.retrieve(sessionId)) as unknown as PaidSession;
    const sku = (session.metadata?.['skuIds'] ?? '').split(',')[0]?.trim() ?? '';
    const email = session.customer_details?.email;
    return session.payment_status === 'paid' && sku.startsWith('push-patch-') && email ? { session, sku } : null;
  } catch {
    return null;
  }
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers?.['origin'] ?? event.headers?.['Origin'];
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);
  if (!event.body) return reply(400, { error: 'missing body' }, origin);

  let raw: unknown;
  try { raw = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }
  const v = validateBody(raw);
  if (!v.ok) return reply(400, { error: v.error }, origin);
  const { body } = v;

  const paid = await paidSession(body.sessionId);
  if (!paid) return reply(402, { error: 'payment not found for this session' }, origin);
  const { session, sku } = paid;

  const contactId = deriveContactId(session.customer_details!.email!.trim().toLowerCase());
  const encounterId = encounterIdFor(session.id);
  const ts = new Date().toISOString();
  const pi = session.payment_intent;
  const paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? '');

  let created = false;
  try {
    if ((await createEncounter({ contactId, encounterId, sku, sessionId: session.id, paymentIntentId, ts })) === 'duplicate') {
      return reply(200, { ok: true, alreadySubmitted: true, encounterId }, origin);
    }
    created = true;
    await upsertRecord({ contactId, session, body, ts });
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
      flags: screeningFlags(body.screening),
    });
  } catch (e) {
    console.error('[push-patch-intake] provider hand-off failed', { sessionId: session.id, error: String(e) });
    await deleteEncounter(contactId, encounterId);
    return reply(502, { error: 'could not reach the reviewing physician; please resubmit' }, origin);
  }

  await markIntakeSubmitted(contactId, session.id, ts);
  return reply(200, { ok: true, encounterId }, origin);
};
