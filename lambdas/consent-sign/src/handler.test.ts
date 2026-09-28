import { describe, it, expect, beforeEach, vi } from 'vitest';

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSendMock(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(i: any) { this.input = i; } },
  PutCommand: class PutCommand { input: any; constructor(i: any) { this.input = i; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(i: any) { this.input = i; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { constructor(_: any) {} send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class InvokeCommand { input: any; constructor(i: any) { this.input = i; } },
}));

const customersCreate = vi.fn();
const setupIntentsCreate = vi.fn();
const setupIntentsRetrieve = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: async () => ({
    customers: { create: (...a: any[]) => customersCreate(...a) },
    setupIntents: {
      create: (...a: any[]) => setupIntentsCreate(...a),
      retrieve: (...a: any[]) => setupIntentsRetrieve(...a),
    },
  }),
  getStripePublishableKey: async () => 'pk_test_123',
}));

process.env.CONSENT_SECRET = 'test-secret';
process.env.NOTIFY_TO = 'drtj@my4mlife.com';

import { handler } from './handler';
import { approveToken } from './token';
import { buildSignUrl } from './url';
import { CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';

const C = 'contact-abc', E = 'enc-1';
const TOKEN = approveToken('test-secret', C, E);
const RECORD = { contactId: C, sk: 'record', demographics: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' } };

const ev = (method: string, body?: string, token = TOKEN) => ({
  queryStringParameters: { c: C, e: E, t: token },
  requestContext: { http: { method, sourceIp: '203.0.113.9', userAgent: 'TestAgent/1.0' } },
  body, isBase64Encoded: false,
});

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();

beforeEach(() => {
  ddbSendMock.mockReset();
  lambdaSendMock.mockReset().mockResolvedValue({});
  ddbSendMock.mockResolvedValue({ Item: RECORD });
  customersCreate.mockReset().mockResolvedValue({ id: 'cus_test1' });
  setupIntentsCreate.mockReset().mockResolvedValue({ id: 'seti_1', client_secret: 'seti_1_secret_x' });
  setupIntentsRetrieve.mockReset();
});

describe('consent-sign handler', () => {
  it('GET with a bad token → 403', async () => {
    const res = await handler(ev('GET', undefined, 'deadbeef') as any);
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Not authorized');
  });

  const SIGNED = {
    [CONSENT_NPP_V1]: JSON.stringify({ version: CONSENT_NPP_V1, at: '2026-09-01T00:00:00.000Z' }),
    [CONSENT_PHI_AUTH_V1]: JSON.stringify({ version: CONSENT_PHI_AUTH_V1, at: '2026-09-01T00:00:00.000Z' }),
  };
  const CARD = { stripeCustomerId: 'cus_x', paymentMethodId: 'pm_x', setupIntentId: 'seti_x', last4: '4242', brand: 'visa' };

  it('GET when both consents AND a card exist → Already signed', async () => {
    ddbSendMock.mockResolvedValue({ Item: { ...RECORD, consents: SIGNED, cardOnFile: CARD } });
    const res = await handler(ev('GET') as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Already signed');
  });

  it('GET after abandoning at the card step → card step again, not "already signed"', async () => {
    ddbSendMock.mockResolvedValue({ Item: { ...RECORD, consents: SIGNED } });
    const res = await handler(ev('GET') as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Save a card for your prescription');
    expect(res.body).not.toContain('Already signed');
  });

  it('card step names the lane and price from the encounter item', async () => {
    ddbSendMock.mockImplementation((cmd: any) => {
      const sk = cmd.input?.Key?.sk;
      if (sk === 'record') return Promise.resolve({ Item: { ...RECORD, consents: SIGNED } });
      return Promise.resolve({ Item: { sk, laneLabel: 'Biome NS Rx', priceCents: 12500 } });
    });
    const res = await handler(ev('GET') as any);
    expect(res.body).toContain('Biome NS Rx — $125 per 30-day supply');
    // Customer is created once and the SetupIntent is off-session, scoped to this patient.
    expect(setupIntentsCreate).toHaveBeenCalledWith(expect.objectContaining({
      usage: 'off_session', customer: 'cus_test1',
      metadata: { contactId: C, encounterId: E },
    }));
  });

  it('POST ?step=card with a succeeded SetupIntent → merges cardOnFile, audits, notifies', async () => {
    ddbSendMock.mockResolvedValue({ Item: { ...RECORD, consents: SIGNED } });
    setupIntentsRetrieve.mockResolvedValue({
      id: 'seti_9', status: 'succeeded', customer: 'cus_9', metadata: { contactId: C },
      payment_method: { id: 'pm_9', card: { last4: '4242', brand: 'visa' } },
    });
    const e2 = ev('POST', form({ setupIntentId: 'seti_9' })) as any;
    e2.queryStringParameters.step = 'card';
    const res = await handler(e2);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Signed and saved');
    expect(res.body).toContain('····4242');

    const updates = ddbSendMock.mock.calls.map((a) => a[0]).filter((c) => c.constructor.name === 'UpdateCommand');
    expect(updates[0].input.UpdateExpression).toBe('SET #c = if_not_exists(#c, :empty)');
    // Merge, never a blind overwrite of the whole map.
    expect(updates[1].input.UpdateExpression).toContain('#c.paymentMethodId = :pm');
    expect(updates[1].input.ExpressionAttributeValues).toMatchObject({
      ':cus': 'cus_9', ':pm': 'pm_9', ':si': 'seti_9', ':l4': '4242', ':br': 'visa',
    });
    const put = ddbSendMock.mock.calls.map((a) => a[0]).find((c) => c.constructor.name === 'PutCommand');
    expect(put.input.Item.action).toBe('card.saved');

    const payload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
    expect(payload.to).toBe('drtj@my4mlife.com');
    expect(payload.subject).toContain('[Card saved] Jane Doe');
    // No PAN anywhere — last4 only.
    expect(JSON.stringify(payload)).not.toContain('4242 4242');
  });

  it('POST ?step=card for a SetupIntent belonging to someone else → refused, nothing written', async () => {
    ddbSendMock.mockResolvedValue({ Item: { ...RECORD, consents: SIGNED } });
    setupIntentsRetrieve.mockResolvedValue({
      id: 'seti_9', status: 'succeeded', customer: 'cus_9',
      metadata: { contactId: 'someone-else' }, payment_method: { id: 'pm_9' },
    });
    const e2 = ev('POST', form({ setupIntentId: 'seti_9' })) as any;
    e2.queryStringParameters.step = 'card';
    const res = await handler(e2);
    expect(res.body).toContain('not confirmed');
    expect(ddbSendMock.mock.calls.map((a) => a[0]).filter((c) => c.constructor.name === 'UpdateCommand')).toHaveLength(0);
  });

  it('POST ?step=card for an unconfirmed SetupIntent → refused', async () => {
    ddbSendMock.mockResolvedValue({ Item: { ...RECORD, consents: SIGNED } });
    setupIntentsRetrieve.mockResolvedValue({
      id: 'seti_9', status: 'requires_payment_method', customer: 'cus_9',
      metadata: { contactId: C }, payment_method: null,
    });
    const e2 = ev('POST', form({ setupIntentId: 'seti_9' })) as any;
    e2.queryStringParameters.step = 'card';
    const res = await handler(e2);
    expect(res.body).toContain('not confirmed');
  });

  it('GET fresh → form with both checkboxes and the NPP heading', async () => {
    const res = await handler(ev('GET') as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('name="nppAck"');
    expect(res.body).toContain('name="phiAuth"');
    expect(res.body).toContain('Notice of Privacy Practices');
    expect(res.body).toContain('Jane Doe');
    expect(res.body).toContain('electronic signature');
  });

  it('POST missing a checkbox → 400 with the form re-rendered and a message', async () => {
    const res = await handler(ev('POST', form({ nppAck: 'on', typedName: 'Jane Doe' })) as any);
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Please authorize');
    expect(res.body).toContain('name="phiAuth"');
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('POST with a mismatched typed name → 400', async () => {
    const res = await handler(ev('POST', form({ nppAck: 'on', phiAuth: 'on', typedName: 'Bob Smith' })) as any);
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('does not match');
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('POST valid → writes both consents, an audit item, two emails, success page', async () => {
    const res = await handler(ev('POST', form({ nppAck: 'on', phiAuth: 'on', typedName: 'jane doe' })) as any);
    expect(res.statusCode).toBe(200);
    // Step 2 now renders instead of a terminal success page.
    expect(res.body).toContain('Save a card for your prescription');
    expect(res.body).toContain('Nothing is charged today');

    const updates = ddbSendMock.mock.calls.map((a) => a[0]).filter((c) => c.constructor.name === 'UpdateCommand');
    // First update bootstraps the `consents` map (records from intake may not have one).
    expect(updates[0].input.UpdateExpression).toBe('SET #c = if_not_exists(#c, :empty)');
    expect(updates[0].input.ExpressionAttributeValues[':empty']).toEqual({});
    const update = updates[1];
    expect(update.input.ExpressionAttributeNames['#npp']).toBe(CONSENT_NPP_V1);
    expect(update.input.ExpressionAttributeNames['#phi']).toBe(CONSENT_PHI_AUTH_V1);
    expect(update.input.UpdateExpression).toContain('#c.#npp');
    const npp = JSON.parse(update.input.ExpressionAttributeValues[':npp']);
    expect(npp).toMatchObject({ version: CONSENT_NPP_V1, legalVersion: '2026-09', typedName: 'jane doe', ip: '203.0.113.9' });

    const put = ddbSendMock.mock.calls.map((a) => a[0]).find((c) => c.constructor.name === 'PutCommand');
    expect(put.input.Item.action).toBe('consent.signed');
    expect(put.input.Item.detail).toEqual({ npp: true, phiAuth: true });

    expect(lambdaSendMock).toHaveBeenCalledTimes(2);
    const payloads = lambdaSendMock.mock.calls.map((a) => JSON.parse(Buffer.from(a[0].input.Payload).toString()));
    expect(payloads[0]).toMatchObject({ kind: 'info', to: 'jane@example.com', subject: 'Your signed My4MLife privacy notice and authorization' });
    expect(payloads[1]).toMatchObject({ to: 'drtj@my4mlife.com', subject: '[Consent signed] Jane Doe' });
  });
});

describe('buildSignUrl', () => {
  it('produces a verifying link', () => {
    const url = buildSignUrl('https://x.lambda-url.us-east-2.on.aws/', 'test-secret', C, E);
    expect(url).toBe(`https://x.lambda-url.us-east-2.on.aws/?c=${C}&e=${E}&t=${TOKEN}`);
  });
});
