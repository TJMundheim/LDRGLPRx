// Patient refund confirmation. Sent via the shared email-sender (kind 'info'). No PHI: no product reason, no clinical detail.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export async function sendRefundEmail(to: string, firstName: string): Promise<void> {
  const text = `Hi ${firstName || 'there'},\n\nYour Push Patch refund has been issued. It may take 5–10 business days to appear on your statement.\n\n` +
    `Questions? Reply to this email or write to support@my4mlife.com.\n\nThe My4MLife team\n\nMy4MLife`;
  const html = text.split('\n\n').map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const res = await lambda.send(new InvokeCommand({
    FunctionName: SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to, subject: 'Your Push Patch refund has been issued', text, html, from: 'support' })),
  }));
  if (res.FunctionError) throw new Error('email-sender failed');
}
