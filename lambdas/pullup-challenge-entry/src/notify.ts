import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { Entry } from './validate';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

export async function notifyTJ(e: Entry): Promise<void> {
  const [first, ...rest] = e.name.split(/\s+/);
  const initial = rest.length ? ` ${rest[rest.length - 1].charAt(0)}` : '';
  const div = e.division === 'men' ? "men's" : "women's";
  const text = [
    `Name: ${e.name}`, `Round: ${e.round}`, `Division: ${div}`, `Instagram: ${e.instagramUrl}`, `Age: ${e.age}`, `Bodyweight: ${e.bodyweightLb} lb`,
    `Text opt-in: ${e.smsOptIn ? 'yes' : 'no'}`, `Email opt-in: ${e.emailOptIn ? 'yes' : 'no'}`,
  ].join('\n');
  const html = `<p>${esc(text).replace(/\n/g, '<br>')}</p><p><a href="${esc(e.instagramUrl)}">Open the post</a></p>`;
  const res = await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender',
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({
      kind: 'info', from: 'drtj', to: 'drtj@my4mlife.com',
      subject: `Pull-Up Challenge entry: ${first}${initial} (${e.round}, ${div})`, html, text,
    })),
  }));
  if (res.FunctionError) throw new Error('email-sender failed');
}
