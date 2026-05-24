import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-secrets-manager
// Single secret named "stripe-keys" with nested live/test shape:
// { live: { secret_key, webhook_secret }, test: { secret_key, webhook_secret } }
// ---------------------------------------------------------------------------
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-secrets-manager', () => {
  const SecretsManagerClient = vi.fn().mockImplementation(() => ({ send: mockSend }));
  const GetSecretValueCommand = vi.fn().mockImplementation((input: any) => ({ input }));
  return { SecretsManagerClient, GetSecretValueCommand };
});

// ---------------------------------------------------------------------------
// Mock stripe — capture constructor args to assert apiVersion
// ---------------------------------------------------------------------------
const stripeConstructorCalls: Array<[string, Record<string, unknown>]> = [];
const mockStripeInstance = { _isMockStripe: true };
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation((key: string, opts: any) => {
    stripeConstructorCalls.push([key, opts]);
    return mockStripeInstance;
  });
  return { default: MockStripe };
});

// ---------------------------------------------------------------------------
// The single secret payload the lib must parse
// ---------------------------------------------------------------------------
const SECRET_NAME = 'stripe-keys';

const stripeKeysPayload = {
  live: { secret_key: 'sk_live_abc123', webhook_secret: null },
  test: { secret_key: 'sk_test_xyz789', webhook_secret: null },
};

function makeSecretResponse() {
  return { SecretString: JSON.stringify(stripeKeysPayload) };
}

// Import AFTER mocks
import { getStripeClient, __resetCacheForTests } from './index.js';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

beforeEach(() => {
  __resetCacheForTests();
  mockSend.mockReset();
  mockSend.mockResolvedValue(makeSecretResponse());
  stripeConstructorCalls.length = 0;
  delete process.env['STRIPE_MODE'];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getStripeClient — mode resolution + caching', () => {
  // (a) modeOverride wins over livemode
  it('(a) modeOverride=test wins even when livemode=true', async () => {
    const client = await getStripeClient({ livemode: true, modeOverride: 'test' });

    // Must have fetched the single stripe-keys secret
    const cmdCalls = (GetSecretValueCommand as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(cmdCalls.length).toBeGreaterThan(0);
    expect(cmdCalls[0][0].SecretId).toBe(SECRET_NAME);

    // Stripe must have been constructed with the TEST key
    expect(stripeConstructorCalls.length).toBeGreaterThan(0);
    expect(stripeConstructorCalls[0][0]).toBe(stripeKeysPayload.test.secret_key);
    expect(client).toBeDefined();
  });

  // (b) livemode=true → live key
  it('(b) livemode=true → Stripe constructed with live secret_key', async () => {
    await getStripeClient({ livemode: true });

    expect(stripeConstructorCalls.length).toBeGreaterThan(0);
    expect(stripeConstructorCalls[0][0]).toBe(stripeKeysPayload.live.secret_key);
  });

  // (c) livemode=false → test key
  it('(c) livemode=false → Stripe constructed with test secret_key', async () => {
    await getStripeClient({ livemode: false });

    expect(stripeConstructorCalls.length).toBeGreaterThan(0);
    expect(stripeConstructorCalls[0][0]).toBe(stripeKeysPayload.test.secret_key);
  });

  // (d) STRIPE_MODE env used when livemode unset and no modeOverride
  it('(d) STRIPE_MODE=live env → live key when livemode unset', async () => {
    process.env['STRIPE_MODE'] = 'live';

    await getStripeClient({});

    expect(stripeConstructorCalls.length).toBeGreaterThan(0);
    expect(stripeConstructorCalls[0][0]).toBe(stripeKeysPayload.live.secret_key);
  });

  // (e) default to 'test' when nothing is set
  it('(e) defaults to test mode when no livemode, modeOverride, or STRIPE_MODE', async () => {
    await getStripeClient({});

    expect(stripeConstructorCalls.length).toBeGreaterThan(0);
    expect(stripeConstructorCalls[0][0]).toBe(stripeKeysPayload.test.secret_key);
  });

  // (f) module-level cache: second call within warm container does NOT re-fetch secret
  it('(f) second call with same mode skips Secrets Manager fetch', async () => {
    await getStripeClient({ livemode: false });
    await getStripeClient({ livemode: false });

    // mockSend must have been called exactly once (cache hit on second call)
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  // (g) Stripe constructor receives a non-empty pinned apiVersion string
  it('(g) Stripe constructor called with pinned non-empty apiVersion', async () => {
    const client = await getStripeClient({ livemode: false });

    expect(stripeConstructorCalls.length).toBeGreaterThan(0);
    const opts = stripeConstructorCalls[0][1];
    const apiVersion = opts?.apiVersion as string | undefined;
    expect(typeof apiVersion).toBe('string');
    expect(apiVersion!.length).toBeGreaterThan(0);
    expect(client).toBe(mockStripeInstance);
  });
});
