// Shared HMAC helper for the approve link. Copied verbatim into
// lambdas/concierge-approve/src/token.ts — no cross-package imports between
// Lambdas, so keep both files identical when changing this.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function approveToken(secret: string, contactId: string, sk: string): string {
  return createHmac('sha256', secret).update(`${contactId}|${sk}`).digest('hex');
}

export function verifyToken(secret: string, contactId: string, sk: string, token: string): boolean {
  const expected = approveToken(secret, contactId, sk);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(token ?? '', 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
