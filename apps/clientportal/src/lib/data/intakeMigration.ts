/**
 * intakeMigration.ts — Returning-user detection and neutral-default fill helpers.
 * All operations are localStorage-only; no backend calls.
 */

import { DISCOVERY } from './discovery';

export type ReturningUserStatus =
  | { kind: 'fresh' }
  | { kind: 'in-flight' }
  | { kind: 'returning-legacy' }
  | { kind: 'returning-completed' };

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Count how many of the 20 discovery categories have an anchor answer set. */
function countAnsweredCategories(storage: Storage): number {
  const state = readJson<{ answers: Record<string, Record<string, unknown>> }>(storage, 'discovery-v1');
  if (!state?.answers) return 0;
  return DISCOVERY.filter(cat => {
    const ans = state.answers[cat.id];
    if (!ans) return false;
    return ans[cat.anchorKey] !== undefined;
  }).length;
}

function hasLegacyAnswers(storage: Storage): boolean {
  const gut = readJson<{ answers?: Record<string, unknown> }>(storage, 'gut-assessment-v1');
  if (gut?.answers && Object.keys(gut.answers).length > 0) return true;
  const allergy = readJson<{ answers?: Record<string, unknown> }>(storage, 'allergy-assessment-v1');
  if (allergy?.answers && Object.keys(allergy.answers).length > 0) return true;
  return false;
}

export function detectReturningUser(storage: Storage): ReturningUserStatus {
  // returning-completed: prior completion flag present
  const complete = readJson<{ completedAt?: string }>(storage, 'intake-complete-v1');
  if (complete?.completedAt) return { kind: 'returning-completed' };

  const answeredCount = countAnsweredCategories(storage);

  // returning-legacy: old gut/allergy data exists but new discovery is sparse
  if (hasLegacyAnswers(storage) && answeredCount < 5) {
    return { kind: 'returning-legacy' };
  }

  // in-flight: stage key present, currentStage > 0, at least 1 but < 20 categories answered
  const stageData = readJson<{ currentStage?: number }>(storage, 'intake-stage-v1');
  if (
    stageData?.currentStage !== undefined &&
    stageData.currentStage > 0 &&
    answeredCount >= 1 &&
    answeredCount < 20
  ) {
    return { kind: 'in-flight' };
  }

  return { kind: 'fresh' };
}

/**
 * For each DISCOVERY category, write a neutral (no-problem) anchor answer to
 * discovery-v1 if the category is not already answered.
 * - yesno where problemAnchor='yes' → anchor = false  (no problem)
 * - yesno where problemAnchor='no'  → anchor_problem = false  (no problem, i.e. user answered "yes" so no issue)
 * - likert5 where problemDirection='gte' and problemThreshold=4 → anchor = 3  (below threshold)
 * - likert5 where problemDirection='lte' and problemThreshold=3 → anchor = 4  (above threshold)
 * Returns the count of categories filled.
 */
export function fillNeutralDefaults(storage: Storage): number {
  let state = readJson<{ answers: Record<string, Record<string, unknown>>; currentCategoryIndex: number; startedAt: string }>(
    storage, 'discovery-v1'
  );
  if (!state) {
    state = { answers: {}, currentCategoryIndex: 0, startedAt: new Date().toISOString() };
  }

  let filled = 0;
  for (const cat of DISCOVERY) {
    const existing = state.answers[cat.id];
    if (existing && existing[cat.anchorKey] !== undefined) continue;

    const anchor = cat.anchor;
    let neutralValue: unknown;

    if (anchor.type === 'yesno') {
      if (cat.anchorKey === 'anchor_problem') {
        // problemAnchor='no': anchor_problem is set when user answers "no" (problem).
        // Neutral = no problem = user answered "yes" → anchor_problem should be false/not set.
        // The scoring checks yesNo(cat['anchor_problem']) — false means no problem. Store false.
        neutralValue = false;
      } else {
        // problemAnchor='yes': anchor is set to true when problem. Neutral = false.
        neutralValue = false;
      }
    } else {
      // likert5
      if (anchor.problemDirection === 'gte') {
        // problem at >= threshold; neutral = threshold - 1 (but min 1)
        neutralValue = Math.max(1, (anchor.problemThreshold ?? 4) - 1);
      } else {
        // problemDirection='lte'; problem at <= threshold; neutral = threshold + 1 (but max 5)
        neutralValue = Math.min(5, (anchor.problemThreshold ?? 3) + 1);
      }
    }

    state.answers[cat.id] = { ...(existing ?? {}), [cat.anchorKey]: neutralValue };
    filled++;
  }

  // Advance currentCategoryIndex to mark all categories as navigated
  state.currentCategoryIndex = Math.max(state.currentCategoryIndex, DISCOVERY.length);

  try {
    storage.setItem('discovery-v1', JSON.stringify(state));
  } catch { /* non-fatal */ }

  return filled;
}
