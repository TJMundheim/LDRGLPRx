// Pure math for The Uninsured Decade calculator (/go/uninsured-decade).
// No DOM, no fetch — importable by the page's inline script and by the unit tests.
//
// HONESTY SPINE (locked, do not soften): this module must never produce a number that implies
// the protocol "pays for itself" against dementia-cost avoidance alone. expectedValue() is capped
// so expected savings can never exceed the ten-year bill, and callers must render it as a clearly
// labeled assumption, not a guarantee. See docs/plan/uninsured-decade-calculator-and-talk-spec-2026-09-07.md.

import { getCostOfCare, type StateCostOfCare } from '../data/cost-of-care-by-state';

// ---- Three-stage national baseline (per the spec's PART A "The math" section) ----
// Stage 1: early-stage care, mostly in-home support.
// Stage 2: mid-stage care, heavier in-home / adult day support.
// Stage 3: late-stage custodial care, typically memory care or nursing home.
// These sum to the source doc's ~$525K illustrative 10-year national total.
export const NATIONAL_STAGE1 = 37500;
export const NATIONAL_STAGE2 = 175000;
export const NATIONAL_STAGE3 = 315000;

export interface StageCosts {
  stage1: number;
  stage2: number;
  stage3: number;
  /** stage1 + stage2 + stage3, before any age adjustment. */
  total: number;
}

/**
 * Three-stage 10-year care-cost model, scaled to a state's cost-of-care index.
 * Stages 1-2 (in-home-heavy) scale by the state's inHomeIndex; stage 3 (facility/custodial)
 * scales by the state's facilityIndex. Illustrative, not actuarial.
 */
export function stageCosts(stateAbbr: string): StageCosts {
  const row = getCostOfCare(stateAbbr);
  const stage1 = round2(NATIONAL_STAGE1 * row.inHomeIndex);
  const stage2 = round2(NATIONAL_STAGE2 * row.inHomeIndex);
  const stage3 = round2(NATIONAL_STAGE3 * row.facilityIndex);
  return { stage1, stage2, stage3, total: round2(stage1 + stage2 + stage3) };
}

/**
 * Age -> future-dollar inflation. The staged 10-year model assumes onset at ~70 (ONSET_BASELINE_AGE).
 * If the household is younger than 70, the bill is a future bill — inflate today's staged care
 * costs by a care-cost inflation rate compounded from today to age 70. Source: CareScout/Genworth
 * Cost of Care Surveys report long-run annual cost-of-care increases in roughly the 3-5%/yr range
 * (the 2025 survey's own YoY deltas ranged 1% nursing home to 5% assisted living); 4%/yr is used
 * here as a single representative rate.
 * https://investor.genworth.com/news-events/press-releases/detail/1054/carescout-releases-2025-cost-of-care-survey-results
 * At or above 70, onset is modeled as now: no inflation, the horizon starts immediately.
 */
export const CARE_COST_INFLATION_RATE = 0.04;
export const ONSET_BASELINE_AGE = 70;

/** Years remaining until the modeled onset age (70), floored at 0 once that age has passed. */
export function yearsToOnset(age: number): number {
  if (!Number.isFinite(age)) return 0;
  return Math.max(0, ONSET_BASELINE_AGE - age);
}

/**
 * For a couple, onset timing is driven by the OLDER of the two ages — the partner who reaches
 * the modeled onset age first is the earlier exposure. Falls back to the solo age when there is
 * no spouse/partner age to consider.
 */
export function householdOnsetAge(age: number, spouseAge?: number): number {
  if (spouseAge === undefined || !Number.isFinite(spouseAge)) return age;
  return Math.max(age, spouseAge);
}

/** Compounded inflation factor from today to onset (1.0 once onset age has already passed). */
export function careCostInflationFactor(age: number): number {
  const years = yearsToOnset(age);
  return round4(Math.pow(1 + CARE_COST_INFLATION_RATE, years));
}

/** The calendar year onset is modeled to occur in, given the household's onset-driving age. */
export function onsetYear(age: number, currentYear: number = new Date().getFullYear()): number {
  return currentYear + yearsToOnset(age);
}

