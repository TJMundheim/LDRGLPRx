import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ddbSend = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSend(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(i: any) { this.input = i; } },
  PutCommand: class PutCommand { input: any; constructor(i: any) { this.input = i; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));

const lambdaSend = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { constructor(_: any) {} send = (...a: any[]) => lambdaSend(...a); },
  InvokeCommand: class InvokeCommand { input: any; constructor(i: any) { this.input = i; } },
}));

const promoList = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: async () => ({ promotionCodes: { list: (...a: any[]) => promoList(...a) } }),
}));

process.env.PARTNER_SIGN_SECRET = 'test-secret';
process.env.NOTIFY_TO = 'drtj@my4mlife.com';

import { handler } from './handler';
import { makeToken } from './token';

const NOW = new Date('2026-10-31T15:00:00Z');
const sec = Math.floor(NOW.getTime() / 1000);
const EMAIL = 'jane@glow.com';
const META = { partner: 'true', business: 'Glow Spa', email: EMAIL, clientDiscount: '50', commission: '150' };
const TOKEN = makeToken('test-secret', 'GLOW', EMAIL, sec + 3600);

const ev = (method: string, o: { t?: string; body?: string; b64?: boolean } = {}) => ({
  queryStringParameters: { t: o.t ?? TOKEN },
  requestContext: { http: { method, sourceIp: '203.0.113.9', userAgent: 'TestAgent/1.0' } },
  body: o.b64 ? Buffer.from(o.body ?? '').toString('base64') : o.body,
  isBase64Encoded: !!o.b64,
});
const form = (o: Record<string, string>) => new URLSearchParams({
  legalName: 'Jane Doe', title: 'Owner', business: 'Glow Spa', typedSignature: 'jane doe', agree: 'on', ...o,
}).toString();
const puts = () => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.input.Item);

let signed: any;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  signed = undefined;
  ddbSend.mockReset().mockImplementation(async (c: any) => (c.input.Item ? {} : { Item: signed }));
  lambdaSend.mockReset().mockResolvedValue({});
  promoList.mockReset().mockResolvedValue({ data: [{ code: 'GLOW', active: true, metadata: META }] });
});
afterEach(() => vi.useRealTimers());

describe('GET', () => {
  it('rejects a bad, forged, expired token or mismatched email with a friendly page', async () => {
    for (const t of ['nope', makeToken('wrong', 'GLOW', EMAIL, sec + 99), makeToken('test-secret', 'GLOW', EMAIL, sec - 1)]) {
      const r = await handler(ev('GET', { t }));
      expect(r.statusCode).toBe(403);
      expect(r.body).toContain('invalid or has expired');
    }
    const other = makeToken('test-secret', 'GLOW', 'someone@else.com', sec + 99);
    expect((await handler(ev('GET', { t: other }))).statusCode).toBe(403);
    promoList.mockResolvedValue({ data: [{ code: 'GLOW', metadata: { ...META, partner: 'false' } }] });
    expect((await handler(ev('GET'))).statusCode).toBe(403);
    promoList.mockResolvedValue({ data: [] });
    expect((await handler(ev('GET'))).statusCode).toBe(403);
  });
  it('renders the filled agreement and the form with business prefilled', async () => {
    const r = await handler(ev('GET'));
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('text/html');
    expect(promoList).toHaveBeenCalledWith(expect.objectContaining({ code: 'GLOW' }));
    expect(r.body).toContain('Partner code: GLOW');
    expect(r.body).toContain('$50 off');
    expect(r.body).toContain('$150');
    expect(r.body).toContain('October 31, 2026');
    expect(r.body).toContain('name="typedSignature"');
    expect(r.body).toContain('name="agree"');
    expect(r.body).toContain('value="Glow Spa"');
    expect(r.body).toContain('I agree to sign electronically and that my typed name is my signature.');
    expect(r.body).toContain('width=device-width');
    expect(r.body).not.toContain('{{');
  });
  it('shows signed date and payout next step when already signed', async () => {
    signed = { code: 'GLOW', signedAt: '2026-10-30T20:00:00.000Z', legalName: 'Jane Doe' };
    const r = await handler(ev('GET'));
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Signed on October 30, 2026');
    expect(r.body).toContain('within one business day');
    expect(r.body).not.toContain('name="typedSignature"');
  });
});

