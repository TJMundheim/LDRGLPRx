import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { ddbSend, lambdaSend } = vi.hoisted(() => ({ ddbSend: vi.fn(), lambdaSend: vi.fn() }));

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class ScanCommand { constructor(public input: any) {} }
  class QueryCommand { constructor(public input: any) {} }
  class UpdateCommand { constructor(public input: any) {} }
  return { ScanCommand, QueryCommand, UpdateCommand, DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) } };
});
vi.mock('@aws-sdk/client-lambda', () => {
  class InvokeCommand { constructor(public input: any) {} }
  return { InvokeCommand, LambdaClient: class { send = lambdaSend; } };
});

import { sweepAbandoned } from './abandoned';
import { handler } from './handler';

const NOW = new Date('2026-10-19T15:00:00.000Z');
const LINK_BASE = 'https://my4mlife.com/go/push-patch';
const UTM = 'utm_source=email&utm_medium=lifecycle&utm_campaign=push-patch-abandoned';
const row = (over: Record<string, unknown> = {}) => ({
  contactId: 'c1', sk: 'pending-intake#i1', email: 'buyer.private@example.com', firstName: 'Sam',
  skuId: 'pp-sku-1', signedAt: '2026-10-19T12:00:00.000Z', ...over,
});
const deps = { ddb: { send: ddbSend }, lambda: { send: lambdaSend } };
const nudged = new Set<string>();
const cmds = (kind: string) => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.constructor.name === kind);
const sent = () => JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());

/** Route ddb calls: Scan -> pending rows, Query -> Touchpoints markers, Update -> ok. */
function route(rows: unknown[], paid: boolean | ((contactId: string) => boolean) = false, update: () => unknown = () => ({})) {
  ddbSend.mockImplementation(async (c: any) => {
    switch (c.constructor.name) {
      case 'ScanCommand': return { Items: rows };
      case 'QueryCommand': {
        const id = c.input.ExpressionAttributeValues[':c'];
        if (c.input.TableName === 'PatientRecords') return { Items: nudged.has(id) ? [{ sk: 'pending-intake#old' }] : [] };
        return { Items: (typeof paid === 'function' ? paid(id) : paid) ? [{ sk: 'PUSH_PATCH_PENDING#cs_1' }] : [] };
      }
      default: return update();
    }
  });
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  ddbSend.mockReset(); lambdaSend.mockReset(); nudged.clear();
  lambdaSend.mockResolvedValue({ StatusCode: 200 });
  delete process.env['ABANDONED_CART_ENABLED'];
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); delete process.env['ABANDONED_CART_ENABLED']; });

