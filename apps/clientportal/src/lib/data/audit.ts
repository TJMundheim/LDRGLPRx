/**
 * audit.ts — AuditCategory definitions matching the website's 20-question
 * MindSpan assessment (2026-07-13, superseding the top-8/10-question set).
 *
 * Canonical order = website question order (pillar order embedded):
 *   Mind: cognitive, sleep, hearing-vision, mood, social-connection, mental-challenge
 *   Muscle: movement-strength, weight-body-fat, nutrition, pain-injury
 *   Mitigate: blood-pressure, blood-sugar, ldl-cholesterol, smoking-nicotine,
 *             alcohol, gut-microbiome, hormone-balance, erectile-dysfunction, environment
 *   Motivate: purpose-accountability
 *
 * 'already-diagnosed' is a Yes/No FLAG on the website (transmitted as 0|5) —
 * kept here (last) so legacy stored scores and the regen-medicine routing
 * still resolve, but it is excluded from top-3 ranking in renderer.ts.
 *
 * Scoring: each category accepts either a Likert anchor (1-5 → 0-10) OR
 * legacy yes/no follow-up flags. Linear map: 1→0, 5→10.
 */

export interface AuditCategory {
  id: string;
  label: string;
  priorityTier: boolean;
  /** Score discovery / Likert answers for this category. Returns 0–10. */
  score(answers: Record<string, unknown>): number;
}

function clamp(n: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, n));
}

function yesNo(v: unknown): boolean {
  return v === true || v === 'yes';
}

function likertScore(v: unknown): number {
  const n = Number(v);
  if (!n || n < 1 || n > 5) return 0;
  // 1→0, 2→2.5, 3→5, 4→7.5, 5→10
  return (n - 1) * 2.5;
}

/**
 * Generic Likert+follow-up scorer used by all categories.
 * If `anchor` is a 1-5 Likert → base from likertScore. Else if `anchor`
 * is yes/true → base 5. Add 1 pt per yes follow-up (f1..f3), cap 10.
 */
function genericScore(cat: Record<string, unknown>): number {
  let base = likertScore(cat['anchor']);
  if (base === 0 && yesNo(cat['anchor'])) base = 5;
  if (base === 0) {
    // count any yes follow-ups even without anchor
    const follows = [cat['f1'], cat['f2'], cat['f3']].filter(yesNo).length;
    return clamp(follows);
  }
  let s = base;
  if (yesNo(cat['f1'])) s += 1;
  if (yesNo(cat['f2'])) s += 1;
  if (yesNo(cat['f3'])) s += 1;
  return clamp(s);
}

function cat(id: string, label: string): AuditCategory {
  return {
    id,
    label,
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers[id] ?? {});
    },
  };
}

export const AUDIT_CATEGORIES: AuditCategory[] = [
  // ── Mind ──
  cat('cognitive', 'Cognitive / brain fog'),
  cat('sleep', 'Sleep'),
  cat('hearing-vision-dental', 'Hearing, vision & dental'),
  cat('mood', 'Mood'),
  cat('social-connection', 'Social connection'),
  cat('mental-challenge', 'Mental challenge'),
  // ── Muscle ──
  cat('movement-strength', 'Movement & strength'),
  cat('weight-body-fat', 'Weight'),
  cat('nutrition', 'Nutrition'),
  cat('pain-injury', 'Pain / injury'),
  // ── Mitigate ──
  cat('blood-pressure', 'Blood pressure'),
  cat('blood-sugar', 'Blood sugar'),
  cat('ldl-cholesterol', 'LDL cholesterol'),
  cat('smoking-nicotine', 'Smoking / nicotine'),
  cat('alcohol', 'Alcohol'),
  cat('gut-microbiome', 'Gut health'),
  cat('hormone-balance', 'Hormones'),
  cat('erectile-dysfunction', 'Sexual function'),
  cat('environment', 'Environment'),
  // ── Motivate ──
  cat('purpose-accountability', 'Purpose & accountability'),
  // ── Flag (not ranked — see renderer.ts) ──
  cat('already-diagnosed', 'Already diagnosed'),
];
