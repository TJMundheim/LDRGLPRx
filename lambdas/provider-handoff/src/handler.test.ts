import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks — declared before any import of the module under test ──────

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: any[]) => ddbSendMock(...a) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(input: any) { this.input = input; } },
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

import { handler, patientNameOf } from './handler';
import { resetProviderEmailCache } from './config';
import { packetKeyFor } from './packet';
import { renderCoverNote, subjectFor } from './mail';

const CONSENTS = {
  'consent-npp-v1': { version: 'v1', agreed: true, at: '2026-09-28T00:00:00.000Z' },
  'consent-phi-auth-v1': { version: 'v1', agreed: true, at: '2026-09-28T00:00:00.000Z' },
};

const RECORD_ITEM = {
  contactId: 'contact-abc',
  sk: 'record',
  demographics: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  consents: CONSENTS,
};

const ENCOUNTER_ITEM = {
  contactId: 'contact-abc',
  sk: 'encounter#enc-1',
  state: 'coordinator-reviewed',
  laneLabel: 'Biome NS Rx',
};

const ADMIN = { groups: ['Admins'] };
const PACKET_URL = 'https://s3.example.com/clinical-packets/contact-abc/enc-1.html?X-Amz-Signature=abc';

/** DDB responses for a fully-consented, coordinator-reviewed encounter. */
function seedDdb(record: any = RECORD_ITEM, encounter: any = ENCOUNTER_ITEM) {
  ddbSendMock.mockImplementation(async (cmd: any) => {
    const sk = cmd.input.Key?.sk;
    if (sk === 'record') return record ? { Item: record } : {};
    if (sk === 'encounter#enc-1') return encounter ? { Item: encounter } : {};
    return {};
  });
}

/** email-sender + export-clinical-packet share one Lambda mock; dispatch on FunctionName. */
function seedLambda(packet: any = { ok: true, summaryUrl: PACKET_URL }) {
  lambdaSendMock.mockImplementation(async (cmd: any) => {
    if (cmd.input.FunctionName === 'my4mlife-export-clinical-packet') {
      return { Payload: Buffer.from(JSON.stringify(packet)) };
    }
    return {};
  });
}

function mailPayload() {
  const call = lambdaSendMock.mock.calls
    .map((c: any[]) => c[0])
    .find((c: any) => c.input.FunctionName === 'my4mlife-email-sender');
  return JSON.parse(Buffer.from(call.input.Payload).toString());
}

function ddbCalls(kind: 'Update' | 'Put') {
  return ddbSendMock.mock.calls
    .map((c: any[]) => c[0])
    .filter((c: any) => c.constructor.name === `${kind}Command`);
}

beforeEach(() => {
  process.env.PATIENT_RECORDS_TABLE = 'PatientRecords';
  process.env.EMAIL_SENDER_FN = 'my4mlife-email-sender';
  process.env.EXPORT_PACKET_FN = 'my4mlife-export-clinical-packet';
  ddbSendMock.mockReset();
  lambdaSendMock.mockReset();
  ssmSendMock.mockReset();
  resetProviderEmailCache();
  ssmSendMock.mockResolvedValue({ Parameter: { Value: 'provider@example.com' } });
  seedLambda();
});

describe('authorization', () => {
  it('throws for a caller who is not in the Admins group', async () => {
    await expect(handler({ arguments: { contactId: 'c', encounterId: 'e' } } as any)).rejects.toThrow('Unauthorized');
  });

  it('accepts the cognito:groups claim shape', async () => {
    seedDdb();
    const res = await handler({
      arguments: { contactId: 'contact-abc', encounterId: 'enc-1' },
      identity: { claims: { 'cognito:groups': ['Admins'] } },
    } as any);
    expect(res.ok).toBe(true);
  });
});

describe('consent gate (defense in depth)', () => {
  it('refuses when neither consent is present', async () => {
    seedDdb({ ...RECORD_ITEM, consents: undefined });
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Consent required/);
    expect(lambdaSendMock).not.toHaveBeenCalled();
    expect(ddbCalls('Update')).toHaveLength(0);
  });

  it('refuses when only the NPP is signed', async () => {
    seedDdb({ ...RECORD_ITEM, consents: { 'consent-npp-v1': CONSENTS['consent-npp-v1'] } });
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Consent required/);
  });

  it('refuses when only the PHI authorization is signed', async () => {
    seedDdb({ ...RECORD_ITEM, consents: { 'consent-phi-auth-v1': CONSENTS['consent-phi-auth-v1'] } });
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res.ok).toBe(false);
  });
});

describe('missing data', () => {
  it('reports a missing patient record', async () => {
    seedDdb(null);
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res).toEqual({ ok: false, error: 'patient record not found' });
  });

  it('reports a missing encounter', async () => {
    seedDdb(RECORD_ITEM, null);
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res).toEqual({ ok: false, error: 'encounter not found' });
  });

  it('requires both ids', async () => {
    const res = await handler({ arguments: { contactId: '', encounterId: '' }, identity: ADMIN } as any);
    expect(res.ok).toBe(false);
  });
});

