import { describe, it, expect } from 'vitest';
import { parseConsents, consentChecklist, providerReady, REQUIRED_FOR_PROVIDER } from './consents.js';

describe('parseConsents', () => {
  it('parses a plain object map with object entries', () => {
    const raw = {
      'consent-npp-v1': { version: '1', at: '2026-09-01T00:00:00Z', typedName: 'Jane Doe' },
    };
    expect(parseConsents(raw)).toEqual({
      'consent-npp-v1': { version: '1', at: '2026-09-01T00:00:00Z', typedName: 'Jane Doe' },
    });
  });

  it('parses entries that are JSON strings', () => {
    const raw = {
      'consent-phi-auth-v1': JSON.stringify({ at: '2026-09-02T00:00:00Z', legalVersion: 'v2' }),
    };
    expect(parseConsents(raw)).toEqual({
      'consent-phi-auth-v1': { at: '2026-09-02T00:00:00Z', legalVersion: 'v2' },
    });
  });

  it('parses the whole map when it arrives as a JSON string', () => {
    const raw = JSON.stringify({ 'consent-contact-v1': { at: '2026-01-01T00:00:00Z' } });
    expect(parseConsents(raw)).toEqual({ 'consent-contact-v1': { at: '2026-01-01T00:00:00Z' } });
  });

  it('is tolerant of malformed entry values', () => {
    const raw = { 'consent-npp-v1': 'not json', 'consent-ai-comms-v1': 42, 'consent-x': null };
    expect(parseConsents(raw)).toEqual({
      'consent-npp-v1': {},
      'consent-ai-comms-v1': {},
      'consent-x': {},
    });
  });

  it('returns {} for null, undefined, arrays, and non-JSON strings', () => {
    expect(parseConsents(null)).toEqual({});
    expect(parseConsents(undefined)).toEqual({});
    expect(parseConsents([1, 2, 3])).toEqual({});
    expect(parseConsents('not json')).toEqual({});
  });
});

describe('consentChecklist', () => {
  it('lists all four consents in order with required flags', () => {
    const items = consentChecklist({});
    expect(items.map((i) => i.id)).toEqual([
      'consent-contact-v1',
      'consent-ai-comms-v1',
      'consent-npp-v1',
      'consent-phi-auth-v1',
    ]);
    expect(items.map((i) => i.required)).toEqual([false, false, true, true]);
    expect(items.every((i) => i.signedAt === null)).toBe(true);
  });

  it('surfaces the signed date for a present consent', () => {
    const items = consentChecklist({
      'consent-npp-v1': { at: '2026-09-01T00:00:00Z' },
    });
    const npp = items.find((i) => i.id === 'consent-npp-v1')!;
    expect(npp.signedAt).toBe('2026-09-01T00:00:00Z');
    const phi = items.find((i) => i.id === 'consent-phi-auth-v1')!;
    expect(phi.signedAt).toBeNull();
  });

  it('marks consent-ai-comms-v1 as optional/unknown when absent (may live on Contact)', () => {
    const items = consentChecklist({});
    const ai = items.find((i) => i.id === 'consent-ai-comms-v1')!;
    expect(ai.required).toBe(false);
    expect(ai.signedAt).toBeNull();
  });
});

describe('providerReady', () => {
  it('is false when neither required consent is present', () => {
    expect(providerReady({})).toBe(false);
  });

  it('is false when only one of the two required consents is present', () => {
    expect(providerReady({ 'consent-npp-v1': { at: '2026-09-01T00:00:00Z' } })).toBe(false);
  });

  it('is true once both required consents are present, regardless of extra fields', () => {
    expect(
      providerReady({
        'consent-npp-v1': {},
        'consent-phi-auth-v1': { at: '2026-09-02T00:00:00Z' },
      }),
    ).toBe(true);
  });

  it('required set matches the exported constant', () => {
    expect(REQUIRED_FOR_PROVIDER).toEqual(['consent-npp-v1', 'consent-phi-auth-v1']);
  });
});