describe('sweepAbandoned', () => {
  it('scans PatientRecords for pending intakes signed between now-7d and now-60min', async () => {
    route([]);
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 0, sent: 0, skipped: 0, failed: 0 });
    const s = cmds('ScanCommand')[0].input;
    expect(s.TableName).toBe('PatientRecords');
    for (const part of ['begins_with(sk', 'signedAt BETWEEN', 'attribute_not_exists(abandonedNudgeAt)']) {
      expect(s.FilterExpression).toContain(part);
    }
    expect(Object.values(s.ExpressionAttributeValues)).toEqual(expect.arrayContaining([
      'pending-intake#', '2026-10-12T15:00:00.000Z', '2026-10-19T14:00:00.000Z',
    ]));
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('skips a row that already has abandonedNudgeAt', async () => {
    route([row({ abandonedNudgeAt: '2026-10-19T13:00:00.000Z' })]);
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect(cmds('UpdateCommand')).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('skips a row with no email', async () => {
    route([row({ email: undefined })]);
    expect(await sweepAbandoned(deps, NOW)).toMatchObject({ skipped: 1, sent: 0 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('skips when Touchpoints has any PUSH_PATCH_PENDING# marker for the contact (they paid)', async () => {
    route([row()], true);
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    const q = cmds('QueryCommand')[0].input;
    expect(q.TableName).toBe('Touchpoints');
    expect(q.KeyConditionExpression).toBe('contactId = :c AND begins_with(sk, :p)');
    expect(q.ExpressionAttributeValues).toEqual({ ':c': 'c1', ':p': 'PUSH_PATCH_PENDING#' });
    expect(cmds('UpdateCommand')).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('claims with a conditional SET abandonedNudgeAt, then sends one email-sender invoke', async () => {
    route([row()]);
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 1, sent: 1, skipped: 0, failed: 0 });
    const u = cmds('UpdateCommand')[0].input;
    expect(u.TableName).toBe('PatientRecords');
    expect(u.Key).toEqual({ contactId: 'c1', sk: 'pending-intake#i1' });
    expect(u.UpdateExpression).toContain('SET abandonedNudgeAt');
    expect(u.ConditionExpression).toContain('attribute_not_exists(abandonedNudgeAt)');
    expect(u.ExpressionAttributeValues[':now']).toBe(NOW.toISOString());
    expect(lambdaSend).toHaveBeenCalledTimes(1);
    expect(lambdaSend.mock.calls[0][0].input.FunctionName).toBe('my4mlife-email-sender');
    expect(sent()).toMatchObject({ kind: 'info', from: 'support', to: 'buyer.private@example.com', subject: 'Your Push Patch is waiting' });
  });

  it('email greets by first name, links with sku + utm, and carries no tagline or health data', async () => {
    route([row()]);
    await sweepAbandoned(deps, NOW);
    const { html } = sent();
    expect(html).toContain('Hi Sam,');
    expect(html).toContain(`${LINK_BASE}?sku=pp-sku-1&amp;${UTM}`.replace('&amp;', '&'));
    expect(html).toContain('our network&#39;s licensed physicians');
    expect(html).not.toMatch(/identity and your dignity/i);
    expect(html).not.toMatch(/glp|semaglutide|tirzepatide|testosterone|diagnos|condition|medication/i);
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it('falls back to "Hi there," and omits the sku param when missing', async () => {
    route([row({ firstName: undefined, skuId: undefined })]);
    await sweepAbandoned(deps, NOW);
    const { html } = sent();
    expect(html).toContain('Hi there,');
    expect(html).toContain(`${LINK_BASE}?${UTM}`);
    expect(html).not.toContain('sku=');
  });

  it('a ConditionalCheckFailed on the claim skips the row without sending', async () => {
    route([row()], false, () => { throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }); });
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('releases the claim when the send fails', async () => {
    route([row()]);
    lambdaSend.mockResolvedValueOnce({ FunctionError: 'Unhandled' });
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 1, sent: 0, skipped: 0, failed: 1 });
    const updates = cmds('UpdateCommand').map((c) => c.input);
    expect(updates).toHaveLength(2);
    expect(updates[1].UpdateExpression).toContain('REMOVE abandonedNudgeAt');
    expect(updates[1].Key).toEqual({ contactId: 'c1', sk: 'pending-intake#i1' });
  });

  it('sends one email per person: skips when another pending intake of theirs was already nudged', async () => {
    nudged.add('c1');
    route([row()]);
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    const q = cmds('QueryCommand').map((c) => c.input).find((i) => i.TableName === 'PatientRecords');
    expect(q).toMatchObject({ ConsistentRead: true, ProjectionExpression: 'sk', FilterExpression: 'attribute_exists(abandonedNudgeAt)' });
    expect(q.ExpressionAttributeValues).toEqual({ ':c': 'c1', ':p': 'pending-intake#' });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('two pending rows for the same person in one sweep -> one email', async () => {
    route([row(), row({ sk: 'pending-intake#i2' })], false, () => { nudged.add('c1'); return {}; });
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 2, sent: 1, skipped: 1, failed: 0 });
    expect(lambdaSend).toHaveBeenCalledTimes(1);
  });

  it('isolates rows: one paid, one abandoned', async () => {
    route([row(), row({ contactId: 'c2', sk: 'pending-intake#i2', email: 'b@example.com' })], (id) => id === 'c1');
    expect(await sweepAbandoned(deps, NOW)).toEqual({ scanned: 2, sent: 1, skipped: 1, failed: 0 });
    expect(sent().to).toBe('b@example.com');
  });
});

describe('handler gating', () => {
  const pendingScans = () => cmds('ScanCommand').filter((c) => c.input.ExpressionAttributeValues?.[':p'] === 'pending-intake#');

  it('skips the abandoned sweep unless ABANDONED_CART_ENABLED === "true"', async () => {
    route([]);
    await handler();
    expect(pendingScans()).toHaveLength(0);
    process.env['ABANDONED_CART_ENABLED'] = 'false';
    await handler();
    expect(pendingScans()).toHaveLength(0);
  });

  it('runs it when ABANDONED_CART_ENABLED === "true"', async () => {
    process.env['ABANDONED_CART_ENABLED'] = 'true';
    route([]);
    await handler();
    expect(pendingScans()).toHaveLength(1);
  });
});
