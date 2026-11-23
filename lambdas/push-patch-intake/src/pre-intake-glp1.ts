// GLP-1 lane of POST /api/push-patch-pre-intake: same flow as Push Patch, no partner/promo lookup.
import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { deriveContactId } from '@my4mlife/contact-id';
import { getStripeClient } from '@my4mlife/stripe-client';
import { evaluateScreening, resolveTestPrice, buildLaneSessionParams } from '@my4mlife/push-patch-checkout';
import { validateGlp1PreIntake } from './validate-glp1';
import { putPending } from './pending';
import { captureContact } from './contact';
import { reply } from './http';

export async function preIntakeGlp1(event: APIGatewayProxyEventV2, raw: unknown, origin?: string): Promise<APIGatewayProxyResultV2> {
  const v = validateGlp1PreIntake(raw);
  if (!v.ok) return reply(v.error === 'not eligible' ? 403 : 400, { error: v.error }, origin);
  const { email, firstName, lastName, phone, skuId, autoShip, screening, health, consentName, testToken } = v.body;
  const screened = evaluateScreening(screening, 'glp1');
  if (!screened.ok) return reply(screened.reason === 'not eligible' ? 403 : 400, { error: screened.reason }, origin);

  const contactId = deriveContactId(email);
  const intakeId = randomUUID();
  const params = buildLaneSessionParams({
    lane: 'glp1', autoShip, skuId, mode: process.env['STRIPE_MODE'] === 'live' ? 'live' : 'test', contactId, intakeId,
    screenMeta: screened.metadata, email, firstName, phone, testPrice: await resolveTestPrice(skuId, testToken),
  });
  if (!params) return reply(503, { error: 'product not yet available' }, origin);

  const signedAt = new Date().toISOString();
  const h = event.headers ?? {};
  try {
    await putPending({
      contactId, intakeId, email, firstName, lastName, skuId, lane: 'glp1', autoShip,
      dob: health.dob, sex: health.sex, phone, consentName, privacyAck: true, signedAt,
      medications: [...health.interactingMeds, ...(health.otherMeds.toLowerCase() === 'none' ? [] : [health.otherMeds])],
      allergies: health.allergies.toLowerCase() === 'none' ? [] : [health.allergies], conditions: health.conditions,
      glp1: { health, screening: { version: screened.metadata['screen_v'] as string, at: screened.metadata['screen_at'] as string } },
      ip: event.requestContext?.http?.sourceIp, userAgent: h['user-agent'] ?? h['User-Agent'] ?? event.requestContext?.http?.userAgent,
    });
  } catch (e) {
    console.error('[push-patch-intake] glp1 pending write failed', { error: (e as { name?: string })?.name ?? 'Error' });
    return reply(500, { error: 'could not save your answers' }, origin);
  }
  await captureContact({ email, fullName: `${firstName} ${lastName}`, phone, pre: true });
  try {
    const session = await (await getStripeClient()).checkout.sessions.create(params as never);
    return reply(200, { url: session.url }, origin);
  } catch (e) {
    console.error('[push-patch-intake] glp1 checkout session failed', { error: (e as { name?: string })?.name ?? 'Error' });
    return reply(500, { error: 'could not open checkout' }, origin);
  }
}
