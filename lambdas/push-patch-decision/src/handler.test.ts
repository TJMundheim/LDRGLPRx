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
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

const refundsCreate = vi.fn();
const sessionsRetrieve = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(async () => ({
    refunds: { create: (...a: any[]) => refundsCreate(...a) },
    checkout: { sessions: { retrieve: (...a: any[]) => sessionsRetrieve(...a) } },
  })),
}));

import { handler } from './handler';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SECRET = 'test-hmac-secret';
const CONTACT = 'contact-abc';
const ENC = 'pp-cs_test_123';
const SESSION = 'cs_test_123';
const PI = 'pi_test_456';
const FULFILLMENT = 'orders@fulfillment.test';

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
  process.env.PUSH_PATCH_FULFILLMENT_EMAIL = FULFILLMENT;
  ssmSendMock.mockImplementation(async (cmd: any) => {
    if (cmd.input.Name === 'push-patch-decision-hmac-key') return { Parameter: { Value: SECRET } };
    throw new Error(`unexpected SSM param ${cmd.input.Name}`);
  });
  lambdaSendMock.mockResolvedValue({ StatusCode: 200 });
  refundsCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });
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
    expect(u).toHaveLength(1);
    expect(u[0].Key).toEqual({ contactId: CONTACT, sk: `encounter#${ENC}` });
    // conditional: only from 'sent-to-provider'
    expect(u[0].ConditionExpression).toMatch(/state/);
    const vals = Object.values(u[0].ExpressionAttributeValues ?? {});
    expect(vals).toContain('sent-to-provider');
    expect(vals).toContain('script-written');
  });

  it('sends the patient a welcome email from the info alias', async () => {
    await handler(evt(tokenFor('approve')));
    const welcome = emails().find((e) => e.to === 'jane@example.com');
    expect(welcome).toBeDefined();
    expect(welcome.kind).toBe('info');
    expect(welcome.subject).toBe('Welcome — your Push Patch is approved');
    // customer copy never names the fulfillment partner
    expect(flat(welcome)).not.toMatch(/genesis/i);
  });

  it('sends the order email to PUSH_PATCH_FULFILLMENT_EMAIL with blend, ship-to, patient name, phone, DOB, session id', async () => {
    await handler(evt(tokenFor('approve')));
    const order = emails().find((e) => e.to === FULFILLMENT);
    expect(order).toBeDefined();
    expect(order.kind).toBe('info');
    const html = String(order.html);
    expect(html).toContain('Repair');                                         // blend name
    expect(html).toContain('BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg');   // blend formula
    expect(html).toContain('12 Ranch Rd');                                    // ship-to
    expect(html).toContain('Austin');
    expect(html).toContain('78701');
    expect(html).toContain('Jane Doe');                                       // patient name
    expect(html).toContain('+15125550123');                                   // phone
    expect(html).toContain('1980-04-02');                                     // DOB
    expect(html).toContain(SESSION);                                          // session id
    expect(sessionsRetrieve).toHaveBeenCalledWith(SESSION, expect.anything());
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

describe('decline', () => {
  it('claims declined (conditional), then refunds the payment intent in full, returns confirmation HTML', async () => {
    const calls: string[] = [];
    refundsCreate.mockImplementation(async () => { calls.push('refund'); return { id: 're_1' }; });
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.__t === 'Get') return { Item: cmd.input.Key.sk === 'record' ? RECORD : encounter() };
      if (cmd.__t === 'Update') calls.push('update');
      return {};
    });

    const res: any = await handler(evt(tokenFor('decline')));
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(body(res)).toMatch(/declined/i);

    expect(refundsCreate).toHaveBeenCalledTimes(1);
    const [arg, opts] = refundsCreate.mock.calls[0];
    expect(arg).toMatchObject({ payment_intent: PI });
    expect(arg.amount).toBeUndefined();                    // full refund
    // double-click race protection: Stripe de-dupes on the idempotency key
    expect(opts?.idempotencyKey).toEqual(expect.stringContaining(SESSION));

    expect(calls).toEqual(['update', 'refund']);
    const u = updates();
    expect(u).toHaveLength(1);
    const vals = Object.values(u[0].ExpressionAttributeValues ?? {});
    expect(vals).toContain('sent-to-provider');
    expect(vals).toContain('declined');
  });

  it('emails the patient "not cleared — full refund issued" and sends NO order email', async () => {
    await handler(evt(tokenFor('decline')));
    const sent = emails();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('jane@example.com');
    expect(sent[0].kind).toBe('info');
    expect(flat(sent[0])).toMatch(/not cleared/i);
    expect(flat(sent[0])).toMatch(/full refund/i);
    expect(sent.find((e) => e.to === FULFILLMENT)).toBeUndefined();
    expect(flat(sent[0])).not.toMatch(/genesis/i);
  });

  it('refund failure → 500 HTML, claim rolled back to sent-to-provider, no email', async () => {
    refundsCreate.mockRejectedValue(new Error('stripe is down'));
    const res: any = await handler(evt(tokenFor('decline')));
    expect(res.statusCode).toBe(500);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    const u = updates();
    expect(u).toHaveLength(2);
    expect(u[0].ExpressionAttributeValues).toMatchObject({ ':from': 'sent-to-provider', ':to': 'declined' });
    expect(u[1].ExpressionAttributeValues).toMatchObject({ ':from': 'declined', ':to': 'sent-to-provider' });
    expect(lambdaSendMock).not.toHaveBeenCalled();
    // error page must not leak the internal error text
    expect(body(res)).not.toContain('stripe is down');
  });

  it('race: decline loses to a concurrent approve → no refund, no email', async () => {
    seedDdb('sent-to-provider', { updateRejects: true });
    const res: any = await handler(evt(tokenFor('decline')));
    expect(body(res)).toMatch(/already decided/i);
    expect(refundsCreate).not.toHaveBeenCalled();
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
