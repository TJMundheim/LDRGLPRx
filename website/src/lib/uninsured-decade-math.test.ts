import { describe, it, expect } from 'vitest';
import {
  stageCosts,
  stageCostsAtOnset,
  tenYearTotal,
  yearsToOnset,
  householdOnsetAge,
  careCostInflationFactor,
  onsetYear,
  CARE_COST_INFLATION_RATE,
  ONSET_BASELINE_AGE,
  spendDownYears,
  spendDownYearsBand,
  expectedValue,
  ageBand,
  tenYearPremium,
  premiumLedger,
  ANNUAL_PROTOCOL_PREMIUM,
  PREMIUM_BASKET_MONTHLY,
  GYM_MONTHLY,
  TRAINER_MONTHLY,
  GROCERY_PREMIUM_MONTHLY,
  SUPPLEMENTS_MONTHLY,
  hoursToAddPerMonth,
  isExerciseAtTarget,
  EXERCISE_TARGET_HOURS_PER_MONTH,
  WEEKS_PER_MONTH,
  DEFAULT_RELATIVE_RISK_REDUCTION,
  MAX_RELATIVE_RISK_REDUCTION,
  NATIONAL_STAGE1,
  NATIONAL_STAGE2,
  NATIONAL_STAGE3,
  LIFETIME_DEMENTIA_RISK_SINGLE,
  LIFETIME_DEMENTIA_RISK_MEN,
  LIFETIME_DEMENTIA_RISK_WOMEN,
  LIFETIME_DEMENTIA_RISK_COUPLE,
  LANCET_2024_RRR_CEILING,
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

// ---- Age -> future-dollar inflation (item 1) ----

describe('yearsToOnset', () => {
  it('is 0 at or above the 70 baseline', () => {
    expect(yearsToOnset(70)).toBe(0);
    expect(yearsToOnset(85)).toBe(0);
  });

  it('counts years remaining to 70 below the baseline', () => {
    expect(yearsToOnset(62)).toBe(8);
    expect(yearsToOnset(45)).toBe(25);
  });

  it('ONSET_BASELINE_AGE is 70', () => {
    expect(ONSET_BASELINE_AGE).toBe(70);
  });
});

describe('householdOnsetAge', () => {
  it('uses the solo age when there is no spouse', () => {
    expect(householdOnsetAge(62)).toBe(62);
  });

  it('uses the OLDER of the two ages (the earlier exposure)', () => {
    expect(householdOnsetAge(62, 60)).toBe(62);
    expect(householdOnsetAge(60, 65)).toBe(65);
  });
});

describe('careCostInflationFactor', () => {
  it('is exactly the named 4%/yr rate, compounded to age 70', () => {
    expect(CARE_COST_INFLATION_RATE).toBe(0.04);
    // age 62 -> 8 years to onset
    expect(careCostInflationFactor(62)).toBeCloseTo(Math.pow(1.04, 8), 4);
  });

  it('is 1 (no inflation) at or above 70', () => {
    expect(careCostInflationFactor(70)).toBe(1);
    expect(careCostInflationFactor(90)).toBe(1);
  });

  it('is greater than 1 below 70, and grows the further below 70 the age is', () => {
    expect(careCostInflationFactor(62)).toBeGreaterThan(1);
    expect(careCostInflationFactor(45)).toBeGreaterThan(careCostInflationFactor(62));
  });
});

describe('onsetYear', () => {
  it('is the current year when age is 70 or above', () => {
    expect(onsetYear(70, 2026)).toBe(2026);
    expect(onsetYear(80, 2026)).toBe(2026);
  });

  it('is the current year plus years-to-onset when age is below 70', () => {
    expect(onsetYear(62, 2026)).toBe(2034);
  });
});

describe('stageCostsAtOnset', () => {
  it('with no age, equals the unadjusted stageCosts', () => {
    expect(stageCostsAtOnset('TX')).toEqual(stageCosts('TX'));
  });

  it('with age >= 70, equals the unadjusted stageCosts (no inflation, onset is now)', () => {
    expect(stageCostsAtOnset('TX', 70)).toEqual(stageCosts('TX'));
    expect(stageCostsAtOnset('TX', 85)).toEqual(stageCosts('TX'));
  });

  it('with age below 70, every stage (and the total) is inflated by the same factor', () => {
    const base = stageCosts('TX');
    const inflated = stageCostsAtOnset('TX', 62);
    const factor = careCostInflationFactor(62);
    expect(inflated.stage1).toBeCloseTo(base.stage1 * factor, 1);
    expect(inflated.stage2).toBeCloseTo(base.stage2 * factor, 1);
    expect(inflated.stage3).toBeCloseTo(base.stage3 * factor, 1);
    expect(inflated.total).toBeCloseTo(inflated.stage1 + inflated.stage2 + inflated.stage3, 1);
  });

  it('for a couple, uses the OLDER age for onset timing (the earlier exposure)', () => {
    // 65-year-old with a 68-year-old spouse: onset timing driven by 68, not 65.
    const viaCouple = stageCostsAtOnset('TX', 65, 68);
    const viaOlderSolo = stageCostsAtOnset('TX', 68);
    expect(viaCouple).toEqual(viaOlderSolo);
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

  it('age 70 or above applies no inflation', () => {
    const base = stageCosts('TX').total;
    expect(tenYearTotal('TX', 70)).toBe(base);
    expect(tenYearTotal('TX', 90)).toBe(base);
  });

  it('age under 70 inflates the total (never decreases it)', () => {
    const base = stageCosts('TX').total;
    const inflated = tenYearTotal('TX', 62);
    expect(inflated).toBeGreaterThan(base);
  });

  it('a younger age inflates more than an older (but still <70) age', () => {
    expect(tenYearTotal('TX', 45)).toBeGreaterThan(tenYearTotal('TX', 62));
  });

  it('for a couple, the older spouse age drives the inflation, not the primary age', () => {
    // Primary 55 (would inflate a lot alone), spouse 69 (barely inflates) -> should use 69.
    expect(tenYearTotal('TX', 55, 69)).toBe(tenYearTotal('TX', 69));
    expect(tenYearTotal('TX', 55, 69)).toBeLessThan(tenYearTotal('TX', 55));
  });
});

// ---- The Premium: new money (item 2) ----

describe('premium basket constants', () => {
  it('the mid basket sums to $675/mo (gym $60 + trainer $280 + grocery premium $185 + supplements $150)', () => {
    expect(GYM_MONTHLY).toBe(60);
    expect(TRAINER_MONTHLY).toBe(280);
    expect(GROCERY_PREMIUM_MONTHLY).toBe(185);
    expect(SUPPLEMENTS_MONTHLY).toBe(150);
    expect(PREMIUM_BASKET_MONTHLY).toBe(675);
  });

  it('ANNUAL_PROTOCOL_PREMIUM is the basket times 12', () => {
    expect(ANNUAL_PROTOCOL_PREMIUM).toBe(675 * 12);
  });

  it('tenYearPremium is the full basket over 10 years: $81,000', () => {
    expect(tenYearPremium()).toBe(81_000);
  });
});

describe('premiumLedger', () => {
  it('with $0 current spend, all of the basket is new money', () => {
    const result = premiumLedger(0);
    expect(result.fullBasketTenYear).toBe(81_000);
    expect(result.alreadySpendingTenYear).toBe(0);
    expect(result.newMoneyTenYear).toBe(81_000);
  });

  it('with current spend below the basket, splits into already-spending + new money that sum to the full basket', () => {
    const result = premiumLedger(400);
    expect(result.alreadySpendingTenYear).toBe(400 * 120);
    expect(result.newMoneyTenYear).toBe((675 - 400) * 120);
    expect(result.alreadySpendingTenYear + result.newMoneyTenYear).toBe(result.fullBasketTenYear);
  });

  it('with current spend at or above the basket, new money floors at zero', () => {
    const atBasket = premiumLedger(675);
    expect(atBasket.newMoneyTenYear).toBe(0);
    const above = premiumLedger(900);
    expect(above.newMoneyTenYear).toBe(0);
    expect(above.alreadySpendingTenYear).toBe(900 * 120);
  });

  it('treats a negative or non-finite spend as zero', () => {
    expect(premiumLedger(-50).alreadySpendingTenYear).toBe(0);
    expect(premiumLedger(NaN).alreadySpendingTenYear).toBe(0);
  });
});

// ---- Hours/week of exercise -> hours premium (item 3) ----

describe('exercise hours', () => {
  it('target is 10 hours/month, and the weekly->monthly multiplier is 4.33', () => {
    expect(EXERCISE_TARGET_HOURS_PER_MONTH).toBe(10);
    expect(WEEKS_PER_MONTH).toBe(4.33);
  });

  it('hoursToAddPerMonth is 10 minus hours*4.33, floored at 0', () => {
    expect(hoursToAddPerMonth(0)).toBe(10);
    expect(hoursToAddPerMonth(1)).toBeCloseTo(10 - 1 * 4.33, 2);
    expect(hoursToAddPerMonth(3)).toBe(0); // 3 * 4.33 = 12.99, already past target
  });

  it('never goes negative', () => {
    expect(hoursToAddPerMonth(40)).toBe(0);
  });

  it('isExerciseAtTarget is true once hours*4.33 >= 10', () => {
    expect(isExerciseAtTarget(1)).toBe(false);
    expect(isExerciseAtTarget(2.31)).toBe(true); // 2.31 * 4.33 = 10.0023
  });

  it('treats non-finite or negative hours as zero', () => {
    expect(hoursToAddPerMonth(-5)).toBe(10);
    expect(hoursToAddPerMonth(NaN)).toBe(10);
  });
});

// ---- Net worth / spend-down (unchanged defaults + item 5 with onset inflation) ----

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

  it('with no onset age passed, uses today-dollar cost (unchanged default behavior)', () => {
    const result = spendDownYears('500k-1m', 'TX');
    const row = getCostOfCare('TX');
    expect(result.years).toBeCloseTo(750_000 / row.nursingHomeAnnual, 2);
  });

  it('with an onset-driving age under 70, inflates the annual private-pay cost, shortening the years', () => {
    const uninflated = spendDownYears('500k-1m', 'TX');
    const inflated = spendDownYears('500k-1m', 'TX', 62);
    expect(inflated.years).toBeLessThan(uninflated.years);
  });

  it('with an onset-driving age at or above 70, matches the uninflated default', () => {
    const uninflated = spendDownYears('500k-1m', 'TX');
    const atSeventy = spendDownYears('500k-1m', 'TX', 70);
    expect(atSeventy.years).toBe(uninflated.years);
  });
});

describe('spendDownYearsBand', () => {
  it('buckets correctly for PostHog (no raw years ever passed)', () => {
    expect(spendDownYearsBand({ years: 2, display: '2 years', isOpenEnded: false })).toBe('<5');
    expect(spendDownYearsBand({ years: 7, display: '7 years', isOpenEnded: false })).toBe('5-10');
    expect(spendDownYearsBand({ years: 14, display: '10+ years', isOpenEnded: true })).toBe('10+');
  });
});

describe('lifetime dementia risk constants (Nature Medicine 2025, ARIC cohort)', () => {
  it('single-person risk is the 42% overall figure', () => {
    expect(LIFETIME_DEMENTIA_RISK_SINGLE).toBe(0.42);
  });

  it('sex-specific figures are 35% men / 48% women', () => {
    expect(LIFETIME_DEMENTIA_RISK_MEN).toBe(0.35);
    expect(LIFETIME_DEMENTIA_RISK_WOMEN).toBe(0.48);
  });

  it('couple risk is the probability at least one partner develops dementia (~66.2%)', () => {
    expect(LIFETIME_DEMENTIA_RISK_COUPLE).toBeCloseTo(0.662, 4);
    expect(LIFETIME_DEMENTIA_RISK_COUPLE).toBeGreaterThan(LIFETIME_DEMENTIA_RISK_SINGLE);
  });

  it('the Lancet 2024 ceiling is 45%', () => {
    expect(LANCET_2024_RRR_CEILING).toBe(0.45);
  });
});

describe('expectedValue', () => {
  it('never exceeds the ten-year total, at the maximum allowed risk reduction', () => {
    const total = tenYearTotal('TX');
    const result = expectedValue(total, MAX_RELATIVE_RISK_REDUCTION, LIFETIME_DEMENTIA_RISK_COUPLE);
    expect(result.expectedSavings).toBeLessThanOrEqual(total);
  });

  it('clamps a risk reduction above the allowed max down to the max', () => {
    const total = tenYearTotal('TX');
    const atMax = expectedValue(total, MAX_RELATIVE_RISK_REDUCTION, LIFETIME_DEMENTIA_RISK_COUPLE);
    const overMax = expectedValue(total, 0.9, LIFETIME_DEMENTIA_RISK_COUPLE);
    expect(overMax.riskReduction).toBe(MAX_RELATIVE_RISK_REDUCTION);
    expect(overMax.expectedSavings).toBe(atMax.expectedSavings);
  });

  it('clamps a negative risk reduction up to zero', () => {
    const total = tenYearTotal('TX');
    const result = expectedValue(total, -0.2, LIFETIME_DEMENTIA_RISK_COUPLE);
    expect(result.riskReduction).toBe(0);
    expect(result.expectedSavings).toBe(0);
  });

  it('tenYearPremium is ANNUAL_PROTOCOL_PREMIUM times 10', () => {
    expect(tenYearPremium()).toBe(ANNUAL_PROTOCOL_PREMIUM * 10);
  });

  it('a single person uses the 42% probability, distinct from a couple', () => {
    const total = tenYearTotal('TX');
    const single = expectedValue(total, DEFAULT_RELATIVE_RISK_REDUCTION, LIFETIME_DEMENTIA_RISK_SINGLE);
    const couple = expectedValue(total, DEFAULT_RELATIVE_RISK_REDUCTION, LIFETIME_DEMENTIA_RISK_COUPLE);
    expect(single.expectedSavings).toBeLessThan(couple.expectedSavings);
  });

  // Illustrative national-average example ($405,262, the book's cited average total cost),
  // now checked against the corrected $81,000 (basket-derived) ten-year premium instead of the
  // old rounded $100,000 placeholder.
  it('a couple at 30% RRR against a $405,262 cost and the real $81,000 premium shows expected savings of roughly $80K, not yet breaking even', () => {
    const result = expectedValue(405_262, 0.30, LIFETIME_DEMENTIA_RISK_COUPLE, tenYearPremium());
    expect(result.expectedSavings).toBeGreaterThan(79_000);
    expect(result.expectedSavings).toBeLessThan(81_000);
    expect(result.breaksEven).toBe(false);
  });

  it('a couple at the 45% Lancet ceiling against a $405,262 cost and the real $81,000 premium shows expected savings of roughly $120K and breaks even', () => {
    const result = expectedValue(405_262, LANCET_2024_RRR_CEILING, LIFETIME_DEMENTIA_RISK_COUPLE, tenYearPremium());
    expect(result.expectedSavings).toBeGreaterThan(119_000);
    expect(result.expectedSavings).toBeLessThan(122_000);
    expect(result.breaksEven).toBe(true);
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
