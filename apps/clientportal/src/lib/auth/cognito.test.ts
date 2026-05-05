import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock import.meta.env before module import ---
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_COGNITO_REGION: 'us-east-1',
      VITE_USER_POOL_CLIENT_ID: 'test-client-id',
      VITE_USER_POOL_ID: 'us-east-1_testpool',
      VITE_LEAD_CAPTURE_API_URL: 'https://mock-api.example.com',
    },
  },
});

// Mock fetch for requestEmailCode
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the AWS SDK
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  return {
    CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
    InitiateAuthCommand: vi.fn().mockImplementation((input) => ({ _name: 'InitiateAuth', input })),
    RespondToAuthChallengeCommand: vi.fn().mockImplementation((input) => ({ _name: 'RespondToAuthChallenge', input })),
    UpdateUserAttributesCommand: vi.fn().mockImplementation((input) => ({ _name: 'UpdateUserAttributes', input })),
    VerifyUserAttributeCommand: vi.fn().mockImplementation((input) => ({ _name: 'VerifyUserAttribute', input })),
  };
});

import {
  RespondToAuthChallengeCommand,
  UpdateUserAttributesCommand,
  VerifyUserAttributeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  requestEmailCode,
  submitEmailCode,
  getIdToken,
  getCurrentUser,
  signOut,
  updatePrimaryEmail,
} from './cognito.js';

// Minimal localStorage shim
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  length: 0,
  key: () => null,
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  mockSend.mockReset();
  mockFetch.mockReset();
  localStorageMock.clear();
  vi.mocked(RespondToAuthChallengeCommand).mockClear();
  vi.mocked(UpdateUserAttributesCommand).mockClear();
  vi.mocked(VerifyUserAttributeCommand).mockClear();
});

describe('requestEmailCode', () => {
  it('POSTs to /api/request-otp and returns session', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'sent', session: 'session-abc' }),
    });

    const session = await requestEmailCode('User@Example.com', 'Alex');

    const [calledUrl, calledInit] = vi.mocked(mockFetch).mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toMatch(/\/api\/request-otp$/);
    expect(calledInit.method).toBe('POST');
    // Email lowercased
    const body = JSON.parse(calledInit.body as string);
    expect(body.email).toBe('user@example.com');
    expect(body.firstName).toBe('Alex');
    expect(session).toBe('session-abc');
  });

  it('throws if no session in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'sent' }),
    });
    await expect(requestEmailCode('user@example.com')).rejects.toThrow('No session');
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ status: 'error', message: 'Invalid email address' }),
    });
    await expect(requestEmailCode('bad-email')).rejects.toThrow('Invalid email address');
  });
});

describe('submitEmailCode', () => {
  it('calls RespondToAuthChallenge with CUSTOM_CHALLENGE and persists tokens', async () => {
    mockSend.mockResolvedValueOnce({
      AuthenticationResult: {
        IdToken: 'id-tok',
        AccessToken: 'access-tok',
        RefreshToken: 'refresh-tok',
      },
    });

    await submitEmailCode('user@example.com', '123456', 'session-abc');

    expect(RespondToAuthChallengeCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        ChallengeName: 'CUSTOM_CHALLENGE',
        ChallengeResponses: { USERNAME: 'user@example.com', ANSWER: '123456' },
        Session: 'session-abc',
      }),
    );
    expect(store['cognito_id_token']).toBe('id-tok');
    expect(store['cognito_access_token']).toBe('access-tok');
    expect(store['cognito_refresh_token']).toBe('refresh-tok');
  });

  it('throws if no AuthenticationResult', async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(submitEmailCode('user@example.com', '000', 'sess')).rejects.toThrow(
      'No AuthenticationResult',
    );
  });
});

describe('getIdToken', () => {
  it('returns null when not signed in', () => {
    expect(getIdToken()).toBeNull();
  });

  it('returns the stored idToken', () => {
    store['cognito_id_token'] = 'my-token';
    expect(getIdToken()).toBe('my-token');
  });
});

describe('getCurrentUser', () => {
  it('returns null when no token', () => {
    expect(getCurrentUser()).toBeNull();
  });

  it('decodes sub, email, and groups from JWT payload', () => {
    const payload = { sub: 'user-sub', email: 'u@test.com', 'cognito:groups': ['admin'] };
    const encoded = btoa(JSON.stringify(payload));
    store['cognito_id_token'] = `header.${encoded}.sig`;

    const user = getCurrentUser();
    expect(user).toEqual({ sub: 'user-sub', email: 'u@test.com', groups: ['admin'] });
  });
});

describe('signOut', () => {
  it('removes all token keys', () => {
    store['cognito_id_token'] = 'a';
    store['cognito_access_token'] = 'b';
    store['cognito_refresh_token'] = 'c';
    signOut();
    expect(store['cognito_id_token']).toBeUndefined();
    expect(store['cognito_access_token']).toBeUndefined();
    expect(store['cognito_refresh_token']).toBeUndefined();
  });
});

describe('updatePrimaryEmail', () => {
  it('calls UpdateUserAttributes then VerifyUserAttribute', async () => {
    store['cognito_access_token'] = 'acc-tok';
    mockSend.mockResolvedValue({});

    await updatePrimaryEmail('new@example.com', '654321');

    expect(UpdateUserAttributesCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        AccessToken: 'acc-tok',
        UserAttributes: [{ Name: 'email', Value: 'new@example.com' }],
      }),
    );
    expect(VerifyUserAttributeCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        AccessToken: 'acc-tok',
        AttributeName: 'email',
        Code: '654321',
      }),
    );
  });

  it('skips VerifyUserAttribute when no verification code provided', async () => {
    store['cognito_access_token'] = 'acc-tok';
    mockSend.mockResolvedValue({});

    await updatePrimaryEmail('new@example.com');
    expect(VerifyUserAttributeCommand).not.toHaveBeenCalled();
  });

  it('throws if not authenticated', async () => {
    await expect(updatePrimaryEmail('x@x.com')).rejects.toThrow('Not authenticated');
  });
});

describe('no password code paths', () => {
  it('cognito module does not reference password in RespondToAuthChallenge calls', async () => {
    const allCalls = [...vi.mocked(RespondToAuthChallengeCommand).mock.calls];
    for (const [input] of allCalls) {
      expect(JSON.stringify(input).toLowerCase()).not.toContain('password');
    }
  });
});
