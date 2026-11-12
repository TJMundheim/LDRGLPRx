import { createHmac, timingSafeEqual } from 'crypto';

export interface Link { c: string; s: string; t: string; k: 'UPS' | 'FedEx'; e: number }

// HMAC-SHA256 hex over `c|s|t|k|e`, same algorithm as push-patch-decision/sign.ts.
export const sign = (l: Link, secret: string): string =>
  createHmac('sha256', secret).update(`${l.c}|${l.s}|${l.t}|${l.k}|${l.e}`).digest('hex');

/** Returns the parsed link, or null when malformed, badly signed or expired. */
export function verify(p: URLSearchParams, secret: string, nowSec = Math.floor(Date.now() / 1000)): Link | null {
  const [c, s, t, k, e, sig] = ['c', 's', 't', 'k', 'e', 'sig'].map((n) => p.get(n) ?? '');
  if (!c || !s || !t || !sig || (k !== 'UPS' && k !== 'FedEx') || !/^\d+$/.test(e!)) return null;
  const link: Link = { c: c!, s: s!, t: t!, k, e: Number(e) };
  const given = Buffer.from(sig!, 'hex');
  const want = Buffer.from(sign(link, secret), 'hex');
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return link.e < nowSec ? null : link;
}
