/**
 * audit-questions.ts — 8 public assessment questions mirroring
 * apps/clientportal/src/lib/components/intake/Stage2Likert.svelte
 * and apps/clientportal/src/lib/data/audit.ts.
 *
 * Locked 2026-05-12: reduced from 22 to 8 to match the top-8 master taxonomy
 * (see memory/project_top_8_categories.md). Canonical order:
 *   gut, sleep, weight, nutrition, erectile-dysfunction, environment,
 *   cognitive, hormones.
 *
 * Each item: id, n (01-08 padded), label, prompt, scoreGuide, categoryNote,
 * priorityTier (always true now), solutionSlug.
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
  /** Priority tier — all 8 master categories are priority-tier */
  priorityTier: boolean;
  /** URL slug for /solutions/<slug> */
  solutionSlug: string;
}

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: 'gut-microbiome',
    n: '01',
    label: 'Gut health / leaky gut',
    prompt: "I deal with bloating, gas, irregular stools, food reactions, or brain fog after meals — my gut clearly isn't happy.",
    scoreGuide: "0 = No gut issues at all · 3 = Occasional bloating or food reactions a few times a month · 5 = Daily bloating, irregular stools, multiple food sensitivities, foggy after most meals",
    categoryNote: 'The gut-brain axis sits underneath nearly everything else — fix this first and other categories often improve on their own.',
    priorityTier: true,
    solutionSlug: 'gut',
  },
  {
    id: 'sleep',
    n: '02',
    label: 'Sleep / sleep optimization',
    prompt: "I don't sleep well — I have trouble falling asleep, wake up during the night, or drag through mornings even after a full night in bed.",
    scoreGuide: '0 = Sleep is solid — I fall asleep fast, stay asleep, and wake rested · 3 = Some nights great, some rough · 5 = Most nights are bad, I wake up tired, and timing is all over the place',
    categoryNote: "Poor sleep silently degrades hormones, weight, mood, and memory. It's the most-leveraged lever after gut.",
    priorityTier: true,
    solutionSlug: 'sleep',
  },
  {
    id: 'weight-body-fat',
    n: '03',
    label: 'Weight (BMI)',
    prompt: "I'm carrying more body fat than I should — clothes don't fit the way they used to and the scale has been creeping up.",
    scoreGuide: '0 = At my ideal weight, body composition feels right · 3 = About 10-20 lbs heavier than I should be · 5 = More than 30 lbs over target with visible belly fat',
    categoryNote: 'Use the BMI calculator below to sanity-check your answer — BMI is informational only and does not change your score.',
    priorityTier: true,
    solutionSlug: 'weight',
  },
  {
    id: 'nutrition',
    n: '04',
    label: 'Diet / nutrition',
    prompt: 'I rely on fast food, processed snacks, or convenience meals more often than I cook real whole-food meals at home.',
    scoreGuide: '0 = Almost everything I eat is whole foods, mostly home-cooked · 3 = Mixed — some good days, some takeout / processed days · 5 = Fast food, packaged snacks, or convenience meals are my default',
    categoryNote: 'Food quality is the daily input that drives microbiome diversity, blood sugar, and energy.',
    priorityTier: true,
    solutionSlug: 'nutrition',
  },
  {
    id: 'erectile-dysfunction',
    n: '05',
    label: 'Erectile + sexual function',
    prompt: "My sex drive has dropped and erections aren't what they used to be — frequency, hardness, or both have declined noticeably in the past year or two.",
    scoreGuide: '0 = Drive and function feel completely normal · 3 = Some noticeable off-weeks but not a steady pattern · 5 = Clear, sustained decline in drive, hardness, or morning erections',
    categoryNote: 'ED and libido decline are early-warning signals — like the canary in the coal mine — for hormones, cardiovascular health, and cognitive trajectory. Not a verdict.',
    priorityTier: true,
    solutionSlug: 'erectile-dysfunction',
  },
  {
    id: 'environment',
    n: '06',
    label: 'Environment',
    prompt: "I don't get morning sunlight or any meaningful outdoor time during the day — I'm under artificial lighting most of my waking hours, drinking tap water, and surrounded by screens and EMF.",
    scoreGuide: '0 = I get morning sun daily, filtered air and water, low artificial light · 3 = Some exposure issues, partially managing · 5 = No morning sun, indoors all day under fluorescents/screens, tap water, no air filtration, constant EMF',
    categoryNote: 'Light, air, water, and EMF compound over years. Lack of morning sunlight is the most overlooked driver of poor sleep and mood.',
    priorityTier: true,
    solutionSlug: 'environment',
  },
  {
    id: 'cognitive',
    n: '07',
    label: 'Cognitive / brain fog',
    prompt: "My mind isn't as sharp as it used to be — I forget words mid-sentence, lose focus, or feel mentally foggy more days than not.",
    scoreGuide: '0 = Sharp, focused, fast recall every day · 3 = Occasional brain fog or forgetfulness · 5 = Daily noticeable cognitive issues that affect work or relationships',
    categoryNote: 'Mind is the destination of the 4M system — cognitive performance is the end-state we are optimizing for.',
    priorityTier: true,
    solutionSlug: 'cognitive',
  },
  {
    id: 'hormone-balance',
    n: '08',
    label: 'Hormone optimization / TRT',
    prompt: 'I feel like my hormones are off — persistent fatigue, low drive, mood swings, poor recovery from workouts, or loss of muscle mass despite trying.',
    scoreGuide: '0 = Energy, libido, mood, and recovery all feel optimal · 3 = Occasional symptoms, especially under stress · 5 = Multiple hormone-related symptoms most days affecting daily function',
    categoryNote: 'Testosterone and cortisol balance underlie resilience — proper labs and a coach-led plan beat guessing.',
    priorityTier: true,
    solutionSlug: 'hormones',
  },
  {
    id: 'already-diagnosed',
    n: '09',
    label: 'Already diagnosed',
    prompt: "Have you already been diagnosed with mild cognitive decline, early dementia, Alzheimer's, or Parkinson's?",
    scoreGuide: "0 = No concerns, no family history · 1 = Family history of cognitive decline or related diagnosis · 2 = Occasional concerning symptoms (brain fog, memory lapses) · 3 = Regular symptoms I'm noticing but undiagnosed · 4 = Mild cognitive decline diagnosis or formal evaluation underway · 5 = Diagnosed with Alzheimer's, dementia, Parkinson's, or related condition",
    categoryNote: "If you're already in this category, regenerative medicine becomes time-sensitive.",
    priorityTier: true,
    solutionSlug: 'regenerative-medicine',
  },
  {
    id: 'alcohol',
    n: '10',
    label: 'Excessive alcohol',
    prompt: 'How much alcohol do you consume?',
    scoreGuide: "0 = I don't drink · 1 = Up to 2 drinks per week · 2 = 3-7 drinks per week, never more than 2 per sitting · 3 = More than 7 drinks per week, OR more than 2 per sitting regularly · 4 = Daily drinker (1-2 drinks per day) · 5 = Daily heavy drinker (3+ drinks per day)",
    categoryNote: 'Alcohol disrupts gut, sleep, hormones, and cognition simultaneously. Cutting back affects every other pillar.',
    priorityTier: true,
    solutionSlug: 'substance-use',
  },
];

/**
 * Bonus map — additive weight applied to raw score in selectTop3.
 *
 * Rules locked 2026-06-01 (revised mid-assessment):
 *   - already-diagnosed >= 3 → automatic #1 in top-3 (override; NOT bonus-driven)
 *   - already-diagnosed 0/1/2 → ranked normally with raw score, no bonus
 *   - gut-microbiome and weight-body-fat get +2 bonus
 *   - everything else uses raw score (no bonus)
 *
 * NOTE: already-diagnosed is NOT in this bonus map because the override
 * happens in selectTop3 logic, not in the score math.
 */
export const AUDIT_BONUS_BY_ID: Record<string, number> = {
  'gut-microbiome': 2,
  'weight-body-fat': 2,
};
