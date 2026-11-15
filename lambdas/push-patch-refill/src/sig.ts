import { createHmac, timingSafeEqual } from 'crypto';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

export interface Link { c: string; e: string; exp: number }

// HMAC-SHA256 hex over `contactId|encounterId|exp` (exp = unix seconds). The CLI signs the same way.
export const sign = (l: Link, secret: string): string =>
  createHmac('sha256', secret).update(`${l.c}|${l.e}|${l.exp}`).digest('hex');

/** Parsed link, or null when malformed, badly signed or expired. */
export function verify(p: URLSearchParams, secret: string, nowSec = Math.floor(Date.now() / 1000)): Link | null {
  const [c, e, exp, sig] = ['c', 'e', 'exp', 'sig'].map((n) => p.get(n) ?? '') as [string, string, string, string];
  if (!c || !e || !sig || !/^\d+$/.test(exp) || !/^[0-9a-f]+$/i.test(sig)) return null;
  const link: Link = { c, e, exp: Number(exp) };
  const given = Buffer.from(sig, 'hex');
  const want = Buffer.from(sign(link, secret), 'hex');
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return link.exp < nowSec ? null : link;
}

const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
let cached: string | undefined;
export async function hmacKey(): Promise<string> {
  if (!cached) {
    const r = await ssm.send(new GetParameterCommand({ Name: process.env.HMAC_PARAM ?? '/my4mlife/push-patch/refill-hmac-key', WithDecryption: true }));
    cached = r.Parameter?.Value;
  }
  if (!cached) throw new Error('hmac key missing');
  return cached;
}
