import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appsyncClient } from './client.js';

const TEST_URL = 'https://test.appsync.example/graphql';
const TEST_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.test-payload.sig';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('appsyncClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('attaches Authorization header with the id token', async () => {
    const mockFetch = makeFetch({ data: { getMyProfile: { id: 'u1' } } });
    global.fetch = mockFetch;

    const request = appsyncClient({ url: TEST_URL, getToken: () => TEST_TOKEN });
    await request({ query: 'query GetMyProfile { getMyProfile { id } }' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [_url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(TEST_TOKEN);
  });

  it('POSTs to VITE_APPSYNC_URL with the correct query string for listMyOutcomes', async () => {
    const expectedQuery = `
      query ListMyOutcomes($limit: Int, $nextToken: String) {
        listMyOutcomes(limit: $limit, nextToken: $nextToken) {
          nextToken
          items { id owner weekISO month week freeText submittedAt createdAt updatedAt
  scores { domain score } }
        }
      }
    `;

    const mockFetch = makeFetch({
      data: { listMyOutcomes: { items: [], nextToken: null } },
    });
    global.fetch = mockFetch;

    const request = appsyncClient({ url: TEST_URL, getToken: () => TEST_TOKEN });
    await request({ query: expectedQuery, variables: { limit: 10, nextToken: undefined } });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TEST_URL);

    const body = JSON.parse(init.body as string);
    expect(body.query).toBe(expectedQuery);
    expect(body.variables).toEqual({ limit: 10, nextToken: undefined });
  });

  it('uses Content-Type application/json', async () => {
    const mockFetch = makeFetch({ data: {} });
    global.fetch = mockFetch;

    const request = appsyncClient({ url: TEST_URL, getToken: () => TEST_TOKEN });
    await request({ query: '{ __typename }' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws when GraphQL response contains errors', async () => {
    const mockFetch = makeFetch({
      data: null,
      errors: [{ message: 'Unauthorized' }],
    });
    global.fetch = mockFetch;

    const request = appsyncClient({ url: TEST_URL, getToken: () => TEST_TOKEN });
    await expect(request({ query: '{ __typename }' })).rejects.toThrow('GraphQL error(s): Unauthorized');
  });

  it('throws when HTTP status is not ok', async () => {
    const mockFetch = makeFetch({}, false, 403);
    global.fetch = mockFetch;

    const request = appsyncClient({ url: TEST_URL, getToken: () => TEST_TOKEN });
    await expect(request({ query: '{ __typename }' })).rejects.toThrow('AppSync HTTP error 403');
  });

  it('throws when no token is available', async () => {
    const request = appsyncClient({ url: TEST_URL, getToken: () => null });
    await expect(request({ query: '{ __typename }' })).rejects.toThrow(
      'No Cognito ID token available',
    );
  });

  it('throws when URL is not set', async () => {
    const request = appsyncClient({ url: '', getToken: () => TEST_TOKEN });
    await expect(request({ query: '{ __typename }' })).rejects.toThrow('VITE_APPSYNC_URL is not set');
  });
});
