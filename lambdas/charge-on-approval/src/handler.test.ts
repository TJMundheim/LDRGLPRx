// charge-on-approval — handler tests
// Mocks: @aws-sdk/lib-dynamodb (DDB calls), @my4mlife/stripe-client (Stripe)

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.mock factories run before imports)
// ---------------------------------------------------------------------------

const { mockSend, mockStripe } = vi.hoisted(() => {
  const mockSend = vi.fn();
  const mockStripe = {
    customers: { create: vi.fn(), update: vi.fn() },
    paymentMethods: { attach: vi.fn() },
    paymentIntents: { create: vi.fn() },
    products: { create: vi.fn() },
    prices: { create: vi.fn() },
    subscriptions: { create: vi.fn() },
  };
  return { mockSend, mockStripe };
});

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockSend })),
  },
  QueryCommand: vi.fn((input) => ({ __type: 'QueryCommand', input })),
  PutCommand: vi.fn((input) => ({ __type: 'PutCommand', input })),
  UpdateCommand: vi.fn((input) => ({ __type: 'UpdateCommand', input })),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(() => Promise.resolve(mockStripe)),
}));

// ---------------------------------------------------------------------------
// Import handler after mocks
// ---------------------------------------------------------------------------

import { handler } from './handler.js';
import type { AppSyncEvent } from './handler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_EVENT: AppSyncEvent = {
  arguments: {
    contactId: 'contact-123',
    encounterId: 'enc-456',
    amountCents: 19900,
    billingType: 'one_time',
    label: 'GLP-1 initial',
  },
  identity: { groups: ['Admins'], username: 'coordinator1' },
};

const RECORD_ITEM = {
  contactId: 'contact-123',
  sk: 'record',
  demographics: {
    email: 'patient@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
  },
  cardOnFile: {
    stripeCustomerId: 'cus_existing',
    paymentMethodId: 'pm_test_123',
  },
};

const ENCOUNTER_ITEM = {
  contactId: 'contact-123',
  sk: 'encounter#enc-456',
  encounterId: 'enc-456',
  state: 'script-written',
  category: 'weight-loss',
};

