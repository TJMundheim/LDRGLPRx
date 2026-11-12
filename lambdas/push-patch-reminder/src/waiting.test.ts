import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { ddbSend, lambdaSend } = vi.hoisted(() => ({ ddbSend: vi.fn(), lambdaSend: vi.fn() }));

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class ScanCommand { constructor(public input: any) {} }
  class GetCommand { constructor(public input: any) {} }
  class UpdateCommand { constructor(public input: any) {} }
  return { ScanCommand, GetCommand, UpdateCommand, QueryCommand: class {}, DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) } };
});
vi.mock('@aws-sdk/client-lambda', () => {
  class InvokeCommand { constructor(public input: any) {} }
  return { InvokeCommand, LambdaClient: class { send = lambdaSend; } };
});

import { sweepWaiting } from './waiting';

const NOW = new Date('2026-11-12T15:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const enc = (over: Record<string, unknown> = {}) => ({
  contactId: 'c1', sk: 'encounter#pp-1', state: 'script-written', sku: 'push-patch-kpv-nad-ghk', decidedAt: hoursAgo(49), ...over,
});
const deps = { ddb: { send: ddbSend }, lambda: { send: lambdaSend } };
const cmds = (kind: string) => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.constructor.name === kind);

function route(rows: unknown[], update: () => unknown = () => ({})) {
  ddbSend.mockImplementation(async (c: any) => {
    switch (c.constructor.name) {
      case 'ScanCommand': return { Items: rows };
      case 'GetCommand': return { Item: { demographics: { firstName: 'Sam', email: 'sam.private@example.com' } } };
      default: return update();
    }
  });
}

beforeEach(() => { process.env['WAITING_EMAIL_SINCE'] = '2026-11-01T00:00:00Z'; ddbSend.mockReset(); lambdaSend.mockReset(); lambdaSend.mockResolvedValue({ StatusCode: 200 }); });
afterEach(() => { vi.restoreAllMocks(); delete process.env['WAITING_EMAIL_SINCE']; });

describe('sweepWaiting cutoff', () => {
  it('does not send for orders approved before the cutoff', async () => {
    process.env['WAITING_EMAIL_SINCE'] = '2026-11-12T00:00:00Z';
    route([enc({ decidedAt: hoursAgo(49) })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });
  it('sends for orders approved after the cutoff and older than 48h', async () => {
    process.env['WAITING_EMAIL_SINCE'] = '2026-11-10T00:00:00Z';
    route([enc({ decidedAt: hoursAgo(49) })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(1);
  });
  it.each([['missing', undefined], ['invalid', 'not-a-date']])('sends nothing when cutoff is %s', async (_n, v) => {
    if (v === undefined) delete process.env['WAITING_EMAIL_SINCE']; else process.env['WAITING_EMAIL_SINCE'] = v;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    route([enc()]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(ddbSend).not.toHaveBeenCalled();
    expect(lambdaSend).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(' ')).toContain('waiting: no-cutoff');
  });
});

describe('sweepWaiting', () => {
  it('does not send at 47 hours', async () => {
    route([enc({ decidedAt: hoursAgo(47) })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(lambdaSend).not.toHaveBeenCalled();
    expect(cmds('UpdateCommand')).toHaveLength(0);
  });

  it('sends exactly once at 49 hours, stamping before sending', async () => {
    const order: string[] = [];
    ddbSend.mockImplementation(async (c: any) => {
      order.push(c.constructor.name);
      if (c.constructor.name === 'ScanCommand') return { Items: [enc()] };
      if (c.constructor.name === 'GetCommand') return { Item: { demographics: { firstName: 'Sam', email: 'sam.private@example.com' } } };
      return {};
    });
    lambdaSend.mockImplementation(async () => { order.push('send'); return { StatusCode: 200 }; });
    expect(await sweepWaiting(deps, NOW)).toMatchObject({ scanned: 1, sent: 1, failed: 0 });
    expect(order.indexOf('UpdateCommand')).toBeGreaterThan(-1);
    expect(order.indexOf('UpdateCommand')).toBeLessThan(order.indexOf('send'));
    const u = cmds('UpdateCommand')[0].input;
    expect(u.Key).toEqual({ contactId: 'c1', sk: 'encounter#pp-1' });
    expect(u.UpdateExpression).toContain('waitEmailSentAt');
    expect(u.ConditionExpression).toContain('attribute_not_exists(waitEmailSentAt)');
    expect(u.ConditionExpression).toContain('attribute_not_exists(trackingNumber)');
    expect(lambdaSend).toHaveBeenCalledTimes(1);
    const p = JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());
    expect(p).toMatchObject({ kind: 'info', from: 'support', to: 'sam.private@example.com', subject: 'Your Push Patch set is being prepared' });
    expect(p.html).toContain('Sam');
    expect(p.html).toContain('Calm Gut');
  });

  it('scan filters on encounter#pp-, script-written and the window', async () => {
    route([]);
    await sweepWaiting(deps, NOW);
    const s = cmds('ScanCommand')[0].input;
    expect(s.TableName).toBe('PatientRecords');
    expect(s.ExpressionAttributeValues[':p']).toBe('encounter#pp-');
    expect(s.FilterExpression).toContain('waitEmailSentAt');
    expect(s.FilterExpression).toContain('trackingNumber');
  });

  it('does not send when already stamped', async () => {
    route([enc({ waitEmailSentAt: hoursAgo(1) })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('does not send when there is a tracking number', async () => {
    route([enc({ trackingNumber: '1Z999AA10123456784' })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('does not send for a test order', async () => {
    route([enc({ testOrder: true })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('does not send at 11 days', async () => {
    route([enc({ decidedAt: hoursAgo(11 * 24) })]);
    expect((await sweepWaiting(deps, NOW)).sent).toBe(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('does not send when the conditional check fails', async () => {
    route([enc()], () => { throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }); });
    expect(await sweepWaiting(deps, NOW)).toMatchObject({ sent: 0, skipped: 1, failed: 0 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('never logs names, emails or tracking numbers', async () => {
    const logs = [vi.spyOn(console, 'log').mockImplementation(() => {}), vi.spyOn(console, 'error').mockImplementation(() => {})];
    route([enc()]);
    await sweepWaiting(deps, NOW);
    const out = JSON.stringify(logs.flatMap((l) => l.mock.calls));
    expect(out).not.toContain('sam.private');
    expect(out).not.toContain('Sam');
  });
});
