import { createHmac } from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mocks (declared before the module under test is imported) ──────────────────

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSendMock(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(input: any) { this.input = input; } },
  DeleteCommand: class DeleteCommand { input: any; constructor(input: any) { this.input = input; } },
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

const sessionRetrieveMock = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(async () => ({ checkout: { sessions: { retrieve: sessionRetrieveMock } } })),
  __resetCacheForTests: vi.fn(),
}));

import { deriveContactId } from '@my4mlife/contact-id';
import { handler } from './handler';
import { verifyToken } from './sign';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const NOW = '2026-10-01T15:00:00.000Z';
const SECRET = 'test-hmac-secret';
const PROVIDER = 'provider@example.com';
const PACKET_URL = 'https://s3.example.com/clinical-packets/c/e.html?X-Amz-Signature=abc';
const SESSION_ID = 'cs_test_123';
const SKU = 'push-patch-nad-ghk';
const EMAIL = 'jane@example.com';
const CONSENT_NAME = 'Jane Q Doe';

const SESSION = {
  id: SESSION_ID,
  payment_status: 'paid',
  payment_intent: 'pi_123',
  amount_total: 14900,
  metadata: { skuIds: SKU, wear: '12h' },
  customer_details: { email: 'Jane@Example.com', name: 'Jane Doe', phone: '+15559990000' },
  shipping_details: {
    name: 'Jane Doe',
    address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' },
  },
};

const VALID_BODY = {
  sessionId: SESSION_ID,
  dob: '1984-03-09',
  sex: 'female',
  phone: '+15551234567',
  medications: ['metformin'],
  allergies: [],
  conditions: ['hypothyroidism'],
  screening: { seizures: false, pacemaker: false, metalImplantNearSite: false, pregnant: false, woundAtSite: false },
  consentName: CONSENT_NAME,
  shipping: { confirmed: true },
};

const STRIPE_SHIP_TO = { name: 'Jane Doe', line1: '1 Main St', line2: '', city: 'Austin', state: 'TX', postalCode: '78701' };
const CORRECTED = { name: 'Jane Doe', line1: '9 Oak Ave', line2: 'Apt 4', city: 'Denver', state: 'co', postalCode: '80202-1234' };

const REQUIRED_FIELDS = [
  'sessionId', 'dob', 'sex', 'phone', 'medications', 'allergies', 'conditions', 'screening', 'consentName', 'shipping',
];
const SCREENING_FIELDS = ['seizures', 'pacemaker', 'metalImplantNearSite', 'pregnant', 'woundAtSite'];

function evt(body: unknown, method = 'POST', origin?: string) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: origin ? { origin } : {},
    requestContext: { http: { method } },
  } as any;
}

// ── Inspection helpers ─────────────────────────────────────────────────────────

const ddbInputs = () => ddbSendMock.mock.calls.map((c) => c[0].input);
const skOf = (i: any): string | undefined => i.Key?.sk ?? i.Item?.sk;
const valuesOf = (i: any): any[] => [
  ...Object.values(i.ExpressionAttributeValues ?? {}),
  ...Object.values(i.Item ?? {}),
];
const recordWrites = () => ddbInputs().filter((i) => skOf(i) === 'record');
/** The nested-field SET (second record write). */
const recordWrite = () => recordWrites()[recordWrites().length - 1];
/** Resolve a nested-SET expression into { 'demographics.firstName': value, ... }. */
const nestedSets = (i: any): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const m of String(i.UpdateExpression).matchAll(/(#\w+)\.(#\w+) = (:\w+)/g)) {
    out[`${i.ExpressionAttributeNames[m[1]]}.${i.ExpressionAttributeNames[m[2]]}`] = i.ExpressionAttributeValues[m[3]];
  }
  return out;
};
const encounterWrite = () => ddbInputs().find((i) => String(skOf(i)).startsWith('encounter#'));

const fnOf = (call: any[]): string => call[0].input.FunctionName;
const payloadOf = (call: any[]) => JSON.parse(Buffer.from(call[0].input.Payload).toString('utf8'));
const packetCalls = () => lambdaSendMock.mock.calls.filter((c) => fnOf(c).includes('export-clinical-packet'));
const emailCalls = () => lambdaSendMock.mock.calls.filter((c) => fnOf(c).includes('email-sender'));

