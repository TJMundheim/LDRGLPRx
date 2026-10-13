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

const evt = (body: any, extra: any = {}) =>
  ({ body: JSON.stringify(body), headers: {}, requestContext: {}, ...extra }) as any;

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
