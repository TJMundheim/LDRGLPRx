import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const ORIGIN_ALLOWLIST = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'http://localhost:4321',
]);

function corsFor(origin: string | undefined): Record<string, string> {
  const ok = origin && ORIGIN_ALLOWLIST.has(origin) ? origin : 'https://my4mlife.com';
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(statusCode: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return { statusCode, headers: corsFor(origin), body: JSON.stringify(body) };
}

const MIN_FILL_MS = 3000;

function botCheck(body: any): string | null {
  if (typeof body.hp === 'string' && body.hp !== '') return 'honeypot';
  if (typeof body.t !== 'number' || !Number.isFinite(body.t)) return 'no-timing';
  if (body.t < MIN_FILL_MS) return 'too-fast';
  return null;
}

/**
 * Newsletter / lead capture — POST /api/lead-capture
 * Body: { email, source?, firstName?, hp?, t? } — hp = honeypot value, t = ms from page render to submit
 *
 * Delegates to the shared additive Contact upsert (@my4mlife/contact-upsert):
 * identity fields are if_not_exists, stage 'lead' is set only on new rows (an
 * existing Protégé/customer is never downgraded), and the visitor typing their
 * email into a "stay informed" box is recorded as an explicit, timestamped
 * marketingConsent opt-in carrying the request source.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return reply(400, { error: 'invalid JSON body' }, origin); }

  const emailRaw: string | undefined = body.email;
  if (!emailRaw || typeof emailRaw !== 'string') return reply(400, { error: 'email required' }, origin);
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return reply(400, { error: 'malformed email' }, origin);

  // Bot block: honeypot filled, or timing missing/too fast. Answer like success, write nothing.
  const botReason = botCheck(body);
  if (botReason) {
    console.log(`[lead-capture] bot-blocked ${botReason}`);
    return reply(200, { ok: true }, origin);
  }

  const source: string =
    (typeof body.source === 'string' ? body.source.slice(0, 100) : '') || 'newsletter';
  const firstName: string | undefined =
    body.firstName && typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 80) : undefined;

  try {
    await upsertContact(ddb, {
      email,
      ...(firstName ? { firstName } : {}),
      source,
      stage: 'lead',
      marketingConsent: { status: 'opted_in', source },
      event: { type: 'newsletter-signup' },
    }, { table: CONTACT_TABLE });
  } catch (e) {
    console.error('[lead-capture] write failed', e);
    return reply(500, { error: 'write failed' }, origin);
  }

  return reply(200, { ok: true }, origin);
};
