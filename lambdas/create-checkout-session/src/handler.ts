import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getStripeClient } from '@my4mlife/stripe-client';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const REGION = 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';

const ORIGIN_ALLOWLIST = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'http://localhost:4321',
  'http://localhost:3000',
]);

// SKU → Stripe price + mode. Physical-product SKUs collect a US shipping
// address natively via Checkout (shipping_address_collection). Callers may
// still pass a raw priceId (e.g. cohort-workbook) — this map only overrides
// known SKUs.
const SKU_CATALOG: Record<string, { priceId: string; mode: 'payment' | 'subscription'; shipping: boolean; successUrl?: string; cancelUrl?: string }> = {
  'biome-ns-ultra': {
    priceId: 'price_1Tp83ABSbDAyoIVynsgk0BAK',
    mode: 'payment',
    shipping: true,
    successUrl: 'https://www.my4mlife.com/thank-you',
    cancelUrl: 'https://www.my4mlife.com/go/gut-repair',
  },
  'biome-ns-ultra-sub': {
    priceId: 'price_1Tp83ABSbDAyoIVyEgUb5T0V',
    mode: 'subscription',
    shipping: true,
    successUrl: 'https://www.my4mlife.com/thank-you',
    cancelUrl: 'https://www.my4mlife.com/go/gut-repair',
  },
};

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

// Admin demo auth — reads from admin-demo-auth secret
let cachedAdminPassword: string | null = null;
async function getAdminPassword(): Promise<string> {
  if (cachedAdminPassword) return cachedAdminPassword;
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: 'admin-demo-auth' }));
  const parsed = JSON.parse(res.SecretString!);
  cachedAdminPassword = parsed.password as string;
  return cachedAdminPassword;
}

async function writeContactIsDemo(contactId: string, isDemo: boolean): Promise<void> {
  const ddb = new DynamoDBClient({ region: REGION });
  await ddb.send(new UpdateItemCommand({
    TableName: CONTACT_TABLE,
    Key: { contactId: { S: contactId } },
    UpdateExpression: 'SET isDemo = :v, updatedAt = :t',
    ExpressionAttributeValues: {
      ':v': { BOOL: isDemo },
      ':t': { S: new Date().toISOString() },
    },
  }));
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers?.origin ?? event.headers?.Origin;
  const cors = corsFor(origin);
  if (event.requestContext.http.method === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const routePath = event.requestContext.http.path;
  const isAdminRoute = routePath === '/api/admin/demo-checkout-session';

  // Auth gate for admin route
  if (isAdminRoute) {
    const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? '';
    const match = authHeader.match(/^Basic (.+)$/);
    if (!match) return reply(401, { error: 'unauthorized' }, cors);
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
    const password = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : decoded;
    const adminPassword = await getAdminPassword();
    if (password !== adminPassword) return reply(401, { error: 'unauthorized' }, cors);
  }

  // mode from request body is NEVER used — admin route forces test, default route uses STRIPE_MODE env
  const modeOverride: 'test' | undefined = isAdminRoute ? 'test' : undefined;
  const resolvedMode = isAdminRoute ? 'test' : (process.env['STRIPE_MODE'] as 'live' | 'test' ?? 'test');

  const stripe = await getStripeClient({ modeOverride });

  let body: { skuId?: string; priceId?: string; contactId?: string; firstName?: string; email?: string; phone?: string };
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return reply(400, { error: 'invalid JSON body' }, cors); }

  const skuId = body.skuId;
  const catalogEntry = skuId ? SKU_CATALOG[skuId] : undefined;
  const priceId = catalogEntry?.priceId ?? body.priceId;
  const contactId = body.contactId;
  if (!priceId) return reply(400, { error: 'priceId required' }, cors);

  const successBase = catalogEntry?.successUrl ?? process.env.SUCCESS_URL ?? 'https://my4mlife.com/thank-you';
  const cancelBase = catalogEntry?.cancelUrl ?? process.env.CANCEL_URL ?? 'https://my4mlife.com/cart';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: catalogEntry?.mode ?? 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: skuId
        ? `${successBase}?session_id={CHECKOUT_SESSION_ID}&sku=${encodeURIComponent(skuId)}`
        : `${successBase}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: skuId ? `${cancelBase}?sku=${encodeURIComponent(skuId)}` : cancelBase,
      customer_email: body.email || undefined,
      payment_intent_data: catalogEntry?.mode === 'subscription' ? undefined : (body.email ? { receipt_email: body.email } : undefined),
      metadata: {
        ...(contactId ? { contactId } : {}),
        ...(skuId ? { skuIds: skuId } : {}),
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        isDemo: String(resolvedMode === 'test'),
      },
      phone_number_collection: body.phone ? undefined : { enabled: true },
      shipping_address_collection: catalogEntry?.shipping ? { allowed_countries: ['US'] } : undefined,
    });

    if (contactId) {
      await writeContactIsDemo(contactId, resolvedMode === 'test').catch(() => {/* best-effort */});
    }

    return reply(200, { url: session.url, id: session.id }, cors);
  } catch (e: any) {
    return reply(500, { error: e.message ?? 'stripe error' }, cors);
  }
};
