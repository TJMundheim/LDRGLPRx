import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const EMAIL_SENDER_FN = process.env['EMAIL_SENDER_FN'] ?? 'my4mlife-email-sender';
const BASE = process.env['INTAKE_BASE_URL'] ?? 'https://www.my4mlife.com/go/push-patch/thank-you';
import { isGlp1, glp1Name } from './product';
const GLP1_BASE = process.env['GLP1_INTAKE_BASE_URL'] ?? 'https://www.my4mlife.com/go/glp-1/thank-you';
const lambda = new LambdaClient({ region: process.env['AWS_REGION'] ?? 'us-east-2' });

// Copy: docs/launch/push-patch/async-visit-copy.md section 4. Generic text only; no PHI.
const SUBJECTS = ['One step left on your Push Patch order', 'Your Push Patch order is waiting on 2 minutes'];
const OPENERS = [
  'Your Push Patch order is paid, and one step is left before it can ship: a short health questionnaire so one of our network&#39;s licensed physicians can review your order. It takes about 2 minutes.',
  'It has been a day and your Push Patch order is still waiting on the 2-minute questionnaire. Your payment is safe, and nothing ships until it is done.',
];

const GLP1_OPENERS = (name: string) => [
  `Your ${name} order is paid, and one step is left before it can go to review: a short health questionnaire so one of our network&#39;s licensed physicians can look at your order. It takes about 2 minutes.`,
  `It has been a day and your ${name} order is still waiting on the 2-minute questionnaire. Your payment is safe, and nothing is prescribed or sent until it is done.`,
];

export interface Product { lane?: string; skuId?: string }

export function compose(sessionId: string, n: 0 | 1, product: Product = {}): { subject: string; html: string } {
  const g = isGlp1(product.lane, product.skuId);
  const name = g ? glp1Name(product.skuId) : 'Push Patch';
  const link = `${g ? GLP1_BASE : BASE}?session_id=${encodeURIComponent(sessionId)}`;
  const subject = g ? (n === 0 ? `One step left on your ${name} order` : `Your ${name} order is waiting on 2 minutes`) : SUBJECTS[n];
  const opener = g ? GLP1_OPENERS(name)[n] : OPENERS[n];
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#0a1628;line-height:1.55">
<p>Hi,</p>
<p>${opener}</p>
<p style="margin:24px 0"><a href="${link}" style="background:#00b894;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Finish your questionnaire</a></p>
<p>Review happens within an hour during business hours, 9 a.m.&ndash;5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.</p>
<p>If you have already finished, you can ignore this email. Questions? Reply here or write to support@my4mlife.com.</p>
<p>The My4MLife team</p>
<p style="color:#666;font-size:13px;margin-top:32px">My4MLife</p>
<p style="color:#666;font-size:12px"><em>${g ? 'Prescription medication. Prescribed only if approved by a licensed physician in our network after reviewing your health information.' : 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.'}</em></p>
</div>`;
  return { subject, html };
}

/** Synchronous invoke so a failed send is detected (and the claim released). */
export async function sendReminder(to: string, sessionId: string, n: 0 | 1, product: Product = {}): Promise<void> {
  const { subject, html } = compose(sessionId, n, product);
  const r = await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', from: 'support', to, subject, html })),
  }));
  if (r.FunctionError) throw new Error('email-sender failed');
}
