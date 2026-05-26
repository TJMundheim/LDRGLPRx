import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const mockSmSend = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: mockSmSend })),
  GetSecretValueCommand: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetch);

import { handler } from './handler.js';
import { __resetCacheForTests } from './zoom-client.js';

const CREDS = { client_id: 'cid', account_id: 'acc', client_secret: 'sec' };
const TOKEN_RESP = { access_token: 'tok123', expires_in: 3600 };

function mockTokenFetch(): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify(TOKEN_RESP),
    json: async () => TOKEN_RESP,
  });
}

function mockApiResponse(body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetCacheForTests();
  mockSmSend.mockResolvedValue({ SecretString: JSON.stringify(CREDS) });
});

describe('token fetch + cache', () => {
  it('fetches a token using Basic auth and caches it', async () => {
    mockTokenFetch();
    mockApiResponse({ meetings: [] });

    const res = await handler({ action: 'listMeetings', input: {} });
    expect(res.ok).toBe(true);

    // Token was fetched once
    const tokenCall = mockFetch.mock.calls[0];
    expect(tokenCall[0]).toContain('zoom.us/oauth/token');
    expect(tokenCall[1].headers.Authorization).toContain('Basic ');
  });

  it('caches token across multiple invocations (one fetch per warm container)', async () => {
    mockTokenFetch();
    mockApiResponse({ meetings: [] });
    mockApiResponse({ meetings: [] });

    await handler({ action: 'listMeetings', input: {} });
    await handler({ action: 'listMeetings', input: {} });

    const tokenCalls = mockFetch.mock.calls.filter((c) => (c[0] as string).includes('oauth/token'));
    expect(tokenCalls).toHaveLength(1);
  });

  it('re-fetches token after expiry', async () => {
    // First call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'tok1', expires_in: 0 }),
      json: async () => ({ access_token: 'tok1', expires_in: 0 }),
    });
    mockApiResponse({ meetings: [] });

    // Second call — token expired
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'tok2', expires_in: 3600 }),
      json: async () => ({ access_token: 'tok2', expires_in: 3600 }),
    });
    mockApiResponse({ meetings: [] });

    await handler({ action: 'listMeetings', input: {} });
    await handler({ action: 'listMeetings', input: {} });

    const tokenCalls = mockFetch.mock.calls.filter((c) => (c[0] as string).includes('oauth/token'));
    expect(tokenCalls).toHaveLength(2);
  });
});

describe('secret cache hit', () => {
  it('fetches secret only once across multiple invocations', async () => {
    mockTokenFetch();
    mockApiResponse({ meetings: [] });
    mockApiResponse({ meetings: [] });

    await handler({ action: 'listMeetings', input: {} });
    await handler({ action: 'listMeetings', input: {} });

    expect(mockSmSend).toHaveBeenCalledTimes(1);
  });
});

describe('createMeeting happy path', () => {
  it('returns meeting data on success', async () => {
    const meeting = { id: 123456789, join_url: 'https://zoom.us/j/123', topic: 'Test' };
    mockTokenFetch();
    mockApiResponse(meeting);

    const res = await handler({
      action: 'createMeeting',
      input: { topic: 'Test', startTimeIso: '2026-06-01T10:00:00Z', durationMin: 60 },
    });

    expect(res.ok).toBe(true);
    expect(res.data).toEqual(meeting);

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain('/users/me/meetings');
    expect(apiCall[1].method).toBe('POST');
    const body = JSON.parse(apiCall[1].body);
    expect(body.type).toBe(2); // scheduled
    expect(body.settings.auto_recording).toBe('cloud');
    expect(body.settings.waiting_room).toBe(false);
  });

  it('uses type 8 for recurring meetings', async () => {
    mockTokenFetch();
    mockApiResponse({ id: 999 });

    await handler({
      action: 'createMeeting',
      input: {
        topic: 'Weekly', startTimeIso: '2026-06-01T10:00:00Z', durationMin: 30,
        recurrence: { type: 2, repeat_interval: 1 },
      },
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.type).toBe(8);
    expect(body.recurrence).toEqual({ type: 2, repeat_interval: 1 });
  });
});

describe('getMeetingAttendance', () => {
  it('returns participants list', async () => {
    const participants = [
      { user_email: 'alice@example.com', name: 'Alice', join_time: '10:00', leave_time: '11:00', duration: 60 },
    ];
    mockTokenFetch();
    mockApiResponse({ participants });

    const res = await handler({ action: 'getMeetingAttendance', input: { meetingId: '987654321' } });

    expect(res.ok).toBe(true);
    expect((res.data as any).participants).toEqual(participants);
    expect(mockFetch.mock.calls[1][0]).toContain('/report/meetings/987654321/participants');
  });
});

describe('error response shape', () => {
  it('returns ok:false with error message on Zoom API failure', async () => {
    mockTokenFetch();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Meeting not found',
    });

    const res = await handler({ action: 'getMeetingAttendance', input: { meetingId: 'bad' } });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('404');
  });

  it('returns ok:false on unknown action', async () => {
    const res = await handler({ action: 'unknownAction' as any, input: {} });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Unknown action');
  });
});
