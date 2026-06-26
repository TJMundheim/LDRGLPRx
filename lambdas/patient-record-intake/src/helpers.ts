import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { CardOnFile, ConsentRecord } from '@my4mlife/patient-record';

// ── CORS ───────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://my4mlife.com',
  'https://www.my4mlife.com',
  'https://app.my4mlife.com',
  'http://localhost:4321',
  'http://localhost:5173',
]);

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://my4mlife.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

export function reply(status: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: corsHeaders(origin), body: JSON.stringify(body) };
}

// ── Card-data sanitiser ────────────────────────────────────────────────────────

// Whitelist-only: persist only tokenized Stripe references, never raw PAN/CVC/expiry.
const RAW_CARD_DENY = new Set(['number', 'cvc', 'exp', 'expMonth', 'expYear']);

export function sanitiseCard(raw: Record<string, unknown>): CardOnFile {
  const safe: CardOnFile = {};
  if (typeof raw.stripeCustomerId === 'string') safe.stripeCustomerId = raw.stripeCustomerId;
  if (typeof raw.paymentMethodId === 'string') safe.paymentMethodId = raw.paymentMethodId;
  if (typeof raw.setupIntentId === 'string') safe.setupIntentId = raw.setupIntentId;
  // Explicit assertion: none of the deny-listed keys survived.
  for (const k of RAW_CARD_DENY) {
    if (k in safe) delete (safe as Record<string, unknown>)[k];
  }
  return safe;
}

// ── Consent serialiser ─────────────────────────────────────────────────────────

// Serialise each consent as a JSON string so DynamoDB stores it compactly.
export function serialiseConsents(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val && typeof val === 'object') {
      out[key] = JSON.stringify(val as ConsentRecord);
    }
  }
  return out;
}
