import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  claim: vi.fn(), getAuth: vi.fn(), setFields: vi.fn(), record: vi.fn(), sendOrder: vi.fn(), stamp: vi.fn(),
  shipped: vi.fn(), notice: vi.fn(), failed: vi.fn(), upsert: vi.fn(),
}));
vi.mock('@my4mlife/push-patch-decision-core', () => ({
  claimRefillSlot: h.claim, getRefillAuth: h.getAuth, setRefillAuthFields: h.setFields, recordShipment: h.record,
  sendGenesisOrder: h.sendOrder, stampGenesisSent: h.stamp, resolveShip: (s: unknown) => s,
  blendFor: () => ({ name: 'Enhanced Glow' }),
  sendRefillShipped: h.shipped, sendRefillNotice: h.notice, sendRefillPaymentFailed: h.failed,
}));
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: h.upsert }));

import { handleRefillInvoice, handleRefillSession, isRefillInvoice } from './push-patch-refill.js';

const SHIP = { name: 'Paul', address: { line1: '1 Main', line2: '', city: 'Austin', state: 'TX', postal_code: '78701' } }; // resolveShip is mocked as identity
const orders = new Set<string>();
const puts: Array<{ table: string; item: any }> = [];
const lambdaSend = vi.fn().mockResolvedValue({});
const ddb = {
  send: vi.fn(async (cmd: any) => {
    const n = cmd.constructor.name; const i = cmd.input;
    if (n === 'PutCommand') {
      if (i.TableName === 'Orders') {
        if (orders.has(i.Item.orderId)) { const e: any = new Error('x'); e.name = 'ConditionalCheckFailedException'; throw e; }
        orders.add(i.Item.orderId);
      }
      puts.push({ table: i.TableName, item: i.Item });
      return {};
    }
    if (n === 'DeleteCommand') { orders.delete(i.Key.orderId); return {}; }
    if (n === 'GetCommand') {
      if (i.TableName === 'Contact') return { Item: { contactId: 'c1', email: 'p@example.com', firstName: 'Paul' } };
      if (i.Key.sk === 'record') return { Item: { demographics: { firstName: 'Paul', lastName: 'M', phone: '555', email: 'p@example.com' } } };
    }
    return {};
  }),
};
const subsUpdate = vi.fn().mockResolvedValue({});
const stripe: any = { subscriptions: { update: subsUpdate } };
const deps = () => ({ stripe, ddb: ddb as any, lambda: { send: lambdaSend } as any, emailFn: 'email-fn', livemode: true });

const meta = { kind: 'push-patch-refill', contactId: 'c1', encounterId: 'pp-cs_1', skuIds: 'push-patch-glow', partnerRef: 'PARTNER1', mode: 'auto' };
const invoice = (o: any = {}) => ({
  id: 'in_1', amount_paid: 65000, currency: 'usd', customer: 'cus_1', subscription: 'sub_1', billing_reason: 'subscription_cycle',
  payment_intent: 'pi_1', hosted_invoice_url: 'https://pay.example/in_1', customer_email: 'p@example.com',
  subscription_details: { metadata: meta }, ...o,
});
const auth = (o: any = {}) => ({ refillsAuthorized: 8, refillsUsed: 1, sku: 'push-patch-glow', expiresAt: '2027-11-15T00:00:00.000Z', mode: 'auto', status: 'active', ...o });

beforeEach(() => {
  vi.clearAllMocks(); orders.clear(); puts.length = 0;
  h.getAuth.mockResolvedValue({ auth: auth(), encounter: { shipTo: SHIP, sku: 'push-patch-glow', signedByName: 'Dr X' } });
  h.claim.mockResolvedValue({ ok: true, refillNumber: 1, auth: auth() });
  h.sendOrder.mockResolvedValue({ to: 'g@x.com', toGenesis: true });
  h.stamp.mockResolvedValue(undefined); h.shipped.mockResolvedValue(undefined); h.notice.mockResolvedValue(undefined);
  h.failed.mockResolvedValue(undefined); h.upsert.mockResolvedValue(undefined); h.setFields.mockResolvedValue(undefined); h.record.mockResolvedValue(undefined);
});

describe('isRefillInvoice', () => {
  it('reads subscription_details.metadata, then parent.subscription_details.metadata', () => {
    expect(isRefillInvoice(invoice())).toBe(true);
    expect(isRefillInvoice({ parent: { subscription_details: { metadata: meta } } })).toBe(true);
    expect(isRefillInvoice({ subscription_details: { metadata: { kind: 'other' } } })).toBe(false);
    expect(isRefillInvoice({})).toBe(false);
  });
});

