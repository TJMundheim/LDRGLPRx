import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks — must be declared before any import of the module under test ──

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class LambdaClient { constructor(_: any) {} send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class InvokeCommand { input: any; constructor(input: any) { this.input = input; } },
}));

import { handler } from './handler';

const RECORD_ITEM = {
  contactId: 'contact-abc',
  sk: 'record',
  demographics: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
};

beforeEach(() => {
  process.env.PATIENT_RECORDS_TABLE = 'PatientRecords';
  process.env.EMAIL_SENDER_FN = 'my4mlife-email-sender';
  process.env.CONSENT_SIGN_URL = 'https://sign.my4mlife.com/consent';
  process.env.CONSENT_SIGN_HMAC_KEY = 'test-secret';
  ddbSendMock.mockReset();
  lambdaSendMock.mockReset();
  lambdaSendMock.mockResolvedValue({});
});

describe('happy path', () => {
  it('emails the patient a signed link and writes an audit entry', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.Key?.sk === 'record') return { Item: RECORD_ITEM };
      return {};
    });

    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1' },
    } as any);

    expect(res.ok).toBe(true);
    expect(res.sentTo).toBe('jane@example.com');
    expect(res.url).toContain('?c=');
    expect(res.url).toContain('&e=');
    expect(res.url).toContain('&t=');

    expect(lambdaSendMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
    expect(payload.kind).toBe('info');
    expect(payload.to).toBe('jane@example.com');
    expect(payload.subject).toBe('One step before your visit: privacy notice and authorization');
    expect(payload.html).toContain('?c=');
    expect(payload.html).toContain('This link is personal to you.');

    const auditCall = ddbSendMock.mock.calls.find(
      (c: any) => typeof c[0].input.Item?.sk === 'string' && c[0].input.Item.sk.startsWith('audit#'),
    );
    expect(auditCall).toBeTruthy();
    expect(auditCall![0].input.Item.action).toBe('consent.requested');
    expect(auditCall![0].input.Item.sentTo).toBe('jane@example.com');
    expect(auditCall![0].input.Item.encounterId).toBe('enc-1');
  });
});

describe('missing email', () => {
  it('returns ok:false with an error and sends no email', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.Key?.sk === 'record') {
        return { Item: { contactId: 'contact-abc', sk: 'record', demographics: { firstName: 'Jane' } } };
      }
      return {};
    });

    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1' },
    } as any);

    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });
});
