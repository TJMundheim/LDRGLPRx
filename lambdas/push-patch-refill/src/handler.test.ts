import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({ value: null as any }));
const sent = vi.hoisted(() => ({ create: vi.fn(), change: vi.fn(), setShip: vi.fn() }));
vi.mock('@my4mlife/push-patch-decision-core', () => ({
  getRefillAuth: async () => (auth.value ? { auth: auth.value, encounter: { shipTo: { name: 'Paul Secret', line1: '123 Hidden Rd', city: 'Austin', state: 'TX', postalCode: '78701' } } } : null),
  setRefillShipTo: sent.setShip,
  sendRefillChangeReported: sent.change,
  blendFor: (s: string) => ({ name: s === 'push-patch-wolverine' ? 'Wolverine' : s, formula: '' }),
}));
vi.mock('@my4mlife/push-patch-checkout', () => ({
  refillPriceId: (sku: string) => `price_refill_${sku}`,
  pushPatchEntry: (sku: string) => ({ priceId: `price_one_${sku}` }),
}));
vi.mock('./contact', () => ({ loadContact: async () => ({ email: 'p@example.com', firstName: 'Paul' }) }));
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: async () => ({ prices: { retrieve: async () => ({ unit_amount: 65000 }) }, checkout: { sessions: { create: sent.create } } }),
}));
vi.mock('./sig', async (orig) => ({ ...(await orig<typeof import('./sig')>()), hmacKey: async () => 'k' }));

import { handler } from './handler';
import { sign } from './sig';

const future = Math.floor(Date.now() / 1000) + 3600;
const link = (exp = future) => ({ c: 'c1', e: 'pp-1', exp: String(exp), sig: sign({ c: 'c1', e: 'pp-1', exp }, 'k') });
const get = (q: Record<string, string>) => handler({ queryStringParameters: q, requestContext: { http: { method: 'GET' } } });
const post = (f: Record<string, string>) => handler({ body: new URLSearchParams(f).toString(), requestContext: { http: { method: 'POST' } } });
const active = () => ({ status: 'active', sku: 'push-patch-wolverine', refillsAuthorized: 8, refillsUsed: 0, expiresAt: '2999-01-01T00:00:00Z', mode: 'on-demand', partnerRef: 'GLOW' });

beforeEach(() => { auth.value = active(); sent.create.mockReset(); sent.change.mockReset(); sent.setShip.mockReset(); process.env.STRIPE_MODE = 'test'; });

describe('GET', () => {
  it('403 friendly page for a bad signature', async () => {
    const r = await get({ ...link(), sig: 'ab'.repeat(32) });
    expect(r.statusCode).toBe(403);
    expect(r.body).toContain('This link has expired');
  });
  it('403 when expired', async () => {
    expect((await get(link(10))).statusCode).toBe(403);
  });
  it('friendly page when no auth / exhausted', async () => {
    auth.value = null;
    expect((await get(link())).body).toContain('not available');
    auth.value = { ...active(), refillsUsed: 8 };
    expect((await get(link())).body).toContain('not available');
  });
  it('renders the choice page and takes no action', async () => {
    const r = await get(link());
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('Wolverine');
    expect(r.body).toContain('$650 per box');
    expect(r.body).toContain('Auto-ship every 6 weeks (recommended)');
    expect(r.body).not.toContain('p@example.com');
    expect(sent.create).not.toHaveBeenCalled();
  });
  it('asks the shipping-address question; shows city/state only, never street/zip/name', async () => {
    const b = (await get(link())).body;
    expect(b).toContain('Has your shipping address changed since your last order?');
    expect(b).toContain('the address on your last order in Austin, TX');
    for (const s of ['123 Hidden Rd', '78701', 'Paul Secret']) expect(b).not.toContain(s);
    for (const n of ['a_name', 'a_line1', 'a_line2', 'a_city', 'a_state', 'a_zip']) expect(b).toContain(`name="${n}"`);
    expect(b).toContain('Apt/suite (optional)');
    expect(b).toContain('Only fill this in if your address changed');
    expect(b).toContain('name="change"');
  });
  it('done pages need no signature', async () => {
    expect((await get({ done: '1' })).body).toContain('Thank you');
  });
});

