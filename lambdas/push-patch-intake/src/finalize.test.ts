import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSendMock(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(input: any) { this.input = input; } },
  DeleteCommand: class DeleteCommand { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class DynamoDBClient { constructor(_: any) {} } }));
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
}));
const upsertContactMock = vi.fn();
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: (...a: any[]) => upsertContactMock(...a) }));

import { deriveContactId } from '@my4mlife/contact-id';
import { CONSENT_NPP_V1 } from '@my4mlife/patient-record';
import { handler } from './handler';

const NOW = '2026-10-16T15:00:00.000Z';
const SIGNED_AT = '2026-10-16T14:50:00.000Z';
const PROVIDER = 'provider@example.com';
const SESSION_ID = 'cs_test_fin';
const INTAKE_ID = 'int-1';
const SKU = 'push-patch-nad-ghk';
const EMAIL = 'jane@example.com';
const CONTACT = deriveContactId(EMAIL);
const PENDING_SK = `pending-intake#${INTAKE_ID}`;
const ENC_SK = `encounter#pp-${SESSION_ID}`;

const SESSION = {
  id: SESSION_ID, payment_status: 'paid', payment_intent: 'pi_1', amount_total: 14900, currency: 'usd',
  metadata: {
    skuIds: SKU, contactId: CONTACT, intakeId: INTAKE_ID,
    screen_v: 'pp-screen-v2', screen_at: '2026-10-16T14:00:00.000Z', screen_denied: 'seizures,pacemaker,pregnant',
    screen_placement: 'woundOrScar:no', screen_area: 'yes',
  },
  customer_details: { email: 'Jane@Example.com', name: 'Card Holder', phone: '+15559990000' },
  shipping_details: { name: 'Jane Doe', address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } },
};
const PENDING = {
  contactId: CONTACT, sk: PENDING_SK, intakeId: INTAKE_ID, email: EMAIL, firstName: 'Jane', lastName: 'Doe', skuId: SKU,
  dob: '1984-03-09', sex: 'female', phone: '+15551234567', medications: ['metformin'], allergies: [], conditions: ['hypothyroidism'],
  consentName: 'Jane Q Doe', signedAt: SIGNED_AT, ip: '203.0.113.7', userAgent: 'TestBrowser/1.0',
  ttl: Math.floor(Date.parse(NOW) / 1000) + 86400,
};

let pending: any;
let encounter: any;
const ev = (o: any = { mode: 'finalize', sessionId: SESSION_ID, intakeId: INTAKE_ID }) => o as any;
const finalize = async (e?: any) => (await handler(ev(e))) as any;
const run = finalize;
const inputs = () => ddbSendMock.mock.calls.map((c) => c[0].input);
const pendingDeletes = () => ddbSendMock.mock.calls.filter((c) => c[0].constructor.name === 'DeleteCommand' && c[0].input.Key.sk === PENDING_SK);
const skOf = (i: any) => i.Key?.sk ?? i.Item?.sk;
const fn = (c: any[]) => c[0].input.FunctionName as string;
const payload = (c: any[]) => JSON.parse(Buffer.from(c[0].input.Payload).toString('utf8'));
const packets = () => lambdaSendMock.mock.calls.filter((c) => fn(c).includes('export-clinical-packet'));
const emails = () => lambdaSendMock.mock.calls.filter((c) => fn(c).includes('email-sender'));
const providerEmails = () => emails().filter((c) => payload(c).to === PROVIDER);
const copyEmails = () => emails().filter((c) => payload(c).to === EMAIL);
const conditional = () => Object.assign(new Error('c'), { name: 'ConditionalCheckFailedException' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
  pending = PENDING; encounter = undefined;
  ddbSendMock.mockReset();
  ddbSendMock.mockImplementation(async (cmd: any) => {
    const i = cmd.input;
    if (cmd.constructor.name === 'GetCommand') {
      if (i.Key.sk === PENDING_SK) return { Item: pending };
      if (i.Key.sk === ENC_SK) return { Item: encounter };
    }
    return {};
  });
  upsertContactMock.mockReset(); upsertContactMock.mockResolvedValue(undefined);
  sessionRetrieveMock.mockReset(); sessionRetrieveMock.mockResolvedValue(SESSION);
  ssmSendMock.mockReset();
  ssmSendMock.mockImplementation(async (cmd: any) => ({ Parameter: { Value: cmd.input.Name.endsWith('provider/email') ? PROVIDER : 'secret' } }));
  lambdaSendMock.mockReset();
  lambdaSendMock.mockImplementation(async (cmd: any) =>
    cmd.input.FunctionName.includes('export-clinical-packet') ? { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: 'https://s3/p' })) } : {});
});
afterEach(() => vi.useRealTimers());

