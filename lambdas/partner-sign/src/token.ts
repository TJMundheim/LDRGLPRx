// Signed link token: base64url("CODE|email|exp") + "." + HMAC-SHA256 hex of that payload.
// Keep in step with infra/scripts/partner-sign-link.mjs (cross-checked in token.test.ts).
import { createHmac, timingSafeEqual } from 'node:crypto';

const sign = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('hex');

export function makeToken(secret: string, code: string, email: string, exp: number): string {
  const payload = Buffer.from(`${code}|${email}|${exp}`).toString('base64url');
  return `${payload}.${sign(secret, payload)}`;
}

export interface TokenClaims { code: string; email: string; exp: number }

/** Returns the claims, or null for a bad signature, malformed token, empty secret or expired link. */
export function verifyToken(secret: string, token: string, nowSec = Math.floor(Date.now() / 1000)): TokenClaims | null {
  const [payload, sig, extra] = (token ?? '').split('.');
  if (!secret || !payload || !sig || extra !== undefined) return null;
  const a = Buffer.from(sign(secret, payload)), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [code, email, exp] = Buffer.from(payload, 'base64url').toString('utf8').split('|');
  const expNum = Number(exp);
  if (!code || !email || !Number.isFinite(expNum) || expNum < nowSec) return null;
  return { code, email, exp: expNum };
}
