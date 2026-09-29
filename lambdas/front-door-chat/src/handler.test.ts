import { describe, expect, it, vi, beforeEach } from 'vitest';

const ddbSend = vi.fn().mockResolvedValue({});
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSend(...a) }) },
  PutCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

const invokeChat = vi.fn();
vi.mock('./bedrock', () => ({ invokeChat: (...a: any[]) => invokeChat(...a), embedQuery: vi.fn() }));
vi.mock('./retrieve', async (orig) => ({
  ...(await orig<any>()),
  retrieve: async () => [{ id: 'x', source: 'site', title: 'Gut', url: 'https://my4mlife.com/solutions/gut', text: 'gut', vec: [1] }],
}));

const { handler } = await import('./handler');
const { guard } = await import('./guard');
const { validateRequest } = await import('./validate');
const { redact } = await import('./store');
const { buildSystemPrompt } = await import('./prompt');
const { cosine, rank } = await import('./retrieve');
const fixture = (await import('../index/chunks.sample.json')).default as any;

const SID = '11111111-1111-4111-8111-111111111111';
const event = (body: unknown) => ({
  headers: { origin: 'https://my4mlife.com' },
  requestContext: { http: { method: 'POST' } },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}) as any;

beforeEach(() => { ddbSend.mockClear(); invokeChat.mockReset(); });

describe('validation', () => {
  const newId = () => SID;
  it('rejects an empty message', () => {
    expect(validateRequest({ message: '   ' }, newId)).toMatchObject({ ok: false });
  });
  it('rejects a message over 600 chars', () => {
    expect(validateRequest({ message: 'a'.repeat(601) }, newId)).toMatchObject({ ok: false });
  });
  it('rejects more than 6 history turns', () => {
    const history = Array.from({ length: 7 }, () => ({ role: 'user', text: 'hi' }));
    expect(validateRequest({ message: 'hi', history }, newId)).toMatchObject({ ok: false });
  });
  it('rejects history over 4k chars', () => {
    const history = [{ role: 'user', text: 'a'.repeat(4001) }];
    expect(validateRequest({ message: 'hi', history }, newId)).toMatchObject({ ok: false });
  });
  it('rejects a bad role', () => {
    expect(validateRequest({ message: 'hi', history: [{ role: 'system', text: 'x' }] }, newId)).toMatchObject({ ok: false });
  });
  it('issues a sessionId when absent or malformed', () => {
    expect(validateRequest({ message: 'hi' }, newId)).toMatchObject({ ok: true, value: { sessionId: SID } });
    expect(validateRequest({ message: 'hi', sessionId: 'nope' }, newId)).toMatchObject({ ok: true, value: { sessionId: SID } });
  });
  it('keeps a valid uuid v4', () => {
    const r = validateRequest({ message: 'hi', sessionId: SID }, () => 'other');
    expect(r).toMatchObject({ ok: true, value: { sessionId: SID } });
  });
});

describe('handler', () => {
  it('answers 204 to preflight', async () => {
    const res: any = await handler({ ...event({}), requestContext: { http: { method: 'OPTIONS' } } });
    expect(res.statusCode).toBe(204);
  });
  it('400s on invalid json and missing body', async () => {
    expect((await handler(event('{nope')) as any).statusCode).toBe(400);
    expect((await handler({ ...event({}), body: undefined }) as any).statusCode).toBe(400);
  });
  it('returns reply/links/exit/sessionId and stores a turn', async () => {
    invokeChat.mockResolvedValue('Start with the assessment. /assessment');
    const res: any = await handler(event({ message: 'is this for me?', sessionId: SID }));
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.exit).toBe('assessment');
    expect(body.sessionId).toBe(SID);
    expect(body.links[0].url).toBe('https://my4mlife.com/assessment');
    expect(ddbSend).toHaveBeenCalledOnce();
    const item = ddbSend.mock.calls[0][0].input.Item;
    expect(item.contactId).toBe(`chat#${SID}`);
    expect(item.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000) + 29 * 86400);
  });
  it('falls back to the free call when the model throws', async () => {
    invokeChat.mockRejectedValue(new Error('bedrock down'));
    const res: any = await handler(event({ message: 'hi', sessionId: SID }));
    expect(JSON.parse(res.body).exit).toBe('consult');
  });
  it('echoes only an allowed origin', async () => {
    invokeChat.mockResolvedValue('hello');
    const res: any = await handler({ ...event({ message: 'hi' }), headers: { origin: 'https://evil.com' } });
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
  });
});

