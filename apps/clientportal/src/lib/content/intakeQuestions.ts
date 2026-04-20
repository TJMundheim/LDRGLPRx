/**
 * Intake questionnaire content — all 12 sections.
 * Source of truth: docs/intake_questionnaire.md
 *
 * Product slugs: biomeaxisforge | genesis-rpa | glp1-semaglutide | glp1-tirzepatide |
 *   ed-track | trt-male | hrt-female | enclomiphene | ketamine-track | peptide-bpc157 |
 *   peptide-semax | peptide-selank | peptide-dsip | peptide-epitalon |
 *   peptide-cerebrolysin | methylene-blue | stack-foundation | stack-focus |
 *   stack-recovery | stack-longevity | photobiomodulation | cgm-trial |
 *   sleep-trazodone | sleep-ramelteon | sleep-doxepin
 *
 * Lab slugs: lab-foundation | lab-cognitive-baseline | lab-gut-brain |
 *   lab-genomic-blueprint | lab-hormone | lab-brain-biomarkers | lab-sleep-study |
 *   lab-mycotoxin | lab-heavy-metals | lab-cardiovascular
 */

import type { IntakeSection } from '../data/intake';

export const intakeSections: IntakeSection[] = [

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1 — Demographics & baseline
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's1',
    title: 'Demographics & Baseline',
    subtitle: 'Basic information to personalise your protocol.',
    questions: [
      {
        type: 'number',
        id: 's1_age',
        prompt: 'What is your age?',
        unit: 'years',
        min: 18,
        max: 120,
      },
      {
        type: 'singleselect',
        id: 's1_sex',
        prompt: 'Sex assigned at birth',
        options: [
          { value: 'male',   label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other',  label: 'Other / prefer not to say' },
        ],
      },
      {
        type: 'number',
        id: 's1_height_in',
        prompt: 'Height',
        unit: 'inches',
        min: 48,
        max: 96,
      },
      {
        type: 'number',
        id: 's1_weight_lb',
        prompt: 'Weight',
        unit: 'lbs',
        min: 80,
        max: 600,
      },
      {
        type: 'number',
        id: 's1_waist_in',
        prompt: 'Waist circumference (measured at navel)',
        unit: 'inches',
        min: 20,
        max: 80,
        // Metabolic thresholds evaluated in router using sex answer
      },
      {
        type: 'multiselect',
        id: 's1_goals',
        prompt: 'What are your primary health goals? (select all that apply)',
        options: [
          { value: 'weight_loss',        label: 'Lose weight' },
          { value: 'focus',              label: 'Sharper focus' },
          { value: 'energy',             label: 'More energy' },
          { value: 'sleep',              label: 'Better sleep' },
          { value: 'sex_drive',          label: 'Sex drive / ED' },
          { value: 'joint_pain',         label: 'Joint pain' },
          { value: 'anxiety_mood',       label: 'Anxiety / mood' },
          { value: 'longevity',          label: 'Longevity / prevention' },
          { value: 'injury_recovery',    label: 'Injury recovery' },
          { value: 'post_concussion',    label: 'Post-concussion recovery',
            triggers: [{ productSlugs: ['genesis-rpa'], tag: 'brain' }] },
          { value: 'memory',             label: 'Memory concerns',
            triggers: [{ productSlugs: ['stack-focus', 'biomeaxisforge'], labSlugs: ['lab-cognitive-baseline'], tag: 'brain' }] },
          { value: 'gut',                label: 'Gut issues',
            triggers: [{ productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], tag: 'gut' }] },
          { value: 'hormone_balance',    label: 'Hormone balance',
            triggers: [{ labSlugs: ['lab-hormone'], tag: 'hormone' }] },
        ],
      },
      {
        type: 'text',
        id: 's1_medications',
        prompt: 'List any current medications, supplements, and known allergies.',
        helpText: 'Include dose and frequency if known.',
      },
      {
        type: 'text',
        id: 's1_surgeries',
        prompt: 'Describe any past surgeries or hospitalizations.',
      },
      {
        type: 'number',
        id: 's1_head_injuries',
        prompt: 'How many head injuries or concussions have you had?',
        unit: 'count',
        min: 0,
        max: 50,
        numericRules: [
          {
            rule: 'gte',
            value: 1,
            triggers: [
              { productSlugs: ['genesis-rpa'], tierRecommendation: 'longevity', tag: 'brain' },
            ],
          },
        ],
      },
      {
        type: 'multiselect',
        id: 's1_family_history',
        prompt: 'Family history (first-degree relatives): select all that apply',
        options: [
          { value: 'dementia',       label: 'Dementia / Alzheimer\'s',
            triggers: [{ labSlugs: ['lab-genomic-blueprint', 'lab-brain-biomarkers'], tierRecommendation: 'longevity', tag: 'brain' }] },
          { value: 'heart_disease',  label: 'Heart disease',
            triggers: [{ labSlugs: ['lab-cardiovascular'], tag: 'metabolic' }] },
          { value: 'diabetes',       label: 'Diabetes',
            triggers: [{ labSlugs: ['lab-foundation', 'lab-cardiovascular'], tag: 'metabolic' }] },
          { value: 'cancer',         label: 'Cancer' },
          { value: 'autoimmune',     label: 'Autoimmune condition',
            triggers: [{ labSlugs: ['lab-gut-brain'], tag: 'inflammation' }] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2 — Gut & digestion
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's2',
    title: 'Gut & Digestion',
    subtitle: 'Rate how often / severely each symptom affects you (0 = never, 3 = daily/severe).',
    questions: [
      {
        type: 'severity',
        id: 's2_bloating',
        prompt: 'Bloating after meals',
        triggers: [
          { threshold: 2, productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], tag: 'gut' },
        ],
      },
      {
        type: 'severity',
        id: 's2_gas_reflux',
        prompt: 'Frequent gas, belching, or reflux / GERD',
        triggers: [
          { threshold: 2, productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], tag: 'gut' },
        ],
      },
      {
        type: 'severity',
        id: 's2_stool_issues',
        prompt: 'Loose stools, constipation, or alternating pattern',
        triggers: [
          { threshold: 2, productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], tag: 'gut' },
        ],
      },
      {
        type: 'yesno',
        id: 's2_ibs_ibd_dx',
        prompt: 'Have you been diagnosed with IBS, IBD, Crohn\'s, or colitis?',
        triggers: [
          { productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], clinicianFlag: true, tag: 'gut' },
        ],
      },
      {
        type: 'yesno',
        id: 's2_antibiotics',
        prompt: 'Have you taken multiple courses of antibiotics in the last 5 years?',
        helpText: '3+ courses counts as "multiple."',
        triggers: [
          { productSlugs: ['biomeaxisforge'], tag: 'gut' },
        ],
      },
      {
        type: 'severity',
        id: 's2_food_sensitivities',
        prompt: 'Multiple food sensitivities or intolerances',
        triggers: [
          { threshold: 1, productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], tag: 'gut' },
        ],
      },
      {
        type: 'severity',
        id: 's2_skin',
        prompt: 'Skin issues linked to diet (acne, eczema, rosacea flares)',
        triggers: [
          { threshold: 1, productSlugs: ['biomeaxisforge'], tag: 'gut' },
        ],
      },
      {
        type: 'severity',
        id: 's2_brain_fog_eating',
        prompt: 'Brain fog or cognitive sluggishness after eating',
        triggers: [
          { threshold: 2, productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], tag: 'gut' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3 — Brain, mood, cognition
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's3',
    title: 'Brain, Mood & Cognition',
    subtitle: 'Rate how often / severely each symptom affects you.',
    questions: [
      {
        type: 'severity',
        id: 's3_brain_fog',
        prompt: 'Brain fog or mental fatigue',
        triggers: [
          { threshold: 2, productSlugs: ['biomeaxisforge', 'stack-foundation'], labSlugs: ['lab-cognitive-baseline'], tag: 'brain' },
        ],
      },
      {
        type: 'severity',
        id: 's3_focus',
        prompt: 'Trouble focusing or staying on task',
        triggers: [
          { threshold: 2, productSlugs: ['stack-focus'], labSlugs: ['lab-cognitive-baseline'], tag: 'brain' },
        ],
      },
      {
        type: 'severity',
        id: 's3_memory',
        prompt: 'Memory lapses (names, words, forgetting why you walked into a room)',
        triggers: [
          { threshold: 2, productSlugs: ['stack-foundation'], labSlugs: ['lab-cognitive-baseline', 'lab-genomic-blueprint'], tag: 'brain' },
        ],
      },
      {
        type: 'yesno',
        id: 's3_family_dementia',
        prompt: 'Family history of dementia or Alzheimer\'s?',
        triggers: [
          { labSlugs: ['lab-genomic-blueprint', 'lab-brain-biomarkers'], tierRecommendation: 'longevity', tag: 'brain' },
        ],
      },
      {
        type: 'number',
        id: 's3_concussion_count',
        prompt: 'Number of concussions or significant head injuries',
        unit: 'count',
        min: 0,
        max: 30,
        numericRules: [
          {
            rule: 'gte',
            value: 1,
            triggers: [
              { productSlugs: ['genesis-rpa'], tierRecommendation: 'longevity', tag: 'brain' },
            ],
          },
        ],
      },
      {
        type: 'severity',
        id: 's3_post_concussion',
        prompt: 'Persistent post-concussion symptoms (headache, fog, light or sound sensitivity)',
        triggers: [
          { threshold: 2, productSlugs: ['genesis-rpa', 'stack-foundation'], tierRecommendation: 'longevity', tag: 'brain' },
        ],
      },
      {
        type: 'yesno',
        id: 's3_mci_dx',
        prompt: 'Have you been diagnosed with mild cognitive impairment (MCI) or early dementia?',
        triggers: [
          { productSlugs: ['genesis-rpa', 'peptide-cerebrolysin'], labSlugs: ['lab-brain-biomarkers', 'lab-cognitive-baseline'], tierRecommendation: 'concierge', clinicianFlag: true, tag: 'brain' },
        ],
      },
      {
        type: 'severity',
        id: 's3_mood',
        prompt: 'Low mood, anhedonia, or persistent irritability',
        triggers: [
          { threshold: 2, productSlugs: ['biomeaxisforge'], labSlugs: ['lab-gut-brain'], clinicianFlag: true, tag: 'brain' },
        ],
      },
      {
        type: 'severity',
        id: 's3_anxiety',
        prompt: 'Anxiety, racing thoughts, or panic episodes',
        triggers: [
          { threshold: 2, productSlugs: ['peptide-selank'], labSlugs: ['lab-genomic-blueprint'], tag: 'brain' },
        ],
      },
      {
        type: 'yesno',
        id: 's3_ssri_nonresponse',
        prompt: 'History of depression that did not respond adequately to antidepressants (SSRIs/SNRIs)?',
        triggers: [
          { productSlugs: ['ketamine-track'], labSlugs: ['lab-genomic-blueprint'], clinicianFlag: true, tag: 'brain' },
        ],
      },
      {
        type: 'severity',
        id: 's3_burnout',
        prompt: 'Chronic stress or burnout affecting daily function',
        triggers: [
          { threshold: 2, productSlugs: ['peptide-selank', 'peptide-semax'], labSlugs: ['lab-hormone'], tag: 'brain' },
        ],
      },
      {
        // Safety screener — clinician flag on affirm
        type: 'yesno',
        id: 's3_si_screen',
        prompt: 'In the past month, have you had thoughts of harming yourself or not wanting to be alive?',
        helpText: 'This is a standard safety question asked of all participants.',
        triggers: [
          { clinicianFlag: true, tierRecommendation: 'concierge', tag: 'brain' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4 — Sleep
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's4',
    title: 'Sleep',
    subtitle: 'Rate how often / severely each issue affects you.',
    questions: [
      {
        type: 'severity',
        id: 's4_sleep_onset',
        prompt: 'Trouble falling asleep',
        triggers: [
          { threshold: 2, productSlugs: ['sleep-ramelteon', 'stack-foundation'], tag: 'sleep' },
        ],
      },
      {
        type: 'severity',
        id: 's4_night_waking',
        prompt: 'Waking during the night and struggling to return to sleep',
        triggers: [
          { threshold: 2, productSlugs: ['peptide-dsip', 'sleep-doxepin'], labSlugs: ['lab-hormone'], tag: 'sleep' },
        ],
      },
      {
        type: 'severity',
        id: 's4_snoring_apnea',
        prompt: 'Snoring, witnessed breathing pauses (apnea), or excessive daytime sleepiness',
        helpText: 'High-priority indicator for obstructive sleep apnea.',
        triggers: [
          { threshold: 1, labSlugs: ['lab-sleep-study'], tierRecommendation: 'optimization', tag: 'sleep' },
        ],
      },
      {
        type: 'severity',
        id: 's4_unrefreshed',
        prompt: 'Waking unrefreshed despite 7+ hours of sleep',
        triggers: [
          { threshold: 2, labSlugs: ['lab-sleep-study'], tag: 'sleep' },
        ],
      },
      {
        type: 'severity',
        id: 's4_rls',
        prompt: 'Restless legs or leg cramps at night',
        triggers: [
          { threshold: 2, labSlugs: ['lab-foundation'], tag: 'sleep' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5 — Metabolic, weight, energy
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's5',
    title: 'Metabolic Health, Weight & Energy',
    subtitle: 'Rate how often / severely each issue affects you.',
    questions: [
      {
        // BMI threshold handled in router from s1_height_in + s1_weight_lb
        type: 'yesno',
        id: 's5_weight_loss_difficulty',
        prompt: 'BMI ≥ 27 or unable to lose weight despite consistent effort?',
        helpText: 'We\'ll calculate BMI from the height and weight you provided.',
        triggers: [
          { productSlugs: ['glp1-semaglutide'], labSlugs: ['lab-foundation'], tierRecommendation: 'optimization', tag: 'metabolic' },
        ],
      },
      {
        type: 'yesno',
        id: 's5_waist_threshold',
        prompt: 'Waist circumference ≥ 40 inches (men) or ≥ 35 inches (women)?',
        triggers: [
          { labSlugs: ['lab-foundation'], productSlugs: ['cgm-trial'], tag: 'metabolic' },
        ],
      },
      {
        type: 'yesno',
        id: 's5_prediabetes',
        prompt: 'Diagnosed with pre-diabetes or type 2 diabetes?',
        triggers: [
          { productSlugs: ['glp1-semaglutide', 'cgm-trial'], labSlugs: ['lab-foundation', 'lab-cardiovascular'], tierRecommendation: 'optimization', tag: 'metabolic' },
        ],
      },
      {
        type: 'severity',
        id: 's5_cravings',
        prompt: 'Strong sugar or carbohydrate cravings, or energy crashes after meals',
        triggers: [
          { threshold: 2, productSlugs: ['cgm-trial'], labSlugs: ['lab-foundation'], tag: 'metabolic' },
        ],
      },
      {
        type: 'yesno',
        id: 's5_family_t2d_cvd',
        prompt: 'Family history of type 2 diabetes or early cardiovascular disease?',
        triggers: [
          { labSlugs: ['lab-cardiovascular', 'lab-foundation'], tag: 'metabolic' },
        ],
      },
      {
        type: 'yesno',
        id: 's5_stalled_weight_loss',
        prompt: 'Stalled weight loss despite following a structured diet?',
        triggers: [
          { productSlugs: ['glp1-semaglutide'], labSlugs: ['lab-hormone'], tag: 'metabolic' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6 — Hormones
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's6',
    title: 'Hormones',
    subtitle: 'Answer the questions relevant to your sex. Rate 0–3 where applicable.',
    questions: [
      // Male-specific
      {
        type: 'severity',
        id: 's6m_libido_ed',
        prompt: '[Men] Low libido, ED, or weak morning erections',
        triggers: [
          { threshold: 2, productSlugs: ['ed-track', 'trt-male', 'enclomiphene'], labSlugs: ['lab-hormone'], tag: 'hormone' },
        ],
      },
      {
        type: 'severity',
        id: 's6m_muscle_loss',
        prompt: '[Men] Loss of muscle mass or difficulty building muscle',
        triggers: [
          { threshold: 2, productSlugs: ['trt-male', 'enclomiphene'], labSlugs: ['lab-hormone'], tag: 'hormone' },
        ],
      },
      {
        type: 'severity',
        id: 's6m_drive',
        prompt: '[Men] Decreased motivation, competitive drive, or ambition',
        triggers: [
          { threshold: 2, productSlugs: ['trt-male', 'enclomiphene'], labSlugs: ['lab-hormone'], tag: 'hormone' },
        ],
      },
      {
        type: 'severity',
        id: 's6m_fatigue',
        prompt: '[Men] Fatigue despite adequate sleep',
        triggers: [
          { threshold: 2, labSlugs: ['lab-hormone', 'lab-foundation'], tag: 'hormone' },
        ],
      },
      // Female-specific
      {
        type: 'severity',
        id: 's6f_cycle',
        prompt: '[Women] Cycle irregularity, PMS, or perimenopause symptoms',
        triggers: [
          { threshold: 2, productSlugs: ['hrt-female'], labSlugs: ['lab-hormone'], tag: 'hormone' },
        ],
      },
      {
        type: 'severity',
        id: 's6f_vasomotor',
        prompt: '[Women] Hot flashes, night sweats, or vaginal dryness',
        triggers: [
          { threshold: 1, productSlugs: ['hrt-female'], labSlugs: ['lab-hormone'], clinicianFlag: true, tag: 'hormone' },
        ],
      },
      {
        type: 'severity',
        id: 's6f_libido',
        prompt: '[Women] Loss of libido',
        triggers: [
          { threshold: 2, productSlugs: ['hrt-female'], labSlugs: ['lab-hormone'], clinicianFlag: true, tag: 'hormone' },
        ],
      },
      {
        type: 'severity',
        id: 's6f_mood_cycle',
        prompt: '[Women] Mood swings tied to menstrual cycle',
        triggers: [
          { threshold: 2, productSlugs: ['hrt-female'], labSlugs: ['lab-hormone', 'lab-genomic-blueprint'], tag: 'hormone' },
        ],
      },
      // Both sexes
      {
        type: 'severity',
        id: 's6_thyroid',
        prompt: 'Cold intolerance, hair thinning, unexplained weight gain, or constipation',
        helpText: 'These are common signs of low thyroid function.',
        triggers: [
          { threshold: 2, labSlugs: ['lab-hormone'], tag: 'hormone' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 7 — Joint, musculoskeletal, injury
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's7',
    title: 'Joint, Musculoskeletal & Injury',
    subtitle: 'Rate how often / severely each issue affects you.',
    questions: [
      {
        type: 'severity',
        id: 's7_chronic_joint',
        prompt: 'Chronic joint pain (knee, shoulder, hip, or back)',
        triggers: [
          { threshold: 2, productSlugs: ['genesis-rpa'], tierRecommendation: 'longevity', clinicianFlag: true, tag: 'joint' },
        ],
      },
      {
        type: 'yesno',
        id: 's7_structural_dx',
        prompt: 'Diagnosed with a torn meniscus, labral tear, rotator cuff tear, ACL, or MCL injury?',
        triggers: [
          { productSlugs: ['genesis-rpa'], tierRecommendation: 'longevity', clinicianFlag: true, tag: 'joint' },
        ],
      },
      {
        type: 'yesno',
        id: 's7_oa_dx',
        prompt: 'Diagnosed with osteoarthritis?',
        triggers: [
          { productSlugs: ['genesis-rpa', 'peptide-bpc157'], tierRecommendation: 'longevity', clinicianFlag: true, tag: 'joint' },
        ],
      },
      {
        type: 'yesno',
        id: 's7_slow_healing',
        prompt: 'Recent injury that is not healing as expected?',
        triggers: [
          { productSlugs: ['genesis-rpa', 'peptide-bpc157'], tag: 'joint' },
        ],
      },
      {
        type: 'severity',
        id: 's7_tendon',
        prompt: 'Chronic tendon or ligament issues (tennis elbow, plantar fasciitis, Achilles)',
        triggers: [
          { threshold: 2, productSlugs: ['peptide-bpc157'], tag: 'joint' },
        ],
      },
      {
        type: 'yesno',
        id: 's7_post_surgical',
        prompt: 'Post-surgical recovery with ongoing pain or stiffness?',
        triggers: [
          { productSlugs: ['genesis-rpa', 'peptide-bpc157', 'stack-recovery'], clinicianFlag: true, tag: 'joint' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 8 — Sexual health
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's8',
    title: 'Sexual Health',
    subtitle: 'Rate how often / severely each issue affects you.',
    questions: [
      {
        type: 'severity',
        id: 's8_ed',
        prompt: 'Erectile dysfunction — frequency, severity, or duration of difficulty',
        triggers: [
          { threshold: 1, productSlugs: ['ed-track'], labSlugs: ['lab-hormone', 'lab-cardiovascular'], clinicianFlag: true, tag: 'sexual' },
        ],
      },
      {
        type: 'severity',
        id: 's8_sensation',
        prompt: 'Decreased sensation or sexual performance concerns',
        triggers: [
          { threshold: 2, labSlugs: ['lab-hormone'], clinicianFlag: true, tag: 'sexual' },
        ],
      },
      {
        type: 'yesno',
        id: 's8_structural',
        prompt: 'Peyronie\'s disease or other structural concerns?',
        triggers: [
          { clinicianFlag: true, tag: 'sexual' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 9 — Inflammation, autoimmune, chronic illness
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's9',
    title: 'Inflammation, Autoimmune & Chronic Illness',
    subtitle: 'Rate how often / severely each issue affects you.',
    questions: [
      {
        type: 'severity',
        id: 's9_long_covid',
        prompt: 'Multiple unexplained symptoms following a viral illness (long COVID)',
        helpText: 'Examples: fatigue, brain fog, shortness of breath, palpitations lasting weeks or months post-infection.',
        triggers: [
          { threshold: 2, productSlugs: ['genesis-rpa'], labSlugs: ['lab-gut-brain'], tierRecommendation: 'longevity', clinicianFlag: true, tag: 'inflammation' },
        ],
      },
      {
        type: 'yesno',
        id: 's9_autoimmune_dx',
        prompt: 'Diagnosed with an autoimmune condition?',
        triggers: [
          { labSlugs: ['lab-gut-brain', 'lab-foundation'], clinicianFlag: true, tag: 'inflammation' },
        ],
      },
      {
        type: 'severity',
        id: 's9_chronic_pain',
        prompt: 'Widespread chronic pain or fibromyalgia-like symptoms',
        triggers: [
          { threshold: 2, labSlugs: ['lab-foundation', 'lab-hormone'], clinicianFlag: true, tag: 'inflammation' },
        ],
      },
      {
        type: 'yesno',
        id: 's9_mold',
        prompt: 'History of living or working in a water-damaged or mold-affected building?',
        triggers: [
          { labSlugs: ['lab-mycotoxin'], tag: 'inflammation' },
        ],
      },
      {
        type: 'yesno',
        id: 's9_heavy_metals',
        prompt: 'History of occupational, dental amalgam, or dietary heavy metal exposure?',
        triggers: [
          { labSlugs: ['lab-heavy-metals'], tag: 'inflammation' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 10 — Lifestyle context (no triggers; informs protocol)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's10',
    title: 'Lifestyle Context',
    subtitle: 'This information helps personalise your protocol — no right or wrong answers.',
    questions: [
      {
        type: 'singleselect',
        id: 's10_diet',
        prompt: 'What best describes your usual eating pattern?',
        options: [
          { value: 'standard',       label: 'Standard / mixed' },
          { value: 'mediterranean',  label: 'Mediterranean' },
          { value: 'keto',           label: 'Ketogenic / low-carb' },
          { value: 'vegetarian',     label: 'Vegetarian' },
          { value: 'vegan',          label: 'Vegan' },
          { value: 'paleo',          label: 'Paleo / whole30' },
          { value: 'other',          label: 'Other' },
        ],
      },
      {
        type: 'number',
        id: 's10_alcohol_wk',
        prompt: 'Alcoholic drinks per week',
        unit: 'drinks/week',
        min: 0,
        max: 100,
      },
      {
        type: 'singleselect',
        id: 's10_tobacco',
        prompt: 'Tobacco or nicotine use',
        options: [
          { value: 'never',    label: 'Never' },
          { value: 'former',   label: 'Former user' },
          { value: 'current',  label: 'Current user' },
        ],
      },
      {
        type: 'number',
        id: 's10_caffeine_mg',
        prompt: 'Daily caffeine intake (approximate)',
        unit: 'mg/day',
        min: 0,
        max: 2000,
      },
      {
        type: 'singleselect',
        id: 's10_exercise_freq',
        prompt: 'Exercise frequency',
        options: [
          { value: 'none',       label: 'Sedentary / none' },
          { value: '1_2x',       label: '1–2×/week' },
          { value: '3_4x',       label: '3–4×/week' },
          { value: '5plus',      label: '5+×/week' },
        ],
      },
      {
        type: 'multiselect',
        id: 's10_exercise_type',
        prompt: 'Types of exercise you do (select all)',
        options: [
          { value: 'strength',  label: 'Strength / resistance training' },
          { value: 'cardio',    label: 'Cardio / endurance' },
          { value: 'hiit',      label: 'HIIT' },
          { value: 'yoga',      label: 'Yoga / mobility' },
          { value: 'sport',     label: 'Sport / recreational' },
          { value: 'none',      label: 'None' },
        ],
      },
      {
        type: 'number',
        id: 's10_stress',
        prompt: 'Subjective stress level on an average day',
        unit: '/10',
        min: 1,
        max: 10,
      },
      {
        type: 'number',
        id: 's10_social',
        prompt: 'Quality of social connection',
        unit: '/10',
        min: 1,
        max: 10,
      },
      {
        type: 'multiselect',
        id: 's10_trackers',
        prompt: 'Tracking devices you currently use (select all)',
        options: [
          { value: 'oura',        label: 'Oura Ring' },
          { value: 'whoop',       label: 'Whoop' },
          { value: 'apple_watch', label: 'Apple Watch' },
          { value: 'cgm',         label: 'Continuous glucose monitor (CGM)' },
          { value: 'none',        label: 'None' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 11 — Genetic curiosity
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's11',
    title: 'Genetic Curiosity',
    subtitle: 'Opt in to genomic insights that may be relevant to you.',
    questions: [
      {
        type: 'yesno',
        id: 's11_pgx',
        prompt: 'Would you like to know how your genetics affect medication metabolism (pharmacogenomics)?',
        triggers: [
          { labSlugs: ['lab-genomic-blueprint'], tag: 'genomic' },
        ],
      },
      {
        type: 'yesno',
        id: 's11_apoe',
        prompt: 'Would you like to know your genetic risk for Alzheimer\'s (APOE genotype)?',
        helpText: 'Results include genetic counseling guidance.',
        triggers: [
          { labSlugs: ['lab-genomic-blueprint', 'lab-brain-biomarkers'], tag: 'genomic' },
        ],
      },
      {
        type: 'yesno',
        id: 's11_methylation',
        prompt: 'Have you heard of MTHFR or methylation issues? Would you like a full methylation panel?',
        triggers: [
          { labSlugs: ['lab-genomic-blueprint'], tag: 'genomic' },
        ],
      },
      {
        type: 'yesno',
        id: 's11_23andme',
        prompt: 'Have you done 23andMe or AncestryDNA and would like clinical interpretation?',
        triggers: [
          { labSlugs: ['lab-genomic-blueprint'], tag: 'genomic' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 12 — Diagnostics opt-ins
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's12',
    title: 'Diagnostics Opt-ins',
    subtitle: 'Based on your answers, we\'ve identified these add-on panels. Confirm which you\'d like included.',
    questions: [
      {
        type: 'yesno',
        id: 's12_foundation_labs',
        prompt: 'Foundation lab panel (CBC, metabolic, lipids, thyroid, fasting insulin, vitamin D, ferritin)',
        triggers: [
          { labSlugs: ['lab-foundation'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_gut_brain_panel',
        prompt: 'Gut + Brain panel (GI-MAP, SIBO, OAT, zonulin, oral microbiome, BDNF)',
        triggers: [
          { labSlugs: ['lab-gut-brain'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_genomic',
        prompt: 'Genomic Blueprint (methylation, APOE, PGx, detox SNPs, nutrigenomics)',
        triggers: [
          { labSlugs: ['lab-genomic-blueprint'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_hormone_panel',
        prompt: 'Hormone Optimisation panel + DUTCH (comprehensive steroid hormone metabolites)',
        triggers: [
          { labSlugs: ['lab-hormone'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_brain_biomarkers',
        prompt: 'Brain biomarkers (GFAP, p-tau 217, neurofilament light chain)',
        triggers: [
          { labSlugs: ['lab-brain-biomarkers'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_cognitive_baseline',
        prompt: 'Cognitive baseline assessment (Creyos digital battery)',
        triggers: [
          { labSlugs: ['lab-cognitive-baseline'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_sleep_study',
        prompt: 'Home sleep study (WatchPAT — screens for sleep apnea)',
        triggers: [
          { labSlugs: ['lab-sleep-study'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_mycotoxin_metals',
        prompt: 'Mycotoxin + heavy metals panel',
        triggers: [
          { labSlugs: ['lab-mycotoxin', 'lab-heavy-metals'] },
        ],
      },
      {
        type: 'yesno',
        id: 's12_cgm',
        prompt: 'CGM trial (14-day continuous glucose monitor)',
        triggers: [
          { productSlugs: ['cgm-trial'] },
        ],
      },
    ],
  },
];
