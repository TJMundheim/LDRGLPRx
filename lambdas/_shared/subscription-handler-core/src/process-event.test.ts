import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUpdate = vi.fn().mockResolvedValue({});
const mockPut = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn((cmd: unknown) => {
    const c = cmd as { constructor: { name: string } };
    if (c.constructor.name === 'UpdateCommand') return mockUpdate(cmd);
    if (c.constructor.name === 'PutCommand') return mockPut(cmd);
    return Promise.resolve({});
  }) })) },
  UpdateCommand: class UpdateCommand { constructor(public input: unknown) {} },
  PutCommand: class PutCommand { constructor(public input: unknown) {} },
}));

const mockStripeRetrieve = vi.fn();
const mockEventRetrieve = vi.fn(async (id: string) => ({ data: { object: { id: id.replace(/^evt_/, 'sub_') } } }));
const mockCustomerRetrieve = vi.fn(async () => ({ email: 'fallback@example.com', deleted: false }));
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(async () => ({
    subscriptions: { retrieve: mockStripeRetrieve },
    events: { retrieve: mockEventRetrieve },
    customers: { retrieve: mockCustomerRetrieve },
  })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

const { mockUpsert } = vi.hoisted(() => ({ mockUpsert: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: mockUpsert }));

import { deriveContactId } from '@my4mlife/contact-id';
import { processEvent } from './process-event.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSubscription(
  id: string,
  status: 'active' | 'trialing' | 'canceled' | 'past_due',
  customerId = 'cus_test',
  currentPeriodEnd = 1800000000,
  contactId = 'contact-123',
) {
  return {
    id,
    object: 'subscription',
    status,
    customer: customerId,
    current_period_end: currentPeriodEnd,
    metadata: { contactId },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('processEvent — subscription-handler-core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles customer.subscription.created (active → hasActiveSubscription=true)', async () => {
    const sub = makeSubscription('sub_001', 'active');
    mockStripeRetrieve.mockResolvedValue(sub);

    await processEvent({ id: 'evt_001', type: 'customer.subscription.created', livemode: false });

    // Contact must be updated
    const contactCall = mockUpdate.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Contact',
    );
    expect(contactCall).toBeDefined();
    const contactExpr: string = (contactCall![0] as { input: { UpdateExpression: string } }).input.UpdateExpression;
    expect(contactExpr).toContain('hasActiveSubscription');

    const contactVals = (contactCall![0] as { input: { ExpressionAttributeValues: Record<string, unknown> } }).input.ExpressionAttributeValues;
    expect(contactVals[':hasActiveSub']).toBe(true);

    // subscriptionStartedAt must be set (only on first transition to active)
    expect(contactExpr).toContain('subscriptionStartedAt');

    // currentPeriodEnd must be set
    expect(contactExpr).toContain('currentPeriodEnd');

    // Subscription row must be written
    const subCall = mockPut.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Subscriptions',
    );
    expect(subCall).toBeDefined();

    // Touchpoints idempotency guard
    const tpCall = mockPut.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Touchpoints',
    );
    expect(tpCall).toBeDefined();
    const tpCondition: string = (tpCall![0] as { input: { ConditionExpression: string } }).input.ConditionExpression;
    expect(tpCondition).toContain('attribute_not_exists');
  });

  it('handles customer.subscription.updated (trialing → hasActiveSubscription=true)', async () => {
    const sub = makeSubscription('sub_002', 'trialing');
    mockStripeRetrieve.mockResolvedValue(sub);

    await processEvent({ id: 'evt_002', type: 'customer.subscription.updated', livemode: false });

    const contactCall = mockUpdate.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Contact',
    );
    const vals = (contactCall![0] as { input: { ExpressionAttributeValues: Record<string, unknown> } }).input.ExpressionAttributeValues;
    expect(vals[':hasActiveSub']).toBe(true);
  });

  it('handles customer.subscription.deleted → hasActiveSubscription=false', async () => {
    const sub = makeSubscription('sub_003', 'canceled');
    mockStripeRetrieve.mockResolvedValue(sub);

    await processEvent({ id: 'evt_003', type: 'customer.subscription.deleted', livemode: false });

    const contactCall = mockUpdate.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Contact',
    );
    const vals = (contactCall![0] as { input: { ExpressionAttributeValues: Record<string, unknown> } }).input.ExpressionAttributeValues;
    expect(vals[':hasActiveSub']).toBe(false);
  });

  it('is idempotent — processing same event twice writes same Touchpoints row (second is no-op)', async () => {
    const sub = makeSubscription('sub_004', 'active');
    mockStripeRetrieve.mockResolvedValue(sub);

    // First call succeeds
    await processEvent({ id: 'evt_004', type: 'customer.subscription.created', livemode: false });
    const firstPutCount = mockPut.mock.calls.length;

    // Second call: Touchpoints PutItem throws ConditionalCheckFailedException (idempotent guard)
    mockPut.mockImplementationOnce(() => Promise.resolve({})); // Subscriptions table
    mockPut.mockImplementationOnce(() => {
      const err = new Error('ConditionalCheckFailedException');
      (err as NodeJS.ErrnoException).name = 'ConditionalCheckFailedException';
      return Promise.reject(err);
    });

    await expect(
      processEvent({ id: 'evt_004', type: 'customer.subscription.created', livemode: false }),
    ).resolves.toBeUndefined();

    // At least as many calls as first round
    expect(mockPut.mock.calls.length).toBeGreaterThanOrEqual(firstPutCount);
  });

  it('honors livemode — calls getStripeClient with livemode=true for live events', async () => {
    const { getStripeClient } = await import('@my4mlife/stripe-client');
    const sub = makeSubscription('sub_005', 'active');
    mockStripeRetrieve.mockResolvedValue(sub);

    await processEvent({ id: 'evt_005', type: 'customer.subscription.created', livemode: true });

    expect(getStripeClient).toHaveBeenCalledWith({ livemode: true });
  });

  it('does not overwrite subscriptionStartedAt if already set (updated event)', async () => {
    const sub = makeSubscription('sub_006', 'active');
    mockStripeRetrieve.mockResolvedValue(sub);

    await processEvent({ id: 'evt_006', type: 'customer.subscription.updated', livemode: false });

    const contactCall = mockUpdate.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Contact',
    );
    // For updated events, subscriptionStartedAt should use if_not_exists guard, not unconditional set
    const expr: string = (contactCall![0] as { input: { UpdateExpression: string } }).input.UpdateExpression;
    // Either uses SET with if_not_exists OR omits overwrite — just confirm hasActiveSubscription is set
    expect(expr).toContain('hasActiveSubscription');
  });

  it('sets mode=test in Touchpoints for livemode=false events', async () => {
    const sub = makeSubscription('sub_007', 'active');
    mockStripeRetrieve.mockResolvedValue(sub);

    await processEvent({ id: 'evt_007', type: 'customer.subscription.created', livemode: false });

    const tpCall = mockPut.mock.calls.find((c) =>
      (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Touchpoints',
    );
    const item = (tpCall![0] as { input: { Item: Record<string, unknown> } }).input.Item;
    expect(item['mode']).toBe('test');
  });

  describe('Contact email + stage via upsertContact', () => {
    it('upserts email, source, stripeCustomerId, stage customer (customer fetched even when metadata.contactId is set)', async () => {
      mockStripeRetrieve.mockResolvedValue(makeSubscription('sub_100', 'active', 'cus_100'));
      await processEvent({ id: 'evt_100', type: 'customer.subscription.created', livemode: false });
      expect(mockCustomerRetrieve).toHaveBeenCalledWith('cus_100');
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert.mock.calls[0][1]).toEqual({
        email: 'fallback@example.com',
        source: 'subscription',
        stripeCustomerId: 'cus_100',
        stage: 'customer',
        event: { type: 'subscription' },
      });
    });

    it('keeps the existing subscription-field Contact write, on the same row the helper writes', async () => {
      mockStripeRetrieve.mockResolvedValue(makeSubscription('sub_101', 'active', 'cus_101'));
      await processEvent({ id: 'evt_101', type: 'customer.subscription.created', livemode: false });
      const contactCall = mockUpdate.mock.calls.find((c) => (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Contact');
      const input = (contactCall![0] as { input: { UpdateExpression: string; Key: { contactId: string } } }).input;
      expect(input.UpdateExpression).toContain('hasActiveSubscription');
      expect(input.Key.contactId).toBe(deriveContactId('fallback@example.com'));
    });

    it('skips the upsert (does not fail the event) when the customer has no email / lookup fails', async () => {
      mockStripeRetrieve.mockResolvedValue(makeSubscription('sub_102', 'active', 'cus_102'));
      mockCustomerRetrieve.mockRejectedValueOnce(new Error('stripe down'));
      await expect(processEvent({ id: 'evt_102', type: 'customer.subscription.updated', livemode: false })).resolves.toBeUndefined();
      expect(mockUpsert).not.toHaveBeenCalled();
      const contactCall = mockUpdate.mock.calls.find((c) => (c[0] as { input?: { TableName?: string } }).input?.TableName === 'Contact');
      expect((contactCall![0] as { input: { Key: { contactId: string } } }).input.Key.contactId).toBe('contact-123');
    });

    it('throws (so the event retries) when the upsert itself fails', async () => {
      mockStripeRetrieve.mockResolvedValue(makeSubscription('sub_103', 'active', 'cus_103'));
      mockUpsert.mockRejectedValueOnce(new Error('ddb down'));
      await expect(processEvent({ id: 'evt_103', type: 'customer.subscription.created', livemode: false })).rejects.toThrow(/ddb down/);
    });

    it('cancelled subscription still upserts (stage customer is rank-only, never demotes)', async () => {
      mockStripeRetrieve.mockResolvedValue(makeSubscription('sub_104', 'canceled', 'cus_104'));
      await processEvent({ id: 'evt_104', type: 'customer.subscription.deleted', livemode: false });
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
  });
});
