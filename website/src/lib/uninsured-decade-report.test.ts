import { describe, it, expect } from 'vitest';
import { buildReport, money, type UdInputs } from './uninsured-decade-report';
import {
  stageCostsAtOnset,
  householdOnsetAge,
  onsetYear,
  spendDownYears,
  tenYearPremium,
  premiumLedger,
  hoursToAddPerMonth,
  isExerciseAtTarget,
  expectedValue,
  LIFETIME_DEMENTIA_RISK_SINGLE,
  LIFETIME_DEMENTIA_RISK_COUPLE,
} from './uninsured-decade-math';
import { getCostOfCare } from '../data/cost-of-care-by-state';

const NOW = new Date('2026-06-15T12:00:00Z');
const YEAR = 2026;

const base: UdInputs = {
  age: 62,
  spouseAge: 60,
  stateAbbr: 'TX',
  netWorthBand: '500k-1m',
  monthlySpend: 400,
  exerciseHours: 3,
  rrrPct: 30,
  now: NOW,
};

describe('money', () => {
  it('formats whole US dollars', () => {
    expect(money(1234.56)).toBe('$1,235');
    expect(money(0)).toBe('$0');
    expect(money(81000)).toBe('$81,000');
  });
});

describe('buildReport defaults (couple 62/60 TX)', () => {
  const r = buildReport(base);
  const drive = householdOnsetAge(62, 60);
  const costs = stageCostsAtOnset('TX', 62, 60);
  const ledger = premiumLedger(400);
  const sd = spendDownYears('500k-1m', 'TX', drive);
  const onset = onsetYear(drive, YEAR);

  it('matches the math functions', () => {
    expect(r.stateName).toBe(getCostOfCare('TX').state);
    expect(r.isCouple).toBe(true);
    expect(r.onsetDrivingAge).toBe(drive);
    expect(r.onsetYear).toBe(onset);
    expect(r.bill).toBe(costs.total);
    expect(r.stages).toEqual({ stage1: costs.stage1, stage2: costs.stage2, stage3: costs.stage3 });
    expect(r.ledger).toEqual(ledger);
    expect(r.spendDownDisplay).toBe(sd.display);
    expect(r.hoursToAdd).toBe(hoursToAddPerMonth(3));
    expect(r.atTarget).toBe(isExerciseAtTarget(3));
    expect(r.fullPremium).toBe(tenYearPremium());
    expect(r.rrrPct).toBe(30);
  });

  it('uses the couple lifetime risk for ev', () => {
    const ev = expectedValue(costs.total, 0.3, LIFETIME_DEMENTIA_RISK_COUPLE, tenYearPremium());
    expect(r.ev).toEqual({
      unmitigatedExpectedCost: ev.unmitigatedExpectedCost,
      mitigatedExpectedCost: ev.mitigatedExpectedCost,
      expectedSavings: ev.expectedSavings,
      breaksEven: ev.breaksEven,
    });
  });

  it('inflation why-string with plural years', () => {
    expect(r.billWhy).toBe(
      'Modeled onset is 70; at 62, that’s ' + (onset - YEAR) + ' years out, so this is inflated 4%/yr to ' + onset + ' dollars.'
    );
    expect(r.spendDownWhy).toBe('Based on the ' + onset + '-dollar annual private-pay cost, consistent with The Bill above.');
  });

  it('premiumWhy shows the new-money split', () => {
    expect(r.premiumWhy).toBe(
      'The full basket is ' + money(ledger.fullBasketTenYear) + '; you’re already spending ' + money(ledger.alreadySpendingTenYear) + ', so ' + money(ledger.newMoneyTenYear) + ' is new.'
    );
  });

  it('hoursNote is the target note when below target', () => {
    const low = buildReport({ ...base, exerciseHours: 1 });
    expect(low.atTarget).toBe(false);
    expect(low.hoursToAdd).toBe(hoursToAddPerMonth(1));
    expect(low.hoursNote).toBe('Target: 10 hrs/mo (~2.3 hrs/wk)');
  });
});

