import { describe, it, expect } from 'vitest';
import { GLP1_PRODUCTS, GLP1_PRICE_USD, GLP1_CONDITIONS, GLP1_SAFETY_HISTORY, GLP1_INTERACTING_MEDS, failedKnockouts, buildGlp1Body } from './glp1';
import { SCREENING } from './screening';

describe('glp1 products', () => {
  it('has the three contract SKUs and names, all $375', () => {
    expect(GLP1_PRODUCTS.map((p) => [p.skuId, p.name])).toEqual([
      ['glp1-sema', 'GLP-1 · Sema (semaglutide)'],
      ['glp1-tirzep', 'GLP-2 · Tirzep (tirzepatide)'],
      ['glp1-reta', 'GLP-3 · Reta (retatrutide)'],
    ]);
    expect(GLP1_PRICE_USD).toBe(375);
  });
  it('checkbox lists end with none', () => {
    for (const l of [GLP1_CONDITIONS, GLP1_SAFETY_HISTORY, GLP1_INTERACTING_MEDS]) expect(l[l.length - 1].id).toBe('none');
    expect(GLP1_CONDITIONS.length).toBe(8);
    expect(GLP1_SAFETY_HISTORY.length).toBe(6);
    expect(GLP1_INTERACTING_MEDS.length).toBe(4);
  });
});

describe('glp1 screening (glp1-screen-v1)', () => {
  const c = SCREENING['glp1'];
  it('knockout ids match the contract exactly', () => {
    expect(c.knockouts.map((k) => k.id)).toEqual(['pancreatitis', 'mtc-men2', 'pregnancy', 'type1-diabetes', 'under-18', 'gastroparesis', 'eating-disorder']);
    expect(c.placement).toEqual([]);
  });
  it('failedKnockouts returns the ids answered Yes', () => {
    const a = Object.fromEntries(c.knockouts.map((k) => [k.id, false]));
    expect(failedKnockouts(a)).toEqual([]);
    expect(failedKnockouts({ ...a, pancreatitis: true, 'under-18': true })).toEqual(['pancreatitis', 'under-18']);
  });
});

describe('buildGlp1Body', () => {
  const base = {
    skuId: 'glp1-tirzep', autoShip: true,
    answers: { pancreatitis: false },
    health: { dob: '1980-01-02', sex: 'female' as const, heightFt: 5, heightIn: 6, weightLb: 200, conditions: ['none'], safetyHistory: ['none'], priorGlp1: 'never' as const, interactingMeds: ['none'], otherMeds: 'none', allergies: 'none' },
    typedName: 'Jane Q Doe',
    contact: { firstName: 'Jane', lastName: 'Doe', email: 'j@x.com', phone: '5551234567' },
  };
  it('builds the contract body', () => {
    const b = buildGlp1Body(base);
    expect(b).toEqual({
      lane: 'glp1', skuId: 'glp1-tirzep', autoShip: true,
      screening: { version: 'glp1-screen-v1', answers: { pancreatitis: false } },
      health: base.health, signature: { typedName: 'Jane Q Doe' }, contact: base.contact,
    });
    expect('t' in b).toBe(false);
  });
  it('adds the test token as t', () => {
    expect(buildGlp1Body({ ...base, testToken: 'abc' }).t).toBe('abc');
  });
});
