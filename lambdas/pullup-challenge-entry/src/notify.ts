import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { Entry } from './validate';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
export const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

/** Invokes email-sender (RequestResponse) and throws on a function error. */
export async function sendInfo(to: string, subject: string, text: string, html: string): Promise<void> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender',
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', from: 'drtj', to, subject, html, text })),
  }));
  if (res.FunctionError) throw new Error('email-sender failed');
}

/** Tells Dr. TJ about the entry. code === null means Stripe failed and the code must be issued by hand. */
export async function notifyTJ(e: Entry, code: string | null): Promise<void> {
  const [first, ...rest] = e.name.split(/\s+/);
  const initial = rest.length ? ` ${rest[rest.length - 1].charAt(0)}` : '';
  const text = [
    `Name: ${e.name}`, `Round: ${e.round}`, `Instagram: ${e.instagramUrl}`,
    code ? `Code issued: ${code}` : `No code issued: Stripe failed, issue code by hand for ${e.email}`,
    `Text opt-in: ${e.smsOptIn ? 'yes' : 'no'}`, `Email opt-in: ${e.emailOptIn ? 'yes' : 'no'}`,
  ].join('\n');
  const html = `<p>${esc(text).replace(/\n/g, '<br>')}</p><p><a href="${esc(e.instagramUrl)}">Open the post</a></p>`;
  await sendInfo('drtj@my4mlife.com', `Pull-Up Challenge entry: ${first}${initial} (${e.round})`, text, html);
}