describe('finalize: happy path', () => {
  it('returns { result: "ok" } and sends exactly one packet and one provider email', async () => {
    expect(await finalize()).toEqual({ result: 'ok' });
    expect(packets()).toHaveLength(1);
    expect(providerEmails()).toHaveLength(1);
  });

  it('creates the encounter pp-<sessionId> conditionally with the Stripe ship-to and the session payment fields', async () => {
    await run();
    const put = inputs().find((i) => i.Item && skOf(i) === ENC_SK);
    expect(put.ConditionExpression).toBe('attribute_not_exists(sk)');
    expect(put.Item).toMatchObject({
      contactId: CONTACT, lane: 'push-patch', sku: SKU, sessionId: SESSION_ID, paymentIntentId: 'pi_1', state: 'sent-to-provider',
      shipTo: { name: 'Jane Doe', line1: '1 Main St', line2: '', city: 'Austin', state: 'TX', postalCode: '78701' },
    });
  });

  it('writes demographics from the pending form (name, email, dob, sex, phone) on the derived contactId', async () => {
    await run();
    const sets = inputs().filter((i) => skOf(i) === 'record' && i.ExpressionAttributeNames?.['#m1']);
    const values = Object.values(sets[sets.length - 1].ExpressionAttributeValues);
    expect(values).toEqual(expect.arrayContaining(['Jane', 'Doe', EMAIL, '1984-03-09', 'female', '+15551234567', 'TX']));
    expect(values).not.toContain('Card Holder');
  });

  it('consent "at" is the signing time from the pending item, not now', async () => {
    await run();
    const audit = inputs().find((i) => String(skOf(i)).startsWith('audit#'));
    expect(audit.Item.at).toBe(SIGNED_AT);
    const npp = inputs().find((i) => i.ExpressionAttributeNames?.['#npp']);
    const stored = JSON.parse(npp.ExpressionAttributeValues[':npp']);
    expect(stored).toMatchObject({ at: SIGNED_AT, ip: '203.0.113.7', userAgent: 'TestBrowser/1.0' });
    expect(npp.ExpressionAttributeNames['#npp']).toBe(CONSENT_NPP_V1);
  });

  it('records consents BEFORE the packet, the packet before the provider email, the signed copy last', async () => {
    const order: string[] = [];
    ddbSendMock.mockImplementation(async (cmd: any) => {
      const i = cmd.input;
      if (cmd.constructor.name === 'GetCommand') return { Item: i.Key.sk === PENDING_SK ? pending : undefined };
      if (i.ExpressionAttributeNames?.['#npp']) order.push('consent');
      return {};
    });
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      const f = cmd.input.FunctionName;
      if (f.includes('export-clinical-packet')) { order.push('packet'); return { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: 'u' })) }; }
      order.push(payload([cmd]).to === PROVIDER ? 'provider' : 'copy');
      return {};
    });
    await run();
    expect(order).toEqual(['consent', 'packet', 'provider', 'copy']);
  });

  it('provider email names the patient from the pending form', async () => {
    await run();
    expect(payload(providerEmails()[0]).subject).toContain('J. Doe');
  });

  it('a cleared patient (screen_denied = all three knockouts) is stored and emailed as No to seizures/pacemaker/pregnant', async () => {
    await run();
    const stored = inputs().map((i) => i.ExpressionAttributeValues).filter(Boolean)
      .flatMap((v) => Object.values(v)).find((v: any) => v && v.version === 'pp-screen-v2') as any;
    expect(stored.answers).toEqual({ seizures: false, pacemaker: false, pregnant: false, woundOrScar: false, suitableArea: true });
    const text = payload(providerEmails()[0]).text as string;
    for (const l of ['Epilepsy or seizures: No', 'Pacemaker or implanted electronic device: No', 'Pregnant or could be pregnant: No',
      'Suitable clean, low-hair skin area away from any metal implant: Yes', 'Open wound, recent graft or scar where the patch may be worn: No']) {
      expect(text).toContain(l);
    }
  });

  it('deletes the pending item on success', async () => {
    await run();
    expect(pendingDeletes()).toHaveLength(1);
    expect(pendingDeletes()[0][0].input.Key.contactId).toBe(CONTACT);
  });

  it('does not touch the Touchpoints marker (order-handler writes it)', async () => {
    await run();
    expect(inputs().some((i) => String(i.Key?.sk ?? '').startsWith('PUSH_PATCH_PENDING'))).toBe(false);
  });

  it('upserts the Contact as a customer with email/name/phone only', async () => {
    await run();
    expect(upsertContactMock).toHaveBeenCalledTimes(1);
    const input = upsertContactMock.mock.calls[0][1];
    expect(input).toMatchObject({ email: EMAIL, firstName: 'Jane', lastName: 'Doe', phone: '+15551234567', source: 'push-patch-intake', stage: 'customer' });
    expect(JSON.stringify(input)).not.toMatch(/1984|female|metformin|hypothyroidism|Austin/);
  });

  it('a copy-email failure does not fail the finalize', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.FunctionName.includes('export-clinical-packet')) return { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: 'u' })) };
      return payload([cmd]).to === EMAIL ? { FunctionError: 'Unhandled' } : {};
    });
    expect(await finalize()).toEqual({ result: 'ok' });
    expect(copyEmails()).toHaveLength(1);
  });
});

