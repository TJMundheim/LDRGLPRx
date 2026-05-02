/**
 * audit.ts — 20 AuditCategory definitions with auto-scoring from Discovery answers.
 * Scoring: yes=problem anchors base 4–6; each follow-up yes adds 1–2 pts (cap 10).
 * Likert anchors: linear map 1→0, 5→10. Priority-tier uses full follow-up weighting.
 */

export interface AuditCategory {
  id: string;
  label: string;
  priorityTier: boolean;
  /** Score discovery answers for this category. Returns 0–10. */
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

function likertScoreInverted(v: unknown): number {
  // For "no=problem" Likerts: high value = good = low score
  const n = Number(v);
  if (!n || n < 1 || n > 5) return 0;
  return (5 - n) * 2.5;
}

export const AUDIT_CATEGORIES: AuditCategory[] = [
  {
    // Legacy id kept as 'purpose-social' to preserve in-flight localStorage data (discovery-v1.answers['purpose-social']).
    id: 'purpose-social',
    label: 'Lack of purpose, goals',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['purpose-social'] ?? {};
      if (!yesNo(cat['anchor_problem'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'morning-routine',
    label: 'Lack of morning routine',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['morning-routine'] ?? {};
      if (!yesNo(cat['anchor_problem'])) return 0; // no=problem, anchor_problem stored when answer is "no"
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 1;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'sleep',
    label: 'Sleep quality & duration',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['sleep'] ?? {};
      const base = likertScoreInverted(cat['anchor']);
      if (base === 0) return 0;
      let s = base;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 1;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'gut-microbiome',
    label: 'Leaky gut / gut microbiome',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['gut-microbiome'] ?? {};
      if (!yesNo(cat['anchor'])) return clamp(
        [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8'],cat['f9']]
          .filter(yesNo).length
      );
      let s = 4;
      const follows = [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8'],cat['f9']];
      s += follows.filter(yesNo).length;
      return clamp(s);
    },
  },
  {
    id: 'weight-body-fat',
    label: 'Weight / body fat',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['weight-body-fat'] ?? {};
      if (!yesNo(cat['anchor'])) return clamp(
        [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8']]
          .filter(yesNo).length
      );
      let s = 5;
      const follows = [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8']];
      s += follows.filter(yesNo).length;
      return clamp(s);
    },
  },
  {
    id: 'hormone-balance',
    label: 'Hormone balance / low testosterone',
    priorityTier: true,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['hormone-balance'] ?? {};
      if (!yesNo(cat['anchor'])) return clamp(
        [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8']]
          .filter(yesNo).length
      );
      let s = 5;
      const follows = [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8']];
      s += follows.filter(yesNo).length;
      return clamp(s);
    },
  },
  {
    id: 'dental-health',
    label: 'Dental biome & dental health',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['dental-health'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 4;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'substance-use',
    label: 'Excessive alcohol / smoking / vaping',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['substance-use'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'nutrition',
    label: 'Poor nutrition / diet',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['nutrition'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 4;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'nutritional-supplements',
    label: 'Nutritional supplement deficiencies',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['nutritional-supplements'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 4;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'environment',
    label: 'Environment (sun, blue light, EMF, air, water)',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['environment'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 4;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      if (yesNo(cat['f3'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'pain-acute',
    label: 'Acute injury or pain limiting activity',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['pain-acute'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      return clamp(s);
    },
  },
  {
    id: 'pain-chronic',
    label: 'Chronic injury or pain limiting activity',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['pain-chronic'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      return clamp(s);
    },
  },
  {
    id: 'allergies-immune',
    label: 'Allergies & immune issues',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['allergies-immune'] ?? {};
      if (!yesNo(cat['anchor'])) return clamp(
        [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8'],cat['f9']]
          .filter(yesNo).length
      );
      let s = 4;
      const follows = [cat['f1'],cat['f2'],cat['f3'],cat['f4'],cat['f5'],cat['f6'],cat['f7'],cat['f8'],cat['f9']];
      s += follows.filter(yesNo).length;
      return clamp(s);
    },
  },
  {
    id: 'stress',
    label: 'Stress',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['stress'] ?? {};
      const base = likertScore(cat['anchor']);
      if (base < 5) return 0; // ≥4 = problem, score 4→7.5, 5→10
      let s = base;
      if (yesNo(cat['f1'])) s += 1;
      if (yesNo(cat['f2'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'cognitive',
    label: 'Cognitive dysfunction',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['cognitive'] ?? {};
      if (!yesNo(cat['anchor'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      return clamp(s);
    },
  },
  {
    id: 'access-knowledge',
    label: 'Access to health knowledge / education',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['access-knowledge'] ?? {};
      if (!yesNo(cat['anchor_problem'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      return clamp(s);
    },
  },
  {
    id: 'access-care',
    label: 'Access to healthcare services',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['access-care'] ?? {};
      if (!yesNo(cat['anchor_problem'])) return 0;
      let s = 5;
      if (yesNo(cat['f1'])) s += 2;
      if (yesNo(cat['f2'])) s += 2;
      return clamp(s);
    },
  },
  {
    id: 'financial-stress',
    label: 'Financial stress',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['financial-stress'] ?? {};
      const base = likertScore(cat['anchor']);
      if (base < 5) return 0; // ≥4 = problem
      let s = base;
      if (yesNo(cat['f1'])) s += 1;
      if (yesNo(cat['f2'])) s += 1;
      return clamp(s);
    },
  },
  {
    id: 'self-image',
    label: 'Positive self-image',
    priorityTier: false,
    score(a) {
      const answers = a as Record<string, Record<string, unknown>>;
      const cat = answers['self-image'] ?? {};
      const base = likertScoreInverted(cat['anchor']);
      // ≤2 = problem → inverted score ≥7.5
      if (base < 7.5) return 0;
      let s = base;
      if (yesNo(cat['f1'])) s += 1;
      if (yesNo(cat['f2'])) s += 1;
      return clamp(s);
    },
  },
];
