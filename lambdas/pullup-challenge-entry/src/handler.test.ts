import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { sendMock, upsertMock, invokeMock, createMock } = vi.hoisted(() => ({
  sendMock: vi.fn(), upsertMock: vi.fn(), invokeMock: vi.fn(), createMock: vi.fn(),
}));
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: upsertMock }));
vi.mock('@my4mlife/contact-id', () => ({ deriveContactId: (e: string) => `cid-${e}` }));
vi.mock('@my4mlife/stripe-client', () => ({ getStripeClient: async () => ({ promotionCodes: { create: createMock } }) }));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mk = (t: string) => class { t = t; constructor(public input: any) {} };
  return {
    DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
    PutCommand: mk('Put'), GetCommand: mk('Get'), UpdateCommand: mk('Update'),
  };
});
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = invokeMock; constructor(_: any) {} },
  InvokeCommand: class { constructor(public input: any) {} },
}));

import { handler } from './handler';

const NOW = new Date('2026-11-20T18:00:00Z');
const valid = {
  name: 'Jane Doe', email: 'Jane@Example.com', phone: '(817) 555-0142',
  instagramUrl: 'https://www.instagram.com/p/ABC123/', round: 'start', adult: true, rulesAccepted: true,
  smsOptIn: false, emailOptIn: false, consentVersion: 'pullup-v2', hp: '', t: 6000,
};
const evt = (over: any = {}) =>
  ({ body: JSON.stringify({ ...valid, ...over }), headers: { origin: 'https://my4mlife.com' }, requestContext: { http: { method: 'POST', sourceIp: '1.2.3.4' } } }) as any;
const cmds = (t: string) => sendMock.mock.calls.map((c) => c[0]).filter((c) => c.t === t);
const payloads = () => invokeMock.mock.calls.map((c) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));
const entrantMail = () => payloads().filter((p) => p.to === 'jane@example.com');
const tjMail = () => payloads().filter((p) => p.to === 'drtj@my4mlife.com');
const CODE_RE = /^PULLUP-[A-HJKMNP-Z2-9]{6}$/;
let logs: string[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  process.env.PULLUP_COUPON_ID = 'coupon_abc';
  process.env.STRIPE_MODE = 'live';
  sendMock.mockReset(); upsertMock.mockReset(); invokeMock.mockReset(); createMock.mockReset();
  sendMock.mockResolvedValue({});
  upsertMock.mockResolvedValue(undefined);
  invokeMock.mockResolvedValue({});
  createMock.mockImplementation(async (a: any) => ({ id: 'promo_1', code: a.code }));
  logs = [];
  for (const m of ['log', 'error', 'warn', 'info'] as const) vi.spyOn(console, m).mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
});
afterEach(() => { vi.useRealTimers(); });

