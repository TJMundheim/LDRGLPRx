import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

const { s3Send, ddbSend, ssmSend, lamSend } = vi.hoisted(() => ({ s3Send: vi.fn(), ddbSend: vi.fn(), ssmSend: vi.fn(), lamSend: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: class { send = s3Send }, GetObjectCommand: class { constructor(public input: unknown) {} } }));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) },
  ScanCommand: class { constructor(public input: any) {} },
  GetCommand: class { constructor(public input: any) {} },
  UpdateCommand: class { constructor(public input: any) {} },
}));
vi.mock('@aws-sdk/client-ssm', () => ({ SSMClient: class { send = ssmSend }, GetParameterCommand: class { constructor(public input: unknown) {} } }));
vi.mock('@aws-sdk/client-lambda', () => ({ LambdaClient: class { send = lamSend }, InvokeCommand: class { constructor(public input: any) {} } }));
vi.mock('./parse', () => ({ parseTrackingEmail: vi.fn() }));

import { parseTrackingEmail } from './parse';
import { handler } from './handler';

const SECRET = 'test-secret';
const ok = { ok: true, firstName: 'Ronda', lastName: 'Christian', trackingNumber: '1Z999AA10123456784', carrier: 'UPS', fromSupplier: true };
const event = { Records: [{ ses: { mail: { messageId: 'mid1', commonHeaders: { subject: 'FW: TRACKING - Ronda Christian' } } } }] };
const enc = (contactId: string, extra = {}) => ({ contactId, sk: `encounter#pp-${contactId}`, state: 'script-written', sku: 'push-patch-nad-ghk', decidedAt: '2026-11-01T00:00:00Z', ...extra });
const rec = (first: string, last: string) => ({ demographics: { firstName: first, lastName: last, email: `${first}@x.test` } });
const sent = () => lamSend.mock.calls.map((c) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));