describe('POST', () => {
  it.each([
    ['signature mismatch', { typedSignature: 'Janet Doe' }, 'must match'],
    ['no consent', { agree: '' }, 'agree'],
    ['missing title', { title: ' ' }, 'title'],
    ['short name', { legalName: 'J', typedSignature: 'J' }, 'legal name'],
    ['missing business', { business: '' }, 'business'],
  ])('rejects %s and keeps the form', async (_n, over, msg) => {
    const r = await handler(ev('POST', { body: form(over) }));
    expect(r.statusCode).toBe(400);
    expect(r.body.toLowerCase()).toContain(msg);
    expect(r.body).toContain('name="typedSignature"');
    expect(puts()).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('stores the audit record with a conditional put', async () => {
    const r = await handler(ev('POST', { body: form({ typedSignature: '  JANE   DOE ' }), b64: true }));
    expect(r.statusCode).toBe(200);
    const [put] = puts();
    expect(put.input.TableName).toBe('PartnerAgreements');
    expect(put.input.ConditionExpression).toBe('attribute_not_exists(code)');
    expect(put.input.Item).toMatchObject({
      code: 'GLOW', version: 'PA-2026-10', legalName: 'Jane Doe', title: 'Owner', business: 'Glow Spa',
      email: EMAIL, signedAt: NOW.toISOString(), ip: '203.0.113.9', userAgent: 'TestAgent/1.0',
    });
    expect(put.input.Item.docSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('emails the signed copy to the partner and a notice to drtj, both from drtj', async () => {
    await handler(ev('POST', { body: form({}) }));
    const sent = lambdaSend.mock.calls.map((c) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));
    expect(lambdaSend.mock.calls[0][0].input.FunctionName).toBe('my4mlife-email-sender');
    expect(sent).toHaveLength(2);
    expect(sent.map((s) => s.to)).toEqual([EMAIL, 'drtj@my4mlife.com']);
    expect(sent.every((s) => s.kind === 'info' && s.from === 'drtj')).toBe(true);
    expect(sent[0].html).toContain('Signed by Jane Doe, Owner');
    expect(sent[0].html).toContain('Partner code: GLOW');
    expect(sent[1].subject).toContain('GLOW');
  });

  it('confirms with the fallback payout line, or the Connect link when present', async () => {
    let r = await handler(ev('POST', { body: form({}) }));
    expect(r.body).toContain("You're signed");
    expect(r.body).toContain('within one business day');
    promoList.mockResolvedValue({ data: [{ code: 'GLOW', metadata: { ...META, connectOnboardingUrl: 'https://connect.stripe.com/setup/abc' } }] });
    r = await handler(ev('POST', { body: form({}) }));
    expect(r.body).toContain('href="https://connect.stripe.com/setup/abc"');
    expect(r.body).toContain('set up your payouts');
  });

  it('never overwrites an existing signature and sends nothing', async () => {
    ddbSend.mockImplementation(async (c: any) => {
      if (c.input.Item) { const e: any = new Error('x'); e.name = 'ConditionalCheckFailedException'; throw e; }
      return { Item: undefined };
    });
    const r = await handler(ev('POST', { body: form({}) }));
    expect(r.body).toContain('Signed on');
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('blocks a POST when already signed (no second put)', async () => {
    signed = { code: 'GLOW', signedAt: '2026-10-30T20:00:00.000Z' };
    const r = await handler(ev('POST', { body: form({}) }));
    expect(r.body).toContain('Signed on October 30, 2026');
    expect(puts()).toHaveLength(0);
  });

  it('keeps the signature even if the emails fail', async () => {
    lambdaSend.mockRejectedValue(new Error('boom'));
    const r = await handler(ev('POST', { body: form({}) }));
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("You're signed");
  });

  it('rejects POST with a bad token before touching anything', async () => {
    const r = await handler(ev('POST', { t: 'bad', body: form({}) }));
    expect(r.statusCode).toBe(403);
    expect(ddbSend).not.toHaveBeenCalled();
  });
});