/**
 * Stage costs scaled to a state, then (optionally) inflated to the household's modeled onset
 * year. Every stage is inflated by the same factor so stage1 + stage2 + stage3 always reconciles
 * with the displayed total, in the same "onset year dollars" as tenYearTotal.
 */
export function stageCostsAtOnset(stateAbbr: string, age?: number, spouseAge?: number): StageCosts {
  const base = stageCosts(stateAbbr);
  if (age === undefined) return base;
  const factor = careCostInflationFactor(householdOnsetAge(age, spouseAge));
  if (factor === 1) return base;
  return {
    stage1: round2(base.stage1 * factor),
    stage2: round2(base.stage2 * factor),
    stage3: round2(base.stage3 * factor),
    total: round2(base.total * factor),
  };
}

/**
 * "The Bill" — the ten-year staged care-cost total for a state, in onset-year dollars once an
 * age (and, for a couple, a spouse age) is supplied.
 */
export function tenYearTotal(stateAbbr: string, age?: number, spouseAge?: number): number {
  return stageCostsAtOnset(stateAbbr, age, spouseAge).total;
}

// ---- Net worth bands ----
export type NetWorthBand = '<250k' | '250k-500k' | '500k-1m' | '1m-2.5m' | '2.5m-5m' | '5m+';

export const NET_WORTH_BAND_LABELS: Record<NetWorthBand, string> = {
  '<250k': 'Under $250K',
  '250k-500k': '$250K – $500K',
  '500k-1m': '$500K – $1M',
  '1m-2.5m': '$1M – $2.5M',
  '2.5m-5m': '$2.5M – $5M',
  '5m+': '$5M+',
};

// Midpoints used for the spend-down math. The top band is open-ended by definition, so its
// "midpoint" is only ever used internally to floor the display at "10+ years" — never shown raw.
export const NET_WORTH_BAND_MIDPOINTS: Record<NetWorthBand, number> = {
  '<250k': 125_000,
  '250k-500k': 375_000,
  '500k-1m': 750_000,
  '1m-2.5m': 1_750_000,
  '2.5m-5m': 3_750_000,
  '5m+': 6_000_000,
};

export const SPEND_DOWN_OPEN_ENDED_FLOOR_YEARS = 10;

export interface SpendDownResult {
  /** Raw years-until-spend-down, uncapped. */
  years: number;
  /** Display string: "N years" normally, "10+ years" once the raw value hits the floor or the band is open-ended. */
  display: string;
  isOpenEnded: boolean;
}

/**
 * "Years Until Spend-Down" — net worth band midpoint / annual private-pay (late-stage facility)
 * cost for the state. Illustrative, not a Medicaid-eligibility calculation. When an onset-driving
 * age is supplied, the annual cost is inflated to onset year first (consistent with tenYearTotal),
 * so a younger household correctly spends down faster against a bigger future bill.
 */
export function spendDownYears(netWorthBand: NetWorthBand, stateAbbr: string, onsetDrivingAge?: number): SpendDownResult {
  const row: StateCostOfCare = getCostOfCare(stateAbbr);
  const factor = onsetDrivingAge === undefined ? 1 : careCostInflationFactor(onsetDrivingAge);
  const annualPrivatePayCost = round2(row.nursingHomeAnnual * factor);
  const midpoint = NET_WORTH_BAND_MIDPOINTS[netWorthBand];
  const years = round2(midpoint / annualPrivatePayCost);
  const isOpenEnded = netWorthBand === '5m+' || years >= SPEND_DOWN_OPEN_ENDED_FLOOR_YEARS;
  const display = isOpenEnded ? `${SPEND_DOWN_OPEN_ENDED_FLOOR_YEARS}+ years` : `${Math.round(years)} years`;
  return { years, display, isOpenEnded };
}

/** PostHog banding for spendDownYears — never send the raw number. */
export function spendDownYearsBand(result: SpendDownResult): '<5' | '5-10' | '10+' {
  if (result.isOpenEnded) return '10+';
  if (result.years < 5) return '<5';
  return '5-10';
}