const conditionalFailure = () => Object.assign(new Error('conditional'), { name: 'ConditionalCheckFailedException' });

function nothingHappened() {
  expect(ddbSendMock).not.toHaveBeenCalled();
  expect(lambdaSendMock).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));

  ddbSendMock.mockReset();
  ddbSendMock.mockResolvedValue({});

  sessionRetrieveMock.mockReset();
  sessionRetrieveMock.mockResolvedValue(SESSION);

  ssmSendMock.mockReset();
  ssmSendMock.mockImplementation(async (cmd: any) => {
    const name: string = cmd.input.Name;
    if (name.endsWith('push-patch-decision-hmac-key')) return { Parameter: { Value: SECRET } };
    if (name.endsWith('provider/email')) return { Parameter: { Value: PROVIDER } };
    throw new Error(`unexpected SSM parameter ${name}`);
  });

  lambdaSendMock.mockReset();
  lambdaSendMock.mockImplementation(async (cmd: any) => {
    if (cmd.input.FunctionName.includes('export-clinical-packet')) {
      return { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: PACKET_URL })) };
    }
    return {};
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── OPTIONS / CORS ─────────────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  it('returns 204 and touches nothing', async () => {
    const res: any = await handler(evt({}, 'OPTIONS', 'https://my4mlife.com'));
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
    expect(sessionRetrieveMock).not.toHaveBeenCalled();
    nothingHappened();
  });
});

// ── 400: validation ────────────────────────────────────────────────────────────

describe('400 validation', () => {
  it('rejects a missing body', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'POST' } } } as any);
    expect(res.statusCode).toBe(400);
  });

  it('rejects invalid JSON', async () => {
    const res: any = await handler(evt('{bad json'));
    expect(res.statusCode).toBe(400);
  });

  it.each(REQUIRED_FIELDS)('returns 400 when %s is missing, before Stripe or any write', async (field) => {
    const body: any = { ...VALID_BODY };
    delete body[field];
    const res: any = await handler(evt(body));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toEqual(expect.any(String));
    expect(sessionRetrieveMock).not.toHaveBeenCalled();
    nothingHappened();
  });

  it.each(SCREENING_FIELDS)('returns 400 when screening.%s is missing', async (field) => {
    const screening: any = { ...VALID_BODY.screening };
    delete screening[field];
    const res: any = await handler(evt({ ...VALID_BODY, screening }));
    expect(res.statusCode).toBe(400);
    nothingHappened();
  });

  it('returns 400 when a screening answer is not a boolean', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, screening: { ...VALID_BODY.screening, seizures: 'no' } }));
    expect(res.statusCode).toBe(400);
    nothingHappened();
  });

  it('returns 400 for a blank consentName', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, consentName: '   ' }));
    expect(res.statusCode).toBe(400);
    nothingHappened();
  });

  it('returns 400 for a malformed dob', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, dob: '03/09/1984' }));
    expect(res.statusCode).toBe(400);
    nothingHappened();
  });
});

// ── Shipping: GET + POST shipping object ───────────────────────────────────────

const getEvt = (qs: Record<string, string> | undefined = { session_id: SESSION_ID }, origin?: string) =>
  ({ headers: origin ? { origin } : {}, queryStringParameters: qs, requestContext: { http: { method: 'GET' } } }) as any;

describe('GET ship-to', () => {
  it('returns ONLY { shipTo } from the paid session shipping details, with CORS for GET', async () => {
    const res: any = await handler(getEvt(undefined, 'https://my4mlife.com'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ shipTo: STRIPE_SHIP_TO });
    expect(res.headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(sessionRetrieveMock.mock.calls[0][0]).toBe(SESSION_ID);
    nothingHappened();
  });

  it('returns 402 when unpaid or not a push-patch session', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, payment_status: 'unpaid' });
    expect(((await handler(getEvt())) as any).statusCode).toBe(402);
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: { skuIds: 'biome-ns-ultra' } });
    expect(((await handler(getEvt())) as any).statusCode).toBe(402);
    nothingHappened();
  });

  it('returns 400 without session_id and 404 when Stripe holds no shipping address', async () => {
    expect(((await handler(getEvt({}))) as any).statusCode).toBe(400);
    expect(sessionRetrieveMock).not.toHaveBeenCalled();
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, shipping_details: null });
    expect(((await handler(getEvt())) as any).statusCode).toBe(404);
  });
});

