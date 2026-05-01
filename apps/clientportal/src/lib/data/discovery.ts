/**
 * discovery.ts — 20-category adaptive Discovery Questionnaire definitions.
 * Each category has an anchor question plus 2–9 follow-up questions.
 * Priority-tier categories (gut/weight/hormone) always show all follows.
 * Migration helper: migrateFromLegacy() moves old gut/allergy answers into discovery-v1.
 */

export type AnswerValue = boolean | number | string;

export interface DiscoveryQuestion {
  id: string;
  /** 'yesno' | 'likert5' | 'numeric' */
  type: 'yesno' | 'likert5' | 'numeric';
  text: string;
  /** For numeric: unit label to display (e.g. "in", "lbs") */
  unit?: string;
  /**
   * For yesno: 'yes' | 'no' — which answer signals a problem.
   * For likert5: number threshold (≤ or ≥ depending on invertProblem).
   */
  problemAnchor?: 'yes' | 'no';
  /** For likert5: value that signals problem (e.g. ≤3 or ≥4) */
  problemThreshold?: number;
  /** Direction: 'lte' means score ≤ threshold = problem; 'gte' means ≥ threshold */
  problemDirection?: 'lte' | 'gte';
}

export interface CategoryDiscovery {
  id: string;
  label: string;
  anchor: DiscoveryQuestion;
  /** Key used to store anchor answer — 'anchor' or 'anchor_problem' for no=problem */
  anchorKey: string;
  follows: DiscoveryQuestion[];
  alwaysAsk: boolean;
  /** For yesno: anchor answer that signals problem. For likert5 use problemThreshold. */
}

