/**
 * Coach scheduler — pure logic for determining when the AI coach should
 * next reach out to the user. No I/O or side effects.
 */

import type { CoachContext, ProgramMonth } from '../integrations/coach.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckInType = 'daily' | 'weekly' | 'milestone' | 'symptom-followup';

export interface NextCheckIn {
  /** ISO 8601 datetime string for the next scheduled check-in. */
  whenISO: string;
  type: CheckInType;
  reason: string;
}

// ---------------------------------------------------------------------------
// Milestone definitions
// ---------------------------------------------------------------------------

/** Months at which milestone check-ins are triggered (end of each phase). */
const MILESTONE_MONTHS: ProgramMonth[] = [1, 2, 3, 4];

/** Week-within-month numbers that count as milestone weeks. */
const MILESTONE_WEEKS = new Set([4]); // End of each 4-week block

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString();
}

/**
 * Returns true if the current context is at a milestone boundary
 * (end of a program month, expected post-lab or post-RPA window).
 */
function isMilestone(ctx: CoachContext): boolean {
  if (MILESTONE_WEEKS.has(ctx.currentWeek) && MILESTONE_MONTHS.includes(ctx.currentMonth as ProgramMonth)) {
    return true;
  }
  // Post-RPA administration window: Month 1, week 4 (RPA intro)
  if (ctx.currentMonth === 1 && ctx.currentWeek === 4) return true;
  // Post-lab-results window: Month 3, week 1 (cognitive re-test expected)
  if (ctx.currentMonth === 3 && ctx.currentWeek === 1) return true;
  return false;
}

/**
 * Returns true if any recent symptom score is high enough to warrant
 * a follow-up sooner than the normal cadence.
 * Threshold: any domain score >= 7 (out of 10, higher = worse).
 */
function needsSymptomFollowUp(ctx: CoachContext): boolean {
  if (!ctx.recentSymptomScores) return false;
  return Object.values(ctx.recentSymptomScores).some((score) => score >= 7);
}

// ---------------------------------------------------------------------------
// Primary export
// ---------------------------------------------------------------------------

/**
 * Returns the next check-in time and type for the given user context.
 *
 * Cadence by tier:
 *   foundation    — weekly
 *   optimization  — weekly, or sooner if symptom scores are high
 *   longevity     — 2× per week (every 3–4 days)
 *   concierge     — daily during active protocols
 *
 * Milestone events always take priority over the standard cadence.
 *
 * @param ctx        The current coach context.
 * @param lastCheckIn  Unix timestamp (ms) of the last check-in, if any.
 */
export function nextCheckInTime(
  ctx: CoachContext,
  lastCheckIn?: number,
): NextCheckIn {
  const base = lastCheckIn ? new Date(lastCheckIn) : new Date();

  // ── Milestone takes priority ──────────────────────────────────────────────
  if (isMilestone(ctx)) {
    const when = addDays(base, 0); // schedule immediately / same session
    const monthLabel = ctx.currentMonth === 'maintenance' ? 'Maintenance' : `Month ${ctx.currentMonth}`;
    return {
      whenISO: toISO(when),
      type: 'milestone',
      reason: `End of ${monthLabel} Week ${ctx.currentWeek} — milestone check-in due`,
    };
  }

  // ── Symptom follow-up (optimization + longevity + concierge) ─────────────
  if (
    ctx.tier !== 'foundation' &&
    needsSymptomFollowUp(ctx)
  ) {
    const when = addDays(base, 1);
    return {
      whenISO: toISO(when),
      type: 'symptom-followup',
      reason: 'One or more symptom scores >= 7 — follow-up within 24 hours',
    };
  }

  // ── Tier-based cadence ────────────────────────────────────────────────────
  switch (ctx.tier) {
    case 'concierge': {
      const when = addDays(base, 1);
      return {
        whenISO: toISO(when),
        type: 'daily',
        reason: 'Concierge tier — daily check-in during active protocols',
      };
    }

    case 'longevity': {
      // 2× per week ≈ every 3 days
      const when = addDays(base, 3);
      return {
        whenISO: toISO(when),
        type: 'weekly',
        reason: 'Longevity tier — 2× per week cadence',
      };
    }

    case 'optimization': {
      const when = addDays(base, 7);
      return {
        whenISO: toISO(when),
        type: 'weekly',
        reason: 'Optimization tier — weekly check-in',
      };
    }

    case 'foundation':
    default: {
      const when = addDays(base, 7);
      return {
        whenISO: toISO(when),
        type: 'weekly',
        reason: 'Foundation tier — weekly check-in',
      };
    }
  }
}
