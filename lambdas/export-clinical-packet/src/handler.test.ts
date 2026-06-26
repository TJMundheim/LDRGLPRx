import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks — must be declared before any import of the module under test ──

const ddbSendMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  QueryCommand: class QueryCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const s3SendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class S3Client { constructor(_: any) {} send = (...a: any[]) => s3SendMock(...a); },
  PutObjectCommand: class PutObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
  GetObjectCommand: class GetObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-url-sentinel'),
}));

const SIGNED_URL_SENTINEL = 'https://s3.example.com/signed-url-sentinel';

// Import getSignedUrl after mocking so we can spy on it
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handler, computeBmi, assemblePacket, renderSummary } from './handler';

// ── Test fixtures ────────────────────────────────────────────────────────────

const VALID_KEY = 'test-packet-key-abc123';

const RECORD_ITEM = {
  contactId: 'contact-abc',
  sk: 'record',
  demographics: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+15551234567', dob: '1972-05-01', sex: 'M', state: 'TX' },
  history: { heightIn: 72, weightLb: 190, medications: ['Metformin 500mg'], allergies: ['Penicillin'], conditions: ['Type 2 Diabetes'] },
  screeningAnswers: { gut: 3, weight: 4, sleep: 2 },
  consents: { 'consent-npp-v1': { version: 'consent-npp-v1', agreed: true, at: '2026-06-01T10:00:00.000Z' } },
  cardOnFile: { stripeCustomerId: 'cus_abc', paymentMethodId: 'pm_abc' },
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
};

const ENCOUNTER_ITEM = {
  contactId: 'contact-abc',
  sk: 'encounter#enc-xyz',
  encounterId: 'enc-xyz',
  category: 'weight-loss',
  state: 'new',
  visitType: 'async',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
};

function makeEvent(body: unknown, key = VALID_KEY, method = 'POST'): any {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'x-packet-key': key },
    requestContext: { http: { method } },
  };
}

beforeEach(() => {
  process.env.PACKET_API_KEY = VALID_KEY;
  process.env.PATIENT_RECORDS_TABLE = 'PatientRecords';
  process.env.PACKET_BUCKET = 'my4mlife-digital-fulfillment';

  ddbSendMock.mockReset();
  ddbSendMock.mockResolvedValue({ Items: [RECORD_ITEM, ENCOUNTER_ITEM] });

  s3SendMock.mockReset();
  s3SendMock.mockResolvedValue({});

  vi.mocked(getSignedUrl).mockResolvedValue(SIGNED_URL_SENTINEL);
});

// ── Unit: computeBmi ─────────────────────────────────────────────────────────

describe('computeBmi', () => {
  it('computes BMI correctly (703 * lb / in^2, rounded to 1 decimal)', () => {
    // 703 * 190 / (72 * 72) = 133570 / 5184 ≈ 25.765... → 25.8
    expect(computeBmi(72, 190)).toBe(25.8);
  });
  it('returns null when height is missing', () => { expect(computeBmi(undefined, 190)).toBeNull(); });
  it('returns null when weight is missing', () => { expect(computeBmi(72, undefined)).toBeNull(); });
  it('returns null when height is zero', () => { expect(computeBmi(0, 190)).toBeNull(); });
});

// ── Unit: assemblePacket ─────────────────────────────────────────────────────

