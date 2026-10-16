import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSendMock(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(input: any) { this.input = input; } },
  DeleteCommand: class DeleteCommand { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class DynamoDBClient { constructor(_: any) {} } }));
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class LambdaClient { constructor(_: any) {} send = vi.fn(); },
  InvokeCommand: class InvokeCommand { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class SSMClient { constructor(_: any) {} send = vi.fn(); },
  GetParameterCommand: class GetParameterCommand { input: any; constructor(input: any) { this.input = input; } },
}));
const sessionCreateMock = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(async () => ({ checkout: { sessions: { create: sessionCreateMock } } })),
}));
const upsertContactMock = vi.fn();
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: (...a: any[]) => upsertContactMock(...a) }));
const testPriceMock = vi.fn();
let noPrice = false;
vi.mock('@my4mlife/push-patch-checkout', async (orig) => {
  const real = await orig<typeof import('@my4mlife/push-patch-checkout')>();
  return {
    ...real,
    resolveTestPrice: (...a: any[]) => testPriceMock(...a),
    buildPushPatchSessionParams: (i: any) => (noPrice ? null : real.buildPushPatchSessionParams(i)),
  };
});

import { deriveContactId } from '@my4mlife/contact-id';
import { handler } from './handler';

const NOW = '2026-10-16T15:00:00.000Z';
const EMAIL = 'jane@example.com';
const CONTACT = deriveContactId(EMAIL);
const BODY = {
  email: 'Jane@Example.com', firstName: 'Jane', lastName: 'Doe', skuId: 'push-patch-nad-ghk',
  screening: { version: 'pp-screen-v2', answers: { seizures: false, pacemaker: false, pregnant: false, suitableArea: true, woundOrScar: false } },
  dob: '1984-03-09', sex: 'female', phone: '+15551234567', medications: ['metformin'], allergies: [], conditions: ['hypothyroidism'],
  consentName: 'Jane Q Doe', privacyAck: true,
};
const evt = (body: unknown, method = 'POST') => ({
  rawPath: '/api/push-patch-pre-intake',
  body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { 'user-agent': 'TestBrowser/1.0' },
  requestContext: { http: { method, path: '/api/push-patch-pre-intake', sourceIp: '203.0.113.7' } },
}) as any;
const call = async (b: unknown = BODY) => (await handler(evt(b))) as any;
const puts = () => ddbSendMock.mock.calls.map((c) => c[0].input).filter((i) => i.Item);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
  process.env['STRIPE_MODE'] = 'live';
  ddbSendMock.mockReset(); ddbSendMock.mockResolvedValue({});
  upsertContactMock.mockReset(); upsertContactMock.mockResolvedValue(undefined);
  sessionCreateMock.mockReset(); sessionCreateMock.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x', id: 'cs_1' });
  testPriceMock.mockReset(); testPriceMock.mockResolvedValue(null);
  noPrice = false;
});
afterEach(() => vi.useRealTimers());

