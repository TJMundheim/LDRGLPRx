import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(),
  __resetCacheForTests: vi.fn(),
}));

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

const mockSessionRetrieve = vi.fn();
const mockEventRetrieve = vi.fn();
const mockStripe = {
  checkout: { sessions: { retrieve: mockSessionRetrieve } },
  events: { retrieve: mockEventRetrieve },
};

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

const baseEvent = { data: { object: { id: 'cs_test_abc' } } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStripeClient).mockResolvedValue(mockStripe as never);
  mockSend.mockResolvedValue({});
  mockSessionRetrieve.mockResolvedValue(baseSession);
  mockEventRetrieve.mockResolvedValue(baseEvent);
});

describe('processEvent', () => {
  it('(a) calls getStripeClient with livemode from event, not body', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(getStripeClient).toHaveBeenCalledWith({ livemode: false });
  });

  it('(b) retrieves event then session by canonical object id', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(mockEventRetrieve).toHaveBeenCalledWith('evt_1');
    expect(mockSessionRetrieve).toHaveBeenCalledWith('cs_test_abc', { expand: ['line_items', 'customer'] });
  });

  it('(c) writes Orders, Contact, and Touchpoints rows', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('(d) idempotent: second processEvent does not double-count LTV', async () => {
    // Track Orders insert + Touchpoints insert state across two runs
    let ordersInserted = false;
    let touchpointsInserted = false;
    mockSend.mockImplementation(async (cmd: { input?: { TableName?: string; Item?: Record<string, unknown> } }) => {
      const table = cmd.input?.TableName;
      if (table === 'Orders' && cmd.input?.Item?.['orderId']) {
        if (ordersInserted) {
          const err = new Error('CCF'); err.name = 'ConditionalCheckFailedException'; throw err;
        }
        ordersInserted = true;
        return {};
      }
      if (table === 'Touchpoints' && cmd.input?.Item?.['stripeEventId']) {
        if (touchpointsInserted) {
          const err = new Error('CCF'); err.name = 'ConditionalCheckFailedException'; throw err;
        }
        touchpointsInserted = true;
        return {};
      }
      return {};
    });

    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });

    // On second run, Contact update must NOT include the LTV increment.
    const contactUpdates = mockSend.mock.calls
      .map(([cmd]) => cmd?.input)
      .filter((inp) => inp?.TableName === 'Contact' && inp?.UpdateExpression);
    expect(contactUpdates.length).toBe(2);
    expect(contactUpdates[0].UpdateExpression).toContain('lifetimeValueUSD');
    expect(contactUpdates[1].UpdateExpression).not.toContain('lifetimeValueUSD');
  });

  it('(e) livemode=false → Touchpoints mode:test', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    const tpItem = mockSend.mock.calls
      .map(([cmd]) => cmd?.input)
      .find((inp) => inp?.TableName === 'Touchpoints');
    expect(tpItem?.Item?.mode).toBe('test');
  });

  it('(f) Contact PK is contactId (not email)', async () => {
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    const contactUpdate = mockSend.mock.calls
      .map(([cmd]) => cmd?.input)
      .find((inp) => inp?.TableName === 'Contact');
    expect(contactUpdate?.Key).toHaveProperty('contactId');
    expect(contactUpdate?.Key).not.toHaveProperty('email');
  });

  it('(g) metadata.contactId wins over email-derived', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { contactId: 'meta-contact-xyz' },
    });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    const contactUpdate = mockSend.mock.calls
      .map(([cmd]) => cmd?.input)
      .find((inp) => inp?.TableName === 'Contact');
    expect(contactUpdate?.Key.contactId).toBe('meta-contact-xyz');
  });

  it('(h) throws when no contactId and no email available', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      customer: null,
      customer_details: null,
      metadata: {},
    });
    await expect(
      processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false })
    ).rejects.toThrow(/cannot resolve contactId/);
  });
});