describe('finalize: replay and missing', () => {
  it('a duplicate encounter put returns "already" with no packet or email', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name === 'GetCommand') return { Item: cmd.input.Key.sk === PENDING_SK ? pending : undefined };
      if (cmd.input.Item?.sk === ENC_SK) throw conditional();
      return {};
    });
    expect(await finalize()).toEqual({ result: 'already' });
    expect(packets()).toHaveLength(0);
    expect(emails()).toHaveLength(0);
  });

  it('an existing encounter with the pending item already deleted returns "already", not "missing"', async () => {
    pending = undefined; encounter = { sk: ENC_SK };
    expect(await finalize()).toEqual({ result: 'already' });
    expect(packets()).toHaveLength(0);
  });

  it('a missing pending item returns "missing" and writes nothing', async () => {
    pending = undefined;
    expect(await finalize()).toEqual({ result: 'missing' });
    expect(ddbSendMock.mock.calls.every((c) => c[0].constructor.name === 'GetCommand')).toBe(true);
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('an expired pending item (ttl < now) returns "missing"', async () => {
    pending = { ...PENDING, ttl: Math.floor(Date.parse(NOW) / 1000) - 1 };
    expect(await finalize()).toEqual({ result: 'missing' });
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('a session with no shipping details returns "missing"', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, shipping_details: null });
    expect(await finalize()).toEqual({ result: 'missing' });
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('an unpaid session throws so the Stripe retry chain re-delivers', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, payment_status: 'unpaid' });
    await expect(handler(ev())).rejects.toThrow();
  });
});

describe('finalize: failure rolls back and throws', () => {
  it('packet failure deletes the encounter, keeps the pending item, and throws', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) => (cmd.input.FunctionName.includes('export-clinical-packet') ? { FunctionError: 'Unhandled' } : {}));
    await expect(handler(ev())).rejects.toThrow();
    expect(inputs().some((i) => i.Key?.sk === ENC_SK && i.ConditionExpression === '#s = :sent')).toBe(true);
    expect(pendingDeletes()).toHaveLength(0);
    expect(providerEmails()).toHaveLength(0);
    expect(copyEmails()).toHaveLength(0);
  });

  it('provider email failure deletes the encounter and throws', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.FunctionName.includes('export-clinical-packet')) return { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: 'u' })) };
      return { FunctionError: 'Unhandled' };
    });
    await expect(handler(ev())).rejects.toThrow();
    expect(inputs().some((i) => i.Key?.sk === ENC_SK && i.ConditionExpression === '#s = :sent')).toBe(true);
  });

  it('a record write failure deletes the encounter and throws', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name === 'GetCommand') return { Item: cmd.input.Key.sk === PENDING_SK ? pending : undefined };
      if (cmd.input.Key?.sk === 'record' && cmd.input.ExpressionAttributeNames?.['#m1']) throw new Error('ddb down');
      return {};
    });
    await expect(handler(ev())).rejects.toThrow();
    expect(inputs().some((i) => i.Key?.sk === ENC_SK && i.ConditionExpression === '#s = :sent')).toBe(true);
    expect(packets()).toHaveLength(0);
  });
});

describe('GET status', () => {
  const get = async (qs: any = { session_id: SESSION_ID }) =>
    (await handler({ headers: {}, queryStringParameters: qs, requestContext: { http: { method: 'GET' } } } as any)) as any;

  it('complete when the encounter exists', async () => {
    encounter = { sk: ENC_SK };
    const r = await get();
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ status: 'complete' });
  });

  it('processing when a live pending item exists and no encounter yet', async () => {
    expect(JSON.parse((await get()).body)).toEqual({ status: 'processing' });
  });

  it('needs-form (with the Stripe shipTo for the legacy form) when neither exists', async () => {
    pending = undefined;
    const b = JSON.parse((await get()).body);
    expect(b.status).toBe('needs-form');
    expect(b.shipTo).toMatchObject({ line1: '1 Main St', city: 'Austin' });
  });

  it('needs-form when the pending item has expired', async () => {
    pending = { ...PENDING, ttl: 1 };
    expect(JSON.parse((await get()).body).status).toBe('needs-form');
  });

  it('needs-form without shipTo when Stripe holds no address (legacy buyer types one)', async () => {
    pending = undefined;
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, shipping_details: null });
    expect(JSON.parse((await get()).body)).toEqual({ status: 'needs-form' });
  });

  it('a legacy session (no intakeId) with no encounter is needs-form', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: { ...SESSION.metadata, intakeId: undefined } });
    expect(JSON.parse((await get()).body).status).toBe('needs-form');
  });

  it('402 for an unpaid session', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, payment_status: 'unpaid' });
    expect((await get()).statusCode).toBe(402);
  });

  it('400 without session_id', async () => {
    expect((await get({})).statusCode).toBe(400);
  });
});
