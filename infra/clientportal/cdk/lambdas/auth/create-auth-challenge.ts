import type { CreateAuthChallengeTriggerHandler } from 'aws-lambda';
import { randomInt } from 'crypto';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@my4mlife.com';

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  if (event.request.challengeName !== 'CUSTOM_CHALLENGE') {
    return event;
  }

  let code: string;
  const previous = event.request.session?.find(
    (s) => s.challengeName === 'CUSTOM_CHALLENGE' && s.challengeMetadata,
  );
  if (previous?.challengeMetadata) {
    // Reuse the same code across retries within the same auth attempt.
    code = previous.challengeMetadata.replace(/^CODE-/, '');
  } else {
    code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  const toEmail = event.request.userAttributes.email;
  if (toEmail) {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: FROM_EMAIL,
        Destination: { ToAddresses: [toEmail] },
        Content: {
          Simple: {
            Subject: { Data: 'Your 4M Life login code' },
            Body: {
              Text: {
                Data: `Your code is: ${code}  (expires in 5 minutes).\n\nIf you didn't request this, ignore this email.`,
              },
            },
          },
        },
      }),
    );
  }

  event.response.publicChallengeParameters = {
    email: toEmail ?? '',
  };
  event.response.privateChallengeParameters = { code };
  event.response.challengeMetadata = `CODE-${code}`;
  return event;
};