describe('POST shipping', () => {
  it('confirmed:true stores the Stripe address on the encounter as shipTo', async () => {
    await handler(evt(VALID_BODY));
    expect(encounterWrite().Item.shipTo).toEqual(STRIPE_SHIP_TO);
  });

  it('a corrected address overrides the Stripe one (normalized state/zip)', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, shipping: { confirmed: false, address: CORRECTED } }));
    expect(res.statusCode).toBe(200);
    expect(encounterWrite().Item.shipTo).toEqual({ ...CORRECTED, state: 'CO', postalCode: '80202-1234' });
  });

  it('confirmed:true with no Stripe shipping address is a 400 before any write', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, shipping_details: null });
    expect(((await handler(evt(VALID_BODY))) as any).statusCode).toBe(400);
    nothingHappened();
  });

  const bad: [string, unknown][] = [
    ['shipping not an object', 'yes'],
    ['confirmed missing', {}],
    ['confirmed:false without address', { confirmed: false }],
    ['blank line1', { confirmed: false, address: { ...CORRECTED, line1: ' ' } }],
    ['blank city', { confirmed: false, address: { ...CORRECTED, city: '' } }],
    ['blank name', { confirmed: false, address: { ...CORRECTED, name: '' } }],
    ['3-letter state', { confirmed: false, address: { ...CORRECTED, state: 'TEX' } }],
    ['unknown state', { confirmed: false, address: { ...CORRECTED, state: 'ZZ' } }],
    ['4-digit zip', { confirmed: false, address: { ...CORRECTED, postalCode: '8020' } }],
    ['alpha zip', { confirmed: false, address: { ...CORRECTED, postalCode: 'K1A 0B1' } }],
  ];
  it.each(bad)('returns 400 for %s, before Stripe or any write', async (_n, shipping) => {
    const res: any = await handler(evt({ ...VALID_BODY, shipping }));
    expect(res.statusCode).toBe(400);
    expect(sessionRetrieveMock).not.toHaveBeenCalled();
    nothingHappened();
  });

  it('accepts a 9-digit zip without a hyphen and normalizes it', async () => {
    await handler(evt({ ...VALID_BODY, shipping: { confirmed: false, address: { ...CORRECTED, line2: undefined, postalCode: '802021234' } } }));
    expect(encounterWrite().Item.shipTo).toMatchObject({ postalCode: '80202-1234', line2: '' });
  });
});

// ── 402: payment gate ──────────────────────────────────────────────────────────

describe('402 payment gate', () => {
  it('retrieves the session by the body sessionId', async () => {
    await handler(evt(VALID_BODY));
    expect(sessionRetrieveMock).toHaveBeenCalledTimes(1);
    expect(sessionRetrieveMock.mock.calls[0][0]).toBe(SESSION_ID);
  });

  it.each(['unpaid', 'no_payment_required'])('returns 402 when payment_status is %s', async (status) => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, payment_status: status });
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(402);
    nothingHappened();
  });

  it('returns 402 when metadata.skuIds is not a push-patch-* SKU', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: { skuIds: 'biome-ns-ultra' } });
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(402);
    nothingHappened();
  });

  it('returns 402 when metadata.skuIds is absent', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: {} });
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(402);
    nothingHappened();
  });

  it('returns 402 when Stripe cannot find the session', async () => {
    sessionRetrieveMock.mockRejectedValue(Object.assign(new Error('No such session'), { code: 'resource_missing' }));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(402);
    nothingHappened();
  });
});

// ── Success: record + encounter + consent ──────────────────────────────────────

