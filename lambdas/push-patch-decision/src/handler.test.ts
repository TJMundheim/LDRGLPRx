// push-patch-decision — /api/push-patch-decision, two-step:
//   GET ?t=<token>  → confirm page only, NO side effects (email link scanners prefetch GETs)
//   POST t=<token>  → performs the decision (form-urlencoded body from the confirm page)
//
// Physician Approve / Decline for a Push Patch async visit.
//
// TOKEN FORMAT (encoded independently below so the tests pin the contract):
//   base64url( `${contactId}.${encounterId}.${action}.${hmacSha256Hex}` )
//   hmac = HMAC-SHA256(secret, `${contactId}.${encounterId}.${action}`), action in {approve, decline}
//   secret = SSM SecureString `push-patch-decision-hmac-key`
// contactId is part of the signed payload because PatientRecords is keyed by
// contactId (PK) + `encounter#<encounterId>` (SK).

import { createHmac } from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── AWS / Stripe mocks — declared before the module under test is imported ────

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSendMock(...a) }) },
  GetCommand: class GetCommand { __t = 'Get'; input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { __t = 'Put'; input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { __t = 'Update'; input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class LambdaClient { constructor(_: any) {} send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class InvokeCommand { input: any; constructor(input: any) { this.input = input; } },
}));

const ssmSendMock = vi.fn();
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: class SSMClient { constructor(_: any) {} send = (...a: any[]) => ssmSendMock(...a); },
  GetParameterCommand: class GetParameterCommand { input: any; constructor(input: any) { this.input = input; } },
}));

const refundsCreate = vi.fn(); // never expected to be called: decline no longer touches Stripe
const sessionsRetrieve = vi.fn();
const getStripeClientMock = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: (...a: any[]) => getStripeClientMock(...a),
}));
const stripeStub = () => ({
    refunds: { create: (...a: any[]) => refundsCreate(...a) },
    checkout: { sessions: { retrieve: (...a: any[]) => sessionsRetrieve(...a) } },
  });

import { PDFDocument } from 'pdf-lib';
import { handler } from './handler';
import { resetPracticeCache } from '@my4mlife/push-patch-decision-core';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SECRET = 'test-hmac-secret';
const CONTACT = 'contact-abc';
const ENC = 'pp-cs_test_123';
const SESSION = 'cs_test_123';
const PI = 'pi_test_456';
const GENESIS = 'orders@genesis.test';
const TJ = 'drtj@my4mlife.com';
const PRACTICE = {
  clinician: 'Dr. Test Clinician', practice: 'Test Practice', practice_phone: '555-0100', payment_email: 'pay@example.com',
  billing: '1 Billing St\nAustin, TX 78701', placer: 'Placer Person', placer_phone: '555-0101', salesrep: 'Rep One',
};
let practiceParam: any = JSON.stringify(PRACTICE);

