import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({ value: null as any, enc: undefined as any, rxMissing: [] as string[] }));
const sent = vi.hoisted(() => ({ create: vi.fn(), change: vi.fn(), setShip: vi.fn() }));
vi.mock('@my4mlife/push-patch-decision-core', () => ({
  getRefillAuth: async () => (auth.value ? { auth: auth.value, encounter: auth.enc ?? { shipTo: { name: 'Paul Secret', line1: '123 Hidden Rd', city: 'Austin', state: 'TX', postalCode: '78701' } } } : null),
  rxProduct: (id?: string) => (id === 'gut-brain-rx' ? { name: 'Gut-Brain Rx', intervalDays: 30, fulfillment: 'manual' } : undefined),
  setRefillShipTo: sent.setShip,
  sendRefillChangeReported: sent.change,
  blendFor: (s: string) => ({ name: s === 'push-patch-wolverine' ? 'Wolverine' : s, formula: '' }),
}));
vi.mock('@my4mlife/push-patch-checkout', () => ({
  refillPriceId: (sku: string) => `price_refill_${sku}`,
  pushPatchEntry: (sku: string) => ({ priceId: `price_one_${sku}` }),
  rxRefillPriceId: (p: string, k: string) => (auth.rxMissing.includes(k) ? undefined : `price_rx_${p}_${k}`),
}));
vi.mock('./contact', () => ({ loadContact: async () => ({ email: 'p@example.com', firstName: 'Paul' }) }));
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: async () => ({ prices: { retrieve: async (id: string) => ({ unit_amount: id.startsWith('price_rx_') ? 12500 : 65000 }) }, checkout: { sessions: { create: sent.create } } }),
}));
vi.mock('./sig', async (orig) => ({ ...(await orig<typeof import('./sig')>()), hmacKey: async () => 'k' }));

import { handler } from './handler';
import { sign } from './sig';

const future = Math.floor(Date.now() / 1000) + 3600;
const link = (exp = future) => ({ c: 'c1', e: 'pp-1', exp: String(exp), sig: sign({ c: 'c1', e: 'pp-1', exp }, 'k') });
const get = (q: Record<string, string>) => handler({ queryStringParameters: q, requestContext: { http: { method: 'GET' } } });
const post = (f: Record<string, string>) => handler({ body: new URLSearchParams(f).toString(), requestContext: { http: { method: 'POST' } } });
const active = () => ({ status: 'active', sku: 'push-patch-wolverine', refillsAuthorized: 8, refillsUsed: 0, expiresAt: '2999-01-01T00:00:00Z', mode: 'on-demand', partnerRef: 'GLOW' });

beforeEach(() => { auth.value = active(); sent.create.mockReset(); sent.change.mockReset(); sent.setShip.mockReset(); auth.enc = undefined; auth.rxMissing = []; process.env.STRIPE_MODE = 'test'; });

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