describe('happy path', () => {
  it('emails the provider, stamps the encounter and writes the audit row', async () => {
    seedDdb();
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);

    expect(res).toEqual({ ok: true, sentTo: 'provider@example.com', packetUrl: PACKET_URL });

    const mail = mailPayload();
    expect(mail.kind).toBe('info');
    expect(mail.to).toBe('provider@example.com');
    expect(mail.cc).toBe('drtj@my4mlife.com');
    expect(mail.subject).toBe('[Provider review] Jane Doe — Biome NS Rx');
    expect(mail.text).toContain('Asynchronous review requested.');
    expect(mail.text).toContain(PACKET_URL);
    expect(mail.text).toContain('expires in 7 days');
    expect(mail.text).toContain('approved / declined / needs info');

    const update = ddbCalls('Update')[0];
    expect(update.input.Key).toEqual({ contactId: 'contact-abc', sk: 'encounter#enc-1' });
    expect(update.input.ExpressionAttributeValues[':state']).toBe('sent-to-provider');
    expect(update.input.ExpressionAttributeValues[':to']).toBe('provider@example.com');
    expect(update.input.ExpressionAttributeValues[':key']).toBe('clinical-packets/contact-abc/enc-1.html');
    expect(update.input.ExpressionAttributeValues[':at']).toMatch(/^\d{4}-/);

    const audit = ddbCalls('Put')[0];
    expect(audit.input.Item.action).toBe('provider.sent');
    expect(audit.input.Item.encounterId).toBe('enc-1');
    expect(audit.input.Item.sentTo).toBe('provider@example.com');
    expect(audit.input.Item.resend).toBe(false);
    expect(audit.input.Item.sk).toMatch(/^audit#/);
  });

  it('never names an active ingredient in the provider email', async () => {
    seedDdb();
    await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    const mail = mailPayload();
    const body = `${mail.subject}\n${mail.text}\n${mail.html}`.toLowerCase();
    for (const forbidden of ['bpc', 'glutamine', 'aloe', 'peptide-157']) {
      expect(body).not.toContain(forbidden);
    }
  });

  it('falls back to a neutral lane label when the encounter has none', async () => {
    seedDdb(RECORD_ITEM, { ...ENCOUNTER_ITEM, laneLabel: undefined });
    await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(mailPayload().subject).toBe('[Provider review] Jane Doe — prescription review');
  });
});

describe('re-send', () => {
  it('regenerates, emails again and appends another audit row marked resend', async () => {
    seedDdb(RECORD_ITEM, { ...ENCOUNTER_ITEM, state: 'sent-to-provider' });
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);

    expect(res.ok).toBe(true);
    expect(mailPayload().text).toContain('Resending Jane Doe');
    expect(ddbCalls('Put')[0].input.Item.resend).toBe(true);
  });
});

describe('failure modes', () => {
  it('reports a packet-generation failure and does not email or stamp', async () => {
    seedDdb();
    seedLambda({ ok: false, error: 'encounter not found' });
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/packet generation failed/);
    expect(ddbCalls('Update')).toHaveLength(0);
    expect(ddbCalls('Put')).toHaveLength(0);
  });

  it('reports an unconfigured provider inbox', async () => {
    seedDdb();
    ssmSendMock.mockResolvedValue({ Parameter: { Value: '   ' } });
    const res = await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/provider email not configured/);
  });
});

describe('provider email cache', () => {
  it('reads SSM once across two hand-offs', async () => {
    seedDdb();
    await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    await handler({ arguments: { contactId: 'contact-abc', encounterId: 'enc-1' }, identity: ADMIN } as any);
    expect(ssmSendMock).toHaveBeenCalledTimes(1);
  });
});

describe('pure helpers', () => {
  it('packetKeyFor matches export-clinical-packet s3 layout', () => {
    expect(packetKeyFor('c1', 'e1')).toBe('clinical-packets/c1/e1.html');
  });

  it('patientNameOf joins what is present', () => {
    expect(patientNameOf({ demographics: { firstName: 'A', lastName: 'B' } })).toBe('A B');
    expect(patientNameOf({ demographics: { firstName: 'A' } })).toBe('A');
    expect(patientNameOf(undefined)).toBe('');
  });

  it('subjectFor is stable', () => {
    expect(subjectFor('Jane Doe', 'GLP-1 program')).toBe('[Provider review] Jane Doe — GLP-1 program');
  });

  it('renderCoverNote escapes html in the patient name', () => {
    const { html } = renderCoverNote({ patientName: '<b>x</b>', laneLabel: 'L', packetUrl: 'u', resend: false });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
