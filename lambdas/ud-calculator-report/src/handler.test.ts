import { describe, it, expect, beforeEach, vi } from 'vitest';

const { upsertMock, invokeMock } = vi.hoisted(() => ({ upsertMock: vi.fn(), invokeMock: vi.fn() }));

vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: upsertMock }));
vi.mock('@my4mlife/contact-id', () => ({ deriveContactId: (e: string) => `cid-${e}` }));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { constructor(_: any) {} } }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: vi.fn() }) },
  UpdateCommand: class { constructor(public input: any) {} },
}));
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = invokeMock; constructor(_: any) {} },
  InvokeCommand: class { constructor(public input: any) {} },
}));

import { handler } from './handler';
import { buildReport, money } from '../../../website/src/lib/uninsured-decade-report';

const valid = {
  age: 62, spouseAge: 60, stateAbbr: 'TX', netWorthBand: '500k-1m', monthlySpend: 400, exerciseHours: 3, rrrPct: 30,
  firstName: 'Jane', email: 'Jane@Example.com', emailOptIn: false, consentVersion: 'ud-calc-v1', hp: '', t: 6000,
};
const ADVISOR = 'advisor.person@firm.example.org';
const evt = (over: any = {}, method = 'POST') =>
  ({ body: JSON.stringify({ ...valid, ...over }), headers: { origin: 'https://my4mlife.com' }, requestContext: { http: { method } } }) as any;
const rawEvt = (body: string) => ({ body, headers: {}, requestContext: { http: { method: 'POST' } } }) as any;
const payloadOf = (i = 0) => JSON.parse(Buffer.from(invokeMock.mock.calls[i][0].input.Payload).toString());

let logs: string[];
beforeEach(() => {
  upsertMock.mockReset(); invokeMock.mockReset();
  upsertMock.mockResolvedValue(undefined);
  invokeMock.mockResolvedValue({});
  logs = [];
  for (const m of ['log', 'error', 'warn', 'info'] as const) vi.spyOn(console, m).mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
});