describe('manual Rx product (Gut-Brain Rx)', () => {
  const rx = (o: any = {}) => ({ status: 'active', sku: 'gut-brain-rx', product: 'gut-brain-rx', fulfillment: 'manual', intervalDays: 30, refillsAuthorized: 2, refillsUsed: 0, expiresAt: '2999-01-01T00:00:00Z', mode: 'on-demand', ...o });
  const NOSHIP = { lane: 'leaky-gut', state: 'fulfilled' };
  beforeEach(() => { auth.value = rx(); sent.create.mockResolvedValue({ url: 'https://checkout.stripe.com/rx' }); });

  it('page shows product name, $125 and 30-day copy; nothing Push Patch', async () => {
    const b = (await get(link())).body;
    expect(b).toContain('Gut-Brain Rx');
    expect(b).toContain('$125 every 30 days');
    expect(b).toContain('Auto-ship every 30 days (recommended)');
    expect(b).toContain('Just one fill');
    expect(b).not.toMatch(/Push Patch|6 weeks|six-patch|one box|next box/i);
    expect(b).toContain('Has your shipping address changed'); // parent has a shipTo
    expect(b).not.toMatch(/bpc|glutamine|aloe/i);
  });
  it('no shipTo anywhere: address is required, no "same address" choice, asks where to ship', async () => {
    auth.enc = NOSHIP;
    const b = (await get(link())).body;
    expect(b).toContain('Where should we ship it?');
    expect(b).not.toContain('name="addr"');
    expect(b).not.toMatch(/same address|Has your shipping address changed/);
    for (const n of ['a_name', 'a_line1', 'a_city', 'a_state', 'a_zip']) expect(b).toContain(`name="${n}"`);
    expect(b).not.toContain('Only fill this in if your address changed');
  });
  it('refillAuth.shipTo present (parent has none): normal address question', async () => {
    auth.enc = NOSHIP; auth.value = rx({ shipTo: { name: 'B S', line1: '1 A', line2: '', city: 'Austin', state: 'TX', postalCode: '78701' } });
    expect((await get(link())).body).toContain('Has your shipping address changed');
  });
  it('POST without shipTo and without an address: 400, no checkout', async () => {
    auth.enc = NOSHIP;
    const r = await post({ ...link(), mode: 'one', change: 'no' });
    expect(r.statusCode).toBe(400);
    expect(r.body).toContain('Please check your shipping address');
    expect(sent.create).not.toHaveBeenCalled();
  });
  it('POST without shipTo and a valid address: saves it, then creates the checkout', async () => {
    auth.enc = NOSHIP;
    const r = await post({ ...link(), mode: 'one', change: 'no', a_name: 'Bryan S', a_line1: '1 A St', a_line2: '', a_city: 'Austin', a_state: 'TX', a_zip: '78701' });
    expect(r.statusCode).toBe(303);
    expect(sent.setShip).toHaveBeenCalledWith('c1', 'pp-1', { name: 'Bryan S', line1: '1 A St', line2: '', city: 'Austin', state: 'TX', postalCode: '78701' });
  });
  it('auto checkout uses the recurring rx price; metadata keeps the refill kind plus fulfillment + product', async () => {
    await post({ ...link(), mode: 'auto', change: 'no', addr: 'no' });
    const [params] = sent.create.mock.calls[0];
    expect(params.mode).toBe('subscription');
    expect(params.line_items).toEqual([{ price: 'price_rx_gut-brain-rx_recurring', quantity: 1 }]);
    expect(params.metadata).toMatchObject({ kind: 'push-patch-refill', fulfillment: 'manual', product: 'gut-brain-rx', skuIds: 'gut-brain-rx', mode: 'auto' });
    expect(params.subscription_data.metadata).toEqual(params.metadata);
  });
  it('one-fill checkout uses the once rx price', async () => {
    await post({ ...link(), mode: 'one', change: 'no', addr: 'no' });
    const [params] = sent.create.mock.calls[0];
    expect(params.mode).toBe('payment');
    expect(params.line_items[0].price).toBe('price_rx_gut-brain-rx_once');
  });
  it('unknown product on a manual auth: not available, no checkout', async () => {
    auth.value = rx({ product: 'nope' });
    expect((await get(link())).body).toContain('not available');
    expect((await post({ ...link(), mode: 'one', change: 'no', addr: 'no' })).body).toContain('not available');
    expect(sent.create).not.toHaveBeenCalled();
  });
  it('Push Patch checkout metadata has no fulfillment/product keys', async () => {
    auth.value = active();
    await post({ ...link(), mode: 'auto', change: 'no', addr: 'no' });
    const c = sent.create.mock.calls[0][0];
    expect('fulfillment' in c.metadata).toBe(false); expect('product' in c.metadata).toBe(false);
    expect(c.success_url).toMatch(/\?done=1$/);
  });
  it('rx checkout success page says "preparing", not "box ships"', async () => {
    await post({ ...link(), mode: 'one', change: 'no', addr: 'no' });
    expect(sent.create.mock.calls[0][0].success_url).toMatch(/\?done=1&rx=1$/);
    const b = (await get({ done: '1', rx: '1' })).body;
    expect(b).toContain('preparing your refill');
    expect(b).not.toMatch(/box ships/);
    expect((await get({ done: '1' })).body).toContain('We will email you when your box ships.');
  });
  for (const missing of [['once', 'recurring'], ['recurring'], ['once']]) {
    it(`rx price ids missing (${missing.join('+')}, e.g. live catalog empty): friendly 200 page on GET and POST, no checkout`, async () => {
      auth.rxMissing = missing;
      const g = await get(link());
      expect(g.statusCode).toBe(200); expect(g.body).toContain('not available');
      const r = await post({ ...link(), mode: 'one', change: 'no', addr: 'no' });
      expect(r.statusCode).toBe(200); expect(r.body).toContain('not available');
      expect(sent.create).not.toHaveBeenCalled(); expect(sent.setShip).not.toHaveBeenCalled();
    });
  }
  it('rx on auto-ship already (no auto option): only the once price is needed', async () => {
    auth.value = rx({ mode: 'auto', subscriptionId: 'sub_1' }); auth.rxMissing = ['recurring'];
    const r = await post({ ...link(), mode: 'one', change: 'no', addr: 'no' });
    expect(r.statusCode).toBe(303);
  });
});
