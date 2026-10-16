import { describe, it, expect } from 'vitest';
import { validatePreIntake } from './validate';

const GOOD = {
  email: ' Jane@Example.com ', firstName: 'Jane', lastName: 'Doe', skuId: 'push-patch-nad-ghk',
  screening: { version: 'pp-screen-v2', answers: {} },
  dob: '1984-03-09', sex: 'female', phone: '+15551234567', medications: ['metformin'], allergies: [], conditions: [],
  consentName: 'Jane Q Doe', privacyAck: true,
};

describe('validatePreIntake', () => {
  it('accepts a full body and normalizes the email', () => {
    const v: any = validatePreIntake(GOOD);
    expect(v.ok).toBe(true);
    expect(v.body).toMatchObject({ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', skuId: 'push-patch-nad-ghk', consentName: 'Jane Q Doe', privacyAck: true });
    expect(v.body.screening).toEqual(GOOD.screening);
  });

  it('passes an optional testToken through', () => {
    expect((validatePreIntake({ ...GOOD, testToken: 'tok' }) as any).body.testToken).toBe('tok');
  });

  it.each(['email', 'firstName', 'lastName', 'skuId', 'screening', 'dob', 'sex', 'phone', 'medications', 'allergies', 'conditions', 'consentName', 'privacyAck'])(
    'rejects a missing %s', (k) => {
      const b: any = { ...GOOD };
      delete b[k];
      expect(validatePreIntake(b).ok).toBe(false);
    });

  it.each(['nope', 'a@b', '@x.com', 'a b@x.com', ''])('rejects the bad email %j', (email) => {
    expect(validatePreIntake({ ...GOOD, email }).ok).toBe(false);
  });

  it('rejects a non push-patch sku, privacyAck !== true, a bad dob, and non-objects', () => {
    expect(validatePreIntake({ ...GOOD, skuId: 'biome-ns-ultra' }).ok).toBe(false);
    expect(validatePreIntake({ ...GOOD, privacyAck: 'true' }).ok).toBe(false);
    expect(validatePreIntake({ ...GOOD, dob: '03/09/1984' }).ok).toBe(false);
    expect(validatePreIntake(null).ok).toBe(false);
  });
});
