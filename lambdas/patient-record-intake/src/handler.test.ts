import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks ──────────────────────────────────────────────────────────────

const ddbSendMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  PutCommand: class PutCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

// ── Import handler AFTER mocks ─────────────────────────────────────────────────
import { handler } from './handler';

// ── Helpers ────────────────────────────────────────────────────────────────────

function evt(body: any, method = 'POST', origin?: string) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: origin ? { origin } : {},
    requestContext: { http: { method } },
  } as any;
}

const VALID_BODY = {
  email: 'tj@example.com',
  category: 'weight-loss',
  demographics: { firstName: 'TJ', lastName: 'Smith', email: 'tj@example.com', phone: '+15551234567' },
  history: { medications: ['metformin'], allergies: [], conditions: [], heightIn: 70, weightLb: 220 },
  screeningAnswers: { q1: 'yes', q2: 'no' },
  consents: {
    npp: { version: 'consent-npp-v1', agreed: true, at: '2026-06-26T10:00:00.000Z', text: 'NPP text' },
    phiAuth: { version: 'consent-phi-auth-v1', agreed: true, at: '2026-06-26T10:00:00.000Z', text: 'PHI auth text' },
  },
  cardOnFile: {
    stripeCustomerId: 'cus_test123',
    paymentMethodId: 'pm_test456',
    setupIntentId: 'seti_test789',
  },
};

beforeEach(() => {
  ddbSendMock.mockReset();
  ddbSendMock.mockResolvedValue({});
  lambdaSendMock.mockReset();
  lambdaSendMock.mockResolvedValue({});
});

// ── Test suites ────────────────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  it('returns 204 without touching DynamoDB', async () => {
    const res: any = await handler(evt({}, 'OPTIONS'));
    expect(res.statusCode).toBe(204);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });
});

describe('Validation', () => {
  it('returns 400 when email is missing', async () => {
    const { email: _e, ...body } = VALID_BODY;
    const res: any = await handler(evt(body));
    expect(res.statusCode).toBe(400);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it('returns 400 when email is empty string', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, email: '' }));
    expect(res.statusCode).toBe(400);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const res: any = await handler(evt('{bad json'));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on missing body', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'POST' } } } as any);
    expect(res.statusCode).toBe(400);
  });
});

describe('Success — happy path', () => {
  it('returns 200 with ok:true, contactId (non-empty string), and encounterId (non-empty string)', async () => {
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(typeof body.contactId).toBe('string');
    expect(body.contactId.length).toBeGreaterThan(0);
    expect(typeof body.encounterId).toBe('string');
    expect(body.encounterId.length).toBeGreaterThan(0);
  });

  it('derives contactId deterministically from email via deriveContactId', async () => {
    const res: any = await handler(evt(VALID_BODY));
    const body = JSON.parse(res.body);
    // Same email → same contactId (deterministic)
    const res2: any = await handler(evt({ ...VALID_BODY, email: 'TJ@EXAMPLE.COM' }));
    const body2 = JSON.parse(res2.body);
    expect(body.contactId).toBe(body2.contactId);
  });

  it('makes exactly 3 DynamoDB PutCommand calls (record, encounter, audit)', async () => {
    await handler(evt(VALID_BODY));
    expect(ddbSendMock).toHaveBeenCalledTimes(3);
  });

  it('keys every item by the table PK contactId (never a stray pk attribute)', async () => {
    const res: any = await handler(evt(VALID_BODY));
    const contactId = JSON.parse(res.body).contactId;
    const items = ddbSendMock.mock.calls.map((c: any[]) => c[0].input.Item);
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.contactId).toBe(contactId);
      expect(item.pk).toBeUndefined();
      expect(typeof item.sk).toBe('string');
    }
  });
});

describe('DynamoDB record item (sk:"record")', () => {
  async function getRecordItem() {
    await handler(evt(VALID_BODY));
    const calls = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    return calls.find((i: any) => i.Item?.sk === 'record');
  }

  it('writes sk:"record" with demographics, history, screeningAnswers', async () => {
    const item = await getRecordItem();
    expect(item).toBeDefined();
    expect(item.Item.sk).toBe('record');
    expect(item.Item.demographics).toMatchObject(VALID_BODY.demographics);
    expect(item.Item.history).toMatchObject(VALID_BODY.history);
    expect(item.Item.screeningAnswers).toMatchObject(VALID_BODY.screeningAnswers);
  });

  it('stores NPP consent as JSON string with version and at timestamp', async () => {
    const item = await getRecordItem();
    const npp = JSON.parse(item.Item.consents.npp);
    expect(npp.version).toBe('consent-npp-v1');
    expect(npp.at).toBe('2026-06-26T10:00:00.000Z');
  });

  it('stores PHI auth consent as JSON string with version and at timestamp', async () => {
    const item = await getRecordItem();
    const phi = JSON.parse(item.Item.consents.phiAuth);
    expect(phi.version).toBe('consent-phi-auth-v1');
    expect(phi.at).toBe('2026-06-26T10:00:00.000Z');
  });

  it('writes cardOnFile with only stripeCustomerId, paymentMethodId, setupIntentId', async () => {
    const item = await getRecordItem();
    const cof = item.Item.cardOnFile;
    expect(cof.stripeCustomerId).toBe('cus_test123');
    expect(cof.paymentMethodId).toBe('pm_test456');
    expect(cof.setupIntentId).toBe('seti_test789');
  });
});

