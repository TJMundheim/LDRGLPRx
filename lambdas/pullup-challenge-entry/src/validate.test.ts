import { describe, it, expect } from 'vitest';
import { validate } from './validate';

const base = {
  name: 'Jane Doe', email: 'Jane@Example.com', phone: '(817) 555-0142',
  instagramUrl: 'https://www.instagram.com/p/ABC123/', round: 'start', adult: true, rulesAccepted: true,
  smsOptIn: false, emailOptIn: false, consentVersion: 'pullup-v2',
};
const NOW = new Date('2026-11-20T18:00:00Z');
const v = (over: any = {}, now = NOW) => validate({ ...base, ...over }, now);

describe('validate: fields', () => {
  it('returns a normalized Entry with no age/bodyweight/division', () => {
    const e: any = v();
    expect(e).toEqual({
      name: 'Jane Doe', email: 'jane@example.com', phone: '+18175550142',
      instagramUrl: base.instagramUrl, round: 'start', smsOptIn: false, emailOptIn: false, consentVersion: 'pullup-v2',
    });
    for (const k of ['age', 'bodyweightLb', 'division', 'adult']) expect(e).not.toHaveProperty(k);
  });
  it('ignores legacy age/bodyweight/division inputs (not required, not stored)', () => {
    const e: any = v({ age: 5, bodyweightLb: 10, division: 'coed' });
    expect(typeof e).toBe('object');
    expect(e).not.toHaveProperty('age');
  });
  it.each([
    ['adult missing', { adult: undefined }],
    ['adult false', { adult: false }],
    ['adult string', { adult: 'true' }],
    ['rules not accepted', { rulesAccepted: false }],
    ['bad email', { email: 'nope' }],
    ['short phone', { phone: '12345' }],
    ['missing name', { name: '' }],
    ['missing consentVersion', { consentVersion: '' }],
    ['bad round', { round: 'middle' }],
    ['http instagram', { instagramUrl: 'http://instagram.com/p/1' }],
    ['evil instagram host', { instagramUrl: 'https://evil.com/instagram.com/p/1' }],
    ['missing instagram', { instagramUrl: '' }],
  ])('rejects %s with a message', (_n, over) => {
    expect(typeof v(over)).toBe('string');
  });
  it('accepts opt-ins only when exactly true', () => {
    expect(v({ smsOptIn: true, emailOptIn: true })).toMatchObject({ smsOptIn: true, emailOptIn: true });
    expect(v({ smsOptIn: 'yes' })).toMatchObject({ smsOptIn: false });
  });
});

describe('validate: windows (America/Chicago, CST = UTC-6 in Dec/Jan)', () => {
  const start = (iso: string) => v({ round: 'start' }, new Date(iso));
  const fin = (iso: string) => v({ round: 'final' }, new Date(iso));
  it('start: accepted Dec 15 23:59:59 CT', () => expect(typeof start('2026-12-16T05:59:59Z')).toBe('object'));
  it('start: rejected Dec 16 00:00:00 CT', () => expect(typeof start('2026-12-16T06:00:00Z')).toBe('string'));
  it('start: accepted well before the deadline', () => expect(typeof start('2026-11-16T12:00:00Z')).toBe('object'));
  it('start: rejected in January', () => expect(typeof start('2027-01-03T12:00:00Z')).toBe('string'));
  it('final: rejected Dec 31 23:59:59 CT', () => expect(typeof fin('2027-01-01T05:59:59Z')).toBe('string'));
  it('final: accepted Jan 1 00:00:00 CT', () => expect(typeof fin('2027-01-01T06:00:00Z')).toBe('object'));
  it('final: accepted Jan 7 23:59:59 CT', () => expect(typeof fin('2027-01-08T05:59:59Z')).toBe('object'));
  it('final: rejected Jan 8 00:00:00 CT', () => expect(typeof fin('2027-01-08T06:00:00Z')).toBe('string'));
  it('final: rejected in November', () => expect(typeof fin('2026-11-20T12:00:00Z')).toBe('string'));
});