describe('assemblePacket', () => {
  it('assembles demographics, bmi, medications, allergies, conditions, consents, cardOnFile', () => {
    const packet = assemblePacket({ contactId: 'contact-abc', encounterId: 'enc-xyz',
      exportedAt: '2026-06-26T00:00:00.000Z', record: RECORD_ITEM, encounter: ENCOUNTER_ITEM });
    expect(packet.demographics).toMatchObject({ firstName: 'John', email: 'john@example.com' });
    expect(packet.bmi).toBe(25.8);
    expect(packet.medications).toEqual(['Metformin 500mg']);
    expect(packet.allergies).toEqual(['Penicillin']);
    expect(packet.conditions).toEqual(['Type 2 Diabetes']);
    expect(packet.screeningAnswers).toEqual({ gut: 3, weight: 4, sleep: 2 });
    expect(packet.consents).toMatchObject({ 'consent-npp-v1': { agreed: true } });
    expect(packet.category).toBe('weight-loss');
    expect(packet.visitType).toBe('async');
    expect(packet.state).toBe('new');
  });

  it('SECURITY: cardOnFile is boolean — never exposes raw card data', () => {
    const packet = assemblePacket({ contactId: 'c', encounterId: 'e', exportedAt: '2026-06-26T00:00:00Z',
      record: RECORD_ITEM, encounter: ENCOUNTER_ITEM });
    // Must be a boolean, not an object
    expect(typeof packet.cardOnFile).toBe('boolean');
    expect(packet.cardOnFile).toBe(true);
    // Serialised packet must not contain raw card fields
    const serialised = JSON.stringify(packet);
    expect(serialised).not.toMatch(/"number"/);
    expect(serialised).not.toMatch(/"cvc"/);
    expect(serialised).not.toMatch(/paymentMethodId/);
    expect(serialised).not.toMatch(/stripeCustomerId/);
  });

  it('cardOnFile is false when no payment reference is present', () => {
    const record = { ...RECORD_ITEM, cardOnFile: {} };
    const packet = assemblePacket({ contactId: 'c', encounterId: 'e', exportedAt: '2026-06-26T00:00:00Z',
      record, encounter: ENCOUNTER_ITEM });
    expect(packet.cardOnFile).toBe(false);
  });
});

// ── Unit: renderSummary ──────────────────────────────────────────────────────

describe('renderSummary', () => {
  it('renders a deterministic HTML string containing key fields', () => {
    const packet = assemblePacket({ contactId: 'contact-abc', encounterId: 'enc-xyz',
      exportedAt: '2026-06-26T00:00:00.000Z', record: RECORD_ITEM, encounter: ENCOUNTER_ITEM });
    const html = renderSummary(packet);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('John');
    expect(html).toContain('Metformin');
    expect(html).toContain('25.8');          // BMI rendered
    expect(html).toContain('weight-loss');   // category
    expect(html).toContain('async');         // visitType
    expect(html).toContain('new');           // state
  });

  it('SECURITY: rendered HTML never contains raw card fields (number, cvc)', () => {
    const packet = assemblePacket({ contactId: 'c', encounterId: 'e', exportedAt: '2026-06-26T00:00:00Z',
      record: { ...RECORD_ITEM, cardOnFile: { paymentMethodId: 'pm_secret', stripeCustomerId: 'cus_secret' } },
      encounter: ENCOUNTER_ITEM });
    const html = renderSummary(packet);
    expect(html).not.toContain('pm_secret');
    expect(html).not.toContain('cus_secret');
    expect(html).not.toContain('number');
    expect(html).not.toContain('cvc');
  });

  it('output is deterministic for the same input (no Date.now / random)', () => {
    const packet = assemblePacket({ contactId: 'c', encounterId: 'e',
      exportedAt: '2026-06-26T00:00:00.000Z', record: RECORD_ITEM, encounter: ENCOUNTER_ITEM });
    expect(renderSummary(packet)).toBe(renderSummary(packet));
  });
});

// ── Integration: handler ─────────────────────────────────────────────────────

describe('handler — auth', () => {
  it('returns 401 when x-packet-key header is missing', async () => {
    const event = { body: JSON.stringify({ contactId: 'c', encounterId: 'e' }), headers: {}, requestContext: { http: { method: 'POST' } } };
    const res: any = await handler(event as any);
    expect(res.statusCode).toBe(401);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });

  it('returns 401 when x-packet-key is wrong', async () => {
    const res: any = await handler(makeEvent({ contactId: 'c', encounterId: 'e' }, 'wrong-key'));
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when PACKET_API_KEY env is empty', async () => {
    process.env.PACKET_API_KEY = '';
    const res: any = await handler(makeEvent({ contactId: 'c', encounterId: 'e' }));
    expect(res.statusCode).toBe(401);
  });

  it('handles OPTIONS preflight without auth check', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'OPTIONS' } } } as any);
    expect(res.statusCode).toBe(204);
    expect(ddbSendMock).not.toHaveBeenCalled();
  });
});

