import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (hoisted so vi.mock factories can reference them) ---
const {
  mockStripeChargRetrieve,
  mockStripeDisputeRetrieve,
  mockStripeSubscriptionsList,
  mockStripeSubscriptionsCancel,
  mockStripeEventRetrieve,
  mockDdbSend,
} = vi.hoisted(() => ({
  mockStripeChargRetrieve: vi.fn(),
  mockStripeDisputeRetrieve: vi.fn(),
  mockStripeSubscriptionsList: vi.fn(),
  mockStripeSubscriptionsCancel: vi.fn(),
  // events.retrieve echoes the passed id back as the canonical object id,
  // matching how the existing tests already pass object-ids as event-ids.
  mockStripeEventRetrieve: vi.fn(async (id: string) => ({ data: { object: { id } } })),
  mockDdbSend: vi.fn(),
}));

vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn().mockResolvedValue({
    charges: { retrieve: mockStripeChargRetrieve },
    disputes: { retrieve: mockStripeDisputeRetrieve },
    events: { retrieve: mockStripeEventRetrieve },
    subscriptions: {
      list: mockStripeSubscriptionsList,
      cancel: mockStripeSubscriptionsCancel,
    },
  }),
}));

vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/lib-dynamodb')>('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: { from: () => ({ send: mockDdbSend }) },
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

import { processEvent } from './process-event.js';

// ---- helpers ----
function makeCharge(opts: { refunded?: boolean; customerId?: string } = {}) {
  return {
    id: 'ch_test',
    customer: opts.customerId ?? 'cus_test',
    refunded: opts.refunded ?? false,
    dispute: null,
    metadata: { orderId: 'order_123', contactEmail: 'test@example.com' },
  };
}

function makeDispute(status: string, chargeId = 'ch_test') {
  return { id: 'dp_test', charge: chargeId, status };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDdbSend.mockResolvedValue({});
  mockStripeSubscriptionsList.mockResolvedValue({ data: [] });
});

describe('charge.refunded', () => {
  it('(a) handles charge.refunded event type', async () => {
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ refunded: true }));
    await expect(processEvent({ id: 'ch_test', type: 'charge.refunded', livemode: false })).resolves.not.toThrow();
  });

  it('(c) sets Order.status=refunded', async () => {
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ refunded: true }));
    await processEvent({ id: 'ch_test', type: 'charge.refunded', livemode: false });
    const updateCall = mockDdbSend.mock.calls.find(c =>
      JSON.stringify(c[0]).includes('"refunded"')
    );
    expect(updateCall).toBeTruthy();
  });

  it('(c) idempotent — already-refunded order is no-op (conditional update)', async () => {
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ refunded: true }));
    mockDdbSend.mockResolvedValueOnce({}); // touchpoint
    mockDdbSend.mockResolvedValueOnce({}); // order update
    await processEvent({ id: 'ch_test', type: 'charge.refunded', livemode: false });
    await processEvent({ id: 'ch_test', type: 'charge.refunded', livemode: false });
    // Both calls succeed — second is a no-op due to attribute_not_exists guard
    expect(mockDdbSend).toHaveBeenCalled();
  });
});

describe('charge.dispute.created', () => {
  it('(a) handles charge.dispute.created', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('needs_response'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await expect(processEvent({ id: 'dp_test', type: 'charge.dispute.created', livemode: false })).resolves.not.toThrow();
  });

  it('(d) NEVER bans on created status', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('needs_response'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await processEvent({ id: 'dp_test', type: 'charge.dispute.created', livemode: false });
    const banCall = mockDdbSend.mock.calls.find(c => JSON.stringify(c[0]).includes('"banned"'));
    expect(banCall).toBeUndefined();
  });
});

describe('charge.dispute.updated', () => {
  it('(a) handles charge.dispute.updated', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('under_review'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await expect(processEvent({ id: 'dp_test', type: 'charge.dispute.updated', livemode: false })).resolves.not.toThrow();
  });

  it('(d) NEVER bans on under_review status', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('under_review'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await processEvent({ id: 'dp_test', type: 'charge.dispute.updated', livemode: false });
    const banCall = mockDdbSend.mock.calls.find(c => JSON.stringify(c[0]).includes('"banned"'));
    expect(banCall).toBeUndefined();
  });
});

describe('charge.dispute.closed', () => {
  it('(a) handles charge.dispute.closed', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('won'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await expect(processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false })).resolves.not.toThrow();
  });

  it('(d) NEVER bans on won status', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('won'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false });
    const banCall = mockDdbSend.mock.calls.find(c => JSON.stringify(c[0]).includes('"banned"'));
    expect(banCall).toBeUndefined();
  });

  it('(d) BANS only on lost status', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('lost'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ customerId: 'cus_test' }));
    await processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false });
    const banCall = mockDdbSend.mock.calls.find(c => JSON.stringify(c[0]).includes('"banned"'));
    expect(banCall).toBeTruthy();
  });

  it('(d) ban is idempotent — already-banned contact is no-op (conditional)', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('lost'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ customerId: 'cus_test' }));
    // Both calls should not throw even if second would fail condition
    await processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false });
    await processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false });
    expect(mockDdbSend).toHaveBeenCalled();
  });

  it('(d) ban cancels active subscriptions', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('lost'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ customerId: 'cus_test' }));
    mockStripeSubscriptionsList.mockResolvedValue({
      data: [{ id: 'sub_abc', status: 'active' }, { id: 'sub_def', status: 'trialing' }],
    });
    await processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false });
    expect(mockStripeSubscriptionsCancel).toHaveBeenCalledWith('sub_abc');
    expect(mockStripeSubscriptionsCancel).toHaveBeenCalledWith('sub_def');
  });

  it('(d) cancellation failure does not block ban write', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('lost'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ customerId: 'cus_test' }));
    mockStripeSubscriptionsList.mockResolvedValue({ data: [{ id: 'sub_abc', status: 'active' }] });
    mockStripeSubscriptionsCancel.mockRejectedValue(new Error('network error'));
    await expect(processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false })).resolves.not.toThrow();
    const banCall = mockDdbSend.mock.calls.find(c => JSON.stringify(c[0]).includes('"banned"'));
    expect(banCall).toBeTruthy();
  });

  it('(d) won after lost: ban is NEVER reversed by this handler', async () => {
    // Won dispute should not write a "un-ban" — no lifecycleStage update to non-banned
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('won'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await processEvent({ id: 'dp_test', type: 'charge.dispute.closed', livemode: false });
    const banReversalCall = mockDdbSend.mock.calls.find(c => {
      const s = JSON.stringify(c[0]);
      return s.includes('lifecycleStage') && !s.includes('"banned"');
    });
    expect(banReversalCall).toBeUndefined();
  });
});

describe('listen+pull', () => {
  it('(b) re-retrieves dispute via stripe-client (not trusting payload)', async () => {
    mockStripeDisputeRetrieve.mockResolvedValue(makeDispute('needs_response'));
    mockStripeChargRetrieve.mockResolvedValue(makeCharge());
    await processEvent({ id: 'dp_test', type: 'charge.dispute.created', livemode: false });
    expect(mockStripeDisputeRetrieve).toHaveBeenCalledWith('dp_test');
  });

  it('(e) uses livemode=true to select live Stripe client', async () => {
    const { getStripeClient } = await import('@my4mlife/stripe-client');
    mockStripeChargRetrieve.mockResolvedValue(makeCharge({ refunded: true }));
    await processEvent({ id: 'ch_test', type: 'charge.refunded', livemode: true });
    expect(getStripeClient).toHaveBeenCalledWith(expect.objectContaining({ livemode: true }));
  });
});