const ADDR = { addr: 'yes', a_name: 'Paul M', a_line1: '9 New St', a_line2: '', a_city: 'Dallas', a_state: 'TX', a_zip: '75001' };
describe('POST address', () => {
  beforeEach(() => sent.create.mockResolvedValue({ url: 'https://checkout.stripe.com/z' }));
  it('valid new address is persisted before the checkout is created', async () => {
    const order: string[] = [];
    sent.setShip.mockImplementation(async () => { order.push('set'); });
    sent.create.mockImplementation(async () => { order.push('create'); return { url: 'https://checkout.stripe.com/z' }; });
    const r = await post({ ...link(), mode: 'one', change: 'no', ...ADDR, a_zip: '75001-1234' });
    expect(r.statusCode).toBe(303);
    expect(order).toEqual(['set', 'create']);
    expect(sent.setShip).toHaveBeenCalledWith('c1', 'pp-1', { name: 'Paul M', line1: '9 New St', line2: '', city: 'Dallas', state: 'TX', postalCode: '75001-1234' });
  });
  it('invalid address re-renders 400, keeps answers, no checkout, no write', async () => {
    for (const bad of [{ a_zip: '7500' }, { a_state: 'ZZ' }, { a_line1: '  ' }, { a_city: '' }, { a_name: 'x'.repeat(101) }]) {
      const r = await post({ ...link(), mode: 'one', change: 'no', ...ADDR, ...bad });
      expect(r.statusCode).toBe(400);
      expect(r.body).toContain('Please check your shipping address');
      expect(r.body).toContain('name="a_line1"');
      if (!('a_city' in bad)) expect(r.body).toContain('value="Dallas"'); // answers kept
    }
    expect(sent.create).not.toHaveBeenCalled();
    expect(sent.setShip).not.toHaveBeenCalled();
  });
  it('missing address answer re-renders 400', async () => {
    const r = await post({ ...link(), mode: 'one', change: 'no' });
    expect(r.statusCode).toBe(400);
    expect(r.body).toContain('Please tell us whether your shipping address has changed');
    expect(sent.create).not.toHaveBeenCalled();
  });
  it('addr=no writes nothing', async () => {
    await post({ ...link(), mode: 'one', change: 'no', addr: 'no' });
    expect(sent.setShip).not.toHaveBeenCalled();
    expect(sent.create).toHaveBeenCalled();
  });
  it('health change=yes ignores the address entirely', async () => {
    await post({ ...link(), mode: 'one', change: 'yes', ...ADDR });
    expect(sent.change).toHaveBeenCalled();
    expect(sent.setShip).not.toHaveBeenCalled();
    expect(sent.create).not.toHaveBeenCalled();
  });
  it('logs carry no address text', async () => {
    const spy = vi.spyOn(console, 'log'); const err = vi.spyOn(console, 'error');
    await post({ ...link(), mode: 'one', change: 'no', ...ADDR });
    await post({ ...link(), mode: 'one', change: 'no', ...ADDR, a_zip: 'bad' });
    expect(JSON.stringify([...spy.mock.calls, ...err.mock.calls])).not.toMatch(/New St|75001|Dallas|Paul M/);
  });
});

describe('POST', () => {
  it('rejects a bad signature', async () => {
    expect((await post({ ...link(), sig: '00', mode: 'auto', change: 'no', addr: 'no' })).statusCode).toBe(403);
  });
  it('change=yes emails TJ and creates no checkout', async () => {
    const r = await post({ ...link(), mode: 'auto', change: 'yes' });
    expect(sent.change).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1' });
    expect(sent.create).not.toHaveBeenCalled();
    expect(r.body).toContain('care coordinator will reach out');
  });
  it('auto + no creates a subscription checkout and 303s', async () => {
    sent.create.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    const l = link();
    const r = await post({ ...l, mode: 'auto', change: 'no', addr: 'no' });
    expect(r.statusCode).toBe(303);
    expect(r.headers.location).toBe('https://checkout.stripe.com/x');
    const [params, opts] = sent.create.mock.calls[0];
    expect(params.mode).toBe('subscription');
    expect(params.customer_email).toBe('p@example.com');
    expect(params.subscription_data.metadata).toEqual(params.metadata);
    expect(params.metadata).toMatchObject({ kind: 'push-patch-refill', contactId: 'c1', encounterId: 'pp-1', skuIds: 'push-patch-wolverine', partnerRef: 'GLOW', changeAnswer: 'no', mode: 'auto' });
    expect(params.shipping_address_collection).toBeUndefined();
    expect(opts.idempotencyKey).toContain('pp-1');
  });
  it('one + no creates a payment checkout with a customer and receipt email', async () => {
    sent.create.mockResolvedValue({ url: 'https://checkout.stripe.com/y' });
    await post({ ...link(), mode: 'one', change: 'no', addr: 'no' });
    const [params] = sent.create.mock.calls[0];
    expect(params.mode).toBe('payment');
    expect(params.customer_creation).toBe('always');
    expect(params.payment_intent_data.receipt_email).toBe('p@example.com');
    expect(params.metadata.mode).toBe('one');
  });
  it('rejects missing answers', async () => {
    expect((await post({ ...link(), mode: 'auto' })).statusCode).toBe(400);
    expect(sent.create).not.toHaveBeenCalled();
  });
  it('already auto-shipping: auto choice refused', async () => {
    auth.value = { ...active(), mode: 'auto', subscriptionId: 'sub_1' };
    expect((await post({ ...link(), mode: 'auto', change: 'no', addr: 'no' })).statusCode).toBe(400);
  });
});
