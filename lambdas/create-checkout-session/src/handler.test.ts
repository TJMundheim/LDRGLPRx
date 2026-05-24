import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Hoisted mocks — must be declared before vi.mock calls
const mockCreate = vi.hoisted(() => vi.fn());
const mockGetStripeClient = vi.hoisted(() => vi.fn());
const mockSmSend = vi.hoisted(() => vi.fn());
const mockDdbSend = vi.hoisted(() => vi.fn());

vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: mockGetStripeClient,
}));

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: mockSmSend })),
  GetSecretValueCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({ send: mockDdbSend })),
  UpdateItemCommand: vi.fn(),
}));

import { handler } from './handler.js';

const ADMIN_PASSWORD = 'secret123';

function makeEvent(overrides: { path?: string; method?: string; body?: string; headers?: Record<string, string> } = {}): APIGatewayProxyEventV2 {
  const path = overrides.path ?? '/api/create-checkout-session';
  const method = overrides.method ?? 'POST';
  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json', origin: 'https://my4mlife.com', ...overrides.headers },
    requestContext: {
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '1.2.3.4', userAgent: 'test' },
      accountId: '123', apiId: 'test', domainName: '', domainPrefix: '',
      requestId: 'r1', routeKey: '', stage: '$default', time: '', timeEpoch: 0,
    },
    body: overrides.body ?? JSON.stringify({ priceId: 'price_test123' }),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test', id: 'cs_test_123' });
  mockGetStripeClient.mockResolvedValue({ checkout: { sessions: { create: mockCreate } } });
  mockSmSend.mockResolvedValue({ SecretString: JSON.stringify({ password: ADMIN_PASSWORD }) });
  mockDdbSend.mockResolvedValue({});
});

describe('default route POST /api/create-checkout-session', () => {
  it('returns 200 with url on valid request', async () => {
    const res = await handler(makeEvent()) as any;
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).url).toBe('https://checkout.stripe.com/pay/cs_test');
  });

  it('ignores body mode field — getStripeClient called with modeOverride=undefined', async () => {
    await handler(makeEvent({ body: JSON.stringify({ priceId: 'price_abc', mode: 'test' }) }));
    expect(mockGetStripeClient).toHaveBeenCalledWith({ modeOverride: undefined });
  });

  it('sets isDemo=false in session metadata when STRIPE_MODE=live', async () => {
    process.env['STRIPE_MODE'] = 'live';
    await handler(makeEvent());
    expect(mockCreate.mock.calls[0][0].metadata.isDemo).toBe('false');
    delete process.env['STRIPE_MODE'];
  });

  it('returns 400 when priceId missing', async () => {
    const res = await handler(makeEvent({ body: JSON.stringify({}) })) as any;
    expect(res.statusCode).toBe(400);
  });

  it('handles OPTIONS preflight with 204', async () => {
    const res = await handler(makeEvent({ method: 'OPTIONS' })) as any;
    expect(res.statusCode).toBe(204);
  });
});

describe('admin route POST /api/admin/demo-checkout-session', () => {
  const adminPath = '/api/admin/demo-checkout-session';
  const validCreds = () => `Basic ${Buffer.from(`user:${ADMIN_PASSWORD}`).toString('base64')}`;

  it('returns 401 when Authorization header is missing', async () => {
    const res = await handler(makeEvent({ path: adminPath })) as any;
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    const res = await handler(makeEvent({
      path: adminPath,
      headers: { authorization: `Basic ${Buffer.from('user:wrongpass').toString('base64')}` },
    })) as any;
    expect(res.statusCode).toBe(401);
  });

  it('forces modeOverride=test regardless of body mode field', async () => {
    await handler(makeEvent({
      path: adminPath,
      body: JSON.stringify({ priceId: 'price_test', mode: 'live' }),
      headers: { authorization: validCreds() },
    }));
    expect(mockGetStripeClient).toHaveBeenCalledWith({ modeOverride: 'test' });
  });

  it('sets isDemo=true in session metadata', async () => {
    await handler(makeEvent({
      path: adminPath,
      headers: { authorization: validCreds() },
    }));
    expect(mockCreate.mock.calls[0][0].metadata.isDemo).toBe('true');
  });

  it('returns 200 with url when auth is correct', async () => {
    const res = await handler(makeEvent({
      path: adminPath,
      headers: { authorization: validCreds() },
    })) as any;
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).url).toBeTruthy();
  });
});