describe('invoice.paid', () => {
  it('ships once: order row, child encounter, Genesis, stamp, emails, LTV', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    const order = puts.find((p) => p.table === 'Orders')!.item;
    expect(order).toMatchObject({ orderId: 'in_1', contactId: 'c1', amountUSD: 650, sku: 'push-patch-glow', partnerCode: 'PARTNER1', kind: 'push-patch-refill', refill: true });
    expect(h.claim).toHaveBeenCalledWith('c1', 'pp-cs_1', expect.any(Date));
    const enc = puts.find((p) => p.table === 'PatientRecords')!.item;
    expect(enc).toMatchObject({ sk: 'encounter#pp-rf-in_1', state: 'script-written', lane: 'push-patch', refillOf: 'pp-cs_1', refillNumber: 1, sku: 'push-patch-glow', shipTo: SHIP, paymentIntentId: 'pi_1' });
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
    expect(h.sendOrder.mock.calls[0][0]).toMatchObject({ sessionId: 'in_1', sku: 'push-patch-glow', ship: SHIP, name: 'Paul M', lastName: 'M', phone: '555' });
    expect(h.stamp).toHaveBeenCalledWith('c1', 'pp-rf-in_1', 'g@x.com', true);
    expect(h.shipped).toHaveBeenCalledWith(expect.objectContaining({ to: 'p@example.com', firstName: 'Paul', refillNumber: 1, refillsAuthorized: 8 }));
    expect(h.notice).toHaveBeenCalledTimes(1);
    expect(h.upsert).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ email: 'p@example.com', amountUSD: 650, stripeCustomerId: 'cus_1' }));
  });

  it('ships to refillAuth.shipTo when present, records it on the child encounter, flags TJ notice', async () => {
    const NEW = { name: 'Paul M', address: { line1: '9 New St', line2: '', city: 'Dallas', state: 'TX', postal_code: '75001' } }; // identity-mocked resolveShip
    h.getAuth.mockResolvedValue({ auth: auth({ shipTo: NEW, shipToUpdatedAt: '2026-11-20T00:00:00.000Z' }), encounter: { shipTo: SHIP, sku: 'push-patch-glow', signedByName: 'Dr X' } });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder.mock.calls[0][0].ship).toEqual(NEW);
    expect(puts.find((p) => p.table === 'PatientRecords')!.item.shipTo).toEqual(NEW);
    expect(h.notice).toHaveBeenCalledWith(expect.objectContaining({ shipToUpdatedAt: '2026-11-20T00:00:00.000Z' }));
  });
  it('falls back to the parent shipTo and sends no address flag', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder.mock.calls[0][0].ship).toEqual(SHIP);
    expect(h.notice.mock.calls[0][0].shipToUpdatedAt).toBeUndefined();
  });
  it('never logs address text', async () => {
    const spy = vi.spyOn(console, 'log'); const err = vi.spyOn(console, 'error');
    h.getAuth.mockResolvedValue({ auth: auth({ shipTo: { name: 'Paul M', address: { line1: '9 New St', city: 'Dallas', state: 'TX', postal_code: '75001' } }, shipToUpdatedAt: 'x' }), encounter: { shipTo: SHIP } });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(JSON.stringify([...spy.mock.calls, ...err.mock.calls])).not.toMatch(/New St|75001|Dallas/);
  });

  it('replay does not ship twice', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
    expect(h.claim).toHaveBeenCalledTimes(1);
    expect(h.upsert).toHaveBeenCalledTimes(1);
  });

  it('ignores zero-amount and non-refill invoices', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice({ amount_paid: 0 }));
    await handleRefillInvoice(deps(), 'invoice.paid', invoice({ subscription_details: { metadata: { kind: 'x' } } }));
    expect(h.sendOrder).not.toHaveBeenCalled();
    expect(orders.size).toBe(0);
  });

  it('subscription_create stores subscriptionId and sets no cancel_at (Stripe would prorate the last box)', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice({ billing_reason: 'subscription_create', lines: { data: [{ period: { end: Date.parse('2027-01-01T00:00:00Z') / 1000 } }] } }));
    expect(h.setFields).toHaveBeenCalledWith('c1', 'pp-cs_1', { subscriptionId: 'sub_1', mode: 'auto' });
    expect(subsUpdate).not.toHaveBeenCalled();
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
  });

  it('a renewal that would fall on/after expiresAt ends auto-ship at period end; this box still ships', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice({ lines: { data: [{ period: { end: Date.parse('2027-11-20T00:00:00Z') / 1000 } }] } }));
    expect(subsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
    expect(h.shipped.mock.calls[0][0].nextChargeDate).toBeUndefined();
  });

  it('cycle invoices inside the authorization do not touch the subscription', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice({ lines: { data: [{ period: { end: Date.parse('2027-01-01T00:00:00Z') / 1000 } }] } }));
    expect(subsUpdate).not.toHaveBeenCalled();
  });

  it('marks the Orders row with the outcome', async () => {
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(puts.find((p) => p.table === 'Orders')!.item.refillStatus).toBe('processing');
    const upd = ddb.send.mock.calls.map((c: any) => c[0]).find((c: any) => c.constructor.name === 'UpdateCommand' && c.input.TableName === 'Orders');
    expect(upd.input.ExpressionAttributeValues[':s']).toBe('shipped');
  });

  it('replay of a row stuck in processing past the timeout alerts TJ once and ships nothing', async () => {
    orders.add('in_1');
    ddb.send.mockImplementationOnce(async () => { const e: any = new Error('x'); e.name = 'ConditionalCheckFailedException'; throw e; }) // Orders put
      .mockImplementationOnce(async () => ({})); // stuck-alert conditional update succeeds
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.claim).not.toHaveBeenCalled();
    expect(h.sendOrder).not.toHaveBeenCalled();
    const mail = JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());
    expect(mail.subject).toMatch(/^\[ACTION NEEDED\] Push Patch refill may not have shipped/);
  });

  it('test mode (livemode false) never addresses Genesis', async () => {
    await handleRefillInvoice({ ...deps(), livemode: false }, 'invoice.paid', invoice());
    expect(h.sendOrder.mock.calls[0][0]).toMatchObject({ tjOnly: true, testOrder: true });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice({ id: 'in_2' }));
    expect(h.sendOrder.mock.calls[1][0].tjOnly).toBe(false);
  });

  it('no ship-to on the parent: nothing sent to Genesis, TJ told', async () => {
    h.getAuth.mockResolvedValue({ auth: auth(), encounter: { sku: 'push-patch-glow' } });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder).not.toHaveBeenCalled();
    expect(h.shipped).not.toHaveBeenCalled();
    const mail = JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());
    expect(mail.subject).toMatch(/NOT sent to Genesis/);
  });

  it('last slot taken cancels the subscription at period end', async () => {
    h.claim.mockResolvedValue({ ok: true, refillNumber: 8, auth: auth({ refillsUsed: 8, status: 'exhausted' }) });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
    expect(subsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
  });

  it('exhausted: no Genesis, child encounter routed to provider, TJ told, subscription cancelled', async () => {
    h.claim.mockResolvedValue({ ok: false, reason: 'exhausted' });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder).not.toHaveBeenCalled();
    expect(h.shipped).not.toHaveBeenCalled();
    const enc = puts.find((p) => p.table === 'PatientRecords')!.item;
    expect(enc).toMatchObject({ sk: 'encounter#pp-rf-in_1', state: 'sent-to-provider', refillOf: 'pp-cs_1', refillBlockedReason: 'exhausted' });
    const mail = JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());
    expect(mail.to).toBe('drtj@my4mlife.com');
    expect(mail.subject + mail.html).toMatch(/payment received but refill authorization is used up\/expired/i);
    expect(subsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
  });

  it('expired: routed to provider, auto-ship ends at period end (no more charges without a box)', async () => {
    h.claim.mockResolvedValue({ ok: false, reason: 'expired' });
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.sendOrder).not.toHaveBeenCalled();
    expect(subsUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true });
    expect(puts.find((p) => p.table === 'PatientRecords')!.item.refillBlockedReason).toBe('expired');
  });

  it('Genesis failure sends an ACTION NEEDED notice and does not throw; patient not told it shipped', async () => {
    h.sendOrder.mockRejectedValue(new Error('boom'));
    await expect(handleRefillInvoice(deps(), 'invoice.paid', invoice())).resolves.toBeUndefined();
    const mail = JSON.parse(Buffer.from(lambdaSend.mock.calls[0][0].input.Payload).toString());
    expect(mail.subject).toMatch(/^\[ACTION NEEDED\]/);
    expect(h.shipped).not.toHaveBeenCalled();
  });

  it('email failures do not undo or throw after the Genesis send', async () => {
    h.shipped.mockRejectedValue(new Error('smtp')); h.notice.mockRejectedValue(new Error('smtp'));
    await expect(handleRefillInvoice(deps(), 'invoice.paid', invoice())).resolves.toBeUndefined();
    expect(h.stamp).toHaveBeenCalled();
  });

  it('a failure before the slot is claimed rolls back the Orders row so the retry can ship', async () => {
    h.claim.mockRejectedValueOnce(new Error('ddb down'));
    await expect(handleRefillInvoice(deps(), 'invoice.paid', invoice())).rejects.toThrow('ddb down');
    expect(orders.has('in_1')).toBe(false); // rolled back (delete command observed below)
  });
});