describe('POST /api/push-patch-pre-intake: 400/403/503', () => {
  it.each(['email', 'firstName', 'lastName', 'skuId', 'screening', 'dob', 'sex', 'phone', 'medications', 'allergies', 'conditions', 'consentName', 'privacyAck'])(
    '400 when %s is missing, before any write or Stripe call', async (k) => {
      const b: any = { ...BODY }; delete b[k];
      const r = await call(b);
      expect(r.statusCode).toBe(400);
      expect(ddbSendMock).not.toHaveBeenCalled();
      expect(sessionCreateMock).not.toHaveBeenCalled();
    });

  it('400 on invalid JSON and missing body', async () => {
    expect((await call('{bad')).statusCode).toBe(400);
    expect(((await handler({ headers: {}, requestContext: { http: { method: 'POST' } } } as any)) as any).statusCode).toBe(400);
  });

  it('403 on a screening knockout, nothing written', async () => {
    const r = await call({ ...BODY, screening: { ...BODY.screening, answers: { ...BODY.screening.answers, pacemaker: true } } });
    expect(r.statusCode).toBe(403);
    expect(ddbSendMock).not.toHaveBeenCalled();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('400 when screening answers are incomplete', async () => {
    expect((await call({ ...BODY, screening: { version: 'pp-screen-v2', answers: {} } })).statusCode).toBe(400);
  });

  it('503 when the blend has no price for the mode, nothing written', async () => {
    noPrice = true;
    const r = await call();
    expect(r.statusCode).toBe(503);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/push-patch-pre-intake: success', () => {
  it('returns 200 { url } from the Stripe session', async () => {
    const r = await call();
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ url: 'https://checkout.stripe.com/c/pay/x' });
  });

  it('stores the pending item under the derived contactId with a 30-day ttl and the signing context', async () => {
    await call();
    const item = puts().find((i) => String(i.Item.sk).startsWith('pending-intake#')).Item;
    expect(item).toMatchObject({
      contactId: CONTACT, email: EMAIL, firstName: 'Jane', lastName: 'Doe', skuId: 'push-patch-nad-ghk',
      dob: '1984-03-09', sex: 'female', phone: '+15551234567', medications: ['metformin'], conditions: ['hypothyroidism'],
      consentName: 'Jane Q Doe', signedAt: NOW, ip: '203.0.113.7', userAgent: 'TestBrowser/1.0',
    });
    expect(item.ttl).toBe(Math.floor(Date.parse(NOW) / 1000) + 30 * 86400);
    expect(item.sk).toBe(`pending-intake#${item.intakeId}`);
  });

  it('creates the Stripe session with email prefilled and metadata intakeId + contactId + screen_*', async () => {
    await call();
    const item = puts()[0].Item;
    const p = sessionCreateMock.mock.calls[0][0];
    expect(p.customer_email).toBe(EMAIL);
    expect(p.metadata).toMatchObject({ intakeId: item.intakeId, contactId: CONTACT, skuIds: 'push-patch-nad-ghk', screen_v: 'pp-screen-v2', screen_area: 'yes' });
    expect(p.phone_number_collection).toBeUndefined();
  });

  it('writes the pending item before creating the Stripe session', async () => {
    const order: string[] = [];
    ddbSendMock.mockImplementation(async () => { order.push('put'); return {}; });
    sessionCreateMock.mockImplementation(async () => { order.push('stripe'); return { url: 'u' }; });
    await call();
    expect(order.indexOf('put')).toBeLessThan(order.indexOf('stripe'));
  });

  it('uses the $2 test price when the token resolves', async () => {
    testPriceMock.mockResolvedValue({ currency: 'usd', unit_amount: 200, product_data: { name: 'x' } });
    await call({ ...BODY, testToken: 'tok' });
    expect(testPriceMock).toHaveBeenCalledWith('push-patch-nad-ghk', 'tok');
    const p = sessionCreateMock.mock.calls[0][0];
    expect(p.line_items[0].price_data.unit_amount).toBe(200);
    expect(p.metadata.test_price).toBe('true');
  });

  it('upserts the Contact (push-patch-form, lead) with email/name/real phone only', async () => {
    await call();
    expect(upsertContactMock).toHaveBeenCalledTimes(1);
    const input = upsertContactMock.mock.calls[0][1];
    expect(input).toMatchObject({ email: EMAIL, firstName: 'Jane', lastName: 'Doe', phone: '+15551234567', source: 'push-patch-form', stage: 'lead' });
    expect(JSON.stringify(input)).not.toMatch(/1984|female|metformin|hypothyroidism|203\.0|pp-screen/);
  });

  it('omits a placeholder phone from the Contact', async () => {
    await call({ ...BODY, phone: '+10000000000' });
    expect(upsertContactMock.mock.calls[0][1]).not.toHaveProperty('phone');
  });

  it('a Contact upsert failure does not fail the request', async () => {
    upsertContactMock.mockRejectedValue(new Error('down'));
    expect((await call()).statusCode).toBe(200);
  });
});

describe('POST /api/push-patch-pre-intake: failures', () => {
  it('500 when the pending put fails, with no Stripe session', async () => {
    ddbSendMock.mockRejectedValue(new Error('ddb down'));
    const r = await call();
    expect(r.statusCode).toBe(500);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('500 when Stripe fails, and the error text carries no PHI', async () => {
    sessionCreateMock.mockRejectedValue(new Error('stripe down'));
    const r = await call();
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toMatch(/Jane|1984|metformin/);
  });
});
