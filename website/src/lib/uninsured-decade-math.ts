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
 * Light age adjustment: the 10-year window is illustrative, keyed to a single-diagnosis-at-70
 * scenario. Past 70, compress the total proportionally (2%/yr, capped at 30%) rather than
 * asserting a falsely precise actuarial figure for an older starting age. Labeled illustrative
 * wherever it is shown, per the spec.
 */
export function ageAdjustmentFactor(age: number): number {
  if (!Number.isFinite(age) || age <= 70) return 1;
  const yearsOver = age - 70;
  const compression = Math.min(yearsOver * 0.02, 0.3);
  return round4(1 - compression);
}

/**
 * "The Bill" — the ten-year staged care-cost total for a state, optionally age-adjusted.
 */
export function tenYearTotal(stateAbbr: string, age?: number): number {
  const { total } = stageCosts(stateAbbr);
  const factor = age === undefined ? 1 : ageAdjustmentFactor(age);
  return round2(total * factor);
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
 * cost for the state. Illustrative, not a Medicaid-eligibility calculation.
 */
export function spendDownYears(netWorthBand: NetWorthBand, stateAbbr: string): SpendDownResult {
  const row: StateCostOfCare = getCostOfCare(stateAbbr);
  const annualPrivatePayCost = row.nursingHomeAnnual;
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
// Single labeled constant for v1, per the spec: the 4M protocol basket, ~$10K/yr all-in.
// Footnote in the UI: "based on the 4M protocol basket — see your MindSpan results for your specific plan."
export const ANNUAL_PROTOCOL_PREMIUM = 10_000;
export const PREMIUM_YEARS = 10;

export function tenYearPremium(): number {
  return ANNUAL_PROTOCOL_PREMIUM * PREMIUM_YEARS;
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
