import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks ──────────────────────────────────────────────────────────────

const ddbSendMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  PutCommand: class PutCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
  UpdateCommand: class UpdateCommand {
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

const upsertContactMock = vi.fn();
vi.mock('@my4mlife/contact-upsert', () => ({
  upsertContact: (...a: any[]) => upsertContactMock(...a),
}));

// ── Import handler AFTER mocks ─────────────────────────────────────────────────
import { handler } from './handler';

// ── Helpers ────────────────────────────────────────────────────────────────────

function evt(body: any, method = 'POST', origin?: string, http: Record<string, string> = {}) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: origin ? { origin } : {},
    requestContext: { http: { method, ...http } },
  } as any;
}

const VALID_BODY = {
  email: 'tj@example.com',
  category: 'weight-loss',
  demographics: { firstName: 'TJ', lastName: 'Smith', email: 'tj@example.com', phone: '+15551234567' },
  history: { medications: ['metformin'], allergies: [], conditions: [], heightIn: 70, weightLb: 220 },
  screeningAnswers: { q1: 'yes', q2: 'no' },
  consents: {
    'consent-contact-v1': { version: 'v1', at: '2026-06-26T10:00:00.000Z' },
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
  upsertContactMock.mockReset();
  upsertContactMock.mockResolvedValue(undefined);
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

  it('makes exactly 5 DynamoDB calls (record, consent bootstrap, consent keys, encounter, audit)', async () => {
    await handler(evt(VALID_BODY));
    expect(ddbSendMock).toHaveBeenCalledTimes(5);
  });

  it('keys every item by the table PK contactId (never a stray pk attribute)', async () => {
    const res: any = await handler(evt(VALID_BODY));
    const contactId = JSON.parse(res.body).contactId;
    const inputs = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    expect(inputs).toHaveLength(5);
    for (const input of inputs) {
      // Write 1 (record) is an UpdateCommand keyed via Key; writes 2/3 are
      // PutCommands keyed via Item.
      const keyed = input.Item ?? input.Key;
      expect(keyed.contactId).toBe(contactId);
      expect(keyed.pk).toBeUndefined();
      expect(typeof keyed.sk).toBe('string');
    }
  });
});