describe('single household', () => {
  const r = buildReport({ ...base, spouseAge: undefined });
  it('is not a couple and uses the single risk', () => {
    expect(r.isCouple).toBe(false);
    expect(r.onsetDrivingAge).toBe(62);
    const costs = stageCostsAtOnset('TX', 62, undefined);
    const ev = expectedValue(costs.total, 0.3, LIFETIME_DEMENTIA_RISK_SINGLE, tenYearPremium());
    expect(r.bill).toBe(costs.total);
    expect(r.ev.expectedSavings).toBe(ev.expectedSavings);
  });
});

describe('age >= 70', () => {
  const r = buildReport({ ...base, age: 72, spouseAge: 70 });
  it('uses today’s-dollars strings', () => {
    expect(r.onsetDrivingAge).toBe(72);
    expect(r.onsetYear).toBe(YEAR);
    expect(r.billWhy).toBe('Onset is modeled as starting now (age 72), so this is in today’s dollars.');
    expect(r.spendDownWhy).toBe('Based on today’s annual private-pay cost in ' + getCostOfCare('TX').state + '.');
  });
});

describe('onset exactly one year out', () => {
  it('says "1 year" singular', () => {
    const r = buildReport({ ...base, age: 69, spouseAge: undefined });
    expect(r.onsetYear).toBe(YEAR + 1);
    expect(r.billWhy).toBe('Modeled onset is 70; at 69, that’s 1 year out, so this is inflated 4%/yr to ' + (YEAR + 1) + ' dollars.');
  });
});

describe('spend at or above basket', () => {
  it('says no new money required', () => {
    const r = buildReport({ ...base, monthlySpend: 900 });
    expect(r.ledger.newMoneyTenYear).toBe(0);
    expect(r.premiumWhy).toBe('You’re already spending at or above the full basket — no new money required.');
  });
});

describe('exercise at target', () => {
  it('uses the already-paying note', () => {
    const r = buildReport({ ...base, exerciseHours: 3 });
    expect(r.atTarget).toBe(true);
    expect(r.hoursToAdd).toBe(0);
    expect(r.hoursNote).toBe('You’re already paying the hours; the ledger below is about the dollars.');
  });
});

describe('rrr and verdicts', () => {
  it('rrr 0 gives zero savings and falls short', () => {
    const r = buildReport({ ...base, rrrPct: 0 });
    expect(r.ev.expectedSavings).toBe(0);
    expect(r.ev.breaksEven).toBe(false);
    expect(r.evVerdict).toBe(
      'At these inputs the expected savings fall short of the premium on dementia alone. That is the honest number. The case rests on what the math below cannot count.'
    );
  });

  it('rrr 45 matches expectedValue at 0.45', () => {
    const r = buildReport({ ...base, rrrPct: 45 });
    const costs = stageCostsAtOnset('TX', 62, 60);
    const ev = expectedValue(costs.total, 0.45, LIFETIME_DEMENTIA_RISK_COUPLE, tenYearPremium());
    expect(r.ev.expectedSavings).toBe(ev.expectedSavings);
    expect(r.rrrPct).toBe(45);
  });

  it('breaksEven true yields the exceed verdict', () => {
    const r = buildReport({ ...base, age: 45, spouseAge: 45, stateAbbr: 'NY', rrrPct: 50 });
    expect(r.ev.breaksEven).toBe(true);
    expect(r.evVerdict).toBe(
      'At these inputs the expected savings exceed the premium. Read that carefully: the premium is money you will certainly spend; the savings are an expectation spread across odds you cannot see in advance. Nobody should buy this on the arithmetic alone.'
    );
  });

  it('is pure and deterministic', () => {
    expect(buildReport(base)).toEqual(buildReport({ ...base }));
  });
});
