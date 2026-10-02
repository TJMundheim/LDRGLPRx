import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { DeclinedEnc } from './refund-store';

const EMAIL_SENDER_FN = process.env['EMAIL_SENDER_FN'] ?? 'my4mlife-email-sender';
const INTERNAL_TO = 'drtj@my4mlife.com';
const lambda = new LambdaClient({ region: process.env['AWS_REGION'] ?? 'us-east-2' });
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const REFUND_SUBJECT = '[Refund due] Push Patch refund pending for 7 business days';

/** Internal email: name (initial + last) is approved for internal subjects/bodies; no other PHI. */
export function composeRefundReminder(e: DeclinedEnc, name: string): string {
  const id = e.sk.replace(/^encounter#/, '');
  const rows = [
    name ? `<li>Patient: ${esc(name)}</li>` : '',
    `<li>Encounter: ${esc(id)}</li>`,
    `<li>Declined: ${esc((e.declinedAt ?? 'unknown').slice(0, 10))}</li>`,
    `<li>Refund due by: ${esc(e.refundDueBy ?? 'unknown')}</li>`,
  ].join('');
  return `<div style="font-family:system-ui,sans-serif;line-height:1.5"><p>A declined Push Patch order still has a pending refund after 7 business days.</p><ul>${rows}</ul><p>Open the admin app → Patients → Issue refund.</p></div>`;
}

/** Synchronous invoke so a failed send is detected (and the claim released). */
export async function sendRefundReminder(e: DeclinedEnc, name: string): Promise<void> {
  const r = await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to: INTERNAL_TO, subject: REFUND_SUBJECT, html: composeRefundReminder(e, name) })),
  }));
  if (r.FunctionError) throw new Error('email-sender failed');
}
