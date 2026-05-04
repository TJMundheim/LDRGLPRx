/**
 * audit-questions.ts — 20 public assessment questions mirroring
 * apps/clientportal/src/lib/components/intake/Stage2Likert.svelte
 * and apps/clientportal/src/lib/data/audit.ts.
 *
 * Each item: id, n (01-20 padded), label, prompt, scoreGuide, categoryNote, priorityTier.
 * User input is 0-5; multiply by 2 to get a 0-10 score matching the rest of the system.
 */

export interface AuditQuestion {
  id: string;
  /** Zero-padded two-digit number, e.g. "01" */
  n: string;
  label: string;
  prompt: string;
  /** Scoring guide shown in the expandable panel */
  scoreGuide: string;
  /** Short category context note */
  categoryNote: string;
  /** Priority tier — gut/weight/hormone win ties in top-3 selection */
  priorityTier: boolean;
  /** URL slug for /solutions/<slug> */
  solutionSlug: string;
}

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: 'purpose-social',
    n: '01',
    label: 'Lack of purpose, goals',
    prompt: 'How much do you struggle with a clear sense of purpose, written goals, or daily meaning?',
    scoreGuide: "0 = I have crystal-clear purpose and goals I'm actively pursuing · 3 = I have some direction but it's fuzzy · 5 = I'm drifting; nothing feels meaningful or motivating",
    categoryNote: 'Motivate pillar — foundational to every other behavior change.',
    priorityTier: false,
    solutionSlug: 'purpose-goals',
  },
  {
    id: 'morning-routine',
    n: '02',
    label: 'Lack of morning routine',
    prompt: 'How much do you struggle with an inconsistent or absent morning routine?',
    scoreGuide: '0 = I have a consistent ritual I follow daily · 3 = I have a loose routine but skip it often · 5 = I have no routine; mornings feel chaotic',
    categoryNote: 'Motivate pillar — morning anchors compound over weeks.',
    priorityTier: false,
    solutionSlug: 'morning-routine',
  },
  {
    id: 'sleep',
    n: '03',
    label: 'Sleep quality & duration',
    prompt: 'How much do sleep problems (poor quality, inconsistent timing, frequent waking, fatigue on waking) affect you?',
    scoreGuide: '0 = Consistently great sleep, well-rested every morning · 3 = Hit-or-miss; some nights fine, some rough · 5 = Chronic insomnia, daily fatigue, inconsistent timing, frequent waking',
    categoryNote: 'Mitigate pillar — poor sleep degrades every other system.',
    priorityTier: false,
    solutionSlug: 'sleep',
  },
  {
    id: 'gut-microbiome',
    n: '04',
    label: 'Leaky gut / gut microbiome',
    prompt: 'How much do gut symptoms (bloating, gas, irregular stools, food sensitivities, brain fog after meals) affect you?',
    scoreGuide: '0 = No notable gut symptoms · 3 = Occasional bloating or food reactions, manageable · 5 = Frequent bloating, irregular stools, brain fog after meals, multiple food sensitivities',
    categoryNote: 'Mitigate pillar — gut-brain axis is the primary driver of cognitive aging.',
    priorityTier: true,
    solutionSlug: 'gut',
  },
  {
    id: 'weight-body-fat',
    n: '05',
    label: 'Weight / body fat',
    prompt: 'How much excess body fat do you carry beyond your healthy target?',
    scoreGuide: '0 = At my ideal weight and composition · 3 = Roughly 10–20 lbs above target · 5 = >30 lbs above target with visible visceral fat',
    categoryNote: 'Muscle pillar — visceral fat is an independent cognitive risk factor.',
    priorityTier: true,
    solutionSlug: 'weight',
  },
  {
    id: 'hormone-balance',
    n: '06',
    label: 'Hormone balance / low testosterone',
    prompt: 'How often do you experience symptoms of hormone imbalance (persistent fatigue, low libido, brain fog, loss of muscle mass, mood swings, poor recovery)?',
    scoreGuide: '0 = Energy, libido, mood, and recovery all feel optimal · 3 = Occasional symptoms, especially after stress · 5 = Multiple symptoms most days affecting daily function',
    categoryNote: 'Mitigate pillar — testosterone and cortisol balance underlie resilience.',
    priorityTier: true,
    solutionSlug: 'hormones',
  },
  {
    id: 'dental-health',
    n: '07',
    label: 'Dental biome & dental health',
    prompt: 'How would you rate your dental health concerns (gum bleeding, bad breath, missed cleanings)?',
    scoreGuide: '0 = Excellent oral hygiene, cleaning within 6 months · 3 = Some issues; overdue for cleaning · 5 = Gum issues, >1 year since cleaning, persistent bad breath',
    categoryNote: 'Mitigate pillar — oral microbiome directly affects systemic inflammation.',
    priorityTier: false,
    solutionSlug: 'dental',
  },
  {
    id: 'substance-use',
    n: '08',
    label: 'Excessive alcohol / smoking / vaping',
    prompt: 'How much do alcohol, tobacco, vaping, or recreational drug use affect your health goals?',
    scoreGuide: '0 = None or occasional only (social) · 3 = Alcohol >7 drinks/week or daily nicotine use · 5 = Daily heavy use affecting sleep, energy, or relationships',
    categoryNote: 'Mitigate pillar — substance use blunts every protocol outcome.',
    priorityTier: false,
    solutionSlug: 'substance-use',
  },
  {
    id: 'nutrition',
    n: '09',
    label: 'Poor nutrition / diet',
    prompt: 'How often do you eat highly-processed, fast, or convenience foods?',
    scoreGuide: '0 = Whole-foods diet, mostly home-cooked · 3 = Mix of whole foods and convenience; several times a week processed · 5 = Fast food or processed/convenience food daily',
    categoryNote: 'Mitigate pillar — food quality drives microbiome diversity.',
    priorityTier: false,
    solutionSlug: 'nutrition',
  },
  {
    id: 'nutritional-supplements',
    n: '10',
    label: 'Nutritional supplement deficiencies',
    prompt: "How likely is it that you're under-supplemented in essential nutrients (vitamin D, magnesium, omega-3, B-complex, etc.)?",
    scoreGuide: '0 = I get >15 min direct sun daily, eat well, and tested optimal across panels · 3 = Inconsistent sun and no recent test · 5 = Indoor work, no recent labs, no targeted supplementation',
    categoryNote: 'Mitigate pillar — most adults are silently under-supplemented across multiple essential nutrients.',
    priorityTier: false,
    solutionSlug: 'nutritional-supplements',
  },
  {
    id: 'environment',
    n: '11',
    label: 'Environment (sun, blue light, EMF, air, water)',
    prompt: 'How much do environmental inputs (poor air, unfiltered water, blue light, EMF, fluorescent lighting) affect your daily exposure?',
    scoreGuide: '0 = Clean air, filtered water, low artificial light exposure · 3 = Some exposure but managing it · 5 = Poor air quality at home/work, tap water, screens or fluorescents most of the day',
    categoryNote: 'Mitigate pillar — environmental load compounds inflammation over years.',
    priorityTier: false,
    solutionSlug: 'environment',
  },
  {
    id: 'pain-acute',
    n: '12',
    label: 'Acute injury or pain limiting activity',
    prompt: 'How much does an acute injury or pain (within the past 4 weeks) limit your daily activity?',
    scoreGuide: '0 = No acute injuries · 3 = Mild acute pain — present but not limiting major activities · 5 = Current acute injury significantly limiting movement or exercise',
    categoryNote: 'Muscle pillar — untreated acute injury becomes chronic within 90 days.',
    priorityTier: false,
    solutionSlug: 'pain-acute',
  },
  {
    id: 'pain-chronic',
    n: '13',
    label: 'Chronic injury or pain limiting activity',
    prompt: 'How much does chronic pain (>3 months) limit your daily activity?',
    scoreGuide: '0 = No chronic pain · 3 = Manageable chronic pain; present but functional · 5 = Daily chronic pain limiting most activities and affecting quality of life',
    categoryNote: 'Muscle pillar — chronic pain is both a cause and effect of cognitive decline.',
    priorityTier: false,
    solutionSlug: 'pain-chronic',
  },
  {
    id: 'allergies-immune',
    n: '14',
    label: 'Allergies & immune issues',
    prompt: 'How much do allergies, food sensitivities, or immune symptoms (recurrent infections, autoimmune flares) affect you?',
    scoreGuide: '0 = No notable allergy or immune symptoms · 3 = Seasonal allergies or occasional reactions, manageable · 5 = Multiple food sensitivities + recurrent infections + autoimmune diagnosis',
    categoryNote: 'Mitigate pillar — chronic immune activation is a primary driver of gut permeability.',
    priorityTier: false,
    solutionSlug: 'allergies',
  },
  {
    id: 'stress',
    n: '15',
    label: 'Stress',
    prompt: 'How would you rate your average stress level over the past month?',
    scoreGuide: '0 = Calm, well-managed, resilient · 3 = Manageable but constant background stress · 5 = Overwhelming, unmanaged stress affecting sleep, focus, and daily decisions',
    categoryNote: 'Mitigate pillar — cortisol dysregulation accelerates cognitive aging.',
    priorityTier: false,
    solutionSlug: 'stress',
  },
  {
    id: 'cognitive',
    n: '16',
    label: 'Cognitive dysfunction',
    prompt: 'How much do you notice cognitive issues (memory lapses, difficulty focusing, word-finding trouble, mental fatigue)?',
    scoreGuide: '0 = Sharp, focused, fast recall · 3 = Occasional brain fog or forgetfulness · 5 = Daily noticeable cognitive issues affecting work or relationships',
    categoryNote: 'Mind pillar — the destination of the 4M system.',
    priorityTier: false,
    solutionSlug: 'cognitive',
  },
  {
    id: 'access-knowledge',
    n: '17',
    label: 'Access to health knowledge / education',
    prompt: 'How limited is your access to trustworthy, current health information when you need it?',
    scoreGuide: "0 = I have great resources and know who to ask · 3 = I manage but often feel uncertain about sources · 5 = I rely on Google, feel confused, and don't know who to trust",
    categoryNote: 'Motivate pillar — knowledge gaps perpetuate every other risk factor.',
    priorityTier: false,
    solutionSlug: 'health-knowledge',
  },
  {
    id: 'access-care',
    n: '18',
    label: 'Access to healthcare services',
    prompt: 'How limited is your access to a primary care doctor or telemedicine relationship you can reach quickly?',
    scoreGuide: '0 = I have a doctor I can reach within a week · 3 = I have a provider but access is slow or inconvenient · 5 = No PCP, no telemedicine relationship; ER is my fallback',
    categoryNote: 'Motivate pillar — lack of care access delays every protocol.',
    priorityTier: false,
    solutionSlug: 'healthcare-access',
  },
  {
    id: 'financial-stress',
    n: '19',
    label: 'Financial stress',
    prompt: 'How often do health-related costs (food, supplements, care) influence your health decisions?',
    scoreGuide: '0 = Cost is rarely a factor in health decisions · 3 = I sometimes delay or downgrade care due to cost · 5 = I regularly skip or delay needed care because of cost',
    categoryNote: 'Motivate pillar — financial stress raises cortisol and worsens every metric.',
    priorityTier: false,
    solutionSlug: 'financial-stress',
  },
  {
    id: 'self-image',
    n: '20',
    label: 'Positive self-image',
    prompt: 'How dissatisfied are you with how you look and present yourself?',
    scoreGuide: '0 = Confident and satisfied with my appearance · 3 = Neutral; neither satisfied nor particularly bothered · 5 = Unhappy with my appearance; it affects social or professional interactions',
    categoryNote: 'Motivate pillar — self-image is a powerful predictor of long-term adherence.',
    priorityTier: false,
    solutionSlug: 'self-image',
  },
];
