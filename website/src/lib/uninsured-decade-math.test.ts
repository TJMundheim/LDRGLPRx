import { describe, it, expect } from 'vitest';
import {
  stageCosts,
  tenYearTotal,
  ageAdjustmentFactor,
  spendDownYears,
  spendDownYearsBand,
  expectedValue,
  ageBand,
  tenYearPremium,
  ANNUAL_PROTOCOL_PREMIUM,
  DEFAULT_RELATIVE_RISK_REDUCTION,
  MAX_RELATIVE_RISK_REDUCTION,
  NATIONAL_STAGE1,
  NATIONAL_STAGE2,
  NATIONAL_STAGE3,
} from './uninsured-decade-math';
import { getCostOfCare, COST_OF_CARE_BY_STATE } from '../data/cost-of-care-by-state';

describe('stageCosts', () => {
  it('returns the unscaled national baseline for a state whose indices are ~1.0 (North Carolina)', () => {
    const nc = getCostOfCare('NC');
    expect(nc.facilityIndex).toBe(1);
    const { stage1, stage2, stage3 } = stageCosts('NC');
    expect(stage1).toBe(NATIONAL_STAGE1 * nc.inHomeIndex);
    expect(stage2).toBe(NATIONAL_STAGE2 * nc.inHomeIndex);
    expect(stage3).toBe(NATIONAL_STAGE3); // facilityIndex === 1
  });

  it('scales stage3 up for a high-cost state (Oregon, facilityIndex > 1.5)', () => {
    const or = stageCosts('OR');
    const nc = stageCosts('NC');
    expect(or.stage3).toBeGreaterThan(nc.stage3 * 1.5);
  });

  it('scales stage3 down for a lower-cost state (Texas)', () => {
    const tx = stageCosts('TX');
    const nc = stageCosts('NC');
    expect(tx.stage3).toBeLessThan(nc.stage3);
  });

  it('total always equals stage1 + stage2 + stage3', () => {
    for (const row of COST_OF_CARE_BY_STATE) {
      const { stage1, stage2, stage3, total } = stageCosts(row.abbr);
      expect(total).toBeCloseTo(stage1 + stage2 + stage3, 2);
    }
  });

  it('falls back to the national baseline (index 1) for an unrecognized state code', () => {
    const { stage1, stage2, stage3 } = stageCosts('ZZ');
    expect(stage1).toBe(NATIONAL_STAGE1);
    expect(stage2).toBe(NATIONAL_STAGE2);
    expect(stage3).toBe(NATIONAL_STAGE3);
  });
});

describe('tenYearTotal', () => {
  it('Texas is materially below the national baseline total', () => {
    const national = NATIONAL_STAGE1 + NATIONAL_STAGE2 + NATIONAL_STAGE3;
    expect(tenYearTotal('TX')).toBeLessThan(national);
  });

  it('a high-cost state (Oregon) is materially above the national baseline total', () => {
    const national = NATIONAL_STAGE1 + NATIONAL_STAGE2 + NATIONAL_STAGE3;
    expect(tenYearTotal('OR')).toBeGreaterThan(national);
  });

  it('with no age passed, equals stageCosts(...).total exactly (no adjustment applied)', () => {
    expect(tenYearTotal('TX')).toBe(stageCosts('TX').total);
  });

  it('age 70 or under applies no compression', () => {
    const base = stageCosts('TX').total;
    expect(tenYearTotal('TX', 62)).toBe(base);
    expect(tenYearTotal('TX', 70)).toBe(base);
  });

  it('age over 70 compresses the total (never increases it)', () => {
    const base = stageCosts('TX').total;
    const compressed = tenYearTotal('TX', 85);
    expect(compressed).toBeLessThan(base);
    expect(compressed).toBeGreaterThan(0);
  });
});

describe('ageAdjustmentFactor', () => {
  it('is 1.0 at or below 70', () => {
    expect(ageAdjustmentFactor(45)).toBe(1);
    expect(ageAdjustmentFactor(70)).toBe(1);
  });

  it('decreases as age increases past 70', () => {
    expect(ageAdjustmentFactor(75)).toBeLessThan(1);
    expect(ageAdjustmentFactor(80)).toBeLessThan(ageAdjustmentFactor(75));
  });

  it('never compresses more than 30% (floors at 0.7)', () => {
    expect(ageAdjustmentFactor(120)).toBeGreaterThanOrEqual(0.7);
  });
});

