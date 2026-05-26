import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mock AWS clients ────────────────────────────────────────────────────────
const { mockSend, mockLambdaSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockLambdaSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => {
  class DynamoDBClient { send = mockSend; }
  class ScanCommand { constructor(public input: unknown) {} }
  class GetItemCommand { constructor(public input: unknown) {} }
  class UpdateItemCommand { constructor(public input: unknown) {} }
  return { DynamoDBClient, ScanCommand, GetItemCommand, UpdateItemCommand };
});
vi.mock('@aws-sdk/client-lambda', () => {
  class LambdaClient { send = mockLambdaSend; }
  class InvokeCommand { constructor(public input: unknown) {} }
  return { LambdaClient, InvokeCommand };
});
vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: (o: unknown) => o,
  unmarshall: (o: unknown) => o,
}));

// import handler AFTER mocks
import { handler } from './handler';

beforeEach(() => { mockSend.mockReset(); mockLambdaSend.mockReset(); });

describe('reminder-dispatcher', () => {
  it('no-op when no reminders are due', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });
    const result = await handler();
    expect(result).toEqual({ processed: 0, sent: 0, failed: 0 });
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it('happy path: due reminder is sent and marked sent', async () => {
    const reminder = { reminderId: 'r1', eventId: 'e1', contactId: 'c1', kind: 't24h' };
    const event = { title: 'Weekly Zoom', startsAt: '2026-05-28T23:00:00Z', joinUrl: 'https://zoom.us/j/123' };
    const contact = { firstName: 'Alice', email: 'alice@example.com' };
    mockSend
      .mockResolvedValueOnce({ Items: [reminder] })      // Scan
      .mockResolvedValueOnce({ Item: event })             // GetItem Events
      .mockResolvedValueOnce({ Item: contact })           // GetItem Contact
      .mockResolvedValueOnce({})                         // UpdateItem mark sent
    mockLambdaSend.mockResolvedValueOnce({});
    const result = await handler();
    expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
    expect(mockLambdaSend).toHaveBeenCalledOnce();
    const payload = JSON.parse(Buffer.from((mockLambdaSend.mock.calls[0][0] as any).input.Payload).toString());
    expect(payload.to).toBe('alice@example.com');
    expect(payload.subject).toContain('Tomorrow');
  });

  it('marks failed when lookup returns nothing for event or contact', async () => {
    const reminder = { reminderId: 'r2', eventId: 'e2', contactId: 'c2', kind: 't1h' };
    mockSend
      .mockResolvedValueOnce({ Items: [reminder] })
      .mockResolvedValueOnce({ Item: null })   // Events miss
      .mockResolvedValueOnce({ Item: null })   // Contact miss
      .mockResolvedValueOnce({});              // UpdateItem mark failed
    const result = await handler();
    expect(result).toEqual({ processed: 1, sent: 0, failed: 1 });
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it('captures lambda-invoke error to failed row', async () => {
    const reminder = { reminderId: 'r3', eventId: 'e3', contactId: 'c3', kind: 'starting' };
    const event = { title: 'Zoom', startsAt: '2026-05-28T23:00:00Z', joinUrl: 'https://zoom.us/j/999' };
    const contact = { firstName: 'Bob', email: 'bob@example.com' };
    mockSend
      .mockResolvedValueOnce({ Items: [reminder] })
      .mockResolvedValueOnce({ Item: event })
      .mockResolvedValueOnce({ Item: contact })
      .mockResolvedValueOnce({});
    mockLambdaSend.mockRejectedValueOnce(new Error('email-sender timeout'));
    const result = await handler();
    expect(result).toEqual({ processed: 1, sent: 0, failed: 1 });
    // UpdateItem should have been called with status='failed' and error text
    const updateCall = mockSend.mock.calls.find((c: unknown[]) =>
      (c[0] as any)?.input?.UpdateExpression?.includes('SET')
    );
    expect(updateCall).toBeTruthy();
  });
});
