// Signed reorder link. Same HMAC as lambdas/push-patch-refill/src/sig.ts and infra/scripts/push-patch-refill-lib.mjs:
// HMAC-SHA256 hex over `contactId|encounterId|exp` (exp = unix seconds). The refill lambda verifies it.
import { createHmac } from 'crypto';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

export const REFILL_LINK_BASE = 'https://www.my4mlife.com/reorder';

export function signRefillLink(i: { contactId: string; encounterId: string; days: number; key: string; base?: string; now?: number }): string {
  const exp = Math.floor((i.now ?? Date.now()) / 1000) + Math.round(i.days * 86400);
  const sig = createHmac('sha256', i.key).update(`${i.contactId}|${i.encounterId}|${exp}`).digest('hex');
  return `${i.base ?? REFILL_LINK_BASE}?${new URLSearchParams({ c: i.contactId, e: i.encounterId, exp: String(exp), sig })}`;
}

let cached: string | undefined;
export async function refillLinkKey(): Promise<string> {
  if (!cached) {
    const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
    cached = (await ssm.send(new GetParameterCommand({ Name: process.env.REFILL_HMAC_PARAM ?? '/my4mlife/push-patch/refill-hmac-key', WithDecryption: true }))).Parameter?.Value;
  }
  if (!cached) throw new Error('refill hmac key missing');
  return cached;
}
