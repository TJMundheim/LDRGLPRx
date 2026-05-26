import { createHmac, timingSafeEqual } from 'crypto';

export type Action = 'approve' | 'deny';

export function signToken(approvalId: string, action: Action, secret: string): string {
  const payload = `${approvalId}.${action}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyToken(token: string, secret: string): { approvalId: string; action: Action } {
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    throw new Error('invalid token encoding');
  }
  const parts = decoded.split('.');
  if (parts.length !== 3) throw new Error('invalid token format');
  const [approvalId, action, sig] = parts;
  if (action !== 'approve' && action !== 'deny') throw new Error('invalid action');
  const expected = createHmac('sha256', secret).update(`${approvalId}.${action}`).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('invalid token signature');
  }
  return { approvalId, action: action as Action };
}
