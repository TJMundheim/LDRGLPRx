import { describe, it, expect, beforeEach, vi } from 'vitest';

const { sendMock, upsertMock, invokeMock } = vi.hoisted(() => ({ sendMock: vi.fn(), upsertMock: vi.fn(), invokeMock: vi.fn() }));

vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: upsertMock }));
vi.mock('@my4mlife/contact-id', () => ({ deriveContactId: (e: string) => `cid-${e}` }));
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

const valid = {
  name: 'Jane Doe', email: 'Jane@Example.com', phone: '(817) 555-0142', age: 34, bodyweightLb: 165.5,
  instagramUrl: 'https://www.instagram.com/p/ABC123/', round: 'start', rulesAccepted: true,
  smsOptIn: false, emailOptIn: false, consentVersion: 'pullup-v1', hp: '', t: 6000,
};
const evt = (over: any = {}) =>
  ({ body: JSON.stringify({ ...valid, ...over }), headers: { origin: 'https://my4mlife.com' }, requestContext: { http: { method: 'POST', sourceIp: '1.2.3.4' } } }) as any;
const cmds = (t: string) => sendMock.mock.calls.map((c) => c[0]).filter((c) => c.t === t);

let logs: string[];
beforeEach(() => {
  sendMock.mockReset(); upsertMock.mockReset(); invokeMock.mockReset();
  sendMock.mockResolvedValue({});
  upsertMock.mockResolvedValue(undefined);
  invokeMock.mockResolvedValue({});
  logs = [];
  for (const m of ['log', 'error', 'warn', 'info'] as const) vi.spyOn(console, m).mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
});

describe('pullup-challenge-entry', () => {
  it('valid start entry: stores, upserts contact with no consent, notifies TJ', async () => {
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    const [put] = cmds('Put');
    expect(put.input.TableName).toBe('PullUpChallengeEntries');
    expect(put.input.ConditionExpression).toContain('attribute_not_exists');
    expect(put.input.Item).toMatchObject({
      email: 'jane@example.com', sk: 'round#start', name: 'Jane Doe', phone: '+18175550142', age: 34,
      bodyweightLb: 165.5, instagramUrl: valid.instagramUrl, consentVersion: 'pullup-v1',
      smsOptIn: false, emailOptIn: false, sourceIp: '1.2.3.4',
    });
    expect(put.input.Item.submittedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const input = upsertMock.mock.calls[0][1];
    expect(input).toMatchObject({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', phone: '+18175550142', source: 'pullup-challenge' });
    expect(input.marketingConsent).toBeUndefined();
    expect(JSON.stringify(input)).not.toMatch(/165|instagram|34/);
    expect(cmds('Update')).toHaveLength(0);
    const payload = JSON.parse(Buffer.from(invokeMock.mock.calls[0][0].input.Payload).toString());
    expect(payload).toMatchObject({ kind: 'info', from: 'drtj', to: 'drtj@my4mlife.com', subject: 'Pull-Up Challenge entry: Jane D (start)' });
    expect(payload.text).toContain('instagram.com/p/ABC123');
  });

  it('email box checked writes opted_in marketingConsent with version', async () => {
    await handler(evt({ emailOptIn: true }));
    expect(upsertMock.mock.calls[0][1].marketingConsent).toMatchObject({ status: 'opted_in', source: 'pullup-challenge', version: 'pullup-v1' });
  });

  it('SMS box checked writes smsConsent opted_in', async () => {
    await handler(evt({ smsOptIn: true }));
    const [u] = cmds('Update');
    expect(u.input.TableName).toBe('Contact');
    expect(u.input.Key).toEqual({ contactId: 'cid-jane@example.com' });
    expect(JSON.stringify(u.input.ExpressionAttributeValues)).toContain('opted_in');
    expect(upsertMock.mock.calls[0][1].marketingConsent).toBeUndefined();
  });

  it('unchecked boxes never write opt-in', async () => {
    await handler(evt({ smsOptIn: false, emailOptIn: false }));
    expect(upsertMock.mock.calls[0][1].marketingConsent).toBeUndefined();
    expect(cmds('Update')).toHaveLength(0);
  });

  it('duplicate round returns 409', async () => {
    const e: any = new Error('x'); e.name = 'ConditionalCheckFailedException';
    sendMock.mockRejectedValueOnce(e);
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toContain('already entered this round');
    expect(upsertMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it.each([
    ['bad instagram host', { instagramUrl: 'https://evil.com/instagram.com/p/1' }],
    ['http instagram', { instagramUrl: 'http://instagram.com/p/1' }],
    ['under 18', { age: 17 }],
    ['rules not accepted', { rulesAccepted: false }],
    ['bad email', { email: 'nope' }],
    ['short phone', { phone: '12345' }],
    ['bodyweight low', { bodyweightLb: 50 }],
    ['bad round', { round: 'middle' }],
    ['missing name', { name: '' }],
    ['fractional age', { age: 30.5 }],
  ])('400 on %s', async (_n, over) => {
    const res: any = await handler(evt(over));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it.each([['honeypot', { hp: 'x' }], ['too fast', { t: 100 }]])('bot (%s) gets silent 200, nothing stored', async (_n, over) => {
    const res: any = await handler(evt(over));
    expect(res.statusCode).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('final without start is accepted and flagged noStartOnFile', async () => {
    sendMock.mockImplementation(async (c: any) => (c.t === 'Get' ? {} : {}));
    const res: any = await handler(evt({ round: 'final' }));
    expect(res.statusCode).toBe(200);
    expect(cmds('Put')[0].input.Item).toMatchObject({ sk: 'round#final', noStartOnFile: true });
  });

  it('final with start on file is not flagged', async () => {
    sendMock.mockImplementation(async (c: any) => (c.t === 'Get' ? { Item: { email: 'x' } } : {}));
    await handler(evt({ round: 'final' }));
    expect(cmds('Put')[0].input.Item.noStartOnFile).toBeUndefined();
  });

  it('failed notify still returns 200', async () => {
    invokeMock.mockRejectedValue(new Error('boom jane@example.com'));
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
  });

  it('never logs email, phone or name', async () => {
    invokeMock.mockRejectedValue(new Error('boom'));
    await handler(evt({ emailOptIn: true, smsOptIn: true }));
    await handler(evt({ hp: 'x' }));
    await handler(evt({ age: 5 }));
    const all = logs.join('\n');
    expect(logs.length).toBeGreaterThan(0);
    expect(all).not.toMatch(/jane|doe|555|8175|example\.com/i);
  });

  it('answers OPTIONS with 204', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'OPTIONS' } } } as any);
    expect(res.statusCode).toBe(204);
  });
});
