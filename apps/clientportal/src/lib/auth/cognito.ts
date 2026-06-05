/**
 * Passwordless Cognito auth — OTP/magic-code flow via CUSTOM_AUTH.
 * Reads VITE_USER_POOL_ID, VITE_USER_POOL_CLIENT_ID, VITE_COGNITO_REGION from import.meta.env.
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  UpdateUserAttributesCommand,
  VerifyUserAttributeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const REGION = import.meta.env.VITE_COGNITO_REGION as string;
const CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID as string;
const LEAD_API_URL = (import.meta.env.VITE_LEAD_CAPTURE_API_URL as string | undefined) ?? '';

function makeClient(): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient({ region: REGION });
}

const STORAGE_KEYS = {
  idToken: 'cognito_id_token',
  accessToken: 'cognito_access_token',
  refreshToken: 'cognito_refresh_token',
} as const;

/**
 * Step 1: request a one-time code sent to the user's email.
 * Calls the /api/request-otp endpoint which auto-creates the Cognito user if needed.
 * Returns the session string.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function requestEmailCode(email: string, firstName?: string): Promise<string> {
  const url = `${LEAD_API_URL}/api/request-otp`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), firstName }),
  });
  const data = await res.json() as { status: string; session?: string; message?: string };
  if (res.status === 429 || data.status === 'rate_limited') {
    throw new RateLimitError(data.message ?? 'A code was recently sent. Check your inbox before requesting another.');
  }
  if (!res.ok) {
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }
  if (!data.session) throw new Error(data.message ?? 'No session returned from server');
  return data.session;
}

/** Step 2: submit the code. Persists tokens to localStorage on success. */
export async function submitEmailCode(
  email: string,
  code: string,
  session: string,
): Promise<void> {
  const cmd = new RespondToAuthChallengeCommand({
    ClientId: CLIENT_ID,
    ChallengeName: 'CUSTOM_CHALLENGE',
    Session: session,
    ChallengeResponses: { USERNAME: email, ANSWER: code },
  });
  const result = await makeClient().send(cmd);
  const auth = result.AuthenticationResult;
  if (!auth) throw new Error('No AuthenticationResult from RespondToAuthChallenge');
  localStorage.setItem(STORAGE_KEYS.idToken, auth.IdToken ?? '');
  localStorage.setItem(STORAGE_KEYS.accessToken, auth.AccessToken ?? '');
  localStorage.setItem(STORAGE_KEYS.refreshToken, auth.RefreshToken ?? '');
}

/** Returns the persisted idToken, or null if not signed in. */
export function getIdToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.idToken);
  } catch {
    return null;
  }
}

/**
 * Refreshes the ID token using the stored refresh token.
 *
 * Cognito's REFRESH_TOKEN_AUTH flow returns a new IdToken + AccessToken but
 * does NOT rotate the refresh token (the existing one keeps working until its
 * own 30-day expiry). Persists the new tokens to localStorage and returns the
 * new IdToken.
 *
 * Throws if the refresh token is missing, expired, or revoked — the caller is
 * expected to treat that as a real sign-out (clear local state, route the
 * user back to the sign-in screen).
 *
 * Concurrent callers share the same in-flight refresh promise so we don't
 * fire N parallel refreshes when an expired token causes multiple AppSync
 * requests to 401 simultaneously.
 */
let inflightRefresh: Promise<string> | null = null;

export async function refreshIdToken(): Promise<string> {
  if (inflightRefresh) return inflightRefresh;

  const refreshToken = (() => {
    try { return localStorage.getItem(STORAGE_KEYS.refreshToken); } catch { return null; }
  })();
  if (!refreshToken) throw new Error('No refresh token available');

  inflightRefresh = (async () => {
    try {
      const cmd = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      });
      const result = await makeClient().send(cmd);
      const auth = result.AuthenticationResult;
      if (!auth?.IdToken || !auth?.AccessToken) {
        throw new Error('Refresh did not return new tokens');
      }
      try {
        localStorage.setItem(STORAGE_KEYS.idToken, auth.IdToken);
        localStorage.setItem(STORAGE_KEYS.accessToken, auth.AccessToken);
        // Cognito does NOT rotate the refresh token on REFRESH_TOKEN_AUTH —
        // the existing one keeps working until its own expiry.
      } catch { /* ignore non-browser envs */ }
      return auth.IdToken;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

export interface CognitoUser {
  sub: string;
  email: string;
  groups: string[];
  firstName?: string;
  lastName?: string;
}

/** Decodes idToken JWT claims. Returns null if no token is present. */
export function getCurrentUser(): CognitoUser | null {
  const token = getIdToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      sub: decoded.sub ?? '',
      email: decoded.email ?? '',
      groups: (decoded['cognito:groups'] as string[]) ?? [],
      firstName: (decoded.given_name as string) || undefined,
      lastName: (decoded.family_name as string) || undefined,
    };
  } catch {
    return null;
  }
}

// Storage keys that hold per-user assessment / workbook / intake state.
// Cleared on sign-out so the next user's hydrated data isn't shadowed by
// the previous session's cache (Test 2 cache bug, 2026-06-02).
const PER_USER_LOCAL_KEYS = [
  'audit-v1',
  'intake-audit-scores-v1',
  'intake-complete-v1',
  'basics-v1',
  'workbook-v1',
  'workbook-factor-scores-v1',
  'workbook-priorities-v1',
];

/** Clears stored tokens AND per-user app caches. */
export function signOut(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.idToken);
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    for (const k of PER_USER_LOCAL_KEYS) localStorage.removeItem(k);
    // Also clear any workbook-* keys not in the explicit list (forward-compat
    // for future workbook week storage).
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('workbook-')) localStorage.removeItem(key);
    }
  } catch {
    // ignore in non-browser envs
  }
}

/**
 * Update the user's primary email (two-step: UpdateUserAttributes then VerifyUserAttribute).
 * Caller must invoke this function with the verification code once received.
 * Requires a valid accessToken in localStorage.
 */
export async function updatePrimaryEmail(newEmail: string, verificationCode?: string): Promise<void> {
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (!accessToken) throw new Error('Not authenticated');

  const updateCmd = new UpdateUserAttributesCommand({
    AccessToken: accessToken,
    UserAttributes: [{ Name: 'email', Value: newEmail }],
  });
  await makeClient().send(updateCmd);

  if (verificationCode) {
    const verifyCmd = new VerifyUserAttributeCommand({
      AccessToken: accessToken,
      AttributeName: 'email',
      Code: verificationCode,
    });
    await makeClient().send(verifyCmd);
  }
}