describe('success: PatientRecord and Encounter', () => {
  it('returns 200 { ok: true, encounterId } with no alreadySubmitted flag', async () => {
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.encounterId).toBe(`pp-${SESSION_ID}`);
    expect(body.alreadySubmitted).toBeUndefined();
  });

  it('upserts the root record keyed by deriveContactId(lowercased Stripe email)', async () => {
    await handler(evt(VALID_BODY));
    const w = recordWrite();
    expect(w).toBeDefined();
    expect((w.Key ?? w.Item).contactId).toBe(deriveContactId(EMAIL));
  });

  it('writes demographics from the Stripe session (name, email) and the body (dob, sex, phone, state)', async () => {
    await handler(evt(VALID_BODY));
    const sets = nestedSets(recordWrite());
    expect(sets).toMatchObject({
      'demographics.firstName': 'Jane',
      'demographics.lastName': 'Doe',
      'demographics.email': EMAIL,
      'demographics.phone': VALID_BODY.phone, // body phone wins over Stripe phone
      'demographics.dob': VALID_BODY.dob,
      'demographics.sex': VALID_BODY.sex,
      'demographics.state': 'TX', // from shipping address
    });
  });

  it('demographics.state follows the final ship-to (corrected address wins)', async () => {
    await handler(evt({ ...VALID_BODY, shipping: { confirmed: false, address: CORRECTED } }));
    expect(nestedSets(recordWrite())['demographics.state']).toBe('CO');
  });

  it('writes history (medications, allergies, conditions) and screeningAnswers', async () => {
    await handler(evt(VALID_BODY));
    expect(nestedSets(recordWrite())).toMatchObject({
      'history.medications': ['metformin'], 'history.allergies': [], 'history.conditions': ['hypothyroidism'],
      'screeningAnswers.pushPatch': VALID_BODY.screening,
    });
  });

  it('never removes existing data: maps are created only if absent, then only nested paths are SET', async () => {
    await handler(evt(VALID_BODY));
    const [ensure, nested] = recordWrites();
    // Step 1 only ever uses if_not_exists on the maps; no whole-map overwrite.
    expect(ensure.UpdateExpression).not.toMatch(/(^|, |SET )(demographics|history|screeningAnswers|consents) = :/);
    for (const m of ['demographics', 'history', 'screeningAnswers', 'consents']) {
      expect(ensure.UpdateExpression).toContain(`${m} = if_not_exists(${m}, :e)`);
    }
    // Step 2 touches nested paths only (plus updatedAt); no REMOVE/DELETE, no top-level map assignment.
    expect(nested.UpdateExpression).not.toMatch(/REMOVE|DELETE/);
    const assignments = String(nested.UpdateExpression).replace(/^SET /, '').split(', ');
    for (const asg of assignments) expect(asg).toMatch(/^(updatedAt = :ts|#m\d+\.#f\d+ = :v\d+)$/);
    const touched = Object.keys(nestedSets(nested));
    expect(touched.sort()).toEqual([
      'consents.consent-telehealth-push-patch-v1', 'demographics.dob', 'demographics.email', 'demographics.firstName',
      'demographics.lastName', 'demographics.phone', 'demographics.sex', 'demographics.state',
      'history.allergies', 'history.conditions', 'history.medications', 'screeningAnswers.pushPatch',
    ]);
  });

  it('keeps an existing record intact (height, weight, whyNow, other consents) after an intake', async () => {
    const existing: any = {
      demographics: { heightIn: 70, firstName: 'Old', zip: '78701' },
      history: { weightLb: 200, heightIn: 70, priorMeds: ['x'] },
      screeningAnswers: { whyNow: 'energy' },
      consents: { 'consent-protege-v1': { agreed: true } },
    };
    // Tiny in-memory DynamoDB: apply the recorded UpdateExpressions to `existing`.
    ddbSendMock.mockImplementation(async (cmd: any) => {
      const i = cmd.input;
      if (skOf(i) !== 'record') return {};
      const V = i.ExpressionAttributeValues, N = i.ExpressionAttributeNames ?? {};
      for (const asg of String(i.UpdateExpression).replace(/^SET /, '').split(/, (?=[#\w]+(?:\.[#\w]+)? = )/)) {
        const [lhs, rhs] = asg.split(' = ');
        const ine = rhs.match(/^if_not_exists\((\w+), (:\w+)\)$/);
        if (ine) { existing[ine[1]] ??= structuredClone(V[ine[2]]); continue; }
        const path = lhs.split('.').map((p) => N[p] ?? p);
        let o = existing;
        for (const seg of path.slice(0, -1)) o = o[seg];   // throws if a parent map is missing, like DynamoDB
        o[path[path.length - 1]] = V[rhs];
      }
      return {};
    });
    await handler(evt(VALID_BODY));
    expect(existing.demographics).toMatchObject({ heightIn: 70, zip: '78701', firstName: 'Jane', state: 'TX' });
    expect(existing.history).toMatchObject({ weightLb: 200, heightIn: 70, priorMeds: ['x'], medications: ['metformin'] });
    expect(existing.screeningAnswers).toEqual({ whyNow: 'energy', pushPatch: VALID_BODY.screening });
    expect(existing.consents['consent-protege-v1']).toEqual({ agreed: true });
    expect(existing.consents['consent-telehealth-push-patch-v1']).toMatchObject({ agreed: true });
  });

  it('creates the Encounter with lane, sku, sessionId, paymentIntentId and state sent-to-provider', async () => {
    await handler(evt(VALID_BODY));
    const w = encounterWrite();
    expect(w.Item).toMatchObject({
      contactId: deriveContactId(EMAIL),
      sk: `encounter#pp-${SESSION_ID}`,
      encounterId: `pp-${SESSION_ID}`,
      lane: 'push-patch',
      category: 'push-patch',
      visitType: 'async',
      sku: SKU,
      sessionId: SESSION_ID,
      paymentIntentId: 'pi_123',
      state: 'sent-to-provider',
    });
  });

  it('creates the Encounter with a conditional put (attribute_not_exists) so a duplicate cannot overwrite', async () => {
    await handler(evt(VALID_BODY));
    expect(encounterWrite().ConditionExpression).toMatch(/attribute_not_exists/);
  });

  it('accepts an expanded payment_intent object', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, payment_intent: { id: 'pi_expanded' } });
    await handler(evt(VALID_BODY));
    expect(encounterWrite().Item.paymentIntentId).toBe('pi_expanded');
  });
});

describe('success: consent', () => {
  it('stores consent-telehealth-push-patch-v1 with the typed name and a timestamp on the record', async () => {
    await handler(evt(VALID_BODY));
    const stored = JSON.stringify(recordWrite());
    expect(stored).toContain('consent-telehealth-push-patch-v1');
    expect(stored).toContain(CONSENT_NAME);
    expect(stored).toContain(NOW);
  });

  it('stores the consent as an object under consents[consent-telehealth-push-patch-v1] with agreed:true', async () => {
    await handler(evt(VALID_BODY));
    const c = nestedSets(recordWrite())['consents.consent-telehealth-push-patch-v1'];
    expect(c).toMatchObject({ version: 'consent-telehealth-push-patch-v1', agreed: true, name: CONSENT_NAME, at: NOW });
  });
});

// ── Provider hand-off ──────────────────────────────────────────────────────────

describe('success: packet then ONE provider email', () => {
  it('invokes export-clinical-packet with the AppSync-shaped event for the new encounter', async () => {
    await handler(evt(VALID_BODY));
    expect(packetCalls()).toHaveLength(1);
    expect(payloadOf(packetCalls()[0])).toEqual({
      arguments: { contactId: deriveContactId(EMAIL), encounterId: `pp-${SESSION_ID}` },
      identity: { groups: ['Admins'] },
    });
    expect(packetCalls()[0][0].input.InvocationType).toBe('RequestResponse');
  });

  it('writes the record before the packet is built, and builds the packet before the email', async () => {
    const order: string[] = [];
    ddbSendMock.mockImplementation(async (cmd: any) => {
      order.push(`ddb:${skOf(cmd.input)}`);
      return {};
    });
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      const fn: string = cmd.input.FunctionName;
      order.push(fn.includes('export-clinical-packet') ? 'packet' : 'email');
      return fn.includes('export-clinical-packet')
        ? { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: PACKET_URL })) }
        : {};
    });
    await handler(evt(VALID_BODY));
    expect(order.indexOf('ddb:record')).toBeGreaterThan(-1);
    expect(order.indexOf('ddb:record')).toBeLessThan(order.indexOf('packet'));
    expect(order.indexOf('packet')).toBeLessThan(order.indexOf('email'));
  });

  it('sends exactly one email through email-sender to the SSM provider address', async () => {
    await handler(evt(VALID_BODY));
    expect(emailCalls()).toHaveLength(1);
    const p = payloadOf(emailCalls()[0]);
    expect(p.kind).toBe('info');
    expect(p.to).toBe(PROVIDER);
    expect(p.subject).toEqual(expect.any(String));
    expect(p.html).toEqual(expect.any(String));
  });

  it('email HTML contains the packet link', async () => {
    await handler(evt(VALID_BODY));
    expect(payloadOf(emailCalls()[0]).html).toContain(PACKET_URL);
  });

  it('email HTML contains two signed /api/push-patch-decision?t=... links: approve and decline', async () => {
    await handler(evt(VALID_BODY));
    const html: string = payloadOf(emailCalls()[0]).html;
    const tokens = [...html.matchAll(/\/api\/push-patch-decision\?t=([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
    expect(new Set(tokens).size).toBe(2);

    // Token = base64url(`${contactId}.${encounterId}.${action}.${hmacHex}`); HMAC over the first three parts.
    const contactId = deriveContactId(EMAIL);
    const encounterId = `pp-${SESSION_ID}`;
    const decoded = tokens.map((t) => {
      const [c, e, action, sig] = Buffer.from(t, 'base64url').toString('utf8').split('.');
      const expected = createHmac('sha256', SECRET).update(`${c}.${e}.${action}`).digest('hex');
      expect(sig).toBe(expected);
      return { contactId: c, encounterId: e, action };
    });
    expect(decoded).toEqual(expect.arrayContaining([
      { contactId, encounterId, action: 'approve' },
      { contactId, encounterId, action: 'decline' },
    ]));
    // and the shared sign module agrees
    for (const t of tokens) expect(() => verifyToken(t, SECRET)).not.toThrow();
    expect(() => verifyToken(tokens[0]!, 'wrong-secret')).toThrow();
  });

  it('does not put the DOB, phone or medications in the email body (PHI stays behind the packet link)', async () => {
    await handler(evt(VALID_BODY));
    const p = payloadOf(emailCalls()[0]);
    const all = `${p.subject}${p.html}${p.text ?? ''}`;
    expect(all).not.toContain(VALID_BODY.dob);
    expect(all).not.toContain(VALID_BODY.phone);
    expect(all).not.toContain('metformin');
  });

  it('returns 502 and sends no email when packet generation fails', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) =>
      cmd.input.FunctionName.includes('export-clinical-packet')
        ? { FunctionError: 'Unhandled', Payload: Buffer.from('{}') }
        : {});
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(502);
    expect(emailCalls()).toHaveLength(0);
  });

  const encounterDelete = () => ddbSendMock.mock.calls
    .map((c) => c[0])
    .find((c) => c.constructor.name === 'DeleteCommand');

  it('retry gap: deletes the new encounter (state = sent-to-provider) when packet generation fails', async () => {
    lambdaSendMock.mockImplementation(async () => ({ FunctionError: 'Unhandled', Payload: Buffer.from('{}') }));
    await handler(evt(VALID_BODY));
    const del = encounterDelete();
    expect(del).toBeDefined();
    expect(del.input.Key).toEqual({ contactId: deriveContactId(EMAIL), sk: `encounter#pp-${SESSION_ID}` });
    expect(JSON.stringify(del.input)).toContain('sent-to-provider');
    expect(del.input.ConditionExpression).toMatch(/=/);
  });

  it('retry gap: deletes the new encounter and returns 502 when the provider email fails', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) =>
      cmd.input.FunctionName.includes('export-clinical-packet')
        ? { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: PACKET_URL })) }
        : { FunctionError: 'Unhandled' });
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(502);
    expect(encounterDelete()).toBeDefined();
  });

  it('does not delete the encounter on success', async () => {
    await handler(evt(VALID_BODY));
    expect(encounterDelete()).toBeUndefined();
  });
});

