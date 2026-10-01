import { createHmac, timingSafeEqual } from 'crypto';

export type Action = 'approve' | 'decline';

// Token: base64url(`${contactId}.${encounterId}.${action}.${hmacSha256Hex}`)
// HMAC covers `${contactId}.${encounterId}.${action}`. Secret: SSM `push-patch-decision-hmac-key`.
const mac = (payload: string, secret: string): string => createHmac('sha256', secret).update(payload).digest('hex');

export function signToken(contactId: string, encounterId: string, action: Action, secret: string): string {
  const payload = `${contactId}.${encounterId}.${action}`;
  return Buffer.from(`${payload}.${mac(payload, secret)}`).toString('base64url');
}

export function verifyToken(token: string, secret: string): { contactId: string; encounterId: string; action: Action } {
  const parts = Buffer.from(token, 'base64url').toString('utf8').split('.');
  if (parts.length !== 4) throw new Error('invalid token format');
  const [contactId, encounterId, action, sig] = parts as [string, string, string, string];
  if (action !== 'approve' && action !== 'decline') throw new Error('invalid action');
  const given = Buffer.from(sig, 'hex');
  const expected = Buffer.from(mac(`${contactId}.${encounterId}.${action}`, secret), 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error('invalid token signature');
  return { contactId, encounterId, action };
}
