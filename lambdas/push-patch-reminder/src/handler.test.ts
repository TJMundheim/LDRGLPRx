import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { ddbSend, lambdaSend } = vi.hoisted(() => ({ ddbSend: vi.fn(), lambdaSend: vi.fn() }));

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => {
  class ScanCommand { constructor(public input: any) {} }
  class UpdateCommand { constructor(public input: any) {} }
  return { ScanCommand, UpdateCommand, DynamoDBDocumentClient: { from: () => ({ send: ddbSend }) } };
});
vi.mock('@aws-sdk/client-lambda', () => {
  class InvokeCommand { constructor(public input: any) {} }
  return { InvokeCommand, LambdaClient: class { send = lambdaSend; } };
});

import { handler } from './handler';

const NOW = new Date('2026-10-01T15:00:00.000Z');
const CREATED = '2026-10-01T14:20:00.000Z';
const EMAIL = 'buyer.private@example.com';
const item = (over: Record<string, unknown> = {}) => ({
  contactId: 'c1', sk: 'PUSH_PATCH_PENDING#cs_live_abc', sessionId: 'cs_live_abc', email: EMAIL,
  createdAt: CREATED, intakeDue: '2026-10-01T14:50:00.000Z', remindersSent: 0, ...over,
});
const scanCalls = () => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.input.FilterExpression);
const updates = () => ddbSend.mock.calls.map((c) => c[0]).filter((c) => c.input.UpdateExpression);
const sentEmail = () => JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  ddbSend.mockReset(); lambdaSend.mockReset();
  lambdaSend.mockResolvedValue({ StatusCode: 200 });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('push-patch-reminder', () => {
  it('no-ops when nothing is due', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [] });
    expect(await handler()).toEqual({ scanned: 0, sent: 0, skipped: 0, failed: 0 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('scans Touchpoints for pending, unsubmitted, under-limit, past-due items', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [] });
    await handler();
    const s = scanCalls()[0].input;
    expect(s.TableName).toBe('Touchpoints');
    for (const part of ['begins_with(sk', 'attribute_not_exists(intakeSubmittedAt)', 'remindersSent <', 'intakeDue <=']) {
      expect(s.FilterExpression).toContain(part);
    }
    expect(Object.values(s.ExpressionAttributeValues)).toEqual(
      expect.arrayContaining(['PUSH_PATCH_PENDING#', NOW.toISOString(), 2]));
  });

  it('first reminder: claims conditionally (count+1, due = createdAt+24h), then emails variant 1', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [item()] }).mockResolvedValue({});
    expect(await handler()).toEqual({ scanned: 1, sent: 1, skipped: 0, failed: 0 });
    const u = updates()[0].input;
    expect(u.Key).toEqual({ contactId: 'c1', sk: 'PUSH_PATCH_PENDING#cs_live_abc' });
    expect(u.ConditionExpression).toContain('remindersSent = :cur');
    expect(u.ConditionExpression).toContain('attribute_not_exists(intakeSubmittedAt)');
    expect(u.ExpressionAttributeValues[':cur']).toBe(0);
    expect(u.ExpressionAttributeValues[':next']).toBe(1);
    expect(u.ExpressionAttributeValues[':due']).toBe('2026-10-02T14:20:00.000Z');
    const p = sentEmail();
    expect(lambdaSend.mock.calls[0][0].input.FunctionName).toBe('my4mlife-email-sender');
    expect(p).toMatchObject({ kind: 'info', to: EMAIL, subject: 'One step left on your Push Patch order' });
    expect(p.html).toContain('https://www.my4mlife.com/go/push-patch/thank-you?session_id=cs_live_abc');
    expect(p.html).toContain("Don't lose your identity and your dignity while you still have a choice.");
  });

  it('second reminder uses variant 2 and reaches the limit', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [item({ remindersSent: 1, intakeDue: '2026-10-02T14:20:00.000Z' })] })
      .mockResolvedValue({});
    // due time passed in this scenario
    vi.setSystemTime(new Date('2026-10-02T14:21:00.000Z'));
    await handler();
    expect(updates()[0].input.ExpressionAttributeValues[':next']).toBe(2);
    const p = sentEmail();
    expect(p.subject).toBe('Your Push Patch order is waiting on 2 minutes');
    expect(p.html).toContain('It has been a day');
  });

  it('skips (no email) when another run already claimed the item', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [item()] })
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    expect(await handler()).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('rolls the claim back and counts failed when the email invoke fails', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [item()] }).mockResolvedValue({});
    lambdaSend.mockResolvedValueOnce({ StatusCode: 200, FunctionError: 'Unhandled' });
    expect(await handler()).toEqual({ scanned: 1, sent: 0, skipped: 0, failed: 1 });
    const rb = updates()[1].input;
    expect(rb.ConditionExpression).toContain('remindersSent = :next');
    expect(rb.ExpressionAttributeValues[':cur']).toBe(0);
    expect(rb.ExpressionAttributeValues[':dueOld']).toBe('2026-10-01T14:50:00.000Z');
  });

  it('skips items with no email address', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [item({ email: undefined })] });
    expect(await handler()).toEqual({ scanned: 1, sent: 0, skipped: 1, failed: 0 });
    expect(updates()).toHaveLength(0);
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('follows scan pagination', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { contactId: 'c0', sk: 'k' } })
      .mockResolvedValueOnce({ Items: [item()] }).mockResolvedValue({});
    expect((await handler()).sent).toBe(1);
    expect(scanCalls()[1].input.ExclusiveStartKey).toEqual({ contactId: 'c0', sk: 'k' });
  });

  it('never logs the email address (no PHI in logs)', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')];
    ddbSend.mockResolvedValueOnce({ Items: [item(), item({ sk: 'PUSH_PATCH_PENDING#cs_2', sessionId: 'cs_2' })] })
      .mockResolvedValueOnce({}).mockRejectedValueOnce(new Error(`boom ${EMAIL}`)).mockResolvedValue({});
    await handler();
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(EMAIL);
  });
});