function db(encs: any[], recs: Record<string, any>, updateErr?: Error) {
  ddbSend.mockImplementation(async (cmd: any) => {
    if (cmd.input.FilterExpression !== undefined) return { Items: encs };
    if (cmd.input.UpdateExpression) { if (updateErr) throw updateErr; return {}; }
    return { Item: recs[cmd.input.Key.contactId] };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.MAIL_BUCKET = 'bkt'; process.env.SHIP_ADMIN_URL = 'https://ship.test/api/push-patch-ship';
  s3Send.mockResolvedValue({ Body: { transformToString: async () => 'raw' } });
  ssmSend.mockResolvedValue({ Parameter: { Value: SECRET } });
  lamSend.mockResolvedValue({});
  vi.mocked(parseTrackingEmail).mockResolvedValue(ok as any);
  vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('push-patch-tracking handler', () => {
  it('reads S3 at push-patch-tracking/<messageId>', async () => {
    db([], {}); await handler(event as any);
    expect(s3Send.mock.calls[0][0].input).toEqual({ Bucket: 'bkt', Key: 'push-patch-tracking/mid1' });
  });
  it('one match -> stamps conditionally and emails patient from support', async () => {
    db([enc('c1')], { c1: rec('ronda', 'CHRISTIAN') });
    await handler(event as any);
    const upd = ddbSend.mock.calls.map((c) => c[0].input).find((i) => i.UpdateExpression);
    expect(upd.ConditionExpression).toBe('attribute_not_exists(trackingNumber) AND #st = :s');
    expect(upd.Key).toEqual({ contactId: 'c1', sk: 'encounter#pp-c1' });
    expect(upd.ExpressionAttributeValues[':t']).toBe(ok.trackingNumber);
    const m = sent(); expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ kind: 'info', from: 'support', to: 'ronda@x.test' });
    expect(m[0].html).toContain(ok.trackingNumber);
  });
  it('accent-insensitive match', async () => {
    vi.mocked(parseTrackingEmail).mockResolvedValue({ ...ok, firstName: 'Jose', lastName: 'Garcia' } as any);
    db([enc('c1')], { c1: rec('José', 'García') });
    await handler(event as any);
    expect(sent()[0].to).toBe('José@x.test');
  });
  it('duplicate (conditional check failure) -> no email', async () => {
    db([enc('c1')], { c1: rec('Ronda', 'Christian') }, Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    await handler(event as any);
    expect(lamSend).not.toHaveBeenCalled();
  });
  it('zero matches -> TJ email, no links', async () => {
    db([enc('c1')], { c1: rec('Other', 'Person') });
    await handler(event as any);
    const m = sent(); expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ from: 'drtj', to: 'drtj@my4mlife.com' });
    expect(m[0].subject).toContain('Tracking needs your click');
    expect(m[0].text).toContain(ok.trackingNumber);
    expect(m[0].html).not.toContain('sig=');
  });
  it('two matches -> TJ email with two verifiable signed links', async () => {
    db([enc('c1'), enc('c2')], { c1: rec('Ronda', 'Christian'), c2: rec('Ronda', 'Christian') });
    await handler(event as any);
    const m = sent(); expect(m).toHaveLength(1);
    const links = [...m[0].text.matchAll(/https:\/\/ship\.test\/api\/push-patch-ship\?\S+/g)].map((x) => new URL(x[0]));
    expect(links).toHaveLength(2);
    for (const u of links) {
      const q = u.searchParams; const [c, s, t, k, e] = ['c', 's', 't', 'k', 'e'].map((x) => q.get(x)!);
      expect(createHmac('sha256', SECRET).update(`${c}|${s}|${t}|${k}|${e}`).digest('hex')).toBe(q.get('sig'));
      const days = (Number(e) * 1000 - Date.now()) / 86400000; expect(days).toBeGreaterThan(6.9); expect(days).toBeLessThanOrEqual(7);
    }
    expect(m[0].text).toContain('Ronda C.');
  });
  it('non-supplier -> nothing sent', async () => {
    vi.mocked(parseTrackingEmail).mockResolvedValue({ ok: false, reason: 'not-supplier' });
    await handler(event as any);
    expect(lamSend).not.toHaveBeenCalled(); expect(ddbSend).not.toHaveBeenCalled();
  });
  it('parse failure -> TJ email with subject and reason', async () => {
    vi.mocked(parseTrackingEmail).mockResolvedValue({ ok: false, reason: 'no-tracking' });
    await handler(event as any);
    const m = sent(); expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ from: 'drtj', to: 'drtj@my4mlife.com' });
    expect(m[0].subject).toContain("Couldn't read a Novo tracking email");
    expect(m[0].text).toContain('FW: TRACKING - Ronda Christian'); expect(m[0].text).toContain('no-tracking');
  });
  it('test orders are never matched (scan filters them out, and stray ones are dropped)', async () => {
    db([enc('c1', { testOrder: true })], { c1: rec('Ronda', 'Christian') });
    await handler(event as any);
    const scan = ddbSend.mock.calls.map((c) => c[0].input).find((i) => String(i.FilterExpression).includes('#st'));
    expect(scan.FilterExpression).toContain('testOrder');
    expect(sent()[0].subject).toContain('Tracking needs your click'); // zero matches, no patient email
    expect(sent()[0].from).toBe('drtj');
  });
  it('never logs names, emails or tracking numbers', async () => {
    db([enc('c1')], { c1: rec('Ronda', 'Christian') });
    await handler(event as any);
    const logged = JSON.stringify([...(console.log as any).mock.calls, ...(console.error as any).mock.calls]);
    for (const s of ['Ronda', 'Christian', '1Z999', '@x.test']) expect(logged).not.toContain(s);
  });
  it('tracking number already on an order (repeat delivery) -> no email to anyone', async () => {
    ddbSend.mockImplementation(async (cmd: any) => {
      if (String(cmd.input.FilterExpression).includes('trackingNumber = :t')) return { Items: [enc('c1', { trackingNumber: ok.trackingNumber })] };
      if (cmd.input.FilterExpression !== undefined) return { Items: [] };
      return { Item: undefined };
    });
    await handler(event as any);
    expect(lamSend).not.toHaveBeenCalled();
  });
  it('send failure after stamping -> unstamps this number and throws a sanitized error', async () => {
    db([enc('c1')], { c1: rec('Ronda', 'Christian') });
    lamSend.mockResolvedValue({ FunctionError: 'Unhandled' });
    await expect(handler(event as any)).rejects.toThrow('push-patch-tracking failed (Error)');
    const upd = ddbSend.mock.calls.map((c) => c[0].input).filter((i) => i.UpdateExpression);
    expect(upd).toHaveLength(2);
    expect(upd[1].UpdateExpression).toContain('REMOVE trackingNumber');
    expect(upd[1].ConditionExpression).toBe('trackingNumber = :t');
    const logged = JSON.stringify((console.error as any).mock.calls);
    for (const x of ['Ronda', '1Z999', '@x.test']) expect(logged).not.toContain(x);
  });
});