function tokenFor(action: string, opts: { contactId?: string; encounterId?: string; secret?: string } = {}): string {
  const payload = `${opts.contactId ?? CONTACT}.${opts.encounterId ?? ENC}.${action}`;
  const sig = createHmac('sha256', opts.secret ?? SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

// Default: the confirm page's form POST (the only request that acts).
const evt = (t?: string) => ({
  requestContext: { http: { method: 'POST' } },
  queryStringParameters: t === undefined ? {} : { t },
  body: t === undefined ? '' : `t=${encodeURIComponent(t)}`,
});
const getEvt = (t?: string) => ({ requestContext: { http: { method: 'GET' } }, queryStringParameters: t === undefined ? {} : { t } });

const RECORD = {
  contactId: CONTACT,
  sk: 'record',
  demographics: {
    firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
    phone: '+15125550123', dob: '1980-04-02',
  },
};

const encounter = (state = 'sent-to-provider') => ({
  contactId: CONTACT,
  sk: `encounter#${ENC}`,
  lane: 'push-patch',
  sku: 'push-patch-bpc-nad-ghk',
  sessionId: SESSION,
  paymentIntentId: PI,
  state,
});

const STRIPE_SESSION = {
  id: SESSION,
  payment_intent: PI,
  shipping_details: {
    name: 'Jane Doe',
    address: { line1: '12 Ranch Rd', line2: null, city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' },
  },
};

function seedDdb(state = 'sent-to-provider', opts: { updateRejects?: boolean } = {}) {
  ddbSendMock.mockImplementation(async (cmd: any) => {
    if (cmd.__t === 'Get') {
      if (cmd.input.Key.sk === 'record') return { Item: RECORD };
      if (cmd.input.Key.sk === `encounter#${ENC}`) return { Item: encounter(state) };
      return {};
    }
    if (cmd.__t === 'Update' && opts.updateRejects) {
      throw Object.assign(new Error('The conditional request failed'), { name: 'ConditionalCheckFailedException' });
    }
    return {};
  });
}

const updates = () => ddbSendMock.mock.calls.map((c) => c[0]).filter((c) => c.__t === 'Update').map((c) => c.input);
const emails = (): any[] => lambdaSendMock.mock.calls.map((c) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));
const flat = (v: unknown) => JSON.stringify(v);
const body = (r: any) => String(r.body);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GENESIS_ORDER_EMAIL = GENESIS;
  practiceParam = JSON.stringify(PRACTICE);
  resetPracticeCache();
  ssmSendMock.mockImplementation(async (cmd: any) => {
    if (cmd.input.Name === 'push-patch-decision-hmac-key') return { Parameter: { Value: SECRET } };
    if (cmd.input.Name === '/my4mlife/genesis/practice') {
      if (practiceParam === null) throw Object.assign(new Error('nf'), { name: 'ParameterNotFound' });
      return { Parameter: { Value: practiceParam } };
    }
    throw new Error(`unexpected SSM param ${cmd.input.Name}`);
  });
  lambdaSendMock.mockResolvedValue({ StatusCode: 200 });
  getStripeClientMock.mockImplementation(async () => stripeStub());
  delete process.env.AUTO_REFUND_ON_DECLINE;
  sessionsRetrieve.mockResolvedValue(STRIPE_SESSION);
  seedDdb();
});

// ── Invalid token ─────────────────────────────────────────────────────────────

describe('invalid token', () => {
  const noSideEffects = () => {
    expect(updates()).toHaveLength(0);
    expect(lambdaSendMock).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
  };

  it.each([
    ['missing t', undefined],
    ['garbage', 'not-a-token'],
    ['wrong secret', tokenFor('approve', { secret: 'attacker-secret' })],
    ['unknown action', tokenFor('refund')],
  ])('%s → 403 HTML, no side effects', async (_name, t) => {
    const res: any = await handler(evt(t as string | undefined));
    expect(res.statusCode).toBe(403);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(body(res)).toMatch(/<html/i);
    noSideEffects();
  });

  it('approve signature replayed as decline → 403', async () => {
    const decoded = Buffer.from(tokenFor('approve'), 'base64url').toString();
    const forged = Buffer.from(decoded.replace('.approve.', '.decline.')).toString('base64url');
    const res: any = await handler(evt(forged));
    expect(res.statusCode).toBe(403);
    noSideEffects();
  });

  it('tampered encounter id → 403', async () => {
    const decoded = Buffer.from(tokenFor('approve'), 'base64url').toString();
    const forged = Buffer.from(decoded.replace(ENC, 'pp-cs_test_other')).toString('base64url');
    const res: any = await handler(evt(forged));
    expect(res.statusCode).toBe(403);
    noSideEffects();
  });
});

// ── Approve ───────────────────────────────────────────────────────────────────

