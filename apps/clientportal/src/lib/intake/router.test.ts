import { describe, it, expect } from 'vitest';
import { evaluateIntake } from './router.js';
import type {
  IntakeAnswer,
  IntakeSection,
  SeverityQuestion,
  YesNoQuestion,
  NumberQuestion,
  MultiSelectQuestion,
  SingleSelectQuestion,
} from '../data/intake.js';

// ─── Minimal section/question helpers ────────────────────────────────────────

function severity(id: string, prompt: string, threshold = 1): SeverityQuestion {
  return {
    type: 'severity', id, prompt,
    triggers: [{ threshold, tag: id.split('_')[0], productSlugs: [`product-${id}`] }],
  };
}

function yesno(id: string, prompt: string, extra: Partial<import('../data/intake.js').TriggerRule> = {}): YesNoQuestion {
  return { type: 'yesno', id, prompt, triggers: [{ ...extra }] };
}

function number(id: string, prompt: string): NumberQuestion {
  return { type: 'number', id, prompt };
}

const BASE_SECTION: IntakeSection = {
  id: 's_base',
  title: 'Base',
  questions: [
    // gut severity
    { type: 'severity', id: 'gut_bloating', prompt: 'Gut bloating severity',
      triggers: [{ threshold: 1, tag: 'gut', productSlugs: ['biomeaxisforge'] }] } as SeverityQuestion,
    // brain severity
    { type: 'severity', id: 'brain_focus', prompt: 'Brain focus severity',
      triggers: [{ threshold: 1, tag: 'brain', productSlugs: ['biomeaxisforge'] }] } as SeverityQuestion,
    // joint yesno — Genesis RPA trigger
    { type: 'yesno', id: 'joint_torn_meniscus', prompt: 'Torn meniscus diagnosis',
      triggers: [{ productSlugs: ['genesis-rpa'], tag: 'joint',
        labSlugs: ['lab-intra-articular'] }] } as YesNoQuestion,
    // concussion yesno — Genesis RPA + clinician flag
    { type: 'yesno', id: 'brain_postconcussion', prompt: 'Post-concussion symptoms severe',
      triggers: [{ productSlugs: ['genesis-rpa'], clinicianFlag: true, tag: 'brain' }] } as YesNoQuestion,
    // suicidal ideation — clinician flag + concierge
    { type: 'yesno', id: 'mh_suicidal_ideation', prompt: 'Suicidal ideation screener',
      triggers: [{ clinicianFlag: true, tierRecommendation: 'concierge' }] } as YesNoQuestion,
    // height for BMI
    { type: 'number', id: 's1_height_in', prompt: 'Height in inches' } as NumberQuestion,
    // weight for BMI — router has BMI logic hardcoded on s1_weight_lb
    { type: 'number', id: 's1_weight_lb', prompt: 'Weight in pounds' } as NumberQuestion,
    // memory domain for APOE test
    { type: 'severity', id: 'brain_memory', prompt: 'Memory concerns',
      triggers: [{ threshold: 1, tag: 'brain', productSlugs: ['biomeaxisforge'] }] } as SeverityQuestion,
    // APOE family history
    { type: 'yesno', id: 'genomic_apoe_family', prompt: 'Family history of APOE / dementia',
      triggers: [{ labSlugs: ['lab-brain-biomarkers'], tag: 'genomic' }] } as YesNoQuestion,
    // sleep domain
    { type: 'severity', id: 'sleep_quality', prompt: 'Sleep quality',
      triggers: [{ threshold: 1, tag: 'sleep', productSlugs: ['sleep-support'] }] } as SeverityQuestion,
    // metabolic domain
    { type: 'severity', id: 'metabolic_energy', prompt: 'Metabolic energy',
      triggers: [{ threshold: 1, tag: 'metabolic', productSlugs: ['metabolic-bundle'] }] } as SeverityQuestion,
    // hormone domain
    { type: 'severity', id: 'hormone_fatigue', prompt: 'Hormone-related fatigue',
      triggers: [{ threshold: 1, tag: 'hormone', productSlugs: ['hormone-support'] }] } as SeverityQuestion,
  ],
};

