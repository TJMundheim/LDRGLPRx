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

const mockSsmSend = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: vi.fn().mockImplementation(() => ({ send: mockSsmSend })),
  GetParameterCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({ send: mockDdbSend })),
  UpdateItemCommand: vi.fn(),
}));

// push-patch-prices.json is generated later by infra/scripts/stripe-push-patch-prices.mjs — fake IDs here.
vi.mock('./push-patch-prices.json', () => {
  const data = {
    test: {
      'push-patch-wolverine': 'price_test_wolverine',
      'push-patch-glutathione-ghk': 'price_test_glutathione_ghk',
    },
    live: {
      'push-patch-wolverine': 'price_live_wolverine',
      'push-patch-glutathione-ghk': 'price_live_glutathione_ghk',
    },
  };
  return { default: data, ...data };
});

import { handler } from './handler.js';
import { resetTestPriceCache } from './test-price.js';

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
  resetTestPriceCache();
  mockSsmSend.mockResolvedValue({ Parameter: { Value: JSON.stringify({ token: 'goodtoken', expiresAt: new Date(Date.now() + 86_400_000).toISOString() }) } });
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

describe('push-patch SKUs', () => {
  const adminPath = '/api/admin/demo-checkout-session';
  const validCreds = () => `Basic ${Buffer.from(`user:${ADMIN_PASSWORD}`).toString('base64')}`;
  const okAnswers = { seizures: false, pacemaker: false, pregnant: false, metalImplant: false, woundOrScar: true, suitableArea: true };
  const screen = (answers: Record<string, unknown> = {}, version = 'pp-screen-v1') => ({ version, answers: { ...okAnswers, ...answers } });
  const patchBody = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ skuId: 'push-patch-wolverine', wear: '12h', screening: screen(), ...extra });

  it('creates a payment session with US shipping, live price, and wear metadata (live mode)', async () => {
    process.env['STRIPE_MODE'] = 'live';
    try {
      const res = await handler(makeEvent({ body: patchBody() })) as any;
      expect(res.statusCode).toBe(200);
      const args = mockCreate.mock.calls[0][0];
      expect(args.mode).toBe('payment');
      expect(args.shipping_address_collection).toEqual({ allowed_countries: ['US'] });
      expect(args.line_items).toEqual([{ price: 'price_live_wolverine', quantity: 1 }]);
      expect(args.metadata.skuIds).toBe('push-patch-wolverine');
      expect(args.metadata.wear).toBe('12h');
      expect(args.metadata.isDemo).toBe('false');
    } finally {
      delete process.env['STRIPE_MODE'];
    }
  });

  it('uses the test price when STRIPE_MODE is unset (defaults to test)', async () => {
    delete process.env['STRIPE_MODE'];
    await handler(makeEvent({ body: patchBody({ skuId: 'push-patch-glutathione-ghk', wear: '12h' }) }));
    const args = mockCreate.mock.calls[0][0];
    expect(args.line_items).toEqual([{ price: 'price_test_glutathione_ghk', quantity: 1 }]);
    expect(args.metadata.wear).toBe('12h');
    expect(args.metadata.skuIds).toBe('push-patch-glutathione-ghk');
  });

  it('uses the live price for a second blend in live mode', async () => {
    process.env['STRIPE_MODE'] = 'live';
    try {
      await handler(makeEvent({ body: patchBody({ skuId: 'push-patch-glutathione-ghk' }) }));
      expect(mockCreate.mock.calls[0][0].line_items).toEqual([{ price: 'price_live_glutathione_ghk', quantity: 1 }]);
    } finally {
      delete process.env['STRIPE_MODE'];
    }
  });

  it('cancel_url points at /go/push-patch and success_url at /go/push-patch/thank-you with session_id and sku', async () => {
    await handler(makeEvent({ body: patchBody() }));
    const args = mockCreate.mock.calls[0][0];
    expect(args.cancel_url.startsWith('https://www.my4mlife.com/go/push-patch')).toBe(true);
    expect(args.success_url).toBe(
      'https://www.my4mlife.com/go/push-patch/thank-you?session_id={CHECKOUT_SESSION_ID}&sku=push-patch-wolverine',
    );
  });

  it('does not collect a phone number for push-patch SKUs but keeps US shipping', async () => {
    await handler(makeEvent({ body: patchBody() }));
    const args = mockCreate.mock.calls[0][0];
    expect(args.phone_number_collection).toBeUndefined();
    expect(args.shipping_address_collection).toEqual({ allowed_countries: ['US'] });
  });

  it('still collects phone for non-patch SKUs', async () => {
    await handler(makeEvent({ body: JSON.stringify({ skuId: 'biome-ns-ultra' }) }));
    expect(mockCreate.mock.calls[0][0].phone_number_collection).toEqual({ enabled: true });
  });

  it("defaults wear to 12h when it is missing", async () => {
    const res = await handler(makeEvent({ body: JSON.stringify({ skuId: 'push-patch-wolverine', screening: screen() }) })) as any;
    expect(res.statusCode).toBe(200);
    expect(mockCreate.mock.calls[0][0].metadata.wear).toBe('12h');
  });

  it.each(['14h', '24h'])("returns 400 'wear must be 12h' when wear is '%s'", async (w) => {
    const res = await handler(makeEvent({ body: patchBody({ wear: w }) })) as any;
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('wear must be 12h');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ignores wear for non-patch SKUs (biome-ns-ultra)', async () => {
    const res = await handler(makeEvent({ body: JSON.stringify({ skuId: 'biome-ns-ultra', wear: '24h' }) })) as any;
    expect(res.statusCode).toBe(200);
    const args = mockCreate.mock.calls[0][0];
    expect(args.metadata.wear).toBeUndefined();
    expect(args.metadata.skuIds).toBe('biome-ns-ultra');
    expect(args.line_items[0].price).toBe('price_1Tp83ABSbDAyoIVynsgk0BAK');
  });

  it('adds screening metadata on pass', async () => {
    await handler(makeEvent({ body: patchBody() }));
    const m = mockCreate.mock.calls[0][0].metadata;
    expect(m.screen_v).toBe('pp-screen-v1');
    expect(new Date(m.screen_at).toISOString()).toBe(m.screen_at);
    expect(m.screen_denied).toBe('seizures,pacemaker,pregnant');
    expect(m.screen_placement).toBe('metalImplant:no,woundOrScar:yes');
    expect(m.screen_area).toBe('yes');
  });

  it('adds v2 screening metadata (5 answers, no metalImplant)', async () => {
    const answers = { seizures: false, pacemaker: false, pregnant: false, woundOrScar: true, suitableArea: true };
    await handler(makeEvent({ body: patchBody({ screening: { version: 'pp-screen-v2', answers } }) }));
    const m = mockCreate.mock.calls[0][0].metadata;
    expect(m.screen_v).toBe('pp-screen-v2');
    expect(m.screen_denied).toBe('seizures,pacemaker,pregnant');
    expect(m.screen_placement).toBe('woundOrScar:yes');
    expect(m.screen_area).toBe('yes');
  });

  it.each([
    [{ seizures: true }],
    [{ pacemaker: true }],
    [{ pregnant: true }],
    [{ suitableArea: false }],
    [{ seizures: true, pacemaker: true, pregnant: true }],
  ])('403 not eligible and no Stripe call for knockout %j', async (a) => {
    const res = await handler(makeEvent({ body: patchBody({ screening: screen(a) }) })) as any;
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('not eligible');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['wrong version', screen({}, 'pp-screen-v0')],
    ['missing key', { version: 'pp-screen-v1', answers: { seizures: false } }],
    ['non-boolean', screen({ pacemaker: 'no' })],
    ['null answers', { version: 'pp-screen-v1', answers: null }],
  ])("400 'screening required' for %s screening", async (_n, sc) => {
    const res = await handler(makeEvent({ body: patchBody({ screening: sc }) })) as any;
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('screening required');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ignores screening for non-patch SKUs', async () => {
    const res = await handler(makeEvent({ body: JSON.stringify({ skuId: 'biome-ns-ultra', screening: screen({ seizures: true }) }) })) as any;
    expect(res.statusCode).toBe(200);
    expect(mockCreate.mock.calls[0][0].metadata.screen_v).toBeUndefined();
  });

  it('admin test route uses the test price even when STRIPE_MODE=live', async () => {
    process.env['STRIPE_MODE'] = 'live';
    try {
      const res = await handler(makeEvent({ path: adminPath, body: patchBody(), headers: { authorization: validCreds() } })) as any;
      expect(res.statusCode).toBe(200);
      const args = mockCreate.mock.calls[0][0];
      expect(args.line_items).toEqual([{ price: 'price_test_wolverine', quantity: 1 }]);
      expect(args.metadata.isDemo).toBe('true');
      expect(args.metadata.wear).toBe('12h');
    } finally {
      delete process.env['STRIPE_MODE'];
    }
  });
});