describe('pullup-challenge-entry', () => {
  it('valid start entry: stores row without age/bodyweight/division', async () => {
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    const [put] = cmds('Put');
    expect(put.input.TableName).toBe('PullUpChallengeEntries');
    expect(put.input.ConditionExpression).toContain('attribute_not_exists');
    expect(put.input.Item).toMatchObject({
      email: 'jane@example.com', sk: 'round#start', name: 'Jane Doe', phone: '+18175550142',
      instagramUrl: valid.instagramUrl, consentVersion: 'pullup-v2', smsOptIn: false, emailOptIn: false, sourceIp: '1.2.3.4',
    });
    for (const k of ['age', 'bodyweightLb', 'division', 'adult']) expect(put.input.Item).not.toHaveProperty(k);
  });

  it('issues a code: Stripe args, response, saved on the entry row', async () => {
    const res: any = await handler(evt());
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.code).toMatch(CODE_RE);
    expect(createMock).toHaveBeenCalledTimes(1);
    const a = createMock.mock.calls[0][0];
    expect(a).toMatchObject({
      coupon: 'coupon_abc', code: body.code, max_redemptions: 1,
      expires_at: Math.floor(NOW.getTime() / 1000) + 90 * 86400,
      metadata: { source: 'pullup-challenge', round: 'start' },
    });
    expect(JSON.stringify(a.metadata)).not.toMatch(/jane|example|doe/i);
    const [upd] = cmds('Update').filter((c) => c.input.TableName === 'PullUpChallengeEntries');
    expect(upd.input.Key).toEqual({ email: 'jane@example.com', sk: 'round#start' });
    expect(JSON.stringify(upd.input.ExpressionAttributeValues)).toContain(body.code);
    expect(JSON.stringify(upd.input.ExpressionAttributeValues)).toContain('promo_1');
  });

  it('retries after a duplicate-code error and returns the second code', async () => {
    createMock.mockRejectedValueOnce(Object.assign(new Error('x'), { type: 'StripeInvalidRequestError', code: 'resource_already_exists' }));
    const res: any = await handler(evt());
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(res.body).code).toBe(createMock.mock.calls[1][0].code);
  });

  it('sends one entrant email with code + consult link, and one TJ notice with the code', async () => {
    const res: any = await handler(evt());
    const code = JSON.parse(res.body).code;
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(entrantMail()).toHaveLength(1);
    expect(entrantMail()[0]).toMatchObject({ kind: 'info', from: 'drtj' });
    expect(entrantMail()[0].text).toContain(code);
    expect(entrantMail()[0].text).toContain('https://www.my4mlife.com/consult?lane=peptides&src=pullup');
    expect(tjMail()).toHaveLength(1);
    expect(tjMail()[0].text).toContain(code);
    expect(tjMail()[0].text).toContain('instagram.com/p/ABC123');
  });

  it('upserts contact with no consent unless boxes checked', async () => {
    await handler(evt());
    const input = upsertMock.mock.calls[0][1];
    expect(input).toMatchObject({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', phone: '+18175550142', source: 'pullup-challenge' });
    expect(input.marketingConsent).toBeUndefined();
    expect(cmds('Update').filter((c) => c.input.TableName === 'Contact')).toHaveLength(0);
  });
  it('email box checked writes opted_in marketingConsent with version', async () => {
    await handler(evt({ emailOptIn: true }));
    expect(upsertMock.mock.calls[0][1].marketingConsent).toMatchObject({ status: 'opted_in', source: 'pullup-challenge', version: 'pullup-v2' });
  });
  it('SMS box checked writes smsConsent opted_in on Contact', async () => {
    await handler(evt({ smsOptIn: true }));
    const [u] = cmds('Update').filter((c) => c.input.TableName === 'Contact');
    expect(u.input.Key).toEqual({ contactId: 'cid-jane@example.com' });
    expect(JSON.stringify(u.input.ExpressionAttributeValues)).toContain('opted_in');
  });

  it('duplicate round returns 409 with no code, no Stripe, no emails', async () => {
    const e: any = new Error('x'); e.name = 'ConditionalCheckFailedException';
    sendMock.mockRejectedValueOnce(e);
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toContain('already entered this round');
    expect(JSON.parse(res.body).code).toBeUndefined();
    expect(createMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('Stripe failure: 200 {ok:true} without code, no entrant email, TJ told to issue by hand', async () => {
    createMock.mockRejectedValue(new Error('stripe down'));
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(entrantMail()).toHaveLength(0);
    expect(tjMail()).toHaveLength(1);
    expect(tjMail()[0].text).toContain('issue code by hand');
    expect(cmds('Update').filter((c) => c.input.TableName === 'PullUpChallengeEntries')).toHaveLength(0);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it('entrant email failure does not fail the request; code still returned; TJ still notified', async () => {
    invokeMock.mockImplementation(async (c: any) => {
      if (JSON.parse(Buffer.from(c.input.Payload).toString()).to === 'jane@example.com') throw new Error('smtp');
      return {};
    });
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).code).toMatch(CODE_RE);
    expect(tjMail()).toHaveLength(1);
  });

  it('contact upsert failure and TJ notify failure do not fail the request', async () => {
    upsertMock.mockRejectedValue(new Error('ddb'));
    invokeMock.mockRejectedValue(new Error('boom'));
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).code).toMatch(CODE_RE);
  });

  it('saveCode failure still returns 200 (best effort)', async () => {
    sendMock.mockImplementation(async (c: any) => {
      if (c.t === 'Update' && c.input.TableName === 'PullUpChallengeEntries') throw new Error('ddb');
      return {};
    });
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
  });

  describe('windows via the clock', () => {
    const at = async (iso: string, round: string) => {
      vi.setSystemTime(new Date(iso));
      return (await handler(evt({ round }))) as any;
    };
    it('start accepted Dec 15 23:59:59 CT', async () => expect((await at('2026-12-16T05:59:59Z', 'start')).statusCode).toBe(200));
    it('start rejected Dec 16 00:00 CT: 400, nothing stored or issued', async () => {
      expect((await at('2026-12-16T06:00:00Z', 'start')).statusCode).toBe(400);
      expect(sendMock).not.toHaveBeenCalled();
      expect(createMock).not.toHaveBeenCalled();
    });
    it('final rejected Dec 31 23:59:59 CT', async () => expect((await at('2027-01-01T05:59:59Z', 'final')).statusCode).toBe(400));
    it('final accepted Jan 1 00:00 CT', async () => expect((await at('2027-01-01T06:00:00Z', 'final')).statusCode).toBe(200));
    it('final accepted Jan 7 23:59:59 CT', async () => expect((await at('2027-01-08T05:59:59Z', 'final')).statusCode).toBe(200));
    it('final rejected Jan 8 00:00 CT', async () => expect((await at('2027-01-08T06:00:00Z', 'final')).statusCode).toBe(400));
  });

  it.each([
    ['adult false', { adult: false }],
    ['adult missing', { adult: undefined }],
    ['rules not accepted', { rulesAccepted: false }],
    ['bad email', { email: 'nope' }],
    ['bad instagram', { instagramUrl: 'http://instagram.com/p/1' }],
    ['bad round', { round: 'middle' }],
  ])('400 on %s, nothing stored or issued', async (_n, over) => {
    const res: any = await handler(evt(over));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it.each([['honeypot', { hp: 'x' }], ['too fast', { t: 100 }]])('bot (%s) gets silent 200, nothing stored or issued', async (_n, over) => {
    const res: any = await handler(evt(over));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).code).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('final without start is flagged noStartOnFile; with start is not', async () => {
    vi.setSystemTime(new Date('2027-01-03T18:00:00Z'));
    await handler(evt({ round: 'final' }));
    expect(cmds('Put')[0].input.Item).toMatchObject({ sk: 'round#final', noStartOnFile: true });
    sendMock.mockReset();
    sendMock.mockImplementation(async (c: any) => (c.t === 'Get' ? { Item: { email: 'x' } } : {}));
    await handler(evt({ round: 'final', email: 'other@example.org' }));
    expect(cmds('Put')[0].input.Item.noStartOnFile).toBeUndefined();
  });

  it('never logs email, phone, name or the code', async () => {
    invokeMock.mockRejectedValue(new Error('boom jane@example.com'));
    createMock.mockRejectedValueOnce(new Error('stripe jane@example.com Jane'));
    await handler(evt({ emailOptIn: true, smsOptIn: true }));
    await handler(evt({ hp: 'x' }));
    await handler(evt({ adult: false }));
    const e: any = new Error('x'); e.name = 'ConditionalCheckFailedException';
    sendMock.mockRejectedValueOnce(e);
    await handler(evt());
    const all = logs.join('\n');
    expect(logs.length).toBeGreaterThan(0);
    expect(all).not.toMatch(/jane|doe|555|8175|example\.com/i);
    expect(all).not.toMatch(/PULLUP-[A-Z0-9]{6}/);
  });

  it('answers OPTIONS with 204', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'OPTIONS' } } } as any);
    expect(res.statusCode).toBe(204);
  });
});
