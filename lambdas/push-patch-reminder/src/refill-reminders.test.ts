import { describe, it, expect, vi, beforeEach } from 'vitest';

const { ddbSend, lambdaSend } = vi.hoisted(() => ({ ddbSend: vi.fn(), lambdaSend: vi.fn() }));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class ScanCommand { constructor(public input: any) {} }
  class GetCommand { constructor(public input: any) {} }
  class UpdateCommand { constructor(public input: any) {} }
  return { ScanCommand, GetCommand, UpdateCommand, DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) } };
});
vi.mock('@aws-sdk/client-lambda', () => {
  class InvokeCommand { constructor(public input: any) {} }
  return { InvokeCommand, LambdaClient: class { send = lambdaSend; } };
});

import { sweepRefillReminders } from './refill-reminders';

const DAY = 86_400_000;
const NOW = new Date('2026-12-20T12:00:00.000Z');
const ago = (d: number) => new Date(NOW.getTime() - d * DAY).toISOString();
const row = (auth: Record<string, unknown> = {}, over: Record<string, unknown> = {}) => ({
  contactId: 'c1', sk: 'encounter#pp-cs_1', sku: 'push-patch-bpc-nad-ghk', refillDueAt: ago(0),
  refillAuth: { refillsAuthorized: 8, refillsUsed: 2, expiresAt: '2027-11-15T00:00:00.000Z', status: 'active', mode: 'on-demand', lastShippedAt: ago(35), remindersSent: 0, ...auth }, ...over,
});
const route = (rows: unknown[], update: () => unknown = () => ({})) => ddbSend.mockImplementation(async (c: any) => {
  switch (c.constructor.name) {
    case 'ScanCommand': return { Items: rows };
    case 'GetCommand': return { Item: { demographics: { firstName: 'Sam', email: 'sam.private@example.com' } } };
    default: return update();
  }
});
const updates = () => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.constructor.name === 'UpdateCommand').map((c) => c.input);
const mails = () => lambdaSend.mock.calls.map((c) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));
const run = () => sweepRefillReminders({ send: ddbSend }, NOW, async () => 'test-key');

beforeEach(() => { ddbSend.mockReset(); lambdaSend.mockReset(); lambdaSend.mockResolvedValue({ StatusCode: 200 }); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('sweepRefillReminders', () => {
  it('scans PatientRecords parents on refillDueAt <= now', async () => {
    route([]);
    await run();
    const s = ddbSend.mock.calls[0][0].input;
    expect(s.TableName).toBe('PatientRecords');
    expect(s.FilterExpression).toContain('refillDueAt <= :now');
  });

  it('reminder 1 at 35 days: signed 21-day link, advances to reminder 2 at +42 days', async () => {
    route([row()]);
    expect(await run()).toMatchObject({ sent: 1, failed: 0 });
    const m = mails()[0];
    expect(m).toMatchObject({ to: 'sam.private@example.com', from: 'support', subject: 'Time to reorder your Push Patch' });
    const link = new URL(/https:\/\/\S+push-patch-refill\?\S+/.exec(m.text)![0]);
    expect(link.searchParams.get('c')).toBe('c1');
    expect(link.searchParams.get('e')).toBe('pp-cs_1');
    expect(Number(link.searchParams.get('exp'))).toBe(Math.floor(NOW.getTime() / 1000) + 21 * 86400);
    const u = updates()[0];
    expect(u.ExpressionAttributeValues).toMatchObject({ ':next': 1, ':cur': 0, ':nd': new Date(Date.parse(ago(35)) + 42 * DAY).toISOString() });
  });

  it('reminder 2 at 42 days (remindersSent 1), then the schedule is removed', async () => {
    route([row({ remindersSent: 1, lastShippedAt: ago(42) })]);
    await run();
    expect(mails()[0].subject).toBe('Reminder: reorder your Push Patch');
    expect(updates()[0].UpdateExpression).toMatch(/REMOVE refillDueAt/);
    expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':next': 2, ':cur': 1 });
  });

  it('nothing after reminder 2: clears the marker, sends nothing', async () => {
    route([row({ remindersSent: 2, lastShippedAt: ago(50) })]);
    expect(await run()).toMatchObject({ sent: 0, cleared: 1 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('auto-ship (subscription active) never gets reminders', async () => {
    route([row({ mode: 'auto', subscriptionId: 'sub_1' })]);
    expect(await run()).toMatchObject({ sent: 0, cleared: 1 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('exhausted refills at due time: one re-review email to /go/push-patch, no reorder link', async () => {
    route([row({ refillsUsed: 8, status: 'exhausted' })]);
    expect(await run()).toMatchObject({ reReview: 1, sent: 0 });
    const m = mails()[0];
    expect(m.subject).toMatch(/re-review/);
    expect(m.text).toContain('https://my4mlife.com/go/push-patch');
    expect(m.text).not.toContain('push-patch-refill?');
    expect(updates()[0].UpdateExpression).toMatch(/reReviewSentAt/);
  });

  it('expired authorization: re-review; already re-reviewed: nothing', async () => {
    route([row({ expiresAt: ago(1) })]);
    expect(await run()).toMatchObject({ reReview: 1 });
    ddbSend.mockReset(); lambdaSend.mockClear();
    route([row({ expiresAt: ago(1), reReviewSentAt: ago(1) })]);
    expect(await run()).toMatchObject({ reReview: 0, cleared: 1 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('lost claim (another run) sends nothing; failed send releases the claim', async () => {
    route([row()], () => { throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }); });
    expect(await run()).toMatchObject({ sent: 0, skipped: 1 });
    expect(lambdaSend).not.toHaveBeenCalled();
    ddbSend.mockReset(); route([row()]); lambdaSend.mockResolvedValue({ FunctionError: 'Unhandled' });
    expect(await run()).toMatchObject({ sent: 0, failed: 1 });
    expect(updates().at(-1)!.UpdateExpression).toMatch(/SET refillDueAt = :d/);
  });

  it('logs outcome codes only, never the email address', async () => {
    route([row()]);
    await run();
    const logged = JSON.stringify([...(console.log as any).mock.calls, ...(console.error as any).mock.calls]);
    expect(logged).not.toContain('sam.private');
  });
});
