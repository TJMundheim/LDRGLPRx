import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v5 as uuidv5 } from 'uuid';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';

// Fixed UUIDv4 namespace for deterministic contactId = uuidv5(lower(trim(email)), NAMESPACE).
// Matches @my4mlife/contact-id — do not change once leads exist in production.
export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

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

/**
 * Newsletter / lead capture — POST /api/lead-capture
 * Body: { email, source?, firstName? }
 *
 * MERGE-upserts a Contact keyed by uuidv5(email): sets newsletter=true +
 * newsletterSource + newsletterAt, creates lifecycleStage='lead' only for
 * brand-new rows (if_not_exists — an existing Protégé/customer row is never
 * downgraded or overwritten). Consent basis: the visitor typed their email
 * into a "stay informed" box — that's the newsletter opt-in, timestamped
 * server-side.
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

  const source: string = typeof body.source === 'string' ? body.source.slice(0, 100) : 'unknown';
  const firstName: string | undefined =
    body.firstName && typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 80) : undefined;

  const contactId = uuidv5(email, NAMESPACE);
  const ts = new Date().toISOString();

  try {
    await ddb.send(new UpdateCommand({
      TableName: CONTACT_TABLE,
      Key: { contactId },
      UpdateExpression:
        'SET newsletter = :t, newsletterSource = :src, newsletterAt = if_not_exists(newsletterAt, :ts), ' +
        'email = if_not_exists(email, :em), lifecycleStage = if_not_exists(lifecycleStage, :lead), ' +
        'createdAt = if_not_exists(createdAt, :ts), updatedAt = :ts' +
        (firstName ? ', firstName = if_not_exists(firstName, :fn)' : ''),
      ExpressionAttributeValues: {
        ':t': true,
        ':src': source,
        ':ts': ts,
        ':em': email,
        ':lead': 'lead',
        ...(firstName ? { ':fn': firstName } : {}),
      },
    }));
  } catch (e) {
    console.error('[lead-capture] write failed', e);
    return reply(500, { error: 'write failed' }, origin);
  }

  return reply(200, { ok: true }, origin);
};
