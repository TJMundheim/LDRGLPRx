import { describe, it, expect } from 'vitest';
import { validateGlp1PreIntake, bmi } from './validate-glp1';

const GOOD = {
  lane: 'glp1', skuId: 'glp1-sema', autoShip: true,
  screening: { version: 'glp1-screen-v1', answers: {} },
  health: {
    dob: '1980-05-02', sex: 'female', heightFt: 5, heightIn: 6, weightLb: 200, goalWeightLb: 160,
    conditions: ['hypertension'], safetyHistory: ['gallstones'], priorGlp1: 'past', priorGlp1Drug: 'Ozempic', priorGlp1Dose: '1 mg',
    interactingMeds: ['insulin'], otherMeds: 'none', allergies: 'none',
  },
  signature: { typedName: 'Jane Q Doe' },
  contact: { firstName: 'Jane', lastName: 'Doe', email: ' Jane@Example.com ', phone: '+15551234567' },
};

describe('validateGlp1PreIntake', () => {
  it('accepts a full body, normalizes email', () => {
    const v: any = validateGlp1PreIntake(GOOD);
    expect(v.ok).toBe(true);
    expect(v.body).toMatchObject({ skuId: 'glp1-sema', autoShip: true, email: 'jane@example.com', consentName: 'Jane Q Doe', phone: '+15551234567' });
    expect(v.body.health.heightFt).toBe(5);
  });
  it('rejects a non-GLP-1 sku', () => {
    expect((validateGlp1PreIntake({ ...GOOD, skuId: 'push-patch-nad-ghk' }) as any).ok).toBe(false);
  });
  it('rejects non-boolean autoShip', () => {
    expect((validateGlp1PreIntake({ ...GOOD, autoShip: 'yes' }) as any).ok).toBe(false);
  });
  it.each(['dob', 'sex', 'heightFt', 'heightIn', 'weightLb', 'conditions', 'safetyHistory', 'priorGlp1', 'interactingMeds', 'otherMeds', 'allergies'])('rejects missing health.%s', (k) => {
    const h: any = { ...GOOD.health }; delete h[k];
    expect((validateGlp1PreIntake({ ...GOOD, health: h }) as any).ok).toBe(false);
  });
  it('rejects bad enums and missing signature or contact', () => {
    expect((validateGlp1PreIntake({ ...GOOD, health: { ...GOOD.health, sex: 'x' } }) as any).ok).toBe(false);
    expect((validateGlp1PreIntake({ ...GOOD, health: { ...GOOD.health, priorGlp1: 'maybe' } }) as any).ok).toBe(false);
    expect((validateGlp1PreIntake({ ...GOOD, signature: {} }) as any).ok).toBe(false);
    expect((validateGlp1PreIntake({ ...GOOD, contact: { ...GOOD.contact, phone: '' } }) as any).ok).toBe(false);
  });
  it('rejects implausible height/weight', () => {
    expect((validateGlp1PreIntake({ ...GOOD, health: { ...GOOD.health, weightLb: 20 } }) as any).ok).toBe(false);
    expect((validateGlp1PreIntake({ ...GOOD, health: { ...GOOD.health, heightFt: 9 } }) as any).ok).toBe(false);
  });
  it('rejects under 18 as not eligible', () => {
    const r: any = validateGlp1PreIntake({ ...GOOD, health: { ...GOOD.health, dob: '2015-01-01' } });
    expect(r).toEqual({ ok: false, error: 'not eligible' });
  });
  it('bmi from feet/inches/pounds', () => {
    expect(bmi(5, 6, 200)).toBe(32.3);
  });
});