function setupDdbQuery(items: Record<string, unknown>[]) {
  mockSend.mockImplementation((cmd: { __type: string }) => {
    if (cmd.__type === 'QueryCommand') {
      return Promise.resolve({ Items: items });
    }
    return Promise.resolve({});
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('charge-on-approval handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default DDB: query returns record + encounter; writes succeed
    setupDdbQuery([RECORD_ITEM, ENCOUNTER_ITEM]);

    // Default Stripe: one_time success
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_001',
      status: 'succeeded',
    });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
    // attach mints/returns a concrete payment-method id (differs from the input
    // for reused/test tokens) — downstream charge must use THIS id.
    mockStripe.paymentMethods.attach.mockResolvedValue({ id: 'pm_attached_456' });
    mockStripe.customers.update.mockResolvedValue({});
    mockStripe.products.create.mockResolvedValue({ id: 'prod_test' });
    mockStripe.prices.create.mockResolvedValue({ id: 'price_test' });
    mockStripe.subscriptions.create.mockResolvedValue({
      id: 'sub_test_001',
      status: 'active',
    });
  });

  // -------------------------------------------------------------------------
  // 1. one_time success
  // -------------------------------------------------------------------------
  it('returns {ok:true} for a successful one_time charge', async () => {
    const result = await handler(ADMIN_EVENT);

    expect(result.ok).toBe(true);
    expect(result.kind).toBe('one_time');
    expect(result.id).toBe('pi_test_001');
    expect(result.status).toBe('succeeded');
    expect(result.amountCents).toBe(19900);

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 19900,
        currency: 'usd',
        customer: 'cus_existing',
        payment_method: 'pm_test_123',
        off_session: true,
        confirm: true,
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 2. subscription success
  // -------------------------------------------------------------------------
  it('returns {ok:true} for a successful subscription charge', async () => {
    const event: AppSyncEvent = {
      ...ADMIN_EVENT,
      arguments: {
        ...ADMIN_EVENT.arguments,
        billingType: 'subscription',
        interval: 'month',
        label: 'TRT monthly',
      },
    };

    const result = await handler(event);

    expect(result.ok).toBe(true);
    expect(result.kind).toBe('subscription');
    expect(result.id).toBe('sub_test_001');
    expect(result.status).toBe('active');

    expect(mockStripe.products.create).toHaveBeenCalledWith({ name: 'TRT monthly' });
    expect(mockStripe.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        unit_amount: 19900,
        currency: 'usd',
        recurring: { interval: 'month' },
        product: 'prod_test',
      }),
    );
    expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        items: [{ price: 'price_test' }],
        default_payment_method: 'pm_test_123',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 3. ensure-customer when stripeCustomerId is missing
  // -------------------------------------------------------------------------
  it('creates a Stripe customer when none exists on cardOnFile', async () => {
    const recordWithoutCustomer = {
      ...RECORD_ITEM,
      cardOnFile: { paymentMethodId: 'pm_test_123' }, // no stripeCustomerId
    };
    setupDdbQuery([recordWithoutCustomer, ENCOUNTER_ITEM]);

    const result = await handler(ADMIN_EVENT);

    expect(result.ok).toBe(true);
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      email: 'patient@example.com',
      name: 'Jane Doe',
    });
    expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test_123', {
      customer: 'cus_new',
    });
    expect(mockStripe.customers.update).toHaveBeenCalledWith(
      'cus_new',
      expect.objectContaining({
        invoice_settings: { default_payment_method: 'pm_attached_456' },
      }),
    );
    // The charge must use the ATTACHED id, not the original token.
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: 'pm_attached_456' }),
    );

    // Verify an UpdateCommand was sent to persist the new stripeCustomerId
    const updateCalls = mockSend.mock.calls.filter(
      (call: Array<{ __type: string; input: Record<string, unknown> }>) =>
        call[0].__type === 'UpdateCommand',
    );
    const persistCall = updateCalls.find(
      (call: Array<{ __type: string; input: { Key?: Record<string, unknown> } }>) =>
        call[0].input?.Key?.['sk'] === 'record',
    );
    expect(persistCall).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. encounter not in 'script-written' → refuses to charge
  // -------------------------------------------------------------------------
  it('throws when encounter is not in script-written state', async () => {
    const notReadyEncounter = { ...ENCOUNTER_ITEM, state: 'coordinator-reviewed' };
    setupDdbQuery([RECORD_ITEM, notReadyEncounter]);

    await expect(handler(ADMIN_EVENT)).rejects.toThrow(
      'encounter not approved for charge',
    );

    // Stripe must NOT have been called
    expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(mockStripe.subscriptions.create).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. non-admin identity → refused
  // -------------------------------------------------------------------------
  it('throws Unauthorized when caller is not in Admins group', async () => {
    const nonAdminEvent: AppSyncEvent = {
      ...ADMIN_EVENT,
      identity: { groups: ['Members'], username: 'intruder' },
    };

    await expect(handler(nonAdminEvent)).rejects.toThrow('Unauthorized');

    expect(mockSend).not.toHaveBeenCalled();
    expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when identity is missing', async () => {
    const noIdentityEvent: AppSyncEvent = {
      ...ADMIN_EVENT,
      identity: undefined,
    };

    await expect(handler(noIdentityEvent)).rejects.toThrow('Unauthorized');
    expect(mockSend).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. card_declined → {ok:false} and NO encounter state change
  // -------------------------------------------------------------------------
  it('returns {ok:false} on card_declined without changing encounter state', async () => {
    const stripeError = Object.assign(
      new Error('Your card was declined.'),
      { code: 'card_declined', type: 'StripeCardError' },
    );
    mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

    const result = await handler(ADMIN_EVENT);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Your card was declined.');
    expect(result.code).toBe('card_declined');

    // No UpdateCommand should have been issued (encounter stays 'script-written')
    const updateCalls = mockSend.mock.calls.filter(
      (call: Array<{ __type: string }>) => call[0].__type === 'UpdateCommand',
    );
    expect(updateCalls).toHaveLength(0);

    // No Touchpoint PutCommand for a stripe# sk
    const touchpointPuts = mockSend.mock.calls.filter(
      (call: Array<{ __type: string; input?: { Item?: Record<string, unknown> } }>) =>
        call[0].__type === 'PutCommand' &&
        typeof call[0].input?.Item?.['sk'] === 'string' &&
        (call[0].input.Item['sk'] as string).startsWith('stripe#'),
    );
    expect(touchpointPuts).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  it('throws on invalid amountCents (zero)', async () => {
    const event: AppSyncEvent = {
      ...ADMIN_EVENT,
      arguments: { ...ADMIN_EVENT.arguments, amountCents: 0 },
    };
    await expect(handler(event)).rejects.toThrow('amountCents must be a positive integer');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('throws on invalid billingType', async () => {
    const event: AppSyncEvent = {
      ...ADMIN_EVENT,
      // @ts-expect-error intentionally bad value
      arguments: { ...ADMIN_EVENT.arguments, billingType: 'bogus' },
    };
    await expect(handler(event)).rejects.toThrow('billingType');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
