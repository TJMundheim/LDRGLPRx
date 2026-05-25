import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mock send function
const mockSend = vi.fn();

// Mock stripe-client
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(),
  __resetCacheForTests: vi.fn(),
}));

// Mock DynamoDB DocumentClient so all instances use the same mockSend
vi.mock('@aws-sdk/lib-dynamodb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/lib-dynamodb')>();
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: vi.fn(() => ({ send: mockSend })),
    },
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

import { getStripeClient } from '@my4mlife/stripe-client';
import { processEvent } from './process-event.js';

const mockRetrieve = vi.fn();
const mockStripe = { checkout: { sessions: { retrieve: mockRetrieve } } };

const baseSession = {
  id: 'cs_test_abc',
  customer: { id: 'cus_123', email: 'test@example.com' },
  customer_details: { email: 'test@example.com' },
  amount_total: 9900,
  currency: 'usd',
  payment_status: 'paid',
  metadata: {},
  line_items: { data: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStripeClient).mockResolvedValue(mockStripe as never);
  mockSend.mockResolvedValue({});
  mockRetrieve.mockResolvedValue(baseSession);
});

describe('processEvent', () => {
  // (a) only extracts {id, type, livemode} from input
  it('(a) calls getStripeClient with livemode from event, not body', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(getStripeClient).toHaveBeenCalledWith({ livemode: false });
  });

  // (b) calls stripe.checkout.sessions.retrieve with expand
  it('(b) retrieves checkout session with expanded line_items and customer', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(mockRetrieve).toHaveBeenCalledWith(
      expect.any(String),
      { expand: ['line_items', 'customer'] }
    );
  });

  // (c) writes 3 rows: Contact upsert, Orders insert, Touchpoints insert
  it('(c) writes Contact, Orders, and Touchpoints rows', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  // (d) processing same event twice → idempotent (Touchpoints swallows ConditionalCheckFailedException)
  it('(d) processing same event twice is idempotent', async () => {
    let totalCalls = 0;
    mockSend.mockImplementation(async (cmd) => {
      totalCalls++;
      // On second run, simulate ConditionalCheckFailedException on Touchpoints (3rd call overall = 6th)
      if (totalCalls === 6) {
        const err = new Error('ConditionalCheckFailedException');
        err.name = 'ConditionalCheckFailedException';
        throw err;
      }
      return {};
    });

    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(totalCalls).toBe(6);
  });

  // (e) livemode=false → Touchpoints mode:'test'
  it('(e) demo session sets mode test on Touchpoints', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    const allArgs = mockSend.mock.calls.map(([cmd]) => cmd?.input);
    const touchpointsItem = allArgs.find((inp) => inp?.Item?.stripeEventId !== undefined);
    expect(touchpointsItem).toBeDefined();
    expect(touchpointsItem?.Item?.mode).toBe('test');
  });

  // (f) Contact write does NOT overwrite existing isDemo
  it('(f) Contact UpdateCommand does not overwrite isDemo', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    const allArgs = mockSend.mock.calls.map(([cmd]) => cmd?.input);
    const contactUpdate = allArgs.find((inp) => inp?.UpdateExpression !== undefined);
    expect(contactUpdate).toBeDefined();
    expect(contactUpdate?.UpdateExpression).not.toContain('isDemo');
  });
});
