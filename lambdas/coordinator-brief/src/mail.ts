// Invokes the shared email-sender Lambda with the rendered pre-call brief.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const NOTIFY_TO = process.env.NOTIFY_TO ?? 'drtj@my4mlife.com';

const lambda = new LambdaClient({ region: REGION });

export interface MailBrief {
  name: string;
  bestTime: string;
  topLane: string;
  html: string;
  text: string;
  /** Overrides the default "[Pre-call brief]" subject prefix — e.g. when a
   *  MindSpan assessment completion regenerates an already-sent brief. */
  subjectPrefix?: string;
}

export async function mailBrief(p: MailBrief): Promise<void> {
  const prefix = p.subjectPrefix ?? '[Pre-call brief]';
  const subject = `${prefix} ${p.name} — ${p.topLane} — call ${p.bestTime}`;
  await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to: NOTIFY_TO, subject, html: p.html, text: p.text })),
  }));
}
