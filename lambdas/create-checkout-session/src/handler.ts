import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Stripe from 'stripe';

const ORIGIN_ALLOWLIST = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'http://localhost:4321',
  'http://localhost:3000',
]);

const CORS_BASE = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const cors = corsFor(origin);
  if (event.requestContext.http.method === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey || apiKey.startsWith('PLACEHOLDER')) return reply(500, { error: 'stripe not configured' }, cors);

  let body: { skuId?: string; priceId?: string; contactId?: string; firstName?: string; email?: string; phone?: string };
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return reply(400, { error: 'invalid JSON body' }, cors); }

  const priceId = body.priceId;
  const skuId = body.skuId;
  const contactId = body.contactId;
  if (!priceId) return reply(400, { error: 'priceId required' }, cors);

  const stripe = new Stripe(apiKey, { apiVersion: '2025-09-30.acacia' as any });

  const successBase = process.env.SUCCESS_URL ?? 'https://my4mlife.com/thank-you';
  const cancelBase = process.env.CANCEL_URL ?? 'https://my4mlife.com/cart';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successBase}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: skuId ? `${cancelBase}?sku=${encodeURIComponent(skuId)}` : cancelBase,
      customer_email: body.email || undefined,
      metadata: {
        ...(contactId ? { contactId } : {}),
        ...(skuId ? { skuIds: skuId } : {}),
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      },
      phone_number_collection: body.phone ? undefined : { enabled: true },
    });
    return reply(200, { url: session.url, id: session.id }, cors);
  } catch (e: any) {
    return reply(500, { error: e.message ?? 'stripe error' }, cors);
  }
};
