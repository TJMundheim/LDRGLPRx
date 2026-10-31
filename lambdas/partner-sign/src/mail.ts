// Thin wrapper around the shared email-sender Lambda (kind 'info', sent as Dr. TJ).
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
export const NOTIFY_TO = process.env.NOTIFY_TO ?? 'drtj@my4mlife.com';

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender',
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', from: 'drtj', to, subject, html, text })),
  }));
}