describe('ud-calculator-report handler', () => {
  it('OPTIONS returns 204', async () => {
    const res: any = await handler(evt({}, 'OPTIONS'));
    expect(res.statusCode).toBe(204);
  });

  it('bad JSON returns 400', async () => {
    expect(((await handler(rawEvt('{nope'))) as any).statusCode).toBe(400);
  });

  it.each([
    ['honeypot filled', { hp: 'x' }],
    ['too fast', { t: 500 }],
  ])('%s: 200 and nothing sent', async (_n, over) => {
    const res: any = await handler(evt(over));
    expect(res.statusCode).toBe(200);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it.each([
    ['age below 45', { age: 44 }],
    ['age above 85', { age: 86 }],
    ['age non-integer', { age: 60.5 }],
    ['age string', { age: 'sixty' }],
    ['spouseAge below 45', { spouseAge: 40 }],
    ['spouseAge above 85', { spouseAge: 90 }],
    ['unknown state', { stateAbbr: 'ZZ' }],
    ['unknown band', { netWorthBand: '10m+' }],
    ['spend negative', { monthlySpend: -1 }],
    ['spend above 100000', { monthlySpend: 100001 }],
    ['exercise negative', { exerciseHours: -1 }],
    ['exercise above 40', { exerciseHours: 41 }],
    ['rrr negative', { rrrPct: -1 }],
    ['rrr above 50', { rrrPct: 51 }],
    ['firstName empty', { firstName: '' }],
    ['firstName 41 chars', { firstName: 'a'.repeat(41) }],
    ['bad email', { email: 'not-an-email' }],
    ['bad advisor email', { advisorEmail: 'nope' }],
    ['advisor equals own email', { advisorEmail: 'jane@example.com' }],
  ])('invalid %s: 400 and nothing sent', async (_n, over) => {
    const res: any = await handler(evt(over));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toEqual(expect.any(String));
    expect(invokeMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('accepts a single person (no spouseAge) and boundary values', async () => {
    const res: any = await handler(evt({ spouseAge: undefined, age: 45, monthlySpend: 0, exerciseHours: 40, rrrPct: 0 }));
    expect(res.statusCode).toBe(200);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('valid: one email-sender invoke with attachment, no cc, and the server-computed Bill', async () => {
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const cmd = invokeMock.mock.calls[0][0].input;
    expect(cmd.FunctionName).toBe('my4mlife-email-sender');
    const p = payloadOf();
    expect(p).toMatchObject({ kind: 'info', from: 'drtj', to: 'jane@example.com' });
    expect(p.cc).toBeUndefined();
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments[0]).toMatchObject({ filename: 'Uninsured-Decade-Jane.pdf', contentType: 'application/pdf' });
    expect(typeof (p.attachments[0].content ?? p.attachments[0].contentBase64 ?? p.attachments[0].data)).toBe('string');
    const bill = money(buildReport({ age: 62, spouseAge: 60, stateAbbr: 'TX', netWorthBand: '500k-1m', monthlySpend: 400, exerciseHours: 3, rrrPct: 30 }).bill);
    expect(p.html).toContain(bill);
    expect(p.text).toContain(bill);
    expect(p.subject).toEqual(expect.any(String));
  });

  it('ignores any client-supplied content fields (server-only content)', async () => {
    await handler(evt({ html: '<b>EVIL-RELAY</b>', text: 'EVIL-RELAY', subject: 'EVIL-RELAY', bill: 1 }));
    const p = payloadOf();
    expect(JSON.stringify(p)).not.toContain('EVIL-RELAY');
  });

  it('advisor copy goes in cc on the same single email', async () => {
    const res: any = await handler(evt({ advisorEmail: `  ${ADVISOR.toUpperCase()} ` }));
    expect(res.statusCode).toBe(200);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(payloadOf().cc).toBe(ADVISOR);
  });

  it('Contact upsert: source, event, no financial fields, no marketingConsent without opt-in', async () => {
    await handler(evt());
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const input = upsertMock.mock.calls[0][1];
    expect(input).toMatchObject({ email: 'jane@example.com', firstName: 'Jane', source: 'uninsured-decade-calculator', event: { type: 'ud-calculator-report' } });
    expect(input.marketingConsent).toBeUndefined();
    const s = JSON.stringify(input);
    for (const f of ['age', 'spouse', 'stateAbbr', 'TX', 'netWorth', '500k', 'monthlySpend', 'exercise', 'rrr']) expect(s).not.toContain(f);
  });

  it('marketingConsent only when emailOptIn is true', async () => {
    await handler(evt({ emailOptIn: true }));
    const input = upsertMock.mock.calls[0][1];
    expect(input.marketingConsent).toMatchObject({ status: 'opted_in', source: 'uninsured-decade-calculator', version: 'ud-calc-v1' });
  });

  it('advisor address never in Contact or console output; email/name never logged', async () => {
    await handler(evt({ advisorEmail: ADVISOR, emailOptIn: true }));
    expect(JSON.stringify(upsertMock.mock.calls)).not.toContain('advisor.person');
    const out = logs.join('\n').toLowerCase();
    expect(out).not.toContain('advisor.person');
    expect(out).not.toContain('jane');
    expect(out).not.toContain('example.com');
  });

  it('nothing sensitive logged on failure paths either', async () => {
    invokeMock.mockRejectedValue(new Error(`boom jane@example.com ${ADVISOR}`));
    await handler(evt({ advisorEmail: ADVISOR }));
    upsertMock.mockRejectedValue(new Error('jane@example.com'));
    await handler(evt({ advisorEmail: ADVISOR }));
    const out = logs.join('\n').toLowerCase();
    expect(out).not.toContain('advisor.person');
    expect(out).not.toContain('jane');
  });

  it('email send failure returns 502', async () => {
    invokeMock.mockRejectedValue(new Error('lambda down'));
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(502);
  });

  it('email-sender function error (FunctionError) returns 502', async () => {
    invokeMock.mockResolvedValue({ FunctionError: 'Unhandled' });
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(502);
  });

  it('Contact failure still returns 200', async () => {
    upsertMock.mockRejectedValue(new Error('ddb down'));
    const res: any = await handler(evt());
    expect(res.statusCode).toBe(200);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});
