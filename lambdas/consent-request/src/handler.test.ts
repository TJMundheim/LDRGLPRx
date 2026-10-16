import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks — must be declared before any import of the module under test ──

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(input: any) { this.input = input; } },
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

describe('lane + price', () => {
  beforeEach(() => {
    ddbSendMock.mockImplementation(async (cmd: any) =>
      cmd.input.Key?.sk === 'record' ? { Item: RECORD_ITEM } : {});
  });

  it('stamps lane/laneLabel/priceCents on the encounter and names them in the email', async () => {
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'leaky-gut', priceCents: 12500 },
    } as any);

    expect(res).toMatchObject({ ok: true, lane: 'leaky-gut', laneLabel: 'Biome NS Rx', priceCents: 12500 });

    const upd = ddbSendMock.mock.calls
      .map((c: any) => c[0])
      .find((c: any) => c.constructor.name === 'UpdateCommand');
    expect(upd.input.Key.sk).toBe('encounter#enc-1');
    expect(upd.input.UpdateExpression).toBe(
      'SET #lane = :lane, laneLabel = :label, priceCents = :price, updatedAt = :ts');
    expect(upd.input.ExpressionAttributeValues).toMatchObject({
      ':lane': 'leaky-gut', ':label': 'Biome NS Rx', ':price': 12500,
    });

    const payload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
    expect(payload.html).toContain('your Biome NS Rx prescription review');
    expect(payload.html).toContain('$125 per 30-day supply');
    expect(payload.html).toContain('Nothing is charged until the physician approves');
    expect(payload.text).toContain('$125 per 30-day supply');
    // Never an ingredient or formula name in customer copy.
    expect(payload.html).not.toContain('BPC');
  });

  it('defaults the price from the lane when none is supplied', async () => {
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'leaky-gut' },
    } as any);
    expect(res.priceCents).toBe(12500);
  });

  it('a priceless lane omits the price sentence but still names the product', async () => {
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'menopause-hrt' },
    } as any);
    expect(res).toMatchObject({ laneLabel: 'Menopause & HRT program', priceCents: 0 });
    const payload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
    expect(payload.html).toContain('your Menopause &amp; HRT program prescription review'.replace('&amp;', '&'));
    expect(payload.html).not.toContain('per 30-day supply');
  });

  it('no lane → generic copy, no encounter write', async () => {
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1' },
    } as any);
    expect(res.ok).toBe(true);
    expect(res.laneLabel).toBeUndefined();
    expect(ddbSendMock.mock.calls.map((c: any) => c[0])
      .filter((c: any) => c.constructor.name === 'UpdateCommand')).toHaveLength(0);
    const payload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
    expect(payload.html).toContain('you and your prescription review');
  });
});

describe('already signed at intake (Appendix B)', () => {
  const SIGNED = {
    'consent-npp-v1': JSON.stringify({ version: 'consent-npp-v1', at: '2026-10-15T00:00:00.000Z' }),
    'consent-phi-auth-v1': JSON.stringify({ version: 'consent-phi-auth-v1', at: '2026-10-15T00:00:00.000Z' }),
  };
  const withRecord = (extra: Record<string, unknown>) =>
    ddbSendMock.mockImplementation(async (cmd: any) =>
      cmd.input.Key?.sk === 'record' ? { Item: { ...RECORD_ITEM, ...extra } } : {});
  const sentPayload = () => JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
  const audits = () => ddbSendMock.mock.calls.map((c: any) => c[0].input.Item)
    .filter((i: any) => typeof i?.sk === 'string' && i.sk.startsWith('audit#'));

  it('signed + priced + no card → card-only email, no "Read and sign", audit card.requested', async () => {
    withRecord({ consents: SIGNED });
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'leaky-gut', priceCents: 12500 },
    } as any);
    expect(res).toMatchObject({ ok: true, alreadySigned: true, cardOnly: true, sentTo: 'jane@example.com' });
    expect(res.url).toContain('?c=');
    const p = sentPayload();
    expect(p.subject).toBe('Save a card for your prescription');
    expect(p.html).toContain('Hi Jane, your privacy notice and authorization are already signed.');
    expect(p.html).toContain('save a card for your Biome NS Rx prescription ($125 per 30-day supply). Nothing is charged until the physician approves.');
    expect(p.html).toContain('Save my card');
    expect(p.html).toContain('This link is personal to you. — Dr. TJ');
    expect(p.html).not.toContain('Read and sign');
    expect(p.text).not.toContain('Read and sign');
    expect(audits()).toHaveLength(1);
    expect(audits()[0].action).toBe('card.requested');
  });

  it('signed + free lane → nothing sent, alreadySigned', async () => {
    withRecord({ consents: SIGNED });
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'weight-loss' },
    } as any);
    expect(res).toEqual({ ok: true, alreadySigned: true });
    expect(lambdaSendMock).not.toHaveBeenCalled();
    expect(audits()).toHaveLength(0);
  });

  it('signed + unset lane → nothing sent, alreadySigned', async () => {
    withRecord({ consents: SIGNED });
    const res: any = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' } } as any);
    expect(res).toEqual({ ok: true, alreadySigned: true });
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('signed + card on file → nothing sent', async () => {
    withRecord({ consents: SIGNED, cardOnFile: { stripeCustomerId: 'cus_x', paymentMethodId: 'pm_x' } });
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'leaky-gut', priceCents: 12500 },
    } as any);
    expect(res).toEqual({ ok: true, alreadySigned: true });
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('one consent only → today\'s sign-link email', async () => {
    withRecord({ consents: { 'consent-npp-v1': SIGNED['consent-npp-v1'] } });
    const res: any = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'leaky-gut' },
    } as any);
    expect(res.alreadySigned).toBeUndefined();
    const p = sentPayload();
    expect(p.subject).toBe('One step before your visit: privacy notice and authorization');
    expect(p.html).toContain('Read and sign your privacy notice and authorization');
    expect(audits()[0].action).toBe('consent.requested');
  });

  it('still stamps the lane on the encounter when signed', async () => {
    withRecord({ consents: SIGNED });
    await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1', lane: 'weight-loss' },
    } as any);
    const upd = ddbSendMock.mock.calls.map((c: any) => c[0]).filter((c: any) => c.constructor.name === 'UpdateCommand');
    expect(upd).toHaveLength(1);
    expect(upd[0].input.ExpressionAttributeValues[':lane']).toBe('weight-loss');
  });
});