describe('guard', () => {
  it('strips links that are not on the allowlist', () => {
    const r = guard('Try https://evil.com/offer and /not-a-real-page for more.');
    expect(r.reply).not.toContain('evil.com');
    expect(r.reply).not.toContain('/not-a-real-page');
    expect(r.links).toHaveLength(0);
    expect(r.exit).toBeNull();
  });
  it('keeps only the first allowed link', () => {
    const r = guard('Read /solutions/gut then /solutions/sleep.');
    expect(r.links).toHaveLength(1);
    expect(r.links[0].url).toBe('https://my4mlife.com/solutions/gut');
  });
  it('accepts an absolute my4mlife url', () => {
    expect(guard('See https://www.my4mlife.com/consult').links[0].url).toBe('https://my4mlife.com/consult');
  });
  it.each([
    'The formula contains BPC-157 at 500mcg.',
    'Dr. TJ is a physician who reviews your labs.',
    'It costs $399 a month.',
    'This cures leaky gut.',
    'I can prescribe that for you.',
  ])('falls back on forbidden content: %s', (bad) => {
    const r = guard(bad);
    expect(r.blocked).toBe(true);
    expect(r.exit).toBe('consult');
    expect(r.reply).not.toContain('BPC');
  });
  it('allows the approved $249 price', () => {
    expect(guard('Testosterone is a live visit, $249, and includes a hormone panel.').blocked).toBe(false);
  });
  it('detects the consult exit', () => {
    expect(guard('The free call is the fastest route: /consult').exit).toBe('consult');
  });
});

describe('retrieve', () => {
  it('scores identical vectors at 1 and orthogonal at 0', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('ranks the matching fixture chunk first and dedupes by title', () => {
    const q = fixture.chunks[1].vec;
    const top = rank(fixture, q, 6);
    expect(top[0].title).toBe('What the free call covers');
    expect(new Set(top.map((c: any) => c.title)).size).toBe(top.length);
  });
});

describe('store redaction', () => {
  it('redacts emails, formatted phones and long digit runs', () => {
    const out = redact('mail me at bob@example.com or 612-555-1212 or 6125551212');
    expect(out).not.toMatch(/bob@example\.com|612-555-1212|6125551212/);
    expect(out).toContain('[redacted-email]');
    expect(out).toContain('[redacted-phone]');
    expect(out).toContain('[redacted-number]');
  });
});

describe('prompt', () => {
  const chunks = [{ id: '1', source: 'site' as const, title: 'Gut', url: 'https://my4mlife.com/solutions/gut', text: 'gut lining', vec: [] }];
  it('includes the AI disclosure on the first turn only', () => {
    expect(buildSystemPrompt({ chunks, firstTurn: true })).toContain("I'm Dr. TJ's AI");
    expect(buildSystemPrompt({ chunks, firstTurn: false })).toContain('Do not repeat it');
  });
  it('carries the verbatim lane and price text', () => {
    const p = buildSystemPrompt({ chunks, firstTurn: true });
    expect(p).toContain('Testosterone (men) — live audio-visual visit, $249 (includes a hormone panel).');
    expect(p).toContain('Gut-Brain Rx — async review, free visit.');
    expect(p).toContain('Doctor of Chiropractic');
    expect(p).toContain('proprietary, physician-written gut-lining formulation');
  });
  it('states the two exits and forbids "book a visit"', () => {
    const p = buildSystemPrompt({ chunks, firstTurn: true });
    expect(p).toContain('/assessment');
    expect(p).toContain('/consult');
    expect(p).toContain('book a visit');
  });
  it('puts the retrieved source path in the prompt', () => {
    expect(buildSystemPrompt({ chunks, firstTurn: true })).toContain('/solutions/gut');
  });
});