describe('approve', () => {
  it('conditionally moves the encounter sent-to-provider → script-written (existing state), then returns confirmation HTML', async () => {
    const res: any = await handler(evt(tokenFor('approve')));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(body(res)).toMatch(/approved/i);

    const u = updates();
    expect(u).toHaveLength(2); // [0] = state claim, [1] = genesisOrderSentAt stamp
    expect(u[0].Key).toEqual({ contactId: CONTACT, sk: `encounter#${ENC}` });
    // conditional: only from 'sent-to-provider'
    expect(u[0].ConditionExpression).toMatch(/state/);
    const vals = Object.values(u[0].ExpressionAttributeValues ?? {});
    expect(vals).toContain('sent-to-provider');
    expect(vals).toContain('script-written');
  });

  it("records decidedBy 'physician-link' on approve and on decline", async () => {
    await handler(evt(tokenFor('approve')));
    expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':decidedBy': 'physician-link' });
    expect(updates()[0].UpdateExpression).toMatch(/decidedBy = :decidedBy/);
    vi.clearAllMocks(); seedDdb();
    await handler(evt(tokenFor('decline')));
    expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':decidedBy': 'physician-link', ':to': 'declined' });
  });

  it('sends the patient a welcome email from the info alias', async () => {
    await handler(evt(tokenFor('approve')));
    const welcome = emails().find((e) => e.to === 'jane@example.com');
    expect(welcome).toBeDefined();
    expect(welcome.kind).toBe('info');
    expect(welcome.from).toBe('support');
    expect(welcome.subject).toBe('Welcome — your Push Patch is approved');
    // customer copy never names the fulfillment partner
    expect(flat(welcome)).not.toMatch(/genesis/i);
  });

  it('internal Genesis order email is NOT sent from support', async () => {
    await handler(evt(tokenFor('approve')));
    expect(emails().find((e) => e.to === GENESIS).from).toBeUndefined();
  });

  it('welcome email carries the shipping-time copy', async () => {
    await handler(evt(tokenFor('approve')));
    const welcome = emails().find((e) => e.to === 'jane@example.com');
    expect(welcome.text).toContain('Your kit is prepared within 1–3 business days and ships by ground; delivery typically takes 3–5 business days after it ships.');
    expect(welcome.text).not.toMatch(/TJ CONFIRM|Expect it in/);
  });

  it('emails Genesis the filled order form PDF: to GENESIS_ORDER_EMAIL, cc TJ, "encrypt" subject, named attachment, sync invoke', async () => {
    await handler(evt(tokenFor('approve')));
    const order = emails().find((e) => e.to === GENESIS);
    expect(order).toBeDefined();
    expect(order.kind).toBe('info');
    expect(order.cc).toBe(TJ);
    expect(order.subject).toBe('encrypt — Push Patch order — Repair — Doe');
    const text = String(order.text);
    expect(text).toContain('Repair');
    expect(text).toMatch(/quantity:? 1/i);
    expect(text).toContain('Jane Doe');
    expect(text).toMatch(/attached/i);
    expect(order.attachments).toHaveLength(1);
    const att = order.attachments[0];
    expect(att).toMatchObject({ filename: `My4MLife-PushPatch-${SESSION}.pdf`, contentType: 'application/pdf' });
    const form = (await PDFDocument.load(Buffer.from(att.contentBase64, 'base64'))).getForm();
    expect(form.getTextField('qty_push4').getText()).toBe('1');
    expect(form.getTextField('clinician').getText()).toBe('Dr. Test Clinician');
    expect(form.getTextField('email').getText()).toBe('pay@example.com');
    expect(form.getTextField('shipping').getText()).toBe('Jane Doe\n12 Ranch Rd\nAustin, TX 78701\nPhone: +15125550123');
    expect(form.getTextField('rpa_notes1').getText()).toBe(`My4MLife order ${SESSION} · 12-hour`);
    // RequestResponse: the ~1.2 MB base64 payload is over the 256 KB async limit
    const invokes = lambdaSendMock.mock.calls.map((c) => c[0].input);
    expect(invokes.every((i) => i.InvocationType === 'RequestResponse')).toBe(true);
    expect(sessionsRetrieve).toHaveBeenCalledWith(SESSION, expect.anything());
  });

  it('uses the patient-confirmed encounter.shipTo (not the Stripe address) for the PDF and the order email', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.__t === 'Get') {
        return { Item: cmd.input.Key.sk === 'record' ? RECORD : {
          ...encounter(),
          shipTo: { name: 'Janet Doe-Smith', line1: '99 New Ave', line2: 'Unit 7', city: 'Dallas', state: 'TX', postalCode: '75201' },
        } };
      }
      return {};
    });
    await handler(evt(tokenFor('approve')));
    const order = emails().find((e) => e.to === GENESIS);
    const form = (await PDFDocument.load(Buffer.from(order.attachments[0].contentBase64, 'base64'))).getForm();
    expect(form.getTextField('shipping').getText()).toBe('Janet Doe-Smith\n99 New Ave Unit 7\nDallas, TX 75201\nPhone: +15125550123');
    expect(order.text).toContain('Ship to: Janet Doe-Smith');
    expect(flat(order)).not.toContain('Ranch Rd');
  });

  it('shipTo without a name falls back to the patient name; partial shipTo still wins over Stripe', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.__t === 'Get') {
        return { Item: cmd.input.Key.sk === 'record' ? RECORD : { ...encounter(), shipTo: { line1: '5 Elm St', city: 'Waco', state: 'TX', postalCode: '76701' } } };
      }
      return {};
    });
    await handler(evt(tokenFor('approve')));
    const order = emails().find((e) => e.to === GENESIS);
    const form = (await PDFDocument.load(Buffer.from(order.attachments[0].contentBase64, 'base64'))).getForm();
    expect(form.getTextField('shipping').getText()).toBe('Jane Doe\n5 Elm St\nWaco, TX 76701\nPhone: +15125550123');
  });

  it('defaults the Genesis recipient to orders@novobioalliance.com; no duplicate cc when TJ is the recipient', async () => {
    delete process.env.GENESIS_ORDER_EMAIL;
    await handler(evt(tokenFor('approve')));
    expect(emails().find((e) => e.attachments).to).toBe('orders@novobioalliance.com');
    process.env.GENESIS_ORDER_EMAIL = TJ;
    lambdaSendMock.mockClear();
    seedDdb();
    await handler(evt(tokenFor('approve')));
    const o = emails().find((e) => e.attachments);
    expect(o.to).toBe(TJ);
    expect(o.cc).toBeUndefined();
  });

  it.each([
    ['parameter missing', null],
    ['required key empty', JSON.stringify({ ...PRACTICE, billing: '' })],
    ['invalid JSON', 'oops'],
  ])('practice config incomplete (%s) → NOT sent to Genesis; filled-so-far PDF goes to TJ only; page still says approved; welcome still sent', async (_n, value) => {
    practiceParam = value;
    const res: any = await handler(evt(tokenFor('approve')));
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatch(/approved/i);
    const sent = emails();
    expect(sent.find((e) => e.to === GENESIS)).toBeUndefined();
    expect(sent.find((e) => e.to === 'jane@example.com')).toBeDefined();
    const alert = sent.find((e) => e.attachments);
    expect(alert.to).toBe(TJ);
    expect(alert.cc).toBeUndefined();
    expect(alert.subject).toBe(`[ACTION NEEDED] Genesis practice info missing — Push Patch order ${SESSION}`);
    expect(alert.attachments[0].filename).toBe(`My4MLife-PushPatch-${SESSION}.pdf`);
    const form = (await PDFDocument.load(Buffer.from(alert.attachments[0].contentBase64, 'base64'))).getForm();
    expect(form.getTextField('qty_push4').getText()).toBe('1');
    expect(form.getTextField('shipping').getText()).toContain('Jane Doe');
    expect(sent).toHaveLength(2);
  });

  it('unrecognized blend sku → not sent to Genesis; TJ is alerted', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? RECORD : { ...encounter(), sku: 'push-patch-mystery' } };
      return {};
    });
    const res: any = await handler(evt(tokenFor('approve')));
    expect(body(res)).toMatch(/approved/i);
    expect(emails().find((e) => e.to === GENESIS)).toBeUndefined();
    expect(emails().find((e) => e.attachments).to).toBe(TJ);
  });

  it('a failed Genesis send is reported on the confirmation page (mail-failed variant), state stays approved', async () => {
    lambdaSendMock.mockImplementation(async (c: any) => {
      const p = JSON.parse(Buffer.from(c.input.Payload).toString());
      return p.attachments ? { FunctionError: 'Unhandled' } : { StatusCode: 200 };
    });
    const res: any = await handler(evt(tokenFor('approve')));
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatch(/email failed/i);
    expect(updates()).toHaveLength(1); // state claim only: no genesisOrderSentAt when the order send failed
    expect(flat(updates())).not.toContain('genesisOrderSentAt');
  });

  it('stamps genesisOrderSentAt + genesisOrderTo on the encounter after the Genesis order email goes out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T15:00:00Z'));
    const order: string[] = [];
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? RECORD : encounter() };
      if (cmd.__t === 'Update') order.push(cmd.input.UpdateExpression.includes('genesisOrderSentAt') ? 'stamp' : 'claim');
      return {};
    });
    lambdaSendMock.mockImplementation(async (c: any) => {
      const p = JSON.parse(Buffer.from(c.input.Payload).toString());
      order.push(p.to === GENESIS ? 'genesis-email' : 'welcome-email');
      return {};
    });
    try { await handler(evt(tokenFor('approve'))); } finally { vi.useRealTimers(); }
    expect(order.indexOf('stamp')).toBeGreaterThan(order.indexOf('genesis-email'));
    const stamp = updates().find((u) => u.UpdateExpression.includes('genesisOrderSentAt'));
    expect(stamp.Key).toEqual({ contactId: CONTACT, sk: `encounter#${ENC}` });
    expect(stamp.UpdateExpression).toMatch(/genesisOrderTo = :to/);
    expect(stamp.ExpressionAttributeValues).toMatchObject({ ':now': '2026-10-02T15:00:00.000Z', ':to': GENESIS });
  });

  it('TJ-only ACTION NEEDED send (practice config incomplete) still stamps genesisOrderSentAt, but no genesisOrderTo', async () => {
    practiceParam = null;
    await handler(evt(tokenFor('approve')));
    const stamp = updates().find((u) => u.UpdateExpression.includes('genesisOrderSentAt'));
    expect(stamp).toBeDefined();
    expect(stamp.UpdateExpression).not.toMatch(/genesisOrderTo/);
    expect(flat(stamp.ExpressionAttributeValues)).not.toContain(GENESIS);
  });

  it('decline never sets genesisOrderSentAt / genesisOrderTo', async () => {
    await handler(evt(tokenFor('decline')));
    expect(flat(updates())).not.toMatch(/genesisOrder/);
  });

  it('sends exactly two emails (welcome + order), no refund', async () => {
    await handler(evt(tokenFor('approve')));
    expect(emails()).toHaveLength(2);
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it('records the state change before any email goes out', async () => {
    const order: string[] = [];
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? RECORD : encounter() };
      if (cmd.__t === 'Update') order.push('update');
      return {};
    });
    lambdaSendMock.mockImplementation(async () => { order.push('email'); return {}; });
    await handler(evt(tokenFor('approve')));
    expect(order[0]).toBe('update');
    expect(order.filter((o) => o === 'email')).toHaveLength(2);
  });
});

