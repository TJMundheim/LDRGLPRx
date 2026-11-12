// HMAC-signed one-click ship links. Mirror in push-patch-ship-admin.
// sig = HMAC-SHA256(secret, `c|s|t|k|e`) hex; secret = SSM `push-patch-decision-hmac-key`; e = expiry epoch seconds.
import { createHmac, timingSafeEqual } from 'crypto';

export const LINK_TTL_SECONDS = 7 * 24 * 3600;
export interface LinkParts { c: string; s: string; t: string; k: string; e: number }

export const sign = (p: LinkParts, secret: string): string =>
  createHmac('sha256', secret).update(`${p.c}|${p.s}|${p.t}|${p.k}|${p.e}`).digest('hex');

export function verify(p: LinkParts, sig: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const a = Buffer.from(sig, 'hex'); const b = Buffer.from(sign(p, secret), 'hex');
  return nowSec <= p.e && a.length === b.length && timingSafeEqual(a, b);
}

export function buildLink(base: string, p: Omit<LinkParts, 'e'>, secret: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const full = { ...p, e: nowSec + LINK_TTL_SECONDS };
  const q = new URLSearchParams({ c: full.c, s: full.s, t: full.t, k: full.k, e: String(full.e), sig: sign(full, secret) });
  return `${base}?${q}`;
}
