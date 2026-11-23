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
const sessionCreateMock = vi.fn();
const sessionRetrieveMock = vi.fn();
const promoListMock = vi.fn();
vi.mock('@my4mlife/stripe-client', () => ({
  getStripeClient: vi.fn(async () => ({
    checkout: { sessions: { create: sessionCreateMock, retrieve: sessionRetrieveMock } }, promotionCodes: { list: promoListMock },
  })),
}));
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: vi.fn() }));
let dark = false;
const laneInputs: any[] = [];
vi.mock('@my4mlife/push-patch-checkout', async (orig) => {
  const real = await orig<typeof import('@my4mlife/push-patch-checkout')>();
  return {
    ...real,
    resolveTestPrice: async () => null,
    buildLaneSessionParams: (i: any) => {
      laneInputs.push(i);
      return dark ? null : { mode: i.autoShip ? 'subscription' : 'payment', metadata: { skuIds: i.skuId, lane: 'glp1', autoShip: String(i.autoShip), intakeId: i.intakeId, contactId: i.contactId, ...i.screenMeta } };
    },
  };
});

import { deriveContactId } from '@my4mlife/contact-id';
import { handler } from './handler';

const NOW = '2026-11-23T15:00:00.000Z';
const EMAIL = 'jane@example.com';
const CONTACT = deriveContactId(EMAIL);
const KNOCKOUTS = ['pancreatitis', 'mtc-men2', 'pregnancy', 'type1-diabetes', 'under-18', 'gastroparesis', 'eating-disorder'];
const noAnswers = Object.fromEntries(KNOCKOUTS.map((k) => [k, false]));
const BODY = {
  lane: 'glp1', skuId: 'glp1-tirzep', autoShip: true,
  screening: { version: 'glp1-screen-v1', answers: noAnswers },
  health: {
    dob: '1980-05-02', sex: 'female', heightFt: 5, heightIn: 6, weightLb: 200, goalWeightLb: 160,
    conditions: ['hypertension'], safetyHistory: ['gallstones'], priorGlp1: 'never',
    interactingMeds: ['insulin'], otherMeds: 'none', allergies: 'none',
  },
  signature: { typedName: 'Jane Q Doe' },
  contact: { firstName: 'Jane', lastName: 'Doe', email: 'Jane@Example.com', phone: '+15551234567' },
};
const evt = (body: unknown) => ({
  rawPath: '/api/push-patch-pre-intake', body: JSON.stringify(body), headers: { 'user-agent': 'UA' },
  requestContext: { http: { method: 'POST', path: '/api/push-patch-pre-intake', sourceIp: '203.0.113.7' } },
}) as any;
const call = async (b: unknown = BODY) => (await handler(evt(b))) as any;
const puts = () => ddbSendMock.mock.calls.map((c) => c[0].input).filter((i) => i.Item);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
  process.env['STRIPE_MODE'] = 'live';
  dark = false; laneInputs.length = 0;
  ddbSendMock.mockReset(); ddbSendMock.mockResolvedValue({});
  sessionCreateMock.mockReset(); sessionCreateMock.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/g', id: 'cs_g' });
  promoListMock.mockReset(); promoListMock.mockResolvedValue({ data: [] });
});
afterEach(() => vi.useRealTimers());

describe('pre-intake lane glp1', () => {
  it('400 on an unknown lane', async () => {
    expect((await call({ ...BODY, lane: 'nope' })).statusCode).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });
  it('403 on a knockout, nothing written', async () => {
    const r = await call({ ...BODY, screening: { ...BODY.screening, answers: { ...noAnswers, pancreatitis: true } } });
    expect(r.statusCode).toBe(403);
    expect(ddbSendMock).not.toHaveBeenCalled();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });
  it('400 on an invalid health form', async () => {
    expect((await call({ ...BODY, health: { ...BODY.health, sex: 'x' } })).statusCode).toBe(400);
  });
  it('503 when GLP-1 prices do not exist, nothing written', async () => {
    dark = true;
    expect((await call()).statusCode).toBe(503);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });
  it('returns { url }, skips the partner lookup, builds the glp1 session', async () => {
    const r = await call({ ...BODY, ref: 'heritage' });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ url: 'https://checkout.stripe.com/c/pay/g' });
    expect(promoListMock).not.toHaveBeenCalled();
    expect(laneInputs[0]).toMatchObject({ lane: 'glp1', autoShip: true, skuId: 'glp1-tirzep', email: EMAIL, contactId: CONTACT });
    expect(laneInputs[0].promotionCodeId).toBeUndefined();
    expect(sessionCreateMock.mock.calls[0][0].metadata).toMatchObject({ lane: 'glp1', screen_v: 'glp1-screen-v1' });
  });
  it('stores the pending item with lane, sku, autoShip, health, screening and the signature', async () => {
    await call();
    const item = puts().find((i) => String(i.Item.sk).startsWith('pending-intake#')).Item;
    expect(item).toMatchObject({
      contactId: CONTACT, lane: 'glp1', skuId: 'glp1-tirzep', autoShip: true, email: EMAIL, firstName: 'Jane', lastName: 'Doe',
      phone: '+15551234567', consentName: 'Jane Q Doe', privacyAck: true, signedAt: NOW,
      glp1: { health: { heightFt: 5, priorGlp1: 'never' }, screening: { version: 'glp1-screen-v1' } },
    });
  });
});

