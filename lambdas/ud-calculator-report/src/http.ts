import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const ALLOW = new Set(['https://my4mlife.com', 'https://www.my4mlife.com', 'http://localhost:4321']);
const MIN_FILL_MS = 3000;

export const reply = (statusCode: number, body: unknown, origin?: string): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': origin && ALLOW.has(origin) ? origin : 'https://my4mlife.com',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  },
  body: JSON.stringify(body),
});

/** Same rules as lead-capture: filled honeypot, or missing/too-fast timing. */
export function botCheck(b: any): string | null {
  if (typeof b.hp === 'string' && b.hp !== '') return 'honeypot';
  if (typeof b.t !== 'number' || !Number.isFinite(b.t)) return 'no-timing';
  return b.t < MIN_FILL_MS ? 'too-fast' : null;
}
