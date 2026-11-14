// Pure report builder for The Uninsured Decade calculator. No DOM, no window — used by the
// /go/uninsured-decade page and by the report Lambda so both compute identical numbers and text.

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
  type NetWorthBand,
} from './uninsured-decade-math';
import { COST_OF_CARE_BY_STATE } from '../data/cost-of-care-by-state';

export interface UdInputs {
  age: number;
  spouseAge?: number;
  stateAbbr: string;
  netWorthBand: NetWorthBand;
  monthlySpend: number;
  exerciseHours: number;
  rrrPct: number;
  now?: Date;
}

export interface UdReport {
  stateName: string;
  onsetYear: number;
  onsetDrivingAge: number;
  isCouple: boolean;
  bill: number;
  billWhy: string;
  stages: { stage1: number; stage2: number; stage3: number };
  ledger: { fullBasketTenYear: number; alreadySpendingTenYear: number; newMoneyTenYear: number };
  premiumWhy: string;
  spendDownDisplay: string;
  spendDownWhy: string;
  hoursToAdd: number;
  atTarget: boolean;
  hoursNote: string;
  fullPremium: number;
  rrrPct: number;
  ev: { unmitigatedExpectedCost: number; mitigatedExpectedCost: number; expectedSavings: number; breaksEven: boolean };
  /** The breaksEven / falls-short sentence(s), plain text. */
  evVerdict: string;
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function buildReport(i: UdInputs): UdReport {
  const currentYear = (i.now ?? new Date()).getFullYear();
  const row = COST_OF_CARE_BY_STATE.find((r) => r.abbr === i.stateAbbr);
  const stateName = row ? row.state : i.stateAbbr;
  const isCouple = i.spouseAge !== undefined;
  const drive = householdOnsetAge(i.age, i.spouseAge);
  const onset = onsetYear(drive, currentYear);
  const yearsOut = onset - currentYear;

  const costs = stageCostsAtOnset(i.stateAbbr, i.age, i.spouseAge);
  const bill = costs.total;
  const fullPremium = tenYearPremium();
  const ledger = premiumLedger(i.monthlySpend);
  const spendDown = spendDownYears(i.netWorthBand, i.stateAbbr, drive);
  const hoursToAdd = hoursToAddPerMonth(i.exerciseHours);
  const atTarget = isExerciseAtTarget(i.exerciseHours);
  const ev = expectedValue(
    bill,
    i.rrrPct / 100,
    isCouple ? LIFETIME_DEMENTIA_RISK_COUPLE : LIFETIME_DEMENTIA_RISK_SINGLE,
    fullPremium
  );

  return {
    stateName,
    onsetYear: onset,
    onsetDrivingAge: drive,
    isCouple,
    bill,
    billWhy: drive >= 70
      ? 'Onset is modeled as starting now (age ' + drive + '), so this is in today’s dollars.'
      : 'Modeled onset is 70; at ' + drive + ', that’s ' + yearsOut + (yearsOut === 1 ? ' year' : ' years') + ' out, so this is inflated 4%/yr to ' + onset + ' dollars.',
    stages: { stage1: costs.stage1, stage2: costs.stage2, stage3: costs.stage3 },
    ledger,
    premiumWhy: ledger.newMoneyTenYear === 0
      ? 'You’re already spending at or above the full basket — no new money required.'
      : 'The full basket is ' + money(ledger.fullBasketTenYear) + '; you’re already spending ' + money(ledger.alreadySpendingTenYear) + ', so ' + money(ledger.newMoneyTenYear) + ' is new.',
    spendDownDisplay: spendDown.display,
    spendDownWhy: drive >= 70
      ? 'Based on today’s annual private-pay cost in ' + stateName + '.'
      : 'Based on the ' + onset + '-dollar annual private-pay cost, consistent with The Bill above.',
    hoursToAdd,
    atTarget,
    hoursNote: atTarget
      ? 'You’re already paying the hours; the ledger below is about the dollars.'
      : 'Target: 10 hrs/mo (~2.3 hrs/wk)',
    fullPremium,
    rrrPct: i.rrrPct,
    ev: {
      unmitigatedExpectedCost: ev.unmitigatedExpectedCost,
      mitigatedExpectedCost: ev.mitigatedExpectedCost,
      expectedSavings: ev.expectedSavings,
      breaksEven: ev.breaksEven,
    },
    evVerdict: ev.breaksEven
      ? 'At these inputs the expected savings exceed the premium. Read that carefully: the premium is money you will certainly spend; the savings are an expectation spread across odds you cannot see in advance. Nobody should buy this on the arithmetic alone.'
      : 'At these inputs the expected savings fall short of the premium on dementia alone. That is the honest number. The case rests on what the math below cannot count.',
  };
}