// ---- finalize ----
const SID = 'cs_g1'; const IID = 'int-g1'; const PROVIDER = 'provider@example.com';
const SESSION = {
  id: SID, payment_status: 'paid', payment_intent: 'pi_1', amount_total: 37500, currency: 'usd',
  metadata: {
    skuIds: 'glp1-tirzep', lane: 'glp1', autoShip: 'true', contactId: CONTACT, intakeId: IID,
    screen_v: 'glp1-screen-v1', screen_at: NOW, screen_denied: KNOCKOUTS.join(','),
  },
  customer_details: { email: 'Jane@Example.com', name: 'Card Holder' },
  shipping_details: { name: 'Jane Doe', address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } },
};
const PENDING = {
  contactId: CONTACT, sk: `pending-intake#${IID}`, intakeId: IID, email: EMAIL, firstName: 'Jane', lastName: 'Doe', skuId: 'glp1-tirzep',
  lane: 'glp1', autoShip: true, dob: '1980-05-02', sex: 'female', phone: '+15551234567', medications: ['insulin'], allergies: [], conditions: ['hypertension'],
  consentName: 'Jane Q Doe', privacyAck: true, signedAt: NOW,
  glp1: { health: BODY.health, screening: { version: 'glp1-screen-v1' } },
  ttl: Math.floor(Date.parse(NOW) / 1000) + 86400,
};
const fn = (c: any[]) => c[0].input.FunctionName as string;
const payload = (c: any[]) => JSON.parse(Buffer.from(c[0].input.Payload).toString('utf8'));
const inputs = () => ddbSendMock.mock.calls.map((c) => c[0].input);

describe('finalize lane glp1', () => {
  beforeEach(() => {
    sessionRetrieveMock.mockReset(); sessionRetrieveMock.mockResolvedValue(SESSION);
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name === 'GetCommand' && cmd.input.Key.sk === `pending-intake#${IID}`) return { Item: PENDING };
      return {};
    });
    ssmSendMock.mockReset();
    ssmSendMock.mockImplementation(async (cmd: any) => ({ Parameter: { Value: cmd.input.Name.endsWith('provider/email') ? PROVIDER : 'secret' } }));
    lambdaSendMock.mockReset();
    lambdaSendMock.mockImplementation(async (cmd: any) =>
      cmd.input.FunctionName.includes('export-clinical-packet') ? { Payload: Buffer.from(JSON.stringify({ ok: true, summaryUrl: 'https://s3/p' })) } : {});
  });
  const run = async () => (await handler({ mode: 'finalize', sessionId: SID, intakeId: IID } as any)) as any;

  it('creates encounter g1-<sessionId> with lane glp1 and records screeningAnswers.glp1 + the glp1 consent', async () => {
    expect(await run()).toEqual({ result: 'ok' });
    const enc = inputs().find((i) => i.Item?.sk === `encounter#g1-${SID}`);
    expect(enc.Item).toMatchObject({ lane: 'glp1', sku: 'glp1-tirzep', category: 'glp1' });
    const sets = inputs().filter((i) => i.ExpressionAttributeNames?.['#m1']);
    const names = Object.values(sets[sets.length - 1].ExpressionAttributeNames);
    expect(names).toEqual(expect.arrayContaining(['screeningAnswers', 'glp1', 'consent-telehealth-glp1-v1']));
    expect(names).not.toContain('pushPatch');
  });
  it('sends one provider email with the GLP-1 subject, BMI, answers, product, auto-ship and denied knockouts', async () => {
    await run();
    const mails = lambdaSendMock.mock.calls.filter((c) => fn(c).includes('email-sender') && payload(c).to === PROVIDER);
    expect(mails).toHaveLength(1);
    const p = payload(mails[0]);
    expect(p.subject).toBe('GLP-1 review: Jane Doe · GLP-2 · Tirzep (tirzepatide)');
    for (const s of ['BMI 32.3', 'Auto-ship (every 4 weeks): yes', 'Patient denied: pancreatitis, mtc-men2', 'insulin', 'gallstones', 'Prior GLP-1: never', 'Approve', 'Decline']) expect(p.text).toContain(s);
  });
  it('a glp1 session with a non-GLP-1 sku is not treated as paid', async () => {
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: { ...SESSION.metadata, skuIds: 'push-patch-nad-ghk' } });
    await expect(run()).rejects.toThrow();
  });
  it('a push-patch sku with no lane still passes (unchanged)', async () => {
    const { lane, ...m } = SESSION.metadata as any;
    sessionRetrieveMock.mockResolvedValue({ ...SESSION, metadata: { ...m, skuIds: 'push-patch-nad-ghk' } });
    ddbSendMock.mockImplementation(async (cmd: any) => (cmd.constructor.name === 'GetCommand' ? {} : {}));
    expect(await run()).toEqual({ result: 'missing' });
  });
});
