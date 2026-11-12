// Contract: a link minted by push-patch-tracking's signer must verify here, survive URL encoding
// (sk contains '#') through GET -> confirm form -> POST, and expire on the same clock (epoch seconds).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildLink, LINK_TTL_SECONDS } from '../../push-patch-tracking/src/sign';
import { verify } from './sig';

const { load, stamp, unstamp, send, hmacKey } = vi.hoisted(() => ({ load: vi.fn(), stamp: vi.fn(), unstamp: vi.fn(), send: vi.fn(), hmacKey: vi.fn() }));
vi.mock('./store', () => ({ load, stamp, unstamp }));
vi.mock('./mail', () => ({ send }));
vi.mock('./key', () => ({ hmacKey }));
import { handler } from './handler';

const KEY = 'shared-ssm-key';
const BASE = 'https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/push-patch-ship';
const SK = 'encounter#pp-cs_live_a1B2#c3';
const parts = { c: 'contact-1', s: SK, t: '1Z999AA10123456784', k: 'UPS' };
const unesc = (v: string) => v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

beforeEach(() => {
  vi.clearAllMocks();
  hmacKey.mockResolvedValue(KEY); stamp.mockResolvedValue(true); send.mockResolvedValue(undefined);
  load.mockResolvedValue({ enc: { lane: 'push-patch', state: 'script-written', sku: 'push-patch-nad-ghk' }, demo: { firstName: 'Ada', lastName: 'L', email: 'ada@example.com' } });
});

describe('tracking -> ship-admin link contract', () => {
  it('a tracking-minted link verifies in ship-admin, with # encoded', () => {
    const url = buildLink(BASE, parts, KEY);
    expect(url.startsWith(`${BASE}?`)).toBe(true);
    expect(url.slice(BASE.length)).not.toContain('#');
    const link = verify(new URL(url).searchParams, KEY);
    expect(link).toMatchObject({ ...parts });
  });

  it('expiry: same unit (epoch seconds), valid through e, rejected after', () => {
    const now = 1_800_000_000;
    const q = new URL(buildLink(BASE, parts, KEY, now)).searchParams;
    expect(Number(q.get('e'))).toBe(now + LINK_TTL_SECONDS);
    expect(verify(q, KEY, now + LINK_TTL_SECONDS)).not.toBeNull();
    expect(verify(q, KEY, now + LINK_TTL_SECONDS + 1)).toBeNull();
    expect(verify(q, 'other-key', now)).toBeNull();
  });

  it('round trip: API Gateway GET -> confirm form -> POST stamps the original sk', async () => {
    const u = new URL(buildLink(BASE, parts, KEY));
    const g = await handler({ queryStringParameters: Object.fromEntries(u.searchParams), requestContext: { http: { method: 'GET' } } });
    expect(g.statusCode).toBe(200);
    const fields = [...g.body.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)">/g)].map((m) => [m[1]!, unesc(m[2]!)]);
    const body = Buffer.from(new URLSearchParams(fields).toString()).toString('base64');
    const p = await handler({ body, isBase64Encoded: true, requestContext: { http: { method: 'POST' } } });
    expect(p.statusCode).toBe(200);
    expect(stamp).toHaveBeenCalledWith('contact-1', SK, '1Z999AA10123456784', 'UPS', expect.any(String));
    expect(send).toHaveBeenCalledTimes(1);
  });
});
