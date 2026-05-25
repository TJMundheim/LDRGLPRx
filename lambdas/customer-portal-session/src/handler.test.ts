import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

// Hoisted mocks
const mockPortalCreate = vi.hoisted(() => vi.fn());
const mockGetStripeClient = vi.hoisted(() => vi.fn());
const mockDdbSend = vi.hoisted(() => vi.fn());

vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: mockGetStripeClient,
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({ send: mockDdbSend })),
  GetItemCommand: vi.fn(),
}));

import { handler } from './handler.js';

function makeEvent(overrides: {
  customerId?: string;
  jwtSub?: string;
  jwtCustomerId?: string;
  noAuth?: boolean;
} = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  const customerId = overrides.customerId ?? 'cus_test123';
  const jwtSub = overrides.jwtSub ?? 'user-sub-123';
  const jwtCustomerId = overrides.jwtCustomerId ?? customerId;

  return {
    version: '2.0',
    routeKey: 'POST /api/customer-portal-session',
    rawPath: '/api/customer-portal-session',
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      http: { method: 'POST', path: '/api/customer-portal-session', protocol: 'HTTP/1.1', sourceIp: '1.2.3.4', userAgent: 'test' },
      accountId: '123', apiId: 'test', domainName: '', domainPrefix: '',
      requestId: 'r1', routeKey: '', stage: '$default', time: '', timeEpoch: 0,
      authorizer: overrides.noAuth ? undefined : {
        jwt: {
          claims: { sub: jwtSub, 'custom:stripeCustomerId': jwtCustomerId },
          scopes: null,
        },
      },
    } as any,
    body: JSON.stringify({ customerId }),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/test' });
  mockGetStripeClient.mockResolvedValue({
    billingPortal: { sessions: { create: mockPortalCreate } },
  });
  // DDB GetItem returns isDemo=false by default
  mockDdbSend.mockResolvedValue({ Item: { isDemo: { BOOL: false } } });
});

describe('POST /api/customer-portal-session', () => {
  it('returns 200 with url on valid authenticated request', async () => {
    const res = await handler(makeEvent()) as any;
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).url).toBe('https://billing.stripe.com/p/session/test');
  });

  it('calls billingPortal.sessions.create with correct customer + return_url', async () => {
    await handler(makeEvent({ customerId: 'cus_abc' }));
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_abc', return_url: expect.stringContaining('my4mlife.com') }),
    );
  });

  it('derives mode from Contact.isDemo — never from request body', async () => {
    mockDdbSend.mockResolvedValue({ Item: { isDemo: { BOOL: true } } });
    // body mode field should be ignored; isDemo=true drives test mode
    await handler(makeEvent());
    expect(mockGetStripeClient).toHaveBeenCalledWith(expect.objectContaining({ modeOverride: 'test' }));
  });

  it('uses live mode when Contact.isDemo=false', async () => {
    mockDdbSend.mockResolvedValue({ Item: { isDemo: { BOOL: false } } });
    await handler(makeEvent());
    expect(mockGetStripeClient).toHaveBeenCalledWith(expect.objectContaining({ modeOverride: 'live' }));
  });

  it('returns 400 when customerId is missing from body', async () => {
    const event = makeEvent();
    event.body = JSON.stringify({});
    const res = await handler(event) as any;
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when no JWT authorizer context', async () => {
    const res = await handler(makeEvent({ noAuth: true })) as any;
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when JWT customerId does not match requested customerId', async () => {
    const res = await handler(makeEvent({
      customerId: 'cus_test123',
      jwtCustomerId: 'cus_other456',
    })) as any;
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when customerId missing from JWT claims', async () => {
    const event = makeEvent();
    (event.requestContext as any).authorizer.jwt.claims = { sub: 'user-sub' };
    const res = await handler(event) as any;
    expect(res.statusCode).toBe(403);
  });
});
