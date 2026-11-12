import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

const { load, stamp, unstamp, send, hmacKey } = vi.hoisted(() => ({ load: vi.fn(), stamp: vi.fn(), unstamp: vi.fn(), send: vi.fn(), hmacKey: vi.fn() }));
vi.mock('./store', () => ({ load, stamp, unstamp }));
vi.mock('./mail', () => ({ send }));
vi.mock('./key', () => ({ hmacKey }));
import { handler } from './handler';

const KEY = 'test-key';
const sign = (c: string, s: string, t: string, k: string, e: number) => createHmac('sha256', KEY).update(`${c}|${s}|${t}|${k}|${e}`).digest('hex');
const params = (over: Record<string, string> = {}, e = Math.floor(Date.now() / 1000) + 3600) => {
  const p = { c: 'c1', s: 'encounter#pp-cs_1', t: '1Z999AA10123456784', k: 'UPS', e: String(e), ...over };
  return { ...p, sig: over.sig ?? sign(p.c, p.s, p.t, p.k, Number(p.e)) };
};
const get = (q: Record<string, string>) => handler({ queryStringParameters: q, requestContext: { http: { method: 'GET' } } });
const post = (q: Record<string, string>) => handler({ body: new URLSearchParams(q).toString(), requestContext: { http: { method: 'POST' } } });
const enc = (extra = {}) => ({ enc: { lane: 'push-patch', state: 'script-written', sku: 'push-patch-nad-ghk', ...extra }, demo: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' } });

beforeEach(() => { vi.clearAllMocks(); hmacKey.mockResolvedValue(KEY); load.mockResolvedValue(enc()); stamp.mockResolvedValue(true); send.mockResolvedValue(undefined); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('push-patch-ship-admin', () => {
  it('valid GET shows confirm page with POST form and no side effects', async () => {
    const r = await get(params());
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Ada L.');
    expect(r.body).toContain('1Z999AA10123456784');
    expect(r.body).toContain('method="post"');
    expect(r.body).not.toContain('Lovelace');
    expect(stamp).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('valid POST stamps tracking and emails the patient from support', async () => {
    const r = await post(params());
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Sent');
    expect(stamp).toHaveBeenCalledWith('c1', 'encounter#pp-cs_1', '1Z999AA10123456784', 'UPS', expect.any(String));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'ada@example.com', from: 'support', subject: 'Your Push Patch is on its way' });
    expect(send.mock.calls[0][0].text).toContain('1Z999AA10123456784');
  });

  it('second POST sends nothing (already stamped)', async () => {
    load.mockResolvedValue(enc({ trackingNumber: '1Z999AA10123456784' }));
    const r = await post(params());
    expect(r.body).toContain('Already sent: tracking 1Z999AA10123456784');
    expect(stamp).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('lost stamping race sends nothing', async () => {
    stamp.mockResolvedValue(false);
    load.mockResolvedValueOnce(enc()).mockResolvedValueOnce(enc({ trackingNumber: '1ZOTHER' }));
    const r = await post(params());
    expect(r.body).toContain('Already sent');
    expect(send).not.toHaveBeenCalled();
  });

  it('bad or missing signature returns 403 on GET and POST', async () => {
    expect((await get(params({ sig: 'ab'.repeat(32) }))).statusCode).toBe(403);
    expect((await post({ ...params(), t: '1ZTAMPERED' })).statusCode).toBe(403);
    const { sig: _s, ...nosig } = params();
    expect((await get(nosig)).statusCode).toBe(403);
    expect(stamp).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('expired link returns 403 even with a valid signature', async () => {
    const r = await post(params({}, Math.floor(Date.now() / 1000) - 10));
    expect(r.statusCode).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it('wrong state is refused and nothing is sent', async () => {
    load.mockResolvedValue(enc({ state: 'declined' }));
    const r = await post(params());
    expect(r.statusCode).toBe(409);
    expect(stamp).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('logs no PHI or tracking numbers on failure', async () => {
    send.mockRejectedValue(new Error('boom ada@example.com 1Z999AA10123456784'));
    const r = await post(params());
    expect(r.statusCode).toBe(500);
    expect(JSON.stringify((console.error as any).mock.calls)).not.toMatch(/ada|1Z999/);
  });
  it('test orders are refused on GET and POST', async () => {
    load.mockResolvedValue(enc({ testOrder: true }));
    expect((await get(params())).statusCode).toBe(404);
    expect((await post(params())).statusCode).toBe(404);
    expect(stamp).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('send failure undoes the stamp so the link can be retried', async () => {
    send.mockRejectedValue(new Error('email-sender failed'));
    const r = await post(params());
    expect(r.statusCode).toBe(500);
    expect(unstamp).toHaveBeenCalledWith('c1', 'encounter#pp-cs_1', '1Z999AA10123456784');
  });
});
