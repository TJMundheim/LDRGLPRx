import type { DefineAuthChallengeTriggerHandler } from 'aws-lambda';

export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const sessions = event.request.session ?? [];

  if (sessions.length === 0) {
    // First call — issue a custom challenge.
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    return event;
  }

  const last = sessions[sessions.length - 1];
  if (
    last.challengeName === 'CUSTOM_CHALLENGE' &&
    last.challengeResult === true
  ) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  if (sessions.length >= 3) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  // Re-issue another challenge attempt.
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  return event;
};
