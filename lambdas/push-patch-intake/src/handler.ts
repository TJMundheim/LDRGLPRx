// Router for the push-patch-intake Lambda.
//  {mode:'finalize'} (direct invoke by order-handler)  -> finalize.ts, returns { result }
//  GET  /api/push-patch-intake?session_id=             -> status.ts (complete | processing | needs-form)
//  POST /api/push-patch-pre-intake                     -> pre-intake.ts (health form + signature BEFORE payment)
//  POST /api/push-patch-intake                         -> legacy post-payment intake (paid session -> submit.ts)
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { resolveContactId } from '@my4mlife/contact-id';
import { validateBody } from './validate';
import { reply, paidSession } from './http';
import { resolveShipTo } from './ship';
import { encounterIdFor } from './record';
import { submitIntake } from './submit';
import { finalize } from './finalize';
import { orderStatus } from './status';
import { preIntake } from './pre-intake';

type FinalizeEvent = { mode: 'finalize'; sessionId: string; intakeId: string };
const isFinalize = (e: unknown): e is FinalizeEvent => (e as FinalizeEvent)?.mode === 'finalize';

export const handler = async (event: APIGatewayProxyEventV2 | FinalizeEvent): Promise<APIGatewayProxyResultV2 | { result: string }> => {
  if (isFinalize(event)) return finalize(event.sessionId, event.intakeId);
  const origin = event.headers?.['origin'] ?? event.headers?.['Origin'];
  const method = event.requestContext?.http?.method;
  if (method === 'OPTIONS') return reply(204, {}, origin);
  if (method === 'GET') {
    const id = event.queryStringParameters?.['session_id'];
    if (!id) return reply(400, { error: 'session_id required' }, origin);
    const p = await paidSession(id);
    return p ? reply(200, await orderStatus(p.session), origin) : reply(402, { error: 'payment not found for this session' }, origin);
  }
  const path = event.rawPath ?? event.requestContext?.http?.path ?? '';
  if (path.endsWith('/push-patch-pre-intake')) return preIntake(event, origin);
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
  const h = event.headers ?? {};
  const out = await submitIntake({
    contactId, session, sku, shipTo, body,
    name: session.customer_details?.name ?? '', email: session.customer_details?.email ?? '',
    consentAt: new Date().toISOString(), ip: event.requestContext?.http?.sourceIp,
    userAgent: h['user-agent'] ?? h['User-Agent'] ?? event.requestContext?.http?.userAgent, stampMarker: true,
  });
  if (out === 'already') return reply(200, { ok: true, alreadySubmitted: true, encounterId: encounterIdFor(session.id) }, origin);
  if (out === 'record-failed') return reply(500, { error: 'could not save your submission' }, origin);
  if (out === 'handoff-failed') return reply(502, { error: 'could not reach the reviewing physician; please resubmit' }, origin);
  return reply(200, { ok: true, encounterId: encounterIdFor(session.id) }, origin);
};
