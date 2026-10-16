// POST /api/push-patch-pre-intake — health form + signature BEFORE payment. Stores the pending intake
// (30-day TTL) and returns a Stripe Checkout URL; paying then finalizes the order (finalize.ts).
import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { deriveContactId } from '@my4mlife/contact-id';
import { getStripeClient } from '@my4mlife/stripe-client';
import { evaluateScreening, resolveTestPrice, buildPushPatchSessionParams } from '@my4mlife/push-patch-checkout';
import { validatePreIntake } from './validate';
import { putPending } from './pending';
import { captureContact } from './contact';
import { reply } from './http';

export async function preIntake(event: APIGatewayProxyEventV2, origin?: string): Promise<APIGatewayProxyResultV2> {
  if (!event.body) return reply(400, { error: 'missing body' }, origin);
  let raw: unknown;
  try { raw = JSON.parse(event.body); } catch { return reply(400, { error: 'invalid json' }, origin); }
  const v = validatePreIntake(raw);
  if (!v.ok) return reply(400, { error: v.error }, origin);
  const { screening, testToken, email, firstName, lastName, skuId, ...health } = v.body;

  const screened = evaluateScreening(screening);
  if (!screened.ok) return reply(screened.reason === 'not eligible' ? 403 : 400, { error: screened.reason }, origin);

  const contactId = deriveContactId(email);
  const intakeId = randomUUID();
  const params = buildPushPatchSessionParams({
    skuId, mode: process.env['STRIPE_MODE'] === 'live' ? 'live' : 'test', contactId, intakeId, screenMeta: screened.metadata,
    email, firstName, phone: health.phone, testPrice: await resolveTestPrice(skuId, testToken),
  });
  if (!params) return reply(503, { error: 'product not yet available' }, origin);

  const h = event.headers ?? {};
  try {
    await putPending({
      contactId, intakeId, email, firstName, lastName, skuId, ...health, signedAt: new Date().toISOString(),
      ip: event.requestContext?.http?.sourceIp, userAgent: h['user-agent'] ?? h['User-Agent'] ?? event.requestContext?.http?.userAgent,
    });
  } catch (e) {
    console.error('[push-patch-intake] pending write failed', { error: (e as { name?: string })?.name ?? 'Error' });
    return reply(500, { error: 'could not save your answers' }, origin);
  }

  await captureContact({ email, fullName: `${firstName} ${lastName}`, phone: health.phone, pre: true });
  try {
    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.create(params as never);
    return reply(200, { url: session.url }, origin);
  } catch (e) {
    console.error('[push-patch-intake] checkout session failed', { error: (e as { name?: string })?.name ?? 'Error' });
    return reply(500, { error: 'could not open checkout' }, origin);
  }
}