describe('spendDownYears', () => {
  it('the top net-worth band always renders "10+ years" regardless of state', () => {
    for (const abbr of ['TX', 'OR', 'MS']) {
      const result = spendDownYears('5m+', abbr);
      expect(result.display).toBe('10+ years');
      expect(result.isOpenEnded).toBe(true);
    }
  });

  it('a low net-worth band in a high-cost state renders a small, non-open-ended number of years', () => {
    const result = spendDownYears('<250k', 'OR');
    expect(result.isOpenEnded).toBe(false);
    expect(result.years).toBeLessThan(5);
    expect(result.display).toMatch(/^\d+ years$/);
  });

  it('any raw computed value of 10+ years is floored to the "10+ years" display even off the top band', () => {
    // 2.5m-5m midpoint ($3.75M) / a low-cost state's annual facility cost easily clears 10 years.
    const result = spendDownYears('2.5m-5m', 'TX');
    expect(result.years).toBeGreaterThanOrEqual(10);
    expect(result.display).toBe('10+ years');
  });

  it('is monotonically increasing in net worth band for a fixed state', () => {
    const bands: Array<[string, number]> = [
      ['<250k', spendDownYears('<250k', 'TX').years],
      ['250k-500k', spendDownYears('250k-500k', 'TX').years],
      ['500k-1m', spendDownYears('500k-1m', 'TX').years],
    ];
    expect(bands[1][1]).toBeGreaterThan(bands[0][1]);
    expect(bands[2][1]).toBeGreaterThan(bands[1][1]);
  });
});

describe('spendDownYearsBand', () => {
  it('buckets correctly for PostHog (no raw years ever passed)', () => {
    expect(spendDownYearsBand({ years: 2, display: '2 years', isOpenEnded: false })).toBe('<5');
    expect(spendDownYearsBand({ years: 7, display: '7 years', isOpenEnded: false })).toBe('5-10');
    expect(spendDownYearsBand({ years: 14, display: '10+ years', isOpenEnded: true })).toBe('10+');
  });
});

describe('expectedValue', () => {
  it('never exceeds the ten-year total, at the maximum allowed risk reduction', () => {
    const total = tenYearTotal('TX');
    const result = expectedValue(total, MAX_RELATIVE_RISK_REDUCTION);
    expect(result.expectedSavings).toBeLessThanOrEqual(total);
  });

  it('clamps a risk reduction above the allowed max down to the max', () => {
    const total = tenYearTotal('TX');
    const atMax = expectedValue(total, MAX_RELATIVE_RISK_REDUCTION);
    const overMax = expectedValue(total, 0.9);
    expect(overMax.riskReduction).toBe(MAX_RELATIVE_RISK_REDUCTION);
    expect(overMax.expectedSavings).toBe(atMax.expectedSavings);
  });

  it('clamps a negative risk reduction up to zero', () => {
    const total = tenYearTotal('TX');
    const result = expectedValue(total, -0.2);
    expect(result.riskReduction).toBe(0);
    expect(result.expectedSavings).toBe(0);
  });

  it('at the default 30% assumption, does NOT break even against the ten-year premium for a typical state', () => {
    const total = tenYearTotal('TX');
    const result = expectedValue(total, DEFAULT_RELATIVE_RISK_REDUCTION, tenYearPremium());
    expect(result.breaksEven).toBe(false);
    expect(result.expectedSavings).toBeLessThan(tenYearPremium());
  });

  it('tenYearPremium is ANNUAL_PROTOCOL_PREMIUM times 10', () => {
    expect(tenYearPremium()).toBe(ANNUAL_PROTOCOL_PREMIUM * 10);
  });
});

describe('ageBand', () => {
  it('buckets ages for PostHog (raw age never sent)', () => {
    expect(ageBand(45)).toBe('<60');
    expect(ageBand(62)).toBe('60-70');
    expect(ageBand(75)).toBe('70-80');
    expect(ageBand(85)).toBe('80+');
  });
});
