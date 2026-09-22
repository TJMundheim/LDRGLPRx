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
});

describe('consent-sign handler', () => {
  it('GET with a bad token → 403', async () => {
    const res = await handler(ev('GET', undefined, 'deadbeef') as any);
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Not authorized');
  });

  it('GET when both consents exist → Already signed', async () => {
    ddbSendMock.mockResolvedValue({ Item: { ...RECORD, consents: {
      [CONSENT_NPP_V1]: JSON.stringify({ version: CONSENT_NPP_V1, at: '2026-09-01T00:00:00.000Z' }),
      [CONSENT_PHI_AUTH_V1]: JSON.stringify({ version: CONSENT_PHI_AUTH_V1, at: '2026-09-01T00:00:00.000Z' }),
    } } });
    const res = await handler(ev('GET') as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Already signed');
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
    expect(res.body).toContain('Signed.');
    expect(res.body).toContain('care coordinator will confirm');

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