describe('DynamoDB record item (sk:"record")', () => {
  async function getRecordItem() {
    await handler(evt(VALID_BODY));
    const calls = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    return calls.find((i: any) => i.Key?.sk === 'record');
  }

  it('writes sk:"record" with demographics, history, screeningAnswers', async () => {
    const item = await getRecordItem();
    expect(item).toBeDefined();
    expect(item.Key.sk).toBe('record');
    expect(item.ExpressionAttributeValues[':dem']).toMatchObject(VALID_BODY.demographics);
    expect(item.ExpressionAttributeValues[':hist']).toMatchObject(VALID_BODY.history);
    expect(item.ExpressionAttributeValues[':scr']).toMatchObject(VALID_BODY.screeningAnswers);
  });

  it('stores a client consent key as a per-key SET of a JSON string (never replaces the map)', async () => {
    await handler(evt(VALID_BODY));
    const upd = ddbSendMock.mock.calls.map((c: any[]) => c[0].input)
      .filter((i: any) => i.Key?.sk === 'record' && /#c\.#k/.test(i.UpdateExpression ?? ''));
    expect(upd).toHaveLength(1);
    const names = upd[0].ExpressionAttributeNames;
    expect(Object.values(names)).toContain('consent-contact-v1');
    const stored = Object.values(upd[0].ExpressionAttributeValues).find((v) => typeof v === 'string' && v.includes('"v1"'));
    expect(JSON.parse(stored as string)).toMatchObject({ version: 'v1', at: '2026-06-26T10:00:00.000Z' });
  });

  it('the record update no longer carries a consents = :con replacement', async () => {
    const item = await getRecordItem();
    expect(item.UpdateExpression).not.toContain('consents');
    expect(item.ExpressionAttributeValues[':con']).toBeUndefined();
  });

  it('writes cardOnFile with only stripeCustomerId, paymentMethodId, setupIntentId', async () => {
    const item = await getRecordItem();
    const cof = item.ExpressionAttributeValues[':card'];
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

  it('sets visitType to "audio-visual" for menopause-hrt category', async () => {
    await handler(evt({ ...VALID_BODY, category: 'menopause-hrt' }));
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
    const inputs = ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
    // Write 1 (record) is an UpdateCommand — its cardOnFile lives under
    // ExpressionAttributeValues[':card']; writes 2/3 are PutCommands with Item.
    const allItems = inputs.map((i: any) => i.Item ?? i.ExpressionAttributeValues?.[':card']);
    for (const item of allItems) {
      if (!item) continue;
      for (const key of RAW_CARD_KEYS) {
        expect(item[key]).toBeUndefined();
        // Also check nested cardOnFile (PutCommand items only)
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
    const recordItem = calls.find((i: any) => i.Key?.sk === 'record');
    expect(recordItem.ExpressionAttributeValues[':card'].number).toBeUndefined();
    expect(recordItem.ExpressionAttributeValues[':card'].cvc).toBeUndefined();
  });
});

describe('Email sender — fire-and-forget', () => {
  it('invokes coordinator-brief lambda asynchronously (InvocationType Event)', async () => {
    await handler(evt(VALID_BODY));
    expect(lambdaSendMock).toHaveBeenCalledTimes(1);
    const invokeCmd = lambdaSendMock.mock.calls[0][0];
    expect(invokeCmd.input.InvocationType).toBe('Event');
    expect(invokeCmd.input.FunctionName).toBe('my4mlife-coordinator-brief');
  });

  it('returns 200 even if email-sender throws', async () => {
    lambdaSendMock.mockRejectedValueOnce(new Error('email boom'));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    expect(ddbSendMock).toHaveBeenCalledTimes(5);
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

describe('Contact capture (email/name only)', () => {
  it('calls upsertContact with exactly the allowed keys and nothing else', async () => {
    await handler(evt(VALID_BODY));
    expect(upsertContactMock).toHaveBeenCalledTimes(1);
    const input = upsertContactMock.mock.calls[0][1];
    expect(input).toEqual({
      email: 'tj@example.com',
      firstName: 'TJ',
      lastName: 'Smith',
      phone: '+15551234567',
      source: 'consult-intake:weight-loss',
      tags: ['weight-loss'],
      stage: 'lead',
      event: { type: 'consult-intake' },
    });
    expect(Object.keys(input).sort()).toEqual(
      ['email', 'event', 'firstName', 'lastName', 'phone', 'source', 'stage', 'tags']);
  });

  it('never passes demographics, history, answers, consents or card data', async () => {
    await handler(evt(VALID_BODY));
    const json = JSON.stringify(upsertContactMock.mock.calls[0]);
    for (const leak of ['metformin', 'screeningAnswers', 'q1', 'cus_test123', 'pm_test456', 'NPP text', 'heightIn']) {
      expect(json).not.toContain(leak);
    }
  });

  it('omits phone when it is a placeholder, and names when absent', async () => {
    await handler(evt({ ...VALID_BODY, demographics: { phone: '+10000000000' } }));
    const input = upsertContactMock.mock.calls[0][1];
    expect(Object.keys(input).sort()).toEqual(['email', 'event', 'source', 'stage', 'tags']);
  });

  it('defaults lane to general', async () => {
    const { category: _c, ...body } = VALID_BODY;
    await handler(evt(body));
    expect(upsertContactMock.mock.calls[0][1].source).toBe('consult-intake:general');
  });

  it('still returns 200 when upsertContact rejects, logging no email', async () => {
    upsertContactMock.mockRejectedValue(new Error('boom tj@example.com'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
    const logged = JSON.stringify([...warn.mock.calls, ...err.mock.calls]);
    expect(logged).not.toContain('tj@example.com');
    warn.mockRestore(); err.mockRestore();
  });

  it('does not call upsertContact on a validation failure', async () => {
    await handler(evt({ ...VALID_BODY, email: '' }));
    expect(upsertContactMock).not.toHaveBeenCalled();
  });
});

// ── Sign at intake (Appendix B) ──────────────────────────────────────────────────

describe('Sign at intake', () => {
  const SIGNED_BODY = { ...VALID_BODY, privacySign: { agreed: true, typedName: 'TJ Smith' } };
  const http = { sourceIp: '203.0.113.9', userAgent: 'TestAgent/1.0' };
  const inputs = () => ddbSendMock.mock.calls.map((c: any[]) => c[0].input);
  const payloads = () => lambdaSendMock.mock.calls
    .filter((c: any[]) => c[0].input.FunctionName === 'my4mlife-email-sender')
    .map((c: any[]) => JSON.parse(Buffer.from(c[0].input.Payload).toString()));

  it('valid signature stores both keys as JSON {version, legalVersion, at, typedName, ip, userAgent}', async () => {
    const res: any = await handler(evt(SIGNED_BODY, 'POST', undefined, http));
    expect(JSON.parse(res.body).consentsSigned).toBe(true);
    const upd = inputs().find((i: any) => Object.values(i.ExpressionAttributeNames ?? {}).includes('consent-npp-v1'));
    expect(upd.UpdateExpression).toMatch(/#c\.#k\d = :v\d/);
    // Resolve each key name to its stored value.
    const stored = (key: string) => {
      const ph = Object.entries(upd.ExpressionAttributeNames).find(([, v]) => v === key)![0];
      return JSON.parse(upd.ExpressionAttributeValues[`:v${ph.slice(2)}`]);
    };
    const npp = stored('consent-npp-v1');
    const phi = stored('consent-phi-auth-v1');
    expect(npp).toMatchObject({
      version: 'consent-npp-v1', legalVersion: '2026-09', typedName: 'TJ Smith',
      ip: '203.0.113.9', userAgent: 'TestAgent/1.0',
    });
    expect(typeof npp.at).toBe('string');
    expect(phi).toEqual({ ...npp, version: 'consent-phi-auth-v1' });
  });

  it('writes a consent.signed audit with the encounterId and an sk different from record-created', async () => {
    const res: any = await handler(evt(SIGNED_BODY, 'POST', undefined, http));
    const { encounterId } = JSON.parse(res.body);
    const audits = inputs().map((i: any) => i.Item).filter((it: any) => it?.sk?.startsWith('audit#'));
    const created = audits.find((a: any) => a.action === 'record-created');
    const signed = audits.find((a: any) => a.action === 'consent.signed');
    expect(signed.encounterId).toBe(encounterId);
    expect(signed.detail).toEqual({ npp: true, phiAuth: true, source: 'intake' });
    expect(signed.sk).not.toBe(created.sk);
  });

  it('emails the signed copy to the patient and a notice to drtj@', async () => {
    await handler(evt(SIGNED_BODY, 'POST', undefined, http));
    const mails = payloads();
    expect(mails).toHaveLength(2);
    const patient = mails.find((m: any) => m.to === 'tj@example.com');
    expect(patient).toMatchObject({ kind: 'info', subject: 'Your signed My4MLife privacy notice and authorization' });
    expect(patient.html).toContain('TJ Smith');
    expect(patient.html).toContain('Notice of Privacy Practices');
    const notice = mails.find((m: any) => m.to === 'drtj@my4mlife.com');
    expect(notice.kind).toBe('info');
    expect(notice.subject).toBe('[Consent signed] TJ Smith');
  });

  it('copy-email failure still returns 200 with consentsSigned:true', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.FunctionName === 'my4mlife-email-sender') throw new Error('ses down');
      return {};
    });
    const res: any = await handler(evt(SIGNED_BODY, 'POST', undefined, http));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).consentsSigned).toBe(true);
  });

  it('name mismatch → 200, consentsSigned:false, no NPP/PHI write or audit', async () => {
    const body = { ...VALID_BODY, privacySign: { agreed: true, typedName: 'Bob Jones' } };
    const res: any = await handler(evt(body, 'POST', undefined, http));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).consentsSigned).toBe(false);
    expect(inputs().some((i: any) => Object.values(i.ExpressionAttributeNames ?? {}).includes('consent-npp-v1'))).toBe(false);
    expect(inputs().some((i: any) => i.Item?.action === 'consent.signed')).toBe(false);
    expect(payloads()).toHaveLength(0);
  });

  it.each([
    ['agreed false', { agreed: false, typedName: 'TJ Smith' }],
    ['too short', { agreed: true, typedName: 'TJ' }],
    ['absent', undefined],
  ])('%s → not signed', async (_n, privacySign) => {
    const res: any = await handler(evt({ ...VALID_BODY, privacySign }, 'POST', undefined, http));
    expect(JSON.parse(res.body).consentsSigned).toBe(false);
    expect(inputs().some((i: any) => i.Item?.action === 'consent.signed')).toBe(false);
  });

  it('ignores forged client consent-npp-v1 / consent-phi-auth-v1 entries', async () => {
    const body = {
      ...VALID_BODY,
      consents: {
        ...VALID_BODY.consents,
        'consent-npp-v1': { version: 'consent-npp-v1', at: '2020-01-01T00:00:00.000Z' },
        'consent-phi-auth-v1': { version: 'consent-phi-auth-v1', at: '2020-01-01T00:00:00.000Z' },
      },
    };
    await handler(evt(body, 'POST', undefined, http));
    const everyName = inputs().flatMap((i: any) => Object.values(i.ExpressionAttributeNames ?? {}));
    expect(everyName).not.toContain('consent-npp-v1');
    expect(everyName).not.toContain('consent-phi-auth-v1');
    expect(JSON.stringify(inputs())).not.toContain('2020-01-01');
  });

  it('no UpdateExpression contains "consents = "', async () => {
    await handler(evt(SIGNED_BODY, 'POST', undefined, http));
    for (const i of inputs()) expect(i.UpdateExpression ?? '').not.toContain('consents = ');
  });
});