export const DISCOVERY: CategoryDiscovery[] = [
  {
    // Legacy id kept as 'purpose-social' to preserve in-flight localStorage data (discovery-v1.answers['purpose-social']).
    id: 'purpose-social',
    label: 'Lack of purpose, goals',
    anchorKey: 'anchor_problem',
    alwaysAsk: false,
    anchor: {
      id: 'purpose-anchor',
      type: 'yesno',
      text: 'Do you have a clear sense of purpose and specific goals you\'re actively working toward?',
      problemAnchor: 'no',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you lack written goals for the next 12 months?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do your daily activities feel disconnected from what you find most meaningful?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you struggle to identify a compelling reason to get out of bed in the morning?', problemAnchor: 'yes' },
      { id: 'f4', type: 'yesno', text: 'Do you go months without reviewing or updating your personal goals?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'morning-routine',
    label: 'Lack of morning routine',
    anchorKey: 'anchor_problem',
    alwaysAsk: false,
    anchor: {
      id: 'morning-routine-anchor',
      type: 'yesno',
      text: 'Do you have a consistent morning routine you follow most days?',
      problemAnchor: 'no',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you regularly reach for your phone within 10 minutes of waking up?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you typically skip breakfast or eat inconsistently in the morning?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you usually feel rushed, reactive, or behind before 9 AM?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'sleep',
    label: 'Sleep quality & duration',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'sleep-anchor',
      type: 'likert5',
      text: 'How would you rate your sleep quality on most nights?',
      problemThreshold: 3,
      problemDirection: 'lte',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you regularly get less than 7 hours of sleep on weeknights?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you wake up feeling unrefreshed even after a full night of sleep?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you rely on caffeine within 90 minutes of waking to feel alert?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'gut-microbiome',
    label: 'Leaky gut / gut microbiome',
    anchorKey: 'anchor',
    alwaysAsk: true,
    anchor: {
      id: 'gut-anchor',
      type: 'yesno',
      text: 'Do you frequently experience bloating, gas, or digestive discomfort after meals?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'I have excess gas or flatulence on a regular basis.', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'I experience abdominal discomfort, cramping, or pain.', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'My stools are irregular — constipation, diarrhea, or both.', problemAnchor: 'yes' },
      { id: 'f4', type: 'yesno', text: 'I have multiple food sensitivities or reactions.', problemAnchor: 'yes' },
      { id: 'f5', type: 'yesno', text: 'I feel brain fog or fatigue after eating.', problemAnchor: 'yes' },
      { id: 'f6', type: 'yesno', text: 'I have skin issues — acne, eczema, rashes, or rosacea.', problemAnchor: 'yes' },
      { id: 'f7', type: 'yesno', text: 'I have joint pain without injury, or an autoimmune diagnosis.', problemAnchor: 'yes' },
      { id: 'f8', type: 'yesno', text: "I've had 3 or more courses of antibiotics in the past 5 years.", problemAnchor: 'yes' },
      { id: 'f9', type: 'yesno', text: "I'm under chronic stress, or had a major stress event in the past year.", problemAnchor: 'yes' },
    ],
  },
  {
    id: 'weight-body-fat',
    label: 'Weight / body fat',
    anchorKey: 'anchor',
    alwaysAsk: true,
    anchor: {
      id: 'weight-anchor',
      type: 'yesno',
      text: 'Are you currently above your healthy target weight by more than 10 lbs?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Have you struggled to maintain weight loss even after a successful diet?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you notice increased fat around your midsection specifically?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you experience strong cravings for sugar or carbohydrates most days?', problemAnchor: 'yes' },
      { id: 'f4', type: 'yesno', text: 'Has your waist size increased noticeably over the last 2 years?', problemAnchor: 'yes' },
      { id: 'f5', type: 'yesno', text: 'Do you often feel hungry within 2 hours of eating a full meal?', problemAnchor: 'yes' },
      { id: 'f6', type: 'yesno', text: 'Do you frequently eat past fullness or late at night?', problemAnchor: 'yes' },
      { id: 'f7', type: 'yesno', text: 'Have you been told your blood sugar or insulin levels are elevated?', problemAnchor: 'yes' },
      { id: 'f8', type: 'yesno', text: 'Does your weight affect how you feel about participating in activities?', problemAnchor: 'yes' },
      { id: 'm_height', type: 'numeric', text: 'Current height', unit: 'in' },
      { id: 'm_weight', type: 'numeric', text: 'Current weight', unit: 'lbs' },
      { id: 'm_waist', type: 'numeric', text: 'Current waist circumference (at navel)', unit: 'in' },
    ],
  },
  {
    id: 'hormone-balance',
    label: 'Hormone balance / low testosterone',
    anchorKey: 'anchor',
    alwaysAsk: true,
    anchor: {
      id: 'hormone-anchor',
      type: 'yesno',
      text: 'Do you experience persistent fatigue, low libido, brain fog, or loss of muscle mass?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Has your drive or motivation noticeably declined in the past year?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you struggle to maintain or build muscle despite regular exercise?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Have you noticed increased irritability, mood swings, or low mood?', problemAnchor: 'yes' },
      { id: 'f4', type: 'yesno', text: 'Do you feel mentally foggy or struggle to concentrate for extended periods?', problemAnchor: 'yes' },
      { id: 'f5', type: 'yesno', text: 'Has your sleep quality or recovery worsened in the past 12 months?', problemAnchor: 'yes' },
      { id: 'f6', type: 'yesno', text: 'Have you had your hormone levels checked in the past 2 years?', problemAnchor: 'no' },
      { id: 'f7', type: 'yesno', text: 'Do you experience night sweats or unexplained temperature changes?', problemAnchor: 'yes' },
      { id: 'f8', type: 'yesno', text: 'Has your interest in physical intimacy dropped significantly?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'dental-health',
    label: 'Dental biome & dental health',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'dental-anchor',
      type: 'yesno',
      text: 'Have you had recent gum bleeding, persistent bad breath, or more than a year since your last cleaning?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do your gums bleed when you brush or floss?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you have loose teeth, receding gums, or unexplained tooth sensitivity?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you use mouthwash that contains alcohol daily?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'substance-use',
    label: 'Excessive alcohol / smoking / vaping',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'substance-anchor',
      type: 'yesno',
      text: 'Do you currently use alcohol more than 7 drinks per week, smoke, or vape (including nicotine pouches)?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you use alcohol or substances to manage stress or fall asleep?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Have you made unsuccessful attempts to cut back in the past year?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do others close to you express concern about your substance use?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'nutrition',
    label: 'Poor nutrition / diet',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'nutrition-anchor',
      type: 'yesno',
      text: 'Do you eat processed or fast food more than 3 times per week, or rely on convenience meals?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you consume seed oils (canola, soybean, sunflower) or packaged snacks daily?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you eat fewer than 3 servings of vegetables most days?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you regularly add sugar or sweeteners to food or drinks?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'vitamin-d',
    label: 'Vitamin D level',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'vitd-anchor',
      type: 'yesno',
      text: 'Do you spend less than 15 minutes outdoors most days, OR have you not had vitamin D tested in the past year?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you live or work mostly indoors, especially in winter months?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you consistently use high-SPF sunscreen that blocks UVB?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you experience low energy, low mood, or frequent illness in winter?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'environment',
    label: 'Environment (sun, blue light, EMF, air, water)',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'env-anchor',
      type: 'yesno',
      text: 'Do you regularly drink unfiltered tap water, work under fluorescent or blue-screen light most of the day, or have noticeable air-quality issues at home?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you use screens within 30 minutes of bedtime most nights?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you live near a major road, industrial area, or frequently notice poor air quality?', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'Do you sleep with your phone within arm\'s reach or in your bedroom?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'pain-acute',
    label: 'Acute injury or pain limiting activity',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'pain-acute-anchor',
      type: 'yesno',
      text: 'Is there an injury or pain in the past 4 weeks limiting your daily activity?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Is this pain preventing you from exercising or doing activities you enjoy?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Is the pain affecting your sleep or mood?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'pain-chronic',
    label: 'Chronic injury or pain limiting activity',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'pain-chronic-anchor',
      type: 'yesno',
      text: 'Have you had pain limiting daily activity for more than 3 months?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Does the chronic pain limit your ability to exercise or stay active?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Has this pain worsened or become more frequent over the past year?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'allergies-immune',
    label: 'Allergies & immune issues',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'allergy-anchor',
      type: 'yesno',
      text: 'Do you have noticeable food sensitivities, environmental allergies, or recurrent skin or sinus issues?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'I react to gluten or wheat (bloating, fatigue, brain fog, digestive issues).', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'I react to dairy (acne, congestion, GI issues, headaches).', problemAnchor: 'yes' },
      { id: 'f3', type: 'yesno', text: 'I have noticeable reactions to eggs, soy, corn, or peanuts.', problemAnchor: 'yes' },
      { id: 'f4', type: 'yesno', text: 'I have seasonal allergies (pollen, grass, ragweed, mold).', problemAnchor: 'yes' },
      { id: 'f5', type: 'yesno', text: 'I have year-round nasal congestion or post-nasal drip.', problemAnchor: 'yes' },
      { id: 'f6', type: 'yesno', text: 'I have unexplained skin rashes, hives, or eczema.', problemAnchor: 'yes' },
      { id: 'f7', type: 'yesno', text: 'I get migraines or recurring headaches.', problemAnchor: 'yes' },
      { id: 'f8', type: 'yesno', text: 'I have a history of recurrent sinus infections, ear infections, or strep.', problemAnchor: 'yes' },
      { id: 'f9', type: 'yesno', text: 'Certain foods reliably crash my energy or worsen my mood.', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'stress',
    label: 'Stress',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'stress-anchor',
      type: 'likert5',
      text: 'How would you rate your average stress level over the past month?',
      problemThreshold: 4,
      problemDirection: 'gte',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Does stress regularly interfere with your sleep or recovery?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you have fewer than 3 dedicated stress-management practices per week (exercise, meditation, time in nature, etc.)?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'cognitive',
    label: 'Cognitive dysfunction',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'cognitive-anchor',
      type: 'yesno',
      text: 'Have you noticed memory, focus, or word-finding issues in the past 6 months?',
      problemAnchor: 'yes',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you frequently lose your train of thought mid-sentence or forget recent events?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Has your ability to focus for 30+ minutes noticeably declined?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'access-knowledge',
    label: 'Access to health knowledge / education',
    anchorKey: 'anchor_problem',
    alwaysAsk: false,
    anchor: {
      id: 'knowledge-anchor',
      type: 'yesno',
      text: 'Do you feel you have access to trustworthy, up-to-date health information when you need it?',
      problemAnchor: 'no',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do you often feel overwhelmed or confused by conflicting health advice online?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you struggle to find qualified guidance tailored to your specific health goals?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'access-care',
    label: 'Access to healthcare services',
    anchorKey: 'anchor_problem',
    alwaysAsk: false,
    anchor: {
      id: 'care-anchor',
      type: 'yesno',
      text: 'Do you currently have a primary care doctor or telemedicine relationship you can reach within a week?',
      problemAnchor: 'no',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Do cost or insurance barriers regularly prevent you from getting recommended care?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Have you gone more than 2 years without a comprehensive wellness check?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'financial-stress',
    label: 'Financial stress',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'financial-anchor',
      type: 'likert5',
      text: 'How often do health-related costs influence your decisions?',
      problemThreshold: 4,
      problemDirection: 'gte',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Have you delayed or skipped a health service in the past year primarily due to cost?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Does financial stress contribute to your physical symptoms (tension, sleep issues, fatigue)?', problemAnchor: 'yes' },
    ],
  },
  {
    id: 'self-image',
    label: 'Positive self-image',
    anchorKey: 'anchor',
    alwaysAsk: false,
    anchor: {
      id: 'selfimage-anchor',
      type: 'likert5',
      text: 'How would you rate how you feel about how you look and present yourself?',
      problemThreshold: 2,
      problemDirection: 'lte',
    },
    follows: [
      { id: 'f1', type: 'yesno', text: 'Does dissatisfaction with your appearance affect your confidence in social or professional settings?', problemAnchor: 'yes' },
      { id: 'f2', type: 'yesno', text: 'Do you avoid situations (photos, events, gym) because of how you feel about your body?', problemAnchor: 'yes' },
    ],
  },
];

// ─── Migration helper ────────────────────────────────────────────────────────

export interface DiscoveryState {
  answers: Record<string, Record<string, unknown>>;
  currentCategoryIndex: number;
  startedAt: string;
}

const DISCOVERY_KEY = 'discovery-v1';

export function migrateFromLegacy(storage: Storage): void {
  try {
    const existingRaw = storage.getItem(DISCOVERY_KEY);
    const existing: DiscoveryState = existingRaw
      ? (JSON.parse(existingRaw) as DiscoveryState)
      : { answers: {}, currentCategoryIndex: 0, startedAt: new Date().toISOString() };

    let changed = false;

    // Migrate gut assessment
    const gutRaw = storage.getItem('gut-assessment-v1');
    if (gutRaw && !existing.answers['gut-microbiome']) {
      try {
        const gutState = JSON.parse(gutRaw) as { answers: Record<string, boolean>; score: number | null };
        if (gutState.answers && Object.keys(gutState.answers).length > 0) {
          const mapped: Record<string, unknown> = {};
          const keys = ['anchor', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'];
          Object.entries(gutState.answers).forEach(([idx, val]) => {
            const n = Number(idx);
            if (n === 0) mapped['anchor'] = val;
            else mapped[keys[n]] = val;
          });
          existing.answers['gut-microbiome'] = mapped;
          changed = true;
          storage.setItem('gut-assessment-v1', JSON.stringify({ ...gutState, migrated: true }));
        }
      } catch { /* ignore */ }
    }

    // Migrate allergy assessment
    const allergyRaw = storage.getItem('allergy-assessment-v1');
    if (allergyRaw && !existing.answers['allergies-immune']) {
      try {
        const allergyState = JSON.parse(allergyRaw) as { answers: Record<string, boolean>; score: number | null };
        if (allergyState.answers && Object.keys(allergyState.answers).length > 0) {
          const mapped: Record<string, unknown> = {};
          const keys = ['anchor', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'];
          Object.entries(allergyState.answers).forEach(([idx, val]) => {
            const n = Number(idx);
            if (n === 0) mapped['anchor'] = val;
            else mapped[keys[n]] = val;
          });
          existing.answers['allergies-immune'] = mapped;
          changed = true;
          storage.setItem('allergy-assessment-v1', JSON.stringify({ ...allergyState, migrated: true }));
        }
      } catch { /* ignore */ }
    }

    if (changed) {
      storage.setItem(DISCOVERY_KEY, JSON.stringify(existing));
    }
  } catch { /* non-fatal */ }
}