describe('private $2 test-price override (testToken)', () => {
  const answers = { seizures: false, pacemaker: false, pregnant: false, metalImplant: false, woundOrScar: true, suitableArea: true };
  const body = (extra: Record<string, unknown> = {}, sku = 'push-patch-wolverine') =>
    JSON.stringify({ skuId: sku, wear: '12h', screening: { version: 'pp-screen-v1', answers }, ...extra });
  const live = async (b: string) => {
    process.env['STRIPE_MODE'] = 'live';
    try { return await handler(makeEvent({ body: b })) as any; } finally { delete process.env['STRIPE_MODE']; }
  };

  it('valid token charges $2 via price_data, keeps skuId, flags test_price', async () => {
    const res = await live(body({ testToken: 'goodtoken' }));
    expect(res.statusCode).toBe(200);
    const args = mockCreate.mock.calls[0][0];
    expect(args.line_items).toEqual([{ price_data: { currency: 'usd', unit_amount: 200, product_data: { name: 'Push Patch — Wolverine (TEST $2)' } }, quantity: 1 }]);
    expect(args.metadata.test_price).toBe('true');
    expect(args.metadata.skuIds).toBe('push-patch-wolverine');
    expect(args.metadata.wear).toBe('12h');
  });

  it('wrong token silently charges the normal price', async () => {
    const res = await live(body({ testToken: 'badtoken' }));
    expect(res.statusCode).toBe(200);
    const args = mockCreate.mock.calls[0][0];
    expect(args.line_items).toEqual([{ price: 'price_live_wolverine', quantity: 1 }]);
    expect(args.metadata.test_price).toBeUndefined();
  });

  it('expired token charges the normal price', async () => {
    mockSsmSend.mockResolvedValue({ Parameter: { Value: JSON.stringify({ token: 'goodtoken', expiresAt: new Date(Date.now() - 1000).toISOString() }) } });
    await live(body({ testToken: 'goodtoken' }));
    expect(mockCreate.mock.calls[0][0].line_items).toEqual([{ price: 'price_live_wolverine', quantity: 1 }]);
  });

  it('missing SSM parameter charges the normal price without erroring', async () => {
    mockSsmSend.mockRejectedValue(new Error('ParameterNotFound'));
    const res = await live(body({ testToken: 'goodtoken' }));
    expect(res.statusCode).toBe(200);
    expect(mockCreate.mock.calls[0][0].line_items).toEqual([{ price: 'price_live_wolverine', quantity: 1 }]);
  });

  it('non-patch sku ignores the token', async () => {
    await handler(makeEvent({ body: JSON.stringify({ skuId: 'biome-ns-ultra', testToken: 'goodtoken' }) }));
    const args = mockCreate.mock.calls[0][0];
    expect(args.line_items).toEqual([{ price: 'price_1Tp83ABSbDAyoIVynsgk0BAK', quantity: 1 }]);
    expect(args.metadata.test_price).toBeUndefined();
  });

  it('valid token still enforces screening', async () => {
    const res = await live(body({ testToken: 'goodtoken', screening: { version: 'pp-screen-v1', answers: { ...answers, seizures: true } } }));
    expect(res.statusCode).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
