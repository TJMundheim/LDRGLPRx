import { InvokeCommand } from '@aws-sdk/client-lambda';

const EMAIL_SENDER_FN = process.env['EMAIL_SENDER_FN'] ?? 'my4mlife-email-sender';
const BASE = 'https://my4mlife.com/go/push-patch';
const UTM = 'utm_source=email&utm_medium=lifecycle&utm_campaign=push-patch-abandoned';
export const SUBJECT = 'Your Push Patch is waiting';

export interface Sender { send(cmd: unknown): Promise<{ FunctionError?: string }> }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function buildLink(skuId?: string): string {
  return `${BASE}?${skuId ? `sku=${encodeURIComponent(skuId)}&` : ''}${UTM}`;
}

// Copy: docs/launch/push-patch/abandoned-cart-copy.md. Generic text only; no health data, no tagline.
export function compose(firstName: string | undefined, skuId: string | undefined): { subject: string; html: string } {
  const name = firstName?.trim() ? esc(firstName.trim()) : 'there';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#0a1628;line-height:1.55">
<p>Hi ${name},</p>
<p>You started your Push Patch order but did not get through checkout. Picking it back up takes just a few minutes, and one of our network&#39;s licensed physicians reviews your order after that.</p>
<p style="margin:24px 0"><a href="${buildLink(skuId)}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Pick up where you left off</a></p>
<p>Have a question first? Just reply to this email and a real person will get back to you.</p>
<p>If you have already finished, you can ignore this note.</p>
<p>The My4MLife team</p>
<p style="color:#666;font-size:13px;margin-top:32px">My4MLife</p>
</div>`;
  return { subject: SUBJECT, html };
}

/** Synchronous invoke so a failed send is detected (and the claim released). */
export async function sendAbandoned(lambda: Sender, to: string, firstName?: string, skuId?: string): Promise<void> {
  const { subject, html } = compose(firstName, skuId);
  const r = await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', from: 'support', to, subject, html })),
  }));
  if (r.FunctionError) throw new Error('email-sender failed');
}