describe('DynamoDB encounter item', () => {
  async function getEncounterItem() {
    await handler(evt(VALID_BODY));
    const calls = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    return calls.find((i: any) => typeof i.Item?.sk === 'string' && i.Item.sk.startsWith('encounter#'));
  }

  it('writes encounter item with sk starting with "encounter#"', async () => {
    const item = await getEncounterItem();
    expect(item).toBeDefined();
    expect(item.Item.sk).toMatch(/^encounter#/);
  });

  it('writes state:"new"', async () => {
    const item = await getEncounterItem();
    expect(item.Item.state).toBe('new');
  });

  it('sets visitType to "async" for non-testosterone category', async () => {
    const item = await getEncounterItem();
    expect(item.Item.visitType).toBe('async');
  });

  it('sets visitType to "audio-visual" for testosterone-ed category', async () => {
    await handler(evt({ ...VALID_BODY, category: 'testosterone-ed' }));
    const calls = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    const encItem = calls.find((i: any) => typeof i.Item?.sk === 'string' && i.Item.sk.startsWith('encounter#'));
    expect(encItem.Item.visitType).toBe('audio-visual');
  });
});

describe('DynamoDB audit item', () => {
  async function getAuditItem() {
    await handler(evt(VALID_BODY));
    const calls = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    return calls.find((i: any) => typeof i.Item?.sk === 'string' && i.Item.sk.startsWith('audit#'));
  }

  it('writes audit item with sk starting with "audit#"', async () => {
    const item = await getAuditItem();
    expect(item).toBeDefined();
    expect(item.Item.sk).toMatch(/^audit#/);
  });

  it('writes action containing "record-created"', async () => {
    const item = await getAuditItem();
    expect(item.Item.action).toContain('record-created');
  });
});

describe('SECURITY — raw card data never written to DynamoDB', () => {
  const RAW_CARD_KEYS = ['number', 'cvc', 'exp', 'expMonth', 'expYear'];

  it('strips raw card fields from cardOnFile before writing', async () => {
    const body = {
      ...VALID_BODY,
      cardOnFile: {
        stripeCustomerId: 'cus_test123',
        paymentMethodId: 'pm_test456',
        setupIntentId: 'seti_test789',
        // Raw card data — must NEVER reach DynamoDB
        number: '4111111111111111',
        cvc: '123',
        expMonth: 12,
        expYear: 2029,
        exp: '12/29',
      },
    };
    await handler(evt(body));
    const allItems = ddbSendMock.mock.calls.map((c: any[]) => c[0].input?.Item);
    for (const item of allItems) {
      if (!item) continue;
      for (const key of RAW_CARD_KEYS) {
        expect(item[key]).toBeUndefined();
        // Also check nested cardOnFile
        if (item.cardOnFile) {
          expect(item.cardOnFile[key]).toBeUndefined();
        }
      }
    }
  });

  it('does not write any raw card keys even in the top-level record item', async () => {
    const body = {
      ...VALID_BODY,
      cardOnFile: {
        ...VALID_BODY.cardOnFile,
        number: '4111111111111111',
        cvc: '999',
      },
    };
    await handler(evt(body));
    const calls = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    const recordItem = calls.find((i: any) => i.Item?.sk === 'record');
    expect(recordItem.Item.cardOnFile.number).toBeUndefined();
    expect(recordItem.Item.cardOnFile.cvc).toBeUndefined();
  });
});

describe('Email sender — fire-and-forget', () => {
  it('invokes email-sender lambda asynchronously (InvocationType Event)', async () => {
    await handler(evt(VALID_BODY));
    expect(lambdaSendMock).toHaveBeenCalledTimes(1);
    const invokeCmd = lambdaSendMock.mock.calls[0][0];
    expect(invokeCmd.input.InvocationType).toBe('Event');
    expect(invokeCmd.input.FunctionName).toBe('my4mlife-email-sender');
  });

  it('returns 200 even if email-sender throws', async () => {
    lambdaSendMock.mockRejectedValueOnce(new Error('email boom'));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    expect(ddbSendMock).toHaveBeenCalledTimes(3);
  });
});

describe('CORS headers', () => {
  it('returns default CORS origin when no origin header', async () => {
    const res: any = await handler(evt(VALID_BODY));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
    expect(res.headers['Vary']).toBe('Origin');
  });

  it('reflects allowlisted origin', async () => {
    const res: any = await handler(evt(VALID_BODY, 'POST', 'https://app.my4mlife.com'));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://app.my4mlife.com');
  });

  it('falls back to default for unknown origin', async () => {
    const res: any = await handler(evt(VALID_BODY, 'POST', 'https://evil.com'));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
  });
});