// ── Decline ───────────────────────────────────────────────────────────────────

describe('decline (refund queued for admin approval, no Stripe)', () => {
  const NOW = new Date('2026-10-02T15:00:00Z'); // a Friday
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('claims declined with refundStatus pending + declinedAt + refundDueBy (10 business days), returns the queued page', async () => {
    const res: any = await handler(evt(tokenFor('decline')));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(body(res)).toMatch(/Declined/);
    expect(body(res)).toContain('A refund is queued for admin approval.');

    const u = updates();
    expect(u).toHaveLength(1);
    expect(u[0].ConditionExpression).toMatch(/#state = :from/);
    expect(u[0].ExpressionAttributeValues).toMatchObject({
      ':from': 'sent-to-provider',
      ':to': 'declined',
      ':refundStatus': 'pending',
      ':declinedAt': NOW.toISOString(),
      ':refundDueBy': '2026-10-16',
    });
    expect(u[0].UpdateExpression).toMatch(/refundStatus = :refundStatus/);
    expect(u[0].UpdateExpression).toMatch(/declinedAt = :declinedAt/);
    expect(u[0].UpdateExpression).toMatch(/refundDueBy = :refundDueBy/);
  });

  it('never calls Stripe (no client, no refund, no session retrieval)', async () => {
    await handler(evt(tokenFor('decline')));
    expect(getStripeClientMock).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });

  it('sends nothing to Genesis: one patient email only, no attachment, no genesis mention', async () => {
    await handler(evt(tokenFor('decline')));
    const sent = emails();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('jane@example.com');
    expect(sent[0].from).toBe('support');
    expect(sent.find((e) => e.to === GENESIS)).toBeUndefined();
    expect(sent.find((e) => e.attachments)).toBeUndefined();
    expect(flat(sent[0])).not.toMatch(/genesis/i);
  });

  it('patient email: not cleared, refund within 10 business days, no reason/PHI, footer tagline', async () => {
    await handler(evt(tokenFor('decline')));
    const [m] = emails();
    expect(m.kind).toBe('info');
    expect(m.text).toContain("You weren't cleared for the Push Patch.");
    expect(m.text).toContain('Your refund will be processed within 10 business days.');
    expect(m.text).toContain("Don't lose your identity and your dignity while you still have a choice.");
    expect(m.text).not.toMatch(/refunded your payment|full refund issued|\$\d/i);
    expect(m.text).not.toMatch(/answers|screening|seizure|pacemaker|pregnan/i);
  });

  it('a failed patient email still records the decision; physician page says to notify the coordinator', async () => {
    lambdaSendMock.mockRejectedValue(new Error('boom'));
    const res: any = await handler(evt(tokenFor('decline')));
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatch(/queued for admin approval/i);
    expect(body(res)).toMatch(/email failed/i);
    expect(updates()).toHaveLength(1);
  });

  it('AUTO_REFUND_ON_DECLINE unset/false → refund stays pending (default)', async () => {
    process.env.AUTO_REFUND_ON_DECLINE = 'false';
    await handler(evt(tokenFor('decline')));
    expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':refundStatus': 'pending' });
    expect(getStripeClientMock).not.toHaveBeenCalled();
  });

  it('AUTO_REFUND_ON_DECLINE=true is a stub until the shared refund function lands: still pending, still no Stripe call here', async () => {
    process.env.AUTO_REFUND_ON_DECLINE = 'true';
    const res: any = await handler(evt(tokenFor('decline')));
    expect(res.statusCode).toBe(200);
    expect(updates()[0].ExpressionAttributeValues).toMatchObject({ ':refundStatus': 'pending' });
    expect(getStripeClientMock).not.toHaveBeenCalled();
  });

  it('race: decline loses to a concurrent approve → already-decided page, no email', async () => {
    seedDdb('sent-to-provider', { updateRejects: true });
    const res: any = await handler(evt(tokenFor('decline')));
    expect(body(res)).toMatch(/already decided/i);
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });
});

