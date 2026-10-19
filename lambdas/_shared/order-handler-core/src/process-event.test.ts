import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const { mockUpsert } = vi.hoisted(() => ({ mockUpsert: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: mockUpsert }));

import { getStripeClient } from '@my4mlife/stripe-client';
import { deriveContactId } from '@my4mlife/contact-id';
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

    // LTV flows through upsertContact: only the first (new-order) run carries amountUSD.
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert.mock.calls[0][1].amountUSD).toBe(99);
    expect(mockUpsert.mock.calls[1][1].amountUSD).toBeUndefined();
    // The direct Contact UpdateCommand never touches LTV any more.
    const contactUpdates = mockSend.mock.calls
      .map(([cmd]) => cmd?.input)
      .filter((inp) => inp?.TableName === 'Contact' && inp?.UpdateExpression);
    expect(contactUpdates.length).toBe(2);
    for (const u of contactUpdates) expect(u.UpdateExpression).not.toContain('lifetimeValueUSD');
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

  it('(g) metadata.contactId still keys Orders/Touchpoints; Contact row is keyed by the email-derived id (same row upsertContact writes)', async () => {
    mockSessionRetrieve.mockResolvedValue({
      ...baseSession,
      metadata: { contactId: 'meta-contact-xyz' },
    });
    await processEvent({ id: 'evt_1', type: 'checkout.session.completed', livemode: false });
    const inputs = mockSend.mock.calls.map(([cmd]) => cmd?.input);
    expect(inputs.find((inp) => inp?.TableName === 'Orders')?.Item.contactId).toBe('meta-contact-xyz');
    expect(inputs.find((inp) => inp?.TableName === 'Touchpoints')?.Item.contactId).toBe('meta-contact-xyz');
    const contactUpdate = inputs.find((inp) => inp?.TableName === 'Contact');
    expect(contactUpdate?.Key.contactId).toBe(deriveContactId('test@example.com'));
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
  // Non-paid checkout events must not record an order. stripe-events-retry
  // routes every `checkout.session.*` event here, so a future
  // `checkout.session.expired` / `async_payment_failed` EventBridge rule would
  // otherwise write a fake Orders row, bump LTV, and fire fulfillment.
  //
  // Skipped result shape: processEvent returns Promise<void>, and its only
  // existing "no-op" outcome (idempotent replay, see (p5)) is a normal resolve
  // with `undefined`. So "skipped" = resolves to undefined WITHOUT throwing
  // (a throw would send the event to the DLQ / trigger EB retries) and with
  // zero DynamoDB sends and zero Lambda (email / protege-signup) invocations.
  describe('non-completed checkout events are skipped', () => {
    const expectSkipped = async (type: string) => {
      await expect(processEvent({ id: 'evt_skip', type, livemode: false })).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(0);
      expect(mockLambdaSend).toHaveBeenCalledTimes(0);
    };

    it('(s1) checkout.session.expired is skipped: no ddb, no email/lambda', async () => {
      await expectSkipped('checkout.session.expired');
    });

    it('(s2) checkout.session.async_payment_failed is skipped: no ddb, no email/lambda', async () => {
      await expectSkipped('checkout.session.async_payment_failed');
    });

    it('(s3) skip holds even for a fulfillable SKU (no email, no Orders/Contact/Touchpoints)', async () => {
      mockSessionRetrieve.mockResolvedValue({ ...baseSession, metadata: { skuIds: 'cohort-workbook', firstName: 'TJ' } });
      await expectSkipped('checkout.session.expired');
    });

    it('(s4) checkout.session.completed still processes (Orders + Contact + Touchpoints)', async () => {
      await processEvent({ id: 'evt_ok', type: 'checkout.session.completed', livemode: false });
      expect(mockSend).toHaveBeenCalledTimes(3);
      const tables = mockSend.mock.calls.map(([cmd]) => cmd?.input?.TableName);
      expect(tables).toEqual(['Orders', 'Contact', 'Touchpoints']);
    });

    it('(s5) checkout.session.async_payment_succeeded still processes (Orders + Contact + Touchpoints)', async () => {
      await processEvent({ id: 'evt_ok', type: 'checkout.session.async_payment_succeeded', livemode: false });
      expect(mockSend).toHaveBeenCalledTimes(3);
      const tables = mockSend.mock.calls.map(([cmd]) => cmd?.input?.TableName);
      expect(tables).toEqual(['Orders', 'Contact', 'Touchpoints']);
    });
  });

  describe('push-patch fulfillment email', () => {
    // Order email moved to physician approval (built elsewhere). At payment the
    // handler only writes a PUSH_PATCH_PENDING# marker for the intake flow.
    const NOW = new Date('2026-10-01T15:00:00.000Z');
    const patchSession = {
      ...baseSession,
      id: 'cs_test_patch123',
      amount_total: 65000,
      payment_intent: 'pi_test_patch123',
      metadata: { skuIds: 'push-patch-kpv-nad-ghk', wear: '12h' },
      shipping_details: {
        name: 'Jane Doe',
        address: { line1: '742 Evergreen Terrace', line2: null, city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' },
      },
    };
    const run = () => processEvent({ id: 'evt_patch_1', type: 'checkout.session.completed', livemode: false });
    const payloadsOf = () => mockLambdaSend.mock.calls.map((c: any) => JSON.parse(c[0].input.Payload.toString()));
    const pendingPuts = () =>
      mockSend.mock.calls
        .map(([cmd]) => cmd?.input)
        .filter((inp) => inp?.TableName === 'Touchpoints' && typeof inp?.Item?.sk === 'string' && inp.Item.sk.startsWith('PUSH_PATCH_PENDING#'));
    const savedEnv = process.env.PUSH_PATCH_FULFILLMENT_EMAIL;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(NOW);
      mockSessionRetrieve.mockResolvedValue(patchSession);
      process.env.PUSH_PATCH_FULFILLMENT_EMAIL = 'fulfillment@example.com';
    });
    afterEach(() => {
      vi.useRealTimers();
      if (savedEnv === undefined) delete process.env.PUSH_PATCH_FULFILLMENT_EMAIL;
      else process.env.PUSH_PATCH_FULFILLMENT_EMAIL = savedEnv;
    });

    it('(p1) sends NO email to PUSH_PATCH_FULFILLMENT_EMAIL on payment (only the buyer order-received email)', async () => {
      await run();
      expect(payloadsOf().some((p: any) => p.to === 'fulfillment@example.com')).toBe(false);
      expect(payloadsOf().map((p: any) => p.to)).toEqual(['test@example.com']);
    });

    it('(p2) sends no order email to the drtj@my4mlife.com fallback when env is unset', async () => {
      delete process.env.PUSH_PATCH_FULFILLMENT_EMAIL;
      await run();
      expect(payloadsOf().some((p: any) => /my4mlife\.com$/.test(p.to))).toBe(false);
    });

    it('(p2a) sends the order-received email exactly once on a NEW marker', async () => {
      await run();
      expect(mockLambdaSend).toHaveBeenCalledTimes(1);
      const input = (mockLambdaSend.mock.calls[0][0] as any).input;
      expect(input.FunctionName).toBe('my4mlife-email-sender');
      expect(payloadsOf()[0]).toMatchObject({
        kind: 'info',
        from: 'support',
        to: 'test@example.com',
        subject: 'Your Push Patch order is in \u2014 one 2-minute step left',
      });
    });

    it('(p2b) html links to the intake page with the session id, greets by first name, and has no PHI/tagline', async () => {
      mockSessionRetrieve.mockResolvedValue({ ...patchSession, customer_details: { email: 'test@example.com', name: 'Jane Q Doe' } });
      await run();
      const { html } = payloadsOf()[0];
      expect(html).toContain('https://www.my4mlife.com/go/push-patch/thank-you?session_id=cs_test_patch123');
      expect(html).toContain('Finish your questionnaire');
      expect(html).toContain('Hi Jane,');
      expect(html).toContain('licensed physicians');
      expect(html).not.toMatch(/identity|dignity/i);
      // no PHI / shipping / product detail
      for (const bad of ['742 Evergreen', 'Austin', '78701', 'KPV', 'NAD', 'GHK', 'wear', '12h', 'Jane Doe', 'pi_test_patch123']) {
        expect(html).not.toContain(bad);
      }
    });

    it("(p2c) falls back to 'Hi there,' with no name", async () => {
      await run();
      expect(payloadsOf()[0].html).toContain('Hi there,');
    });

    it('(p2d) send failure (rejection or FunctionError) does not throw and the marker is still written', async () => {
      mockLambdaSend.mockRejectedValueOnce(new Error('SES down'));
      await expect(run()).resolves.toBeUndefined();
      mockLambdaSend.mockResolvedValueOnce({ FunctionError: 'Unhandled' });
      await expect(run()).resolves.toBeUndefined();
      expect(pendingPuts()).toHaveLength(2);
    });

    it('(p2e) no buyer email: no send, no throw', async () => {
      mockSessionRetrieve.mockResolvedValue({ ...patchSession, customer: 'cus_1', customer_details: {}, metadata: { ...patchSession.metadata, contactId: 'c_known' } });
      await expect(run()).resolves.toBeUndefined();
      expect(mockLambdaSend).not.toHaveBeenCalled();
    });

    it('(p3) writes exactly one PUSH_PATCH_PENDING#<sessionId> Touchpoints row with all fields', async () => {
      await run();
      const puts = pendingPuts();
      expect(puts).toHaveLength(1);
      expect(puts[0].Item.sk).toBe('PUSH_PATCH_PENDING#cs_test_patch123');
      expect(puts[0].Item).toMatchObject({
        sessionId: 'cs_test_patch123',
        skuId: 'push-patch-kpv-nad-ghk',
        paymentIntentId: 'pi_test_patch123',
        email: 'test@example.com',
        createdAt: NOW.toISOString(),
        remindersSent: 0,
      });
    });

    it('(p3b) intakeDue is createdAt + 30 minutes (ISO)', async () => {
      await run();
      const item = pendingPuts()[0]?.Item;
      expect(item).toBeDefined();
      expect(item.createdAt).toBe('2026-10-01T15:00:00.000Z');
      expect(item.intakeDue).toBe('2026-10-01T15:30:00.000Z');
    });

    it('(p4) pending marker put is conditional (attribute_not_exists(sk))', async () => {
      await run();
      const puts = pendingPuts();
      expect(puts).toHaveLength(1);
      expect(puts[0].ConditionExpression).toBe('attribute_not_exists(sk)');
    });

    it('(p5) replay is idempotent: marker conditional-fails the second time, no throw, no second email', async () => {
      const seen = new Set<string>();
      mockSend.mockImplementation(async (cmd: { input?: { TableName?: string; Item?: Record<string, unknown> } }) => {
        const inp = cmd.input;
        if (inp?.TableName === 'Touchpoints' && inp.Item) {
          const key = String(inp.Item['sk']);
          if (seen.has(key)) { const err = new Error('CCF'); err.name = 'ConditionalCheckFailedException'; throw err; }
          seen.add(key);
        }
        if (inp?.TableName === 'Orders' && inp.Item) {
          const key = `order#${String(inp.Item['orderId'])}`;
          if (seen.has(key)) { const err = new Error('CCF'); err.name = 'ConditionalCheckFailedException'; throw err; }
          seen.add(key);
        }
        return {};
      });
      await run();
      await expect(run()).resolves.toBeUndefined();
      expect(pendingPuts()).toHaveLength(2); // attempted twice; second was rejected by the condition
      expect([...seen].filter((k) => k.startsWith('PUSH_PATCH_PENDING#'))).toEqual(['PUSH_PATCH_PENDING#cs_test_patch123']);
      expect(mockLambdaSend).toHaveBeenCalledTimes(1); // only the first (new-marker) run sends; replay does not
    });

    it('(p6) non-patch SKU writes no PUSH_PATCH_PENDING# row', async () => {
      mockSessionRetrieve.mockResolvedValue({ ...baseSession, metadata: { skuIds: 'some-unmapped-sku' } });
      await run();
      expect(pendingPuts()).toHaveLength(0);
    });

    it('(p7) patch SKU sends no Biome NS Ultra guide or coordinator email', async () => {
      await run();
      for (const p of payloadsOf()) {
        expect(p.subject ?? '').not.toMatch(/Biome NS Ultra|Gut Repair/i);
        expect(p.to).not.toBe('drtj@my4mlife.com');
      }
    });
  });

  describe('Contact row via upsertContact', () => {
    const run = () => processEvent({ id: 'evt_c1', type: 'checkout.session.completed', livemode: false });
    const upsertArg = () => mockUpsert.mock.calls[0][1];

    it('(c1) calls upsertContact with full purchase fields for a Push Patch sku', async () => {
      mockSessionRetrieve.mockResolvedValue({
        ...baseSession,
        id: 'cs_test_patch',
        amount_total: 65000,
        customer: 'cus_str_1',
        customer_details: { email: 'jane@example.com', name: 'Jane Q Doe', phone: '+15125550123' },
        payment_intent: 'pi_1',
        metadata: { skuIds: 'push-patch-kpv-nad-ghk' },
      });
      await run();
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert.mock.calls[0][0]).toEqual({ send: mockSend });
      expect(upsertArg()).toEqual({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Q Doe',
        phone: '+15125550123',
        source: 'purchase:push-patch-kpv-nad-ghk',
        skus: ['push-patch-kpv-nad-ghk'],
        amountUSD: 650,
        stripeCustomerId: 'cus_str_1',
        stage: 'customer',
        event: { type: 'purchase' },
      });
    });

    it('(c2) minimal session: no name/phone/sku omits those keys; expanded customer object supplies stripeCustomerId', async () => {
      await run();
      const arg = upsertArg();
      expect(arg).toMatchObject({ email: 'test@example.com', source: 'purchase', stage: 'customer', stripeCustomerId: 'cus_123', amountUSD: 99, event: { type: 'purchase' } });
      for (const k of ['firstName', 'lastName', 'phone', 'skus']) expect(arg).not.toHaveProperty(k);
    });

    it('(c3) replay (Orders conditional-check fails) sends no amountUSD so LTV is not re-added', async () => {
      mockSend.mockImplementation(async (cmd: { input?: { TableName?: string; Item?: Record<string, unknown> } }) => {
        if (cmd.input?.TableName === 'Orders') { const err = new Error('CCF'); err.name = 'ConditionalCheckFailedException'; throw err; }
        return {};
      });
      await run();
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(upsertArg()).not.toHaveProperty('amountUSD');
    });

    it('(c4) hasUsedFirstPurchaseDiscount + lastPurchaseAt still set by a small direct Contact update (no LTV)', async () => {
      await run();
      const u = mockSend.mock.calls.map(([cmd]) => cmd?.input).find((inp) => inp?.TableName === 'Contact');
      expect(u.UpdateExpression).toContain('hasUsedFirstPurchaseDiscount');
      expect(u.UpdateExpression).toContain('lastPurchaseAt');
      expect(u.UpdateExpression).not.toContain('lifetimeValueUSD');
    });

    describe('Stripe promo consent -> marketingConsent', () => {
      const withConsent = (consent: unknown) => mockSessionRetrieve.mockResolvedValue({ ...baseSession, consent });

      it("(c8) consent.promotions 'opt_in' passes marketingConsent opted_in from stripe-checkout", async () => {
        withConsent({ promotions: 'opt_in', terms_of_service: null });
        await run();
        expect(upsertArg().marketingConsent).toEqual({ status: 'opted_in', source: 'stripe-checkout' });
      });

      it("(c9) consent.promotions 'opt_out' passes marketingConsent opted_out", async () => {
        withConsent({ promotions: 'opt_out' });
        await run();
        expect(upsertArg().marketingConsent).toEqual({ status: 'opted_out', source: 'stripe-checkout' });
      });

      it('(c10) absent or null consent carries no marketingConsent key at all', async () => {
        for (const consent of [undefined, null, {}, { promotions: null }]) {
          mockUpsert.mockClear();
          withConsent(consent);
          await run();
          expect(upsertArg()).not.toHaveProperty('marketingConsent');
        }
      });
    });

    it('(c5) upsert failure still fails the event (retry), like the old Contact write', async () => {
      mockUpsert.mockRejectedValueOnce(new Error('ddb down'));
      await expect(run()).rejects.toThrow(/ddb down/);
    });

    it('(c6) app-access protege-signup payload carries no placeholder phone when Stripe collected none', async () => {
      mockSessionRetrieve.mockResolvedValue({ ...baseSession, metadata: { skuIds: 'app-access' } });
      await run();
      const invoke = mockLambdaSend.mock.calls.map((c: any) => c[0].input).find((i: any) => i.FunctionName === 'my4mlife-protege-signup');
      const body = JSON.parse(JSON.parse(invoke.Payload.toString()).body);
      expect(body).not.toHaveProperty('phone');
      expect(JSON.stringify(body)).not.toContain('+10000000000');
      expect(body.email).toBe('test@example.com');
    });

    it('(c7) app-access forwards a real Stripe-collected phone', async () => {
      mockSessionRetrieve.mockResolvedValue({
        ...baseSession,
        customer_details: { email: 'test@example.com', name: 'Sam Lee', phone: '+15125550999' },
        metadata: { skuIds: 'app-access' },
      });
      await run();
      const invoke = mockLambdaSend.mock.calls.map((c: any) => c[0].input).find((i: any) => i.FunctionName === 'my4mlife-protege-signup');
      expect(JSON.parse(JSON.parse(invoke.Payload.toString()).body).phone).toBe('+15125550999');
    });
  });
});
