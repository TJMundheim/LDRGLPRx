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

const { mockLambdaSend } = vi.hoisted(() => ({ mockLambdaSend: vi.fn().mockResolvedValue({}) }));
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn(() => ({ send: mockLambdaSend })),
  InvokeCommand: class { constructor(public input: unknown) {} },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({})),
  GetObjectCommand: class { constructor(public input: unknown) {} },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed.example/cohort-workbook-v1.pdf?sig=test'),
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

  it('(i) digital fulfillment: cohort-workbook SKU invokes email-sender with signed URL', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { skuIds: 'cohort-workbook', firstName: 'TJ' },
    });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
    const invokeInput = (mockLambdaSend.mock.calls[0][0] as { input: { FunctionName: string; Payload: Buffer } }).input;
    expect(invokeInput.FunctionName).toBe('my4mlife-email-sender');
    const payload = JSON.parse(invokeInput.Payload.toString());
    expect(payload.to).toBe('test@example.com');
    expect(payload.kind).toBe('info');
    expect(payload.subject).toMatch(/Cohort Workbook/i);
    expect(payload.html).toContain('https://signed.example/cohort-workbook-v1.pdf');
    expect(payload.html).toContain('Hi TJ');
  });

  it('(j) digital fulfillment: SKU not in map does NOT invoke email-sender', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { skuIds: 'some-unmapped-sku' },
    });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it('(j2) physical SKU biome-ns-ultra sends coordinator order email with shipping address', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { skuIds: 'biome-ns-ultra' },
      amount_total: 14900,
      shipping_details: {
        name: 'Mark Reynolds',
        address: { line1: '100 Main St', line2: null, city: 'Dallas', state: 'TX', postal_code: '75201', country: 'US' },
      },
    });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    // Biome purchase now sends TWO emails: the free gut-repair guide (to the
    // customer) + the coordinator ship notification (to drtj@).
    expect(mockLambdaSend).toHaveBeenCalledTimes(2);
    const payloads = mockLambdaSend.mock.calls.map((c: any) => JSON.parse(c[0].input.Payload.toString()));
    const guide = payloads.find((p: any) => /Fast Start Guide to Gut Repair/.test(p.subject || ''));
    expect(guide).toBeTruthy();
    const payload = payloads.find((p: any) => /Biome NS Ultra order/.test(p.subject || ''));
    expect(payload.kind).toBe('info');
    expect(payload.to).toBe('drtj@my4mlife.com');
    expect(payload.subject).toMatch(/One-time/);
    expect(payload.html).toContain('Mark Reynolds');
    expect(payload.html).toContain('100 Main St');
    expect(payload.html).toContain('75201');
    expect(payload.html).toContain('$149.00');
  });

  it('(j3) biome-ns-ultra-sub subject says subscription; email failure never throws', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { skuIds: 'biome-ns-ultra-sub' },
      amount_total: 12900,
    });
    // First email (the guide) fails — must be swallowed; the order still
    // completes and the coordinator subscription email still goes out.
    mockLambdaSend.mockRejectedValueOnce(new Error('SES down'));
    await expect(
      processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false }),
    ).resolves.not.toThrow();
    const payloads = mockLambdaSend.mock.calls.map((c: any) => JSON.parse(c[0].input.Payload.toString()));
    const coord = payloads.find((p: any) => /Biome NS Ultra order/.test(p.subject || ''));
    expect(coord).toBeTruthy();
    expect(coord.subject).toMatch(/subscription/i);
  });

  it('(k) digital fulfillment: idempotent retry does NOT re-send email', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { skuIds: 'cohort-workbook', firstName: 'TJ' },
    });
    // First call: all writes succeed normally
    let firstCall = true;
    mockSend.mockImplementation(async (cmd: { input?: { TableName?: string; Item?: Record<string, unknown> } }) => {
      const table = cmd.input?.TableName;
      // On second processEvent, Orders + Touchpoints both throw CCF
      if (!firstCall) {
        if (table === 'Orders' || table === 'Touchpoints') {
          const err = new Error('CCF'); err.name = 'ConditionalCheckFailedException'; throw err;
        }
      }
      return {};
    });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    firstCall = false;
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    // email-sender invoked exactly once (first run), not on retry
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
  });
});