// ── GET = confirm page only (link-scanner safe) ───────────────────────────────

describe('GET (email link / scanner prefetch)', () => {
  it.each(['approve', 'decline'])('%s link → 200 confirm page with a POST form carrying the token, NO side effects', async (action) => {
    const t = tokenFor(action);
    const res: any = await handler(getEvt(t));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(body(res)).toMatch(/<form[^>]*method="post"/i);
    expect(body(res)).toContain(`name="t" value="${t}"`);
    expect(ddbSendMock).not.toHaveBeenCalled();
    expect(lambdaSendMock).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });

  it('invalid token on GET → 403, no side effects', async () => {
    const res: any = await handler(getEvt(tokenFor('approve', { secret: 'attacker-secret' })));
    expect(res.statusCode).toBe(403);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it('POST with a base64-encoded form body (API Gateway) is accepted', async () => {
    const t = tokenFor('approve');
    const res: any = await handler({
      requestContext: { http: { method: 'POST' } },
      body: Buffer.from(`t=${t}`).toString('base64'), isBase64Encoded: true,
    } as any);
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatch(/approved/i);
  });

  it('POST ignores a token that is only in the query string', async () => {
    const res: any = await handler({ requestContext: { http: { method: 'POST' } }, queryStringParameters: { t: tokenFor('decline') }, body: '' } as any);
    expect(res.statusCode).toBe(403);
    expect(refundsCreate).not.toHaveBeenCalled();
  });
});

// ── Second click (idempotency) ────────────────────────────────────────────────

describe('already decided', () => {
  const noSideEffects = () => {
    expect(updates()).toHaveLength(0);
    expect(lambdaSendMock).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
  };

  it.each([
    ['approve', 'script-written'],
    ['approve', 'declined'],
    ['decline', 'script-written'],
    ['decline', 'declined'],
  ])('%s link on an already-%s encounter → "already decided: <state>", no side effects', async (action, state) => {
    seedDdb(state);
    const res: any = await handler(evt(tokenFor(action)));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(body(res)).toMatch(/already decided/i);
    expect(body(res)).toContain(state);
    noSideEffects();
  });

  it('race: read says sent-to-provider but the conditional update fails (approve) → already-decided page, no emails', async () => {
    seedDdb('sent-to-provider', { updateRejects: true });
    const res: any = await handler(evt(tokenFor('approve')));
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatch(/already decided/i);
    expect(lambdaSendMock).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it('race: conditional update fails (decline) → already-decided page, no emails', async () => {
    seedDdb('sent-to-provider', { updateRejects: true });
    const res: any = await handler(evt(tokenFor('decline')));
    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatch(/already decided/i);
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('encounter in another state (e.g. new) is not decidable → no refund, no emails, no update', async () => {
    seedDdb('new');
    const res: any = await handler(evt(tokenFor('decline')));
    expect(body(res)).toMatch(/already decided|not ready/i);
    noSideEffects();
  });
});

describe('test-price orders ($2 override)', () => {
  it('flags the Genesis order email subject, keeping "encrypt"', async () => {
    sessionsRetrieve.mockResolvedValue({ ...STRIPE_SESSION, metadata: { test_price: 'true' } });
    await handler(evt(tokenFor('approve')));
    const order = emails().find((e) => e.to === GENESIS);
    expect(order.subject).toBe('[TEST ORDER — DO NOT FILL] encrypt — Push Patch order — Repair — Doe');
  });

  it('flags the TJ-only ACTION NEEDED email too', async () => {
    sessionsRetrieve.mockResolvedValue({ ...STRIPE_SESSION, metadata: { test_price: 'true' } });
    practiceParam = JSON.stringify({});
    await handler(evt(tokenFor('approve')));
    const alert = emails().find((e) => e.attachments);
    expect(alert.to).toBe(TJ);
    expect(alert.subject.startsWith('[TEST ORDER — DO NOT FILL] [ACTION NEEDED]')).toBe(true);
  });

  it('real orders carry no test marker', async () => {
    sessionsRetrieve.mockResolvedValue({ ...STRIPE_SESSION, metadata: { skuIds: 'push-patch-bpc-nad-ghk' } });
    await handler(evt(tokenFor('approve')));
    expect(emails().find((e) => e.to === GENESIS).subject).toBe('encrypt — Push Patch order — Repair — Doe');
  });
});