describe('handler — validation', () => {
  it('returns 400 when body is missing', async () => {
    const res: any = await handler({ headers: { 'x-packet-key': VALID_KEY }, requestContext: { http: { method: 'POST' } } } as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const res: any = await handler({ body: '{not json', headers: { 'x-packet-key': VALID_KEY }, requestContext: { http: { method: 'POST' } } } as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when contactId is missing', async () => {
    const res: any = await handler(makeEvent({ encounterId: 'e' }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when encounterId is missing', async () => {
    const res: any = await handler(makeEvent({ contactId: 'c' }));
    expect(res.statusCode).toBe(400);
  });
});

describe('handler — not found', () => {
  it('returns 404 when record item is absent', async () => {
    ddbSendMock.mockResolvedValue({ Items: [ENCOUNTER_ITEM] }); // no record item
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toContain('patient record');
  });

  it('returns 404 when encounter item is absent', async () => {
    ddbSendMock.mockResolvedValue({ Items: [RECORD_ITEM] }); // no encounter item
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toContain('encounter');
  });

  it('returns 404 when Items is empty', async () => {
    ddbSendMock.mockResolvedValue({ Items: [] });
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    expect(res.statusCode).toBe(404);
  });
});

describe('handler — happy path', () => {
  it('queries PatientRecords by contactId', async () => {
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    expect(res.statusCode).toBe(200);
    expect(ddbSendMock).toHaveBeenCalledTimes(1);
    const cmd = ddbSendMock.mock.calls[0][0];
    expect(cmd.input.TableName).toBe('PatientRecords');
    expect(cmd.input.KeyConditionExpression).toContain('contactId = :cid');
    expect(cmd.input.ExpressionAttributeValues[':cid']).toBe('contact-abc');
  });

  it('uploads HTML to correct S3 key via PutObjectCommand', async () => {
    await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    // First PutObject call is the actual upload
    const uploadCall = s3SendMock.mock.calls[0][0];
    expect(uploadCall.input.Bucket).toBe('my4mlife-digital-fulfillment');
    expect(uploadCall.input.Key).toBe('clinical-packets/contact-abc/enc-xyz.html');
    expect(uploadCall.input.ContentType).toBe('text/html');
    expect(typeof uploadCall.input.Body).toBe('string');
    expect(uploadCall.input.Body).toContain('<!DOCTYPE html>');
  });

  it('returns 200 with ok, packet, and signed summaryUrl sentinel', async () => {
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.summaryUrl).toBe(SIGNED_URL_SENTINEL);
    expect(body.packet.contactId).toBe('contact-abc');
    expect(body.packet.encounterId).toBe('enc-xyz');
    expect(body.packet.demographics).toMatchObject({ firstName: 'John' });
    expect(body.packet.bmi).toBe(25.8);
    expect(body.packet.category).toBe('weight-loss');
    expect(body.packet.visitType).toBe('async');
    expect(body.packet.state).toBe('new');
  });

  it('SECURITY: response body never contains raw card number, cvc, paymentMethodId, or stripeCustomerId', async () => {
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    const raw = res.body;
    expect(raw).not.toMatch(/"number"/);
    expect(raw).not.toMatch(/"cvc"/);
    expect(raw).not.toMatch(/paymentMethodId/);
    expect(raw).not.toMatch(/stripeCustomerId/);
    // cardOnFile should be present as a boolean
    const body = JSON.parse(raw);
    expect(typeof body.packet.cardOnFile).toBe('boolean');
  });

  it('returns CORS headers with default origin fallback', async () => {
    const res: any = await handler(makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
    expect(res.headers['Vary']).toBe('Origin');
  });

  it('reflects allowlisted origin in CORS header', async () => {
    const event = { ...makeEvent({ contactId: 'contact-abc', encounterId: 'enc-xyz' }),
      headers: { 'x-packet-key': VALID_KEY, origin: 'https://app.my4mlife.com' } };
    const res: any = await handler(event as any);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://app.my4mlife.com');
  });
});
