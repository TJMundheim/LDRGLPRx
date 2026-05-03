/**
 * Intake routing engine — pure, no I/O.
 * evaluateIntake(answers, sections) → IntakeResult
 *
 * Rules (from docs/intake_questionnaire.md):
 *   - Biome-AF is default-on when any gut/brain/cognitive trigger fires.
 *   - Genesis RPA is surfaced only on hard triggers (joint dx, concussion, MCI, long-COVID).
 *   - Tier: 1–2 domains → foundation | 3–4 → optimization | Genesis RPA + ≥3 → longevity | complex → concierge
 *   - Clinician flags: MCI dx, suicidal ideation screen, long-COVID high severity, multiple autoimmune.
 */

import type {
  IntakeAnswer,
  IntakeSection,
  IntakeQuestion,
  IntakeResult,
  TierRec,
  TriggerRule,
  MultiSelectQuestion,
  SingleSelectQuestion,
  NumberQuestion,
  SeverityQuestion,
  YesNoQuestion,
} from '../data/intake';

// ─── Domain constants ────────────────────────────────────────────────────────
const GUT_BRAIN_DOMAINS = new Set(['gut', 'brain']);
const ALL_DOMAINS = ['gut', 'brain', 'sleep', 'metabolic', 'hormone', 'joint', 'sexual', 'inflammation'] as const;
type Domain = typeof ALL_DOMAINS[number];

// ─── Helper: merge trigger rule into accumulators ────────────────────────────
function applyTrigger(
  rule: TriggerRule,
  reason: string,
  productMap: Map<string, string[]>,
  labMap: Map<string, string[]>,
  tierCandidates: TierRec[],
  clinicianQueue: Array<{ questionId: string; reason: string }>,
  questionId: string,
  domainSeverity: Map<string, number>,
  severity: number,
): void {
  for (const slug of rule.productSlugs ?? []) {
    const arr = productMap.get(slug) ?? [];
    arr.push(reason);
    productMap.set(slug, arr);
  }
  for (const slug of rule.labSlugs ?? []) {
    const arr = labMap.get(slug) ?? [];
    arr.push(reason);
    labMap.set(slug, arr);
  }
  if (rule.tierRecommendation) {
    tierCandidates.push(rule.tierRecommendation);
  }
  if (rule.clinicianFlag) {
    clinicianQueue.push({ questionId, reason });
  }
  if (rule.tag) {
    const prev = domainSeverity.get(rule.tag) ?? 0;
    domainSeverity.set(rule.tag, prev + Math.max(severity, 1));
  }
}

