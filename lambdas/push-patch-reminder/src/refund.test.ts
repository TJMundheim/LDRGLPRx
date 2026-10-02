import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { ddbSend, lambdaSend } = vi.hoisted(() => ({ ddbSend: vi.fn(), lambdaSend: vi.fn() }));

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class ScanCommand { constructor(public input: any) {} }
  class UpdateCommand { constructor(public input: any) {} }
  class GetCommand { constructor(public input: any) {} }
  return { ScanCommand, UpdateCommand, GetCommand, DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) } };
});
vi.mock('@aws-sdk/client-lambda', () => {
  class InvokeCommand { constructor(public input: any) {} }
  return { InvokeCommand, LambdaClient: class { send = lambdaSend; } };
});

import { refundSweep } from './refund';

// Tue 2026-10-13: declined Fri 2026-10-02 + 7 business days = 2026-10-13 (due today).
const NOW = new Date('2026-10-13T15:00:00.000Z');
const enc = (over: Record<string, unknown> = {}) => ({
  contactId: 'c1', sk: 'encounter#pp-123', lane: 'push-patch', state: 'declined', refundStatus: 'pending',
  declinedAt: '2026-10-02T16:00:00.000Z', refundDueBy: '2026-10-16', ...over,
});
const calls = (kind: string) => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.constructor.name === kind);
const sent = () => JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  ddbSend.mockReset(); lambdaSend.mockReset();
  ddbSend.mockResolvedValue({});
  lambdaSend.mockResolvedValue({ StatusCode: 200 });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('refundSweep', () => {
  it('scans PatientRecords for declined push-patch encounters with a pending, un-reminded refund', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [] });
    expect(await refundSweep()).toEqual({ scanned: 0, sent: 0, skipped: 0, failed: 0 });
    const s = calls('ScanCommand')[0].input;
    expect(s.TableName).toBe('PatientRecords');
    for (const p of ['begins_with(sk', '#state = ', 'refundStatus = ', 'attribute_not_exists(refundReminderSentAt)', 'lane = ']) {
      expect(s.FilterExpression).toContain(p);
    }
    expect(s.ExpressionAttributeNames).toEqual({ '#state': 'state' });
    expect(Object.values(s.ExpressionAttributeValues)).toEqual(
      expect.arrayContaining(['encounter#pp-', 'push-patch', 'declined', 'pending']));
  });

  it('claims with an attribute_not_exists guard, then sends one internal email with initial + last name', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [enc()] }).mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { demographics: { firstName: 'Jordan', lastName: 'Smith' } } });
    expect(await refundSweep()).toEqual({ scanned: 1, sent: 1, skipped: 0, failed: 0 });
    const u = calls('UpdateCommand')[0].input;
    expect(u.Key).toEqual({ contactId: 'c1', sk: 'encounter#pp-123' });
    expect(u.UpdateExpression).toContain('refundReminderSentAt = :now');
    expect(u.ConditionExpression).toContain('attribute_not_exists(refundReminderSentAt)');
    expect(u.ExpressionAttributeValues[':now']).toBe(NOW.toISOString());
    expect(lambdaSend).toHaveBeenCalledTimes(1);
    const p = sent();
    expect(p).toMatchObject({ kind: 'info', to: 'drtj@my4mlife.com', subject: '[Refund due] Push Patch refund pending for 7 business days' });
    expect(p.from).toBeUndefined();
    for (const t of ['J. Smith', 'pp-123', '2026-10-02', '2026-10-16', 'Open the admin app → Patients → Issue refund.']) {
      expect(p.html).toContain(t);
    }
    expect(p.html).not.toContain('Jordan');
  });

  it('still sends (no name) when the record has no demographics', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [enc()] });
    expect((await refundSweep()).sent).toBe(1);
    expect(sent().html).toContain('pp-123');
  });

  it('does not email declines under 7 business days old (Fri + 7bd = Tue)', async () => {
    vi.setSystemTime(new Date('2026-10-12T23:59:00.000Z'));
    ddbSend.mockResolvedValueOnce({ Items: [enc()] });
    expect(await refundSweep()).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect(calls('UpdateCommand')).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('skips when another run already claimed (conditional check fails)', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [enc()] })
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    expect(await refundSweep()).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('releases the claim and counts failed when the email invoke fails', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [enc()] });
    lambdaSend.mockResolvedValueOnce({ StatusCode: 200, FunctionError: 'Unhandled' });
    expect(await refundSweep()).toEqual({ scanned: 1, sent: 0, skipped: 0, failed: 1 });
    const rb = calls('UpdateCommand')[1].input;
    expect(rb.UpdateExpression).toContain('REMOVE refundReminderSentAt');
    expect(rb.ConditionExpression).toContain('refundReminderSentAt = :now');
  });

  it('follows scan pagination', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { contactId: 'c0', sk: 'k' } })
      .mockResolvedValueOnce({ Items: [enc()] });
    expect((await refundSweep()).sent).toBe(1);
    expect(calls('ScanCommand')[1].input.ExclusiveStartKey).toEqual({ contactId: 'c0', sk: 'k' });
  });

  it('escapes HTML in the name and never logs it', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error')];
    ddbSend.mockResolvedValueOnce({ Items: [enc()] }).mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { demographics: { firstName: 'A', lastName: 'O<b>Brien' } } });
    await refundSweep();
    expect(sent().html).toContain('A. O&lt;b&gt;Brien');
    expect(sent().html).not.toContain('<b>');
    expect(JSON.stringify(spies.flatMap((s) => s.mock.calls))).not.toContain('Brien');
  });
});
