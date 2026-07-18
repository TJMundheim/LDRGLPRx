/**
 * MindSpan Score — v1 (pure, deterministic).
 *
 * Formula (v1):
 *   mindspanScore = clamp(round(
 *     0.45 * adherencePct +
 *     0.35 * (100 - riskLoad) +
 *     0.20 * (min(streakDays, 14) / 14) * 100
 *   ), 0, 100)
 *
 * Where:
 *   - adherencePct: percent of expected daily action slots completed over a
 *     trailing window (see adherencePctForWindow).
 *   - riskLoad: 0-100 composite risk score derived from factor scores (see
 *     riskLoadFromScores); higher = worse, so it is inverted (100 - riskLoad)
 *     in the weighted sum.
 *   - streakDays: consecutive-day completion streak for a key action,
 *     capped at 14 days for scoring purposes.
 *
 * This module is intentionally pure: no imports from the app, no reliance on
 * Date.now(). Every function takes explicit dates/inputs so it is fully
 * deterministic and testable in isolation.
 *
 * v2 note: labs (biomarker panel results) will be added as a 4th weighted
 * term once lab ingestion is available. The v1 weights (0.45 / 0.35 / 0.20)
 * will be rebalanced to make room for a labs term at that time.
 */

export type RiskScores = Record<string, number> | null | undefined;

export interface MindspanInputs {
  adherencePct: number;
  riskLoad: number;
  streakDays: number;
}

export interface MindspanEntry {
  /** `${YYYY-MM-DD}#${actionId}` */
  dateActionId: string;
  completedAt: string;
}

const EXPECTED_ACTION_IDS = ['biome-ns-ultra', 'eating-window'];
const SLOTS_PER_DAY = EXPECTED_ACTION_IDS.length;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Format a Date as a local YYYY-MM-DD string. */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return a new Date offset by `offsetDays` days (can be negative). */
function addDays(d: Date, offsetDays: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + offsetDays);
  return copy;
}

/**
 * Composite 0-100 risk load from a map of factor scores.
 * null/undefined/empty -> 50 (neutral default).
 * Each value is clamped to [0, maxPerFactor] before averaging.
 * Pass `expectedFactors` (e.g. the canonical 20-category count) to normalize
 * against the full assessment basis even when the stored payload carries
 * fewer keys (legacy handoffs) — unanswered factors then count 0, keeping
 * the dashboard risk consistent with the /100 assessment total.
 */
export function riskLoadFromScores(scores: RiskScores, maxPerFactor = 5, expectedFactors?: number): number {
  if (!scores) return 50;
  const keys = Object.keys(scores);
  if (keys.length === 0) return 50;

  let sum = 0;
  for (const key of keys) {
    sum += clamp(scores[key], 0, maxPerFactor);
  }
  const basis = Math.max(keys.length, expectedFactors ?? 0);
  return (100 * sum) / (maxPerFactor * basis);
}

/** Weighted v1 MindSpan Score, clamped to [0, 100]. */
export function mindspanScore({ adherencePct, riskLoad, streakDays }: MindspanInputs): number {
  const streakTerm = (Math.min(streakDays, 14) / 14) * 100;
  const raw = 0.45 * adherencePct + 0.35 * (100 - riskLoad) + 0.2 * streakTerm;
  return clamp(Math.round(raw), 0, 100);
}

/** Parse a dateActionId into { dateStr, actionId }, or null if malformed. */
function parseDateActionId(dateActionId: string): { dateStr: string; actionId: string } | null {
  const idx = dateActionId.indexOf('#');
  if (idx === -1) return null;
  return {
    dateStr: dateActionId.slice(0, idx),
    actionId: dateActionId.slice(idx + 1),
  };
}

/**
 * Percent (0-100, rounded) of expected daily action slots completed within
 * a trailing window of `days` ending on `endDate` (inclusive).
 * Expected slots = SLOTS_PER_DAY per day in the window (biome-ns-ultra,
 * eating-window). Duplicate same-day/same-action entries count once.
 * Entries outside the window or for unrecognized action ids are ignored.
 */
export function adherencePctForWindow(entries: MindspanEntry[], endDate: Date, days = 7, actionIds: string[] = EXPECTED_ACTION_IDS): number {
  const windowDateStrs = new Set<string>();
  for (let o = 0; o < days; o++) {
    windowDateStrs.add(toDateStr(addDays(endDate, -o)));
  }

  const uniqueHits = new Set<string>();
  for (const e of entries) {
    const parsed = parseDateActionId(e.dateActionId);
    if (!parsed) continue;
    const { dateStr, actionId } = parsed;
    if (!actionIds.includes(actionId)) continue;
    if (!windowDateStrs.has(dateStr)) continue;
    uniqueHits.add(`${dateStr}#${actionId}`);
  }

  const expectedSlots = days * actionIds.length;
  if (expectedSlots === 0) return 0;
  return Math.round((100 * uniqueHits.size) / expectedSlots);
}

/**
 * Length of the longest run of consecutive days (within `lookback` days
 * ending on `endDate`, inclusive) that have a completed entry for `actionId`.
 */
export function streakDays(
  entries: MindspanEntry[],
  endDate: Date,
  actionId = 'biome-ns-ultra',
  lookback = 14
): number {
  const completedDateStrs = new Set<string>();
  for (const e of entries) {
    const parsed = parseDateActionId(e.dateActionId);
    if (!parsed) continue;
    if (parsed.actionId !== actionId) continue;
    completedDateStrs.add(parsed.dateStr);
  }

  let bestRun = 0;
  let currentRun = 0;
  for (let o = lookback - 1; o >= 0; o--) {
    const dateStr = toDateStr(addDays(endDate, -o));
    if (completedDateStrs.has(dateStr)) {
      currentRun += 1;
      bestRun = Math.max(bestRun, currentRun);
    } else {
      currentRun = 0;
    }
  }
  return bestRun;
}

/**
 * Oldest-to-newest MindSpan Score for each of the last `days` days ending on
 * `endDate`, using a trailing adherence window (and trailing streak lookback)
 * ending on each respective day. riskLoad is held constant across the series.
 */
export function mindspanSeries(
  entries: MindspanEntry[],
  riskLoad: number,
  endDate: Date,
  days = 7
): number[] {
  const series: number[] = [];
  for (let o = days - 1; o >= 0; o--) {
    const dayEnd = addDays(endDate, -o);
    const adherencePct = adherencePctForWindow(entries, dayEnd, days);
    const streak = streakDays(entries, dayEnd, 'biome-ns-ultra', 14);
    series.push(mindspanScore({ adherencePct, riskLoad, streakDays: streak }));
  }
  return series;
}

/** Difference between the last and first entries of a series, to one decimal. */
export function weeklyDelta(series: number[]): number {
  if (series.length === 0) return 0;
  const delta = series[series.length - 1] - series[0];
  return Math.round(delta * 10) / 10;
}