// ─── Main evaluator ──────────────────────────────────────────────────────────
export function evaluateIntake(
  answers: IntakeAnswer[],
  sections: IntakeSection[],
): IntakeResult {
  // Build fast answer lookup
  const answerMap = new Map<string, IntakeAnswer['value']>();
  for (const a of answers) {
    answerMap.set(a.questionId, a.value);
  }

  // Build fast question lookup
  const questionMap = new Map<string, IntakeQuestion>();
  for (const section of sections) {
    for (const q of section.questions) {
      questionMap.set(q.id, q);
    }
  }

  // Accumulators
  const productMap = new Map<string, string[]>();
  const labMap     = new Map<string, string[]>();
  const tierCandidates: TierRec[] = [];
  const clinicianQueue: Array<{ questionId: string; reason: string }> = [];
  const domainSeverity = new Map<string, number>();

  // Walk every answered question
  for (const answer of answers) {
    const q = questionMap.get(answer.questionId);
    if (!q) continue;

    const val = answer.value;
    const reason = q.prompt;

    switch (q.type) {
      case 'severity': {
        const sq = q as SeverityQuestion;
        const numVal = typeof val === 'number' ? val : Number(val);
        for (const rule of sq.triggers) {
          const threshold = rule.threshold ?? 2;
          if (numVal >= threshold) {
            applyTrigger(rule, reason, productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, numVal);
          }
        }
        break;
      }

      case 'yesno': {
        const yq = q as YesNoQuestion;
        const boolVal = val === true || val === 'true' || val === 'yes' || val === 1;
        if (boolVal) {
          for (const rule of yq.triggers) {
            applyTrigger(rule, reason, productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, 2);
          }
        }
        break;
      }

      case 'multiselect': {
        const mq = q as MultiSelectQuestion;
        const selected = Array.isArray(val) ? val : typeof val === 'string' ? [val] : [];
        for (const opt of mq.options) {
          if (selected.includes(opt.value) && opt.triggers) {
            for (const rule of opt.triggers) {
              applyTrigger(rule, `${reason}: ${opt.label}`, productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, 1);
            }
          }
        }
        break;
      }

      case 'singleselect': {
        const ssq = q as SingleSelectQuestion;
        for (const opt of ssq.options) {
          if (opt.value === val && opt.triggers) {
            for (const rule of opt.triggers) {
              applyTrigger(rule, `${reason}: ${opt.label}`, productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, 1);
            }
          }
        }
        break;
      }

      case 'number': {
        const nq = q as NumberQuestion;
        const numVal = typeof val === 'number' ? val : Number(val);
        for (const nr of nq.numericRules ?? []) {
          let fires = false;
          if (nr.rule === 'gte' && numVal >= nr.value) fires = true;
          if (nr.rule === 'lte' && numVal <= nr.value) fires = true;
          if (nr.rule === 'between' && numVal >= nr.value && numVal <= nr.value2) fires = true;
          if (fires) {
            for (const rule of nr.triggers) {
              applyTrigger(rule, reason, productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, numVal);
            }
          }
        }
        // BMI computation from height/weight
        if (q.id === 's1_weight_lb') {
          const heightRaw = answerMap.get('s1_height_in');
          if (heightRaw !== undefined) {
            const h = Number(heightRaw);
            const w = numVal;
            if (h > 0 && w > 0) {
              const bmi = (w / (h * h)) * 703;
              if (bmi >= 27) {
                applyTrigger(
                  { productSlugs: ['glp1-semaglutide'], labSlugs: ['lab-foundation'], tierRecommendation: 'optimization', tag: 'metabolic' },
                  `Calculated BMI ${bmi.toFixed(1)} ≥ 27`,
                  productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, 2,
                );
              }
            }
          }
        }
        // Waist threshold computed using sex
        if (q.id === 's1_waist_in') {
          const sexRaw = answerMap.get('s1_sex');
          const sex = typeof sexRaw === 'string' ? sexRaw : '';
          const threshold = sex === 'female' ? 35 : 40;
          if (numVal >= threshold) {
            applyTrigger(
              { labSlugs: ['lab-foundation'], productSlugs: ['cgm-trial'], tag: 'metabolic' },
              `Waist circumference ${numVal}" ≥ ${threshold}"`,
              productMap, labMap, tierCandidates, clinicianQueue, q.id, domainSeverity, 2,
            );
          }
        }
        break;
      }

      case 'text':
        // Free text — no triggers
        break;
    }
  }

  // ── Default-on rule: Biome-AF if any gut or brain trigger fired ───────
  const hasGutOrBrainTrigger = GUT_BRAIN_DOMAINS.has('gut') && domainSeverity.has('gut') ||
    GUT_BRAIN_DOMAINS.has('brain') && domainSeverity.has('brain');
  if (hasGutOrBrainTrigger) {
    const existing = productMap.get('biomeaxisforge') ?? [];
    if (existing.length === 0) {
      productMap.set('biomeaxisforge', ['Default recommendation: gut-brain axis support']);
    }
  }

  // ── Tier computation ─────────────────────────────────────────────────────────
  const triggeredDomains = new Set(domainSeverity.keys());
  const domainCount = triggeredDomains.size;
  const hasGenesisRPA = productMap.has('genesis-rpa');

  let recommendedTier: TierRec = 'foundation';
  let tierRationale = '';

  // Concierge: complex case — multiple chronic flags + heavy family history signals
  const conciergeSignal = tierCandidates.filter(t => t === 'concierge').length > 0;
  // Longevity: Genesis RPA candidacy + ≥3 domains
  const longevitySignal = (hasGenesisRPA && domainCount >= 3) || tierCandidates.includes('longevity');
  // Optimization: 3–4 domains
  const optimizationSignal = domainCount >= 3 || tierCandidates.includes('optimization');

  if (conciergeSignal) {
    recommendedTier = 'concierge';
    tierRationale = 'Complex, multi-system presentation with clinician flags — concierge coordination recommended.';
  } else if (longevitySignal) {
    recommendedTier = 'longevity';
    tierRationale = `Genesis RPA candidacy with ${domainCount} active domains — longevity protocol recommended.`;
  } else if (optimizationSignal) {
    recommendedTier = 'optimization';
    tierRationale = `${domainCount} triggered domains — optimisation programme recommended.`;
  } else {
    recommendedTier = 'foundation';
    tierRationale = `${domainCount} triggered domain${domainCount !== 1 ? 's' : ''} — foundation programme is the right starting point.`;
  }

  // Override with highest explicit tier from triggers if it exceeds computed tier
  const tierOrder: TierRec[] = ['foundation', 'optimization', 'longevity', 'concierge'];
  for (const t of tierCandidates) {
    if (tierOrder.indexOf(t) > tierOrder.indexOf(recommendedTier)) {
      recommendedTier = t;
    }
  }

  // ── topPriorities ────────────────────────────────────────────────────────────
  const topPriorities = ALL_DOMAINS
    .filter(d => domainSeverity.has(d))
    .map(d => ({ domain: d as string, severity: domainSeverity.get(d)! }))
    .sort((a, b) => b.severity - a.severity);

  // ── Dedup clinician flags ────────────────────────────────────────────────────
  const seenFlags = new Set<string>();
  const clinicianFlags = clinicianQueue.filter(f => {
    if (seenFlags.has(f.questionId)) return false;
    seenFlags.add(f.questionId);
    return true;
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  const summary = buildSummary(topPriorities, triggeredDomains, hasGenesisRPA, recommendedTier);

  return {
    triggeredProducts: [...productMap.entries()].map(([slug, reasons]) => ({ slug, reasons })),
    triggeredLabs:     [...labMap.entries()].map(([slug, reasons]) => ({ slug, reasons })),
    recommendedTier,
    tierRationale,
    clinicianFlags,
    topPriorities,
    summary,
  };
}

// ─── Summary builder ─────────────────────────────────────────────────────────
function buildSummary(
  topPriorities: { domain: string; severity: number }[],
  triggeredDomains: Set<string>,
  hasGenesisRPA: boolean,
  tier: TierRec,
): string {
  if (topPriorities.length === 0) {
    return 'Your intake suggests a strong foundation for optimisation. We recommend starting with the Biome-AF gut-brain protocol and our Foundation lab panel to establish your baseline.';
  }

  const top3 = topPriorities.slice(0, 3).map(p => domainLabel(p.domain));
  const domainStr = top3.length === 1
    ? top3[0]
    : top3.slice(0, -1).join(', ') + ' and ' + top3[top3.length - 1];

  let sentence1 = `Your responses highlight ${domainStr} as your primary areas to address.`;

  let sentence2 = 'Biome-AF is recommended as your foundation, given the strong gut-brain connection that underlies most of these concerns.';
  if (hasGenesisRPA) {
    sentence2 = 'Based on your history, you may be a candidate for Genesis RPA — a clinician-led regenerative protocol to help support recovery and cellular repair.';
  }

  const tierDesc: Record<TierRec, string> = {
    foundation:   'The Foundation programme gives you the essentials to get started.',
    optimization: 'The Optimisation programme is designed to address the multi-domain pattern we\'re seeing.',
    longevity:    'The Longevity programme is the right fit given the depth of your goals and clinical picture.',
    concierge:    'A Concierge consultation is recommended so a clinician can coordinate your personalised protocol.',
  };
  const sentence3 = tierDesc[tier];

  return `${sentence1} ${sentence2} ${sentence3}`;
}

function domainLabel(domain: string): string {
  const labels: Record<string, string> = {
    gut:          'gut health',
    brain:        'cognitive and mental wellbeing',
    sleep:        'sleep quality',
    metabolic:    'metabolic health',
    hormone:      'hormonal balance',
    joint:        'joint and musculoskeletal health',
    sexual:       'sexual health',
    inflammation: 'inflammation and immune function',
    genomic:      'genomic insights',
  };
  return labels[domain] ?? domain;
}
