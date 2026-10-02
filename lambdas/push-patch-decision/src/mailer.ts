// Sync invoke of the shared email-sender Lambda (kind 'info'). RequestResponse (not Event) because
// a payload carrying a ~900 KB PDF (~1.2 MB base64) exceeds the 256 KB async limit; the 6 MB sync
// limit has headroom, and a send failure surfaces here instead of vanishing.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

export interface Attachment { filename: string; contentBase64: string; contentType: string }
export interface Mail { to: string; subject: string; text: string; html: string; cc?: string; attachments?: Attachment[]; from?: 'support' }

export async function send(payload: Mail): Promise<void> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', ...payload })),
  }));
  if (res.FunctionError) throw new Error('email-sender failed');
}
