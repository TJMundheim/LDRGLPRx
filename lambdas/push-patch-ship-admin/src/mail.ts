import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
export async function send(m: { to: string; subject: string; text: string; html: string; from: 'support' }): Promise<void> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender',
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', ...m })),
  }));
  if (res.FunctionError) throw new Error('email-sender failed');
}
