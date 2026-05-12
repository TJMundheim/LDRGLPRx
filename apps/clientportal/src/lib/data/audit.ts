/**
 * audit.ts — 8 AuditCategory definitions matching the master top-8 taxonomy.
 * Locked 2026-05-12 — reduced from 20 to 8 (see project_top_8_categories.md).
 *
 * Canonical order:
 *   gut-microbiome, sleep, weight-body-fat, nutrition,
 *   erectile-dysfunction, environment, cognitive, hormone-balance.
 *
 * All 8 are priorityTier: true.
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
 * Generic Likert+follow-up scorer used by all 8 categories.
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

export const AUDIT_CATEGORIES: AuditCategory[] = [
  {
    id: 'gut-microbiome',
    label: 'Gut health / leaky gut',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['gut-microbiome'] ?? {});
    },
  },
  {
    id: 'sleep',
    label: 'Sleep / sleep optimization',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['sleep'] ?? {});
    },
  },
  {
    id: 'weight-body-fat',
    label: 'Weight (BMI)',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['weight-body-fat'] ?? {});
    },
  },
  {
    id: 'nutrition',
    label: 'Diet / nutrition',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['nutrition'] ?? {});
    },
  },
  {
    id: 'erectile-dysfunction',
    label: 'Erectile + sexual function',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['erectile-dysfunction'] ?? {});
    },
  },
  {
    id: 'environment',
    label: 'Environment',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['environment'] ?? {});
    },
  },
  {
    id: 'cognitive',
    label: 'Cognitive / brain fog',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['cognitive'] ?? {});
    },
  },
  {
    id: 'hormone-balance',
    label: 'Hormone optimization / TRT',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      return genericScore(answers['hormone-balance'] ?? {});
    },
  },
];