describe('invoice.payment_failed', () => {
  it('later retry attempts send nothing (first failure already emailed)', async () => {
    await handleRefillInvoice(deps(), 'invoice.payment_failed', invoice({ amount_paid: 0, attempt_count: 2 }));
    expect(h.failed).not.toHaveBeenCalled();
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it('emails the patient the hosted invoice url and tells TJ; nothing else', async () => {
    await handleRefillInvoice(deps(), 'invoice.payment_failed', invoice({ amount_paid: 0 }));
    expect(h.failed).toHaveBeenCalledWith({ to: 'p@example.com', firstName: 'Paul', hostedInvoiceUrl: 'https://pay.example/in_1' });
    expect(lambdaSend).toHaveBeenCalledTimes(1);
    expect(h.sendOrder).not.toHaveBeenCalled();
    expect(orders.size).toBe(0);
  });
});

describe('checkout.session.completed (kind refill)', () => {
  const session = (o: any = {}) => ({ id: 'cs_9', mode: 'payment', payment_status: 'paid', amount_total: 65000, currency: 'usd', customer: 'cus_1',
    payment_intent: 'pi_9', customer_details: { email: 'p@example.com' }, metadata: { ...meta, mode: 'one' }, ...o });

  it('one box: fulfils with orderId = session id', async () => {
    await handleRefillSession(deps(), session());
    expect(puts.find((p) => p.table === 'Orders')!.item.orderId).toBe('cs_9');
    expect(puts.find((p) => p.table === 'PatientRecords')!.item.sk).toBe('encounter#pp-rf-cs_9');
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
    expect(subsUpdate).not.toHaveBeenCalled();
    await handleRefillSession(deps(), session());
    expect(h.sendOrder).toHaveBeenCalledTimes(1);
  });

  it('one box: records the shipment on the parent with reminders on; auto-ship invoice records with reminders off', async () => {
    await handleRefillSession(deps(), session());
    expect(h.record).toHaveBeenCalledWith('c1', 'pp-cs_1', expect.any(Date), true);
    h.record.mockClear();
    await handleRefillInvoice(deps(), 'invoice.paid', invoice());
    expect(h.record).toHaveBeenCalledWith('c1', 'pp-cs_1', expect.any(Date), false);
  });

  it('a failed record-shipment never blocks the shipped email', async () => {
    h.record.mockRejectedValue(new Error('x'));
    await handleRefillSession(deps(), session());
    expect(h.shipped).toHaveBeenCalledTimes(1);
  });

  it('unpaid one-box session does nothing', async () => {
    await handleRefillSession(deps(), session({ payment_status: 'unpaid' }));
    expect(orders.size).toBe(0);
    expect(h.sendOrder).not.toHaveBeenCalled();
  });

  it('subscription mode: upserts Contact + stores subscription, writes NO Orders row, ships nothing', async () => {
    await handleRefillSession(deps(), session({ mode: 'subscription', subscription: 'sub_1', metadata: { ...meta } }));
    expect(h.upsert).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ email: 'p@example.com', stripeCustomerId: 'cus_1' }));
    expect(h.upsert.mock.calls[0][1].amountUSD).toBeUndefined();
    expect(h.setFields).toHaveBeenCalledWith('c1', 'pp-cs_1', { mode: 'auto', subscriptionId: 'sub_1' });
    expect(puts.find((p) => p.table === 'Orders')).toBeUndefined();
    expect(h.sendOrder).not.toHaveBeenCalled();
  });
});
