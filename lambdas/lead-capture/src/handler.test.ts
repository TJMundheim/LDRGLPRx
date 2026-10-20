import { describe, it, expect, beforeEach, vi } from 'vitest';

const { upsertMock, sendMock } = vi.hoisted(() => ({ upsertMock: vi.fn(), sendMock: vi.fn() }));

vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: upsertMock }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

import { handler } from './handler';

// Legit browser submits always carry t (ms since render) and an empty honeypot.
const evt = (body: any, extra: any = {}) =>
  ({ body: JSON.stringify({ t: 5000, hp: '', ...body }), headers: {}, requestContext: {}, ...extra }) as any;
// Raw body, no defaults, for bot-rule tests.
const raw = (body: any) => ({ body: JSON.stringify(body), headers: {}, requestContext: {} }) as any;

beforeEach(() => {
  upsertMock.mockReset();
  upsertMock.mockResolvedValue(undefined);
});

describe('lead-capture handler', () => {
  it('rejects missing email', async () => {
    const res: any = await handler(evt({ firstName: 'TJ' }));
    expect(res.statusCode).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('rejects malformed email', async () => {
    const res: any = await handler(evt({ email: 'not-an-email' }));
    expect(res.statusCode).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    const res: any = await handler({ body: '{nope', headers: {}, requestContext: {} } as any);
    expect(res.statusCode).toBe(400);
  });

  it('answers OPTIONS preflight with 204 and no write', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'OPTIONS' } } } as any);
    expect(res.statusCode).toBe(204);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('calls upsertContact with lead stage, opted_in consent, and newsletter-signup event', async () => {
    const res: any = await handler(evt({ email: '  DrTJ@Example.com ', firstName: ' TJ ', source: 'blog-newsletter:gut' }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [ddb, input] = upsertMock.mock.calls[0];
    expect(ddb).toEqual({ send: sendMock });
    expect(input).toEqual({
      email: 'drtj@example.com',
      firstName: 'TJ',
      source: 'blog-newsletter:gut',
      stage: 'lead',
      marketingConsent: { status: 'opted_in', source: 'blog-newsletter:gut' },
      event: { type: 'newsletter-signup' },
    });
  });

  it('defaults source to newsletter when absent or empty', async () => {
    await handler(evt({ email: 'a@b.co' }));
    await handler(evt({ email: 'a@b.co', source: '' }));
    for (const [, input] of upsertMock.mock.calls) {
      expect(input.source).toBe('newsletter');
      expect(input.marketingConsent.source).toBe('newsletter');
    }
  });

  it('omits firstName when not supplied and never passes health or legacy newsletter fields', async () => {
    await handler(evt({ email: 'a@b.co', intakeAnswers: { x: 1 } }));
    const [, input] = upsertMock.mock.calls[0];
    expect('firstName' in input).toBe(false);
    expect(Object.keys(input).sort()).toEqual(['email', 'event', 'marketingConsent', 'source', 'stage']);
  });

  it('truncates source to 100 chars', async () => {
    await handler(evt({ email: 'a@b.co', source: 'x'.repeat(300) }));
    expect(upsertMock.mock.calls[0][1].source).toHaveLength(100);
  });

  it('returns 500 write failed when the helper throws', async () => {
    upsertMock.mockRejectedValueOnce(new Error('boom'));
    const res: any = await handler(evt({ email: 'a@b.co' }));
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: 'write failed' });
  });
});

describe('bot block', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });

  const blocked = async (body: any, reason: string) => {
    const res: any = await handler(raw(body));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(upsertMock).not.toHaveBeenCalled();
    const lines = logSpy.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('bot-blocked'));
    expect(lines).toEqual([`[lead-capture] bot-blocked ${reason}`]);
    expect(lines[0]).not.toContain('@');
  };

  it('non-empty honeypot: 200, no write, logged', async () => {
    await blocked({ email: 'victim@example.com', source: 'footer', hp: 'http://spam', t: 9000 }, 'honeypot');
  });
  it('missing t: 200, no write, logged', async () => {
    await blocked({ email: 'victim@example.com', source: 'footer', hp: '' }, 'no-timing');
  });
  it('non-numeric t: 200, no write, logged', async () => {
    await blocked({ email: 'victim@example.com', t: '9000' }, 'no-timing');
  });
  it('t under 3000ms: 200, no write, logged', async () => {
    await blocked({ email: 'victim@example.com', t: 2999 }, 'too-fast');
  });
  it('t of exactly 3000ms writes', async () => {
    const res: any = await handler(raw({ email: 'ok@example.com', t: 3000 }));
    expect(res.statusCode).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
  it('happy path with empty honeypot still writes', async () => {
    const res: any = await handler(evt({ email: 'ok@example.com', source: 'footer' }));
    expect(res.statusCode).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
  it('malformed email is still a 400 (validation before bot check does not mask real errors)', async () => {
    const res: any = await handler(evt({ email: 'nope' }));
    expect(res.statusCode).toBe(400);
  });
});
