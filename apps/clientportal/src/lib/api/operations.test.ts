/**
 * Unit tests for the three new EMR admin operation wrappers.
 *
 * Strategy: mock the underlying appsyncClient factory so each test controls
 * exactly what the request function returns, then assert on the query names,
 * variables, and parsed output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock the client module before importing operations ───────────────────────
// mockRequest must be declared via vi.hoisted so it is available when vi.mock's
// factory runs (vi.mock is hoisted to the top of the file by vitest).

const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }));

vi.mock('./client.js', () => ({
  appsyncClient: vi.fn(() => mockRequest),
  // The singleton `gql` export is also used as `defaultClient`; give it the same mock.
  gql: mockRequest,
}));

import {
  listPatientRecordsAdmin,
  getPatientRecordAdmin,
  updateEncounterStateAdmin,
} from './operations.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RAW_ENCOUNTER = {
  encounterId: 'enc-1',
  category: 'weight-loss',
  state: 'INTAKE_SUBMITTED',
  visitType: 'async',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-02T00:00:00Z',
};

const RAW_RECORD = {
  contactId: 'contact-123',
  demographics: JSON.stringify({ age: 45, sex: 'M' }),
  history: JSON.stringify({ conditions: ['hypertension'] }),
  screeningAnswers: JSON.stringify({ q1: 'yes' }),
  consents: JSON.stringify({ hipaa: true }),
  cardOnFile: JSON.stringify({ last4: '4242' }),
  encounters: [RAW_ENCOUNTER],
  audit: [JSON.stringify({ action: 'created' })],
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-02T00:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('listPatientRecordsAdmin', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('sends a query whose name contains listPatientRecordsAdmin', async () => {
    mockRequest.mockResolvedValue({ listPatientRecordsAdmin: [RAW_RECORD] });

    await listPatientRecordsAdmin(10);

    expect(mockRequest).toHaveBeenCalledOnce();
    const [{ query, variables }] = mockRequest.mock.calls[0] as [{ query: string; variables: unknown }][];
    expect(query).toMatch(/listPatientRecordsAdmin/);
    expect(variables).toEqual({ limit: 10 });
  });

  it('parses AWSJSON blob fields into objects', async () => {
    mockRequest.mockResolvedValue({ listPatientRecordsAdmin: [RAW_RECORD] });

    const result = await listPatientRecordsAdmin();
    const record = result.listPatientRecordsAdmin[0];

    expect(record.demographics).toEqual({ age: 45, sex: 'M' });
    expect(record.history).toEqual({ conditions: ['hypertension'] });
    expect(record.screeningAnswers).toEqual({ q1: 'yes' });
    expect(record.consents).toEqual({ hipaa: true });
    expect(record.cardOnFile).toEqual({ last4: '4242' });
    expect(Array.isArray(record.audit)).toBe(true);
    expect(record.audit![0]).toEqual({ action: 'created' });
  });

  it('passes through encounters untouched', async () => {
    mockRequest.mockResolvedValue({ listPatientRecordsAdmin: [RAW_RECORD] });

    const result = await listPatientRecordsAdmin();
    const record = result.listPatientRecordsAdmin[0];

    expect(record.encounters).toHaveLength(1);
    expect(record.encounters![0].encounterId).toBe('enc-1');
    expect(record.encounters![0].state).toBe('INTAKE_SUBMITTED');
  });

  it('returns an empty array when the server returns no records', async () => {
    mockRequest.mockResolvedValue({ listPatientRecordsAdmin: [] });

    const result = await listPatientRecordsAdmin();
    expect(result.listPatientRecordsAdmin).toEqual([]);
  });
});

describe('getPatientRecordAdmin', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('sends a query whose name contains getPatientRecordAdmin with contactId variable', async () => {
    mockRequest.mockResolvedValue({ getPatientRecordAdmin: RAW_RECORD });

    await getPatientRecordAdmin('contact-123');

    const [{ query, variables }] = mockRequest.mock.calls[0] as [{ query: string; variables: unknown }][];
    expect(query).toMatch(/getPatientRecordAdmin/);
    expect(variables).toEqual({ contactId: 'contact-123' });
  });

  it('parses AWSJSON blob fields on the returned record', async () => {
    mockRequest.mockResolvedValue({ getPatientRecordAdmin: RAW_RECORD });

    const result = await getPatientRecordAdmin('contact-123');
    const record = result.getPatientRecordAdmin!;

    expect(record.demographics).toEqual({ age: 45, sex: 'M' });
    expect(record.cardOnFile).toEqual({ last4: '4242' });
  });

  it('returns null when the server returns null', async () => {
    mockRequest.mockResolvedValue({ getPatientRecordAdmin: null });

    const result = await getPatientRecordAdmin('contact-missing');
    expect(result.getPatientRecordAdmin).toBeNull();
  });
});

describe('updateEncounterStateAdmin', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('sends a mutation whose name contains updateEncounterStateAdmin with scalar variables matching the schema', async () => {
    mockRequest.mockResolvedValue({ updateEncounterStateAdmin: RAW_ENCOUNTER });

    const input = { contactId: 'contact-123', encounterId: 'enc-1', toState: 'coordinator-reviewed' };
    await updateEncounterStateAdmin(input);

    const [{ query, variables }] = mockRequest.mock.calls[0] as [{ query: string; variables: unknown }][];
    expect(query).toMatch(/updateEncounterStateAdmin/);
    expect(variables).toEqual(input);
  });

  it('returns the encounter shape from the server', async () => {
    mockRequest.mockResolvedValue({ updateEncounterStateAdmin: RAW_ENCOUNTER });

    const result = await updateEncounterStateAdmin({
      contactId: 'contact-123',
      encounterId: 'enc-1',
      toState: 'CLINICIAN_REVIEW',
    });

    expect(result.updateEncounterStateAdmin).toMatchObject({
      encounterId: 'enc-1',
      state: 'INTAKE_SUBMITTED',
      visitType: 'async',
    });
  });

  it('returns null when the server returns null', async () => {
    mockRequest.mockResolvedValue({ updateEncounterStateAdmin: null });

    const result = await updateEncounterStateAdmin({
      contactId: 'contact-x',
      encounterId: 'enc-x',
      toState: 'CANCELLED',
    });
    expect(result.updateEncounterStateAdmin).toBeNull();
  });
});
