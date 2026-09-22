// Thin wrapper around the shared email-sender Lambda (kind: 'info' — the
// from address is chosen by email-sender itself).
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

export const NOTIFY_TO = process.env.NOTIFY_TO ?? 'drtj@my4mlife.com';

const lambda = new LambdaClient({ region: REGION });

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to, subject, html, text })),
  }));
}
