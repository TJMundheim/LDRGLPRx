import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getStripeClient, getStripePublishableKey } from '@my4mlife/stripe-client';

const ORIGIN_ALLOWLIST = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'http://localhost:4321',
  'http://localhost:3000',
]);

const CORS_BASE = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
} as const;

function corsFor(origin: string | undefined): Record<string, string> {
  const ok = origin && ORIGIN_ALLOWLIST.has(origin) ? origin : 'https://my4mlife.com';
  return { 'Access-Control-Allow-Origin': ok, ...CORS_BASE };
}

function reply(statusCode: number, body: unknown, cors: Record<string, string>): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;
  const cors = corsFor(origin);
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, cors);

  let body: { email?: string; category?: string; firstName?: string };
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return reply(400, { error: 'invalid JSON body' }, cors); }

  const email = (body.email ?? '').trim().toLowerCase();
  const category = (body.category ?? 'glp1').trim();

  try {
    const stripe = await getStripeClient({ modeOverride: 'live' });
    const publishableKey = await getStripePublishableKey('live');
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        category,
        ...(email ? { email } : {}),
        ...(body.firstName ? { firstName: body.firstName } : {}),
      },
    });
    return reply(200, { clientSecret: setupIntent.client_secret, id: setupIntent.id, publishableKey }, cors);
  } catch (e: any) {
    return reply(500, { error: e.message ?? 'stripe error' }, cors);
  }
};
