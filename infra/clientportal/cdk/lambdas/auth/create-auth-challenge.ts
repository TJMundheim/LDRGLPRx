import type { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import { randomInt } from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({});
const SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';

const codeHtml = (code: string) => `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px">
<h1 style="font-size:20px;color:#111">Your My4MLife login code</h1>
<p style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f4f4f5;padding:16px;text-align:center;border-radius:8px">${code}</p>
<p style="color:#666;font-size:13px">Expires in 5 minutes. If you didn't request this, ignore this email.</p>
<p style="color:#666;font-size:13px">Begin with the end in mind. — The My4MLife concierge</p></div>`;

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  if (event.request.challengeName !== 'CUSTOM_CHALLENGE') return event;

  const previous = event.request.session?.find(
    (s) => s.challengeName === 'CUSTOM_CHALLENGE' && s.challengeMetadata,
  );
  const code = previous?.challengeMetadata
    ? previous.challengeMetadata.replace(/^CODE-/, '')
    : String(randomInt(0, 1_000_000)).padStart(6, '0');

  const toEmail = event.request.userAttributes.email;
  if (toEmail) {
    await lambda.send(
      new InvokeCommand({
        FunctionName: SENDER_FN,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(
          JSON.stringify({
            kind: 'verification',
            to: toEmail,
            subject: 'Your My4MLife login code',
            html: codeHtml(code),
            text: `Your code is: ${code} (expires in 5 minutes).`,
          }),
        ),
      }),
    );
  }

  event.response.publicChallengeParameters = { email: toEmail ?? '' };
  event.response.privateChallengeParameters = { code };
  event.response.challengeMetadata = `CODE-${code}`;
  return event;
};