// ---- "The Premium" ----
// The 4M protocol mid basket, per docs/book-uninsured-decade/source/figures-verified-2026-09-07.md
// §2b: mid-tier gym + trainer (1x/wk) + organic/grass-fed grocery premium + supplements, for a
// 2-person household. This replaces the book's rounded "$10K/yr" shorthand with the real basket
// total ($8,100/yr, $81,000 over 10 years) so the on-page math and the printed copy agree exactly.
export const GYM_MONTHLY = 60;
export const TRAINER_MONTHLY = 280;
export const GROCERY_PREMIUM_MONTHLY = 185;
export const SUPPLEMENTS_MONTHLY = 150;
export const PREMIUM_BASKET_MONTHLY = GYM_MONTHLY + TRAINER_MONTHLY + GROCERY_PREMIUM_MONTHLY + SUPPLEMENTS_MONTHLY; // $675/mo
export const PREMIUM_YEARS = 10;
export const ANNUAL_PROTOCOL_PREMIUM = PREMIUM_BASKET_MONTHLY * 12; // $8,100/yr

export function tenYearPremium(): number {
  return ANNUAL_PROTOCOL_PREMIUM * PREMIUM_YEARS; // $81,000
}

export interface PremiumLedger {
  /** The full basket over 10 years — the honest premium the EV math is compared against. */
  fullBasketTenYear: number;
  /** What the household says it already spends monthly, carried out over 10 years. */
  alreadySpendingTenYear: number;
  /** max(0, basket - currentMonthlySpend) * 120 — the actual NEW money the basket requires. */
  newMoneyTenYear: number;
}

/**
 * "The Premium" as new money: most of what the basket costs, a household already spends on
 * some mix of gym/trainer/food/supplements. Only the gap is new spend. fullBasketTenYear stays
 * fixed (it's what the EV comparison uses); alreadySpendingTenYear + newMoneyTenYear reconcile to
 * it whenever current spend is at or below the basket.
 */
export function premiumLedger(currentMonthlySpend: number): PremiumLedger {
  const spend = Number.isFinite(currentMonthlySpend) && currentMonthlySpend > 0 ? currentMonthlySpend : 0;
  const fullBasketTenYear = tenYearPremium();
  const alreadySpendingTenYear = round2(spend * 12 * PREMIUM_YEARS);
  const newMoneyTenYear = round2(Math.max(0, PREMIUM_BASKET_MONTHLY - spend) * 12 * PREMIUM_YEARS);
  return { fullBasketTenYear, alreadySpendingTenYear, newMoneyTenYear };
}

// ---- Hours/week of exercise -> "the premium in hours" ----
// Target: 10 hours/month (~2.3 hrs/wk). No risk-reduction bonus is derived from this — the RRR
// slider below stays the only risk-reduction control.
export const EXERCISE_TARGET_HOURS_PER_MONTH = 10;
export const WEEKS_PER_MONTH = 4.33;

/** Hours still needed this month to hit the target, given a weekly exercise habit. Floors at 0. */
export function hoursToAddPerMonth(hoursPerWeek: number): number {
  const hrs = Number.isFinite(hoursPerWeek) && hoursPerWeek > 0 ? hoursPerWeek : 0;
  return round2(Math.max(0, EXERCISE_TARGET_HOURS_PER_MONTH - hrs * WEEKS_PER_MONTH));
}

/** True once the household's weekly exercise habit already clears the monthly target. */
export function isExerciseAtTarget(hoursPerWeek: number): boolean {
  return hoursToAddPerMonth(hoursPerWeek) === 0;
}

// ---- Expected value, stated honestly ----
export const DEFAULT_RELATIVE_RISK_REDUCTION = 0.3;
export const MIN_RELATIVE_RISK_REDUCTION = 0;
export const MAX_RELATIVE_RISK_REDUCTION = 0.5;