// ── Reminder contract ──────────────────────────────────────────────────────────

describe('success: Touchpoints pending marker', () => {
  const markerUpdate = () => ddbInputs().find((i) => i.TableName === 'Touchpoints');

  it('stamps intakeSubmittedAt on PUSH_PATCH_PENDING#<sessionId>', async () => {
    await handler(evt(VALID_BODY));
    const u = markerUpdate();
    expect(u).toBeDefined();
    expect(u.Key).toEqual({ contactId: deriveContactId(EMAIL), sk: `PUSH_PATCH_PENDING#${SESSION_ID}` });
    expect(u.UpdateExpression).toContain('intakeSubmittedAt');
    expect(Object.values(u.ExpressionAttributeValues)).toContain(NOW);
  });

  it('uses metadata.contactId when present (same resolution as order-handler-core)', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: { ...SESSION.metadata, contactId: 'meta-contact-1' } });
    await handler(evt(VALID_BODY));
    expect(markerUpdate().Key.contactId).toBe('meta-contact-1');
    expect(encounterWrite().Item.contactId).toBe('meta-contact-1');
  });

  it('ignores a missing marker (ConditionalCheckFailed) and still returns 200', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.TableName === 'Touchpoints') throw conditionalFailure();
      return {};
    });
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
  });

  it('is not touched when the submit is a duplicate', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (String(skOf(cmd.input)).startsWith('encounter#') && cmd.input.ConditionExpression) throw conditionalFailure();
      return {};
    });
    await handler(evt(VALID_BODY));
    expect(markerUpdate()).toBeUndefined();
  });
});