function answers(map: Record<string, IntakeAnswer['value']>): IntakeAnswer[] {
  return Object.entries(map).map(([questionId, value]) => ({ questionId, value }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('evaluateIntake — router', () => {

  it('empty answers → foundation tier, no products, no flags', () => {
    const result = evaluateIntake([], [BASE_SECTION]);
    expect(result.recommendedTier).toBe('foundation');
    expect(result.triggeredProducts).toHaveLength(0);
    expect(result.clinicianFlags).toHaveLength(0);
  });

  it('gut severity ≥1 → BiomeAxisForge default-on', () => {
    const result = evaluateIntake(answers({ gut_bloating: 1 }), [BASE_SECTION]);
    const slugs = result.triggeredProducts.map(p => p.slug);
    expect(slugs).toContain('biomeaxisforge');
  });

  it('brain severity ≥1 → BiomeAxisForge default-on via brain domain', () => {
    const result = evaluateIntake(answers({ brain_focus: 2 }), [BASE_SECTION]);
    const slugs = result.triggeredProducts.map(p => p.slug);
    expect(slugs).toContain('biomeaxisforge');
  });

  it('torn meniscus → genesis-rpa + intra-articular lab', () => {
    const result = evaluateIntake(answers({ joint_torn_meniscus: true }), [BASE_SECTION]);
    const slugs = result.triggeredProducts.map(p => p.slug);
    const labs = result.triggeredLabs.map(l => l.slug);
    expect(slugs).toContain('genesis-rpa');
    expect(labs).toContain('lab-intra-articular');
  });

  it('post-concussion severe → genesis-rpa + clinician flag', () => {
    const result = evaluateIntake(answers({ brain_postconcussion: true }), [BASE_SECTION]);
    const slugs = result.triggeredProducts.map(p => p.slug);
    expect(slugs).toContain('genesis-rpa');
    expect(result.clinicianFlags.some(f => f.questionId === 'brain_postconcussion')).toBe(true);
  });

  it('height 70in + weight 220lb → BMI ≥27 → glp1-semaglutide', () => {
    // BMI = (220 / (70*70)) * 703 ≈ 31.6
    const result = evaluateIntake(
      answers({ s1_height_in: 70, s1_weight_lb: 220 }),
      [BASE_SECTION],
    );
    const slugs = result.triggeredProducts.map(p => p.slug);
    expect(slugs).toContain('glp1-semaglutide');
  });

  it('height 70in + weight 160lb → BMI <27 → no glp1', () => {
    // BMI = (160 / (70*70)) * 703 ≈ 22.9
    const result = evaluateIntake(
      answers({ s1_height_in: 70, s1_weight_lb: 160 }),
      [BASE_SECTION],
    );
    const slugs = result.triggeredProducts.map(p => p.slug);
    expect(slugs).not.toContain('glp1-semaglutide');
  });

  it('APOE family history + memory trigger → brain biomarkers lab', () => {
    const result = evaluateIntake(
      answers({ genomic_apoe_family: true, brain_memory: 2 }),
      [BASE_SECTION],
    );
    const labs = result.triggeredLabs.map(l => l.slug);
    expect(labs).toContain('lab-brain-biomarkers');
  });

  it('≥3 triggered domains → optimization tier', () => {
    // gut + sleep + metabolic = 3 domains
    const result = evaluateIntake(
      answers({ gut_bloating: 2, sleep_quality: 2, metabolic_energy: 2 }),
      [BASE_SECTION],
    );
    expect(['optimization', 'longevity', 'concierge']).toContain(result.recommendedTier);
  });

  it('suicidal ideation → clinician flag + concierge tier', () => {
    const result = evaluateIntake(answers({ mh_suicidal_ideation: true }), [BASE_SECTION]);
    expect(result.clinicianFlags.some(f => f.questionId === 'mh_suicidal_ideation')).toBe(true);
    expect(result.recommendedTier).toBe('concierge');
  });

});