// Lifetime risk of any dementia after age 55, ARIC cohort (Fang, Coresh et al., Nature Medicine,
// 13 Jan 2025): https://www.nature.com/articles/s41591-024-03340-9 — 42% overall, 35% for men,
// 48% for women. This page is deliberately gender-neutral (it does not ask sex), so:
//   - a single person uses the overall 42% figure directly.
//   - a couple (spouse/partner age provided) uses the probability that AT LEAST ONE partner
//     develops dementia: 1 - (1 - 0.35)(1 - 0.48) ≈ 0.662, treating the two sex-specific risks
//     as independent (an approximation — a household is never told which partner is male or
//     female, so this combines both sex-specific rates rather than guessing).
// This is what keeps the expected-value math honest: without weighting by the probability the
// cost is ever incurred at all, a naive `total * riskReduction` wildly overstates expected savings
// and would falsely imply the premium spend "pays for itself" on dementia-cost avoidance alone —
// exactly what the locked honesty spine forbids.
export const LIFETIME_DEMENTIA_RISK_SINGLE = 0.42;
export const LIFETIME_DEMENTIA_RISK_MEN = 0.35;
export const LIFETIME_DEMENTIA_RISK_WOMEN = 0.48;
export const LIFETIME_DEMENTIA_RISK_COUPLE = round4(
  1 - (1 - LIFETIME_DEMENTIA_RISK_MEN) * (1 - LIFETIME_DEMENTIA_RISK_WOMEN)
);

// The Lancet Commission 2024 ceiling: the population-level relative risk reduction achievable if
// all 14 modifiable dementia risk factors were addressed. A population figure, not a personal
// guarantee — shown as a labeled tick/marker on the RRR slider, not a promise about any individual.
export const LANCET_2024_RRR_CEILING = 0.45;

export interface ExpectedValueResult {
  /** Expected cost with no risk reduction applied: probability * total. */
  unmitigatedExpectedCost: number;
  /** Expected cost after the assumed relative risk reduction: probability * (1 - riskReduction) * total. */
  mitigatedExpectedCost: number;
  /** unmitigatedExpectedCost - mitigatedExpectedCost — the dementia-cost-avoidance-only expected savings. Always <= total. */
  expectedSavings: number;
  /** riskReduction, clamped to [MIN_RELATIVE_RISK_REDUCTION, MAX_RELATIVE_RISK_REDUCTION]. */
  riskReduction: number;
  /** True when expectedSavings alone would cover the ten-year premium — i.e. a "break-even" claim. At the default assumption this is false for every state; included so the UI can assert it and say so plainly rather than imply otherwise. */
  breaksEven: boolean;
}

/**
 * Expected-cost math using a single, visibly-labeled assumed relative-risk-reduction, weighted by
 * the lifetime probability the cost is ever incurred at all — the ARIC-cohort dementia risk
 * (Nature Medicine 2025). Callers MUST pass the probability that matches their household shape:
 * LIFETIME_DEMENTIA_RISK_SINGLE for a single person, LIFETIME_DEMENTIA_RISK_COUPLE when a
 * spouse/partner is in the picture. This is an assumption, never a guarantee, and it deliberately
 * excludes caregiver-hour value, other-disease risk reduction, and quality-of-life gains — so it
 * will almost always understate the honest case for the premium spend while never overstating it
 * as an ROI. expectedSavings can never exceed tenYearTotal, by construction.
 */
export function expectedValue(
  total: number,
  riskReduction: number,
  lifetimeProbability: number,
  premium: number = tenYearPremium()
): ExpectedValueResult {
  const clamped = Math.min(Math.max(riskReduction, MIN_RELATIVE_RISK_REDUCTION), MAX_RELATIVE_RISK_REDUCTION);
  const unmitigatedExpectedCost = round2(lifetimeProbability * total);
  const mitigatedExpectedCost = round2(lifetimeProbability * (1 - clamped) * total);
  const expectedSavings = round2(unmitigatedExpectedCost - mitigatedExpectedCost);
  return {
    unmitigatedExpectedCost,
    mitigatedExpectedCost,
    expectedSavings,
    riskReduction: clamped,
    breaksEven: expectedSavings >= premium,
  };
}

// ---- Banding helpers for PostHog events (no raw PII/financial numbers ever leave the page) ----
export type AgeBand = '<60' | '60-70' | '70-80' | '80+';

export function ageBand(age: number): AgeBand {
  if (age < 60) return '<60';
  if (age < 70) return '60-70';
  if (age < 80) return '70-80';
  return '80+';
}

// ---- small numeric helpers ----
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