// ── Idempotency ────────────────────────────────────────────────────────────────

describe('second submit for the same session', () => {
  beforeEach(() => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (String(skOf(cmd.input)).startsWith('encounter#') && cmd.input.ConditionExpression) throw conditionalFailure();
      return {};
    });
  });

  it('returns 200 { alreadySubmitted: true }', async () => {
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ alreadySubmitted: true });
  });

  it('sends no email and builds no packet', async () => {
    await handler(evt(VALID_BODY));
    expect(emailCalls()).toHaveLength(0);
    expect(packetCalls()).toHaveLength(0);
  });

  it('does not rewrite the record or consent (the conditional encounter write runs first)', async () => {
    await handler(evt(VALID_BODY));
    expect(recordWrite()).toBeUndefined();
  });

  it('a genuine DynamoDB failure is not mistaken for a duplicate', async () => {
    ddbSendMock.mockImplementation(async () => { throw Object.assign(new Error('boom'), { name: 'InternalServerError' }); });
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(emailCalls()).toHaveLength(0);
  });
});

// ── Screening flag ─────────────────────────────────────────────────────────────

describe('screening flag in the provider email', () => {
  it('subject has no "[Screening flag]" when every answer is no', async () => {
    await handler(evt(VALID_BODY));
    expect(payloadOf(emailCalls()[0]).subject).not.toContain('[Screening flag]');
  });

  it.each(SCREENING_FIELDS)('subject contains "[Screening flag]" and HTML names %s when it is yes', async (field) => {
    const screening = { ...VALID_BODY.screening, [field]: true };
    await handler(evt({ ...VALID_BODY, screening }));
    expect(emailCalls()).toHaveLength(1);
    const p = payloadOf(emailCalls()[0]);
    expect(p.subject).toContain('[Screening flag]');
    expect(p.html).toContain(field);
  });

  it('a flagged submit still goes to the provider (physician decides) and returns 200', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, screening: { ...VALID_BODY.screening, pacemaker: true } }));
    expect(res.statusCode).toBe(200);
    expect(emailCalls()).toHaveLength(1);
  });

  it('persists the screening answers as submitted', async () => {
    const screening = { ...VALID_BODY.screening, pregnant: true };
    await handler(evt({ ...VALID_BODY, screening }));
    expect(nestedSets(recordWrite())['screeningAnswers.pushPatch']).toEqual(screening);
  });
});
