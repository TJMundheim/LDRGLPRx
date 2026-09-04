/**
 * audit-questions.ts — the 20-question MindSpan assessment, grouped by the
 * four pillars (Mind → Muscle → Mitigate → Motivate).
 *
 * Replaced the top-8/10-question set 2026-07-13 per
 * docs/… MindSpan-20Q-Assessment-Spec. Scale unchanged per item:
 * 0 = no problem at all · 5 = severe. Max total = 100.
 *
 * "Already diagnosed" is NO LONGER a scored item — it is a separate Yes/No
 * flag (DIAGNOSED_QUESTION) that routes to the regenerative-medicine path
 * and does not count toward the 100. For downstream compatibility (the
 * audit-complete email recommendation + the app's factor map), the flag is
 * still transmitted inside `scores` as `already-diagnosed: 0 | 5`.
 *
 * Legacy ids are preserved where the category carried over so the app's
 * AUDIT_ID_TO_FACTOR_NAME map and the lambda RX_MAP keep working:
 *   cognitive, sleep, weight-body-fat, nutrition, alcohol, gut-microbiome,
 *   hormone-balance, erectile-dysfunction, environment, already-diagnosed.
 */

export interface AuditPillar {
  id: 'mind' | 'muscle' | 'mitigate' | 'motivate';
  name: string;
  tag: string;
}

export const AUDIT_PILLARS: AuditPillar[] = [
  { id: 'mind', name: 'Mind', tag: 'The destination' },
  { id: 'muscle', name: 'Muscle', tag: 'The engine' },
  { id: 'mitigate', name: 'Mitigate', tag: 'Remove the harm' },
  { id: 'motivate', name: 'Motivate', tag: 'Make it stick' },
];

export interface AuditQuestion {
  id: string;
  /** Zero-padded two-digit number, e.g. "01" */
  n: string;
  pillar: AuditPillar['id'];
  label: string;
  prompt: string;
  /** Scoring guide shown in the expandable panel */
  scoreGuide: string;
  /** Short category context note */
  categoryNote: string;
  /** URL slug for /solutions/<slug> */
  solutionSlug: string;
}

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  // ── MIND — the destination ──────────────────────────────────────────────
  {
    id: 'cognitive',
    n: '01',
    pillar: 'mind',
    label: 'Cognitive / brain fog',
    prompt: "My mind isn't as sharp as it used to be — I forget words mid-sentence, lose focus, or feel mentally foggy more days than not.",
    scoreGuide: '0 = Sharp, focused, fast recall every day · 3 = Occasional brain fog or forgetfulness · 5 = Daily noticeable cognitive issues that affect work or relationships',
    categoryNote: 'Mind is the destination of the 4M system — cognitive performance is the end-state we are optimizing for.',
    solutionSlug: 'cognitive',
  },
  {
    id: 'sleep',
    n: '02',
    pillar: 'mind',
    label: 'Sleep',
    prompt: "I don't sleep well — trouble falling asleep, waking during the night, or dragging through mornings even after a full night in bed.",
    scoreGuide: '0 = Sleep is solid — I fall asleep fast, stay asleep, and wake rested · 3 = Some nights great, some rough · 5 = Most nights are bad, I wake up tired, and timing is all over the place',
    categoryNote: 'The brain cleans itself only during deep sleep. Poor sleep silently degrades hormones, weight, mood, and memory.',
    solutionSlug: 'sleep',
  },
  {
    id: 'hearing-vision-dental',
    n: '03',
    pillar: 'mind',
    label: 'Hearing, vision & dental',
    prompt: "My hearing, eyesight, or dental health has slipped and I haven't had it properly checked or corrected — I strain to follow conversations or read, or I'm ignoring bleeding gums, loose teeth, or overdue dental work.",
    scoreGuide: '0 = All three checked and fully maintained — no strain, healthy gums · 3 = Noticeable slippage in one, not yet properly checked or corrected · 5 = I regularly miss parts of conversations, avoid reading, or have gum/dental problems I keep putting off',
    categoryNote: 'Uncorrected hearing loss is one of the largest modifiable dementia risk factors — and gum disease feeds the same inflammation that reaches the brain. The oral microbiome is the front door of the gut-brain axis.',
    solutionSlug: 'cognitive',
  },
  {
    id: 'mood',
    n: '04',
    pillar: 'mind',
    label: 'Mood',
    prompt: "I'm dealing with anxiety, depression, ongoing low mood, or a shorter fuse than I used to have.",
    scoreGuide: '0 = Mood is steady and generally good · 3 = Regular low days, irritability, or worry that I notice · 5 = Persistent anxiety, low mood, or anger that affects work or relationships most days',
    categoryNote: 'Depression and anxiety are among the most under-recognized contributors to cognitive decline — and among the most treatable.',
    solutionSlug: 'stress',
  },
  {
    id: 'social-connection',
    n: '05',
    pillar: 'mind',
    label: 'Social connection',
    prompt: "I've become more isolated — fewer real conversations and less regular connection with people I care about.",
    scoreGuide: '0 = Regular, real connection with people I care about · 3 = Fewer real conversations than I used to have · 5 = Genuinely isolated — days can pass without a meaningful conversation',
    categoryNote: 'Social isolation carries a dementia risk on par with the big physical factors. Connection is a protocol, not a luxury.',
    solutionSlug: 'purpose-goals',
  },
  {
    id: 'mental-challenge',
    n: '06',
    pillar: 'mind',
    label: 'Mental challenge',
    prompt: 'I rarely challenge my mind or learn anything new — most days run on autopilot.',
    scoreGuide: '0 = I learn or build something genuinely new most weeks · 3 = Occasional challenge, mostly routine · 5 = Full autopilot — nothing new in months',
    categoryNote: 'The brain follows a ruthless use-it-or-lose-it principle. Novelty and difficulty are what keep the architecture live.',
    solutionSlug: 'cognitive',
  },

  // ── MUSCLE — the engine ─────────────────────────────────────────────────
  {
    id: 'movement-strength',
    n: '07',
    pillar: 'muscle',
    label: 'Movement & strength',
    prompt: "I don't move most days, and my strength, muscle, and recovery have been slipping.",
    scoreGuide: '0 = I move daily and train strength regularly — no decline · 3 = Inconsistent — some active weeks, some sedentary · 5 = Mostly sedentary and clearly weaker than a few years ago',
    categoryNote: 'Muscle is the engine — and the single best-evidenced lever for both metabolic and cognitive protection.',
    solutionSlug: 'muscle',
  },
  {
    id: 'weight-body-fat',
    n: '08',
    pillar: 'muscle',
    label: 'Weight',
    prompt: "I'm carrying more body fat than I should — clothes don't fit the way they used to and the scale keeps creeping up.",
    scoreGuide: '0 = At my ideal weight, body composition feels right · 3 = About 10-20 lbs heavier than I should be · 5 = More than 30 lbs over target with visible belly fat',
    categoryNote: 'Answer by how your clothes fit and how far you are from your ideal weight — no exact numbers needed.',
    solutionSlug: 'weight',
  },
  {
    id: 'nutrition',
    n: '09',
    pillar: 'muscle',
    label: 'Nutrition',
    prompt: 'I rely on fast food, processed snacks, or convenience meals more often than I cook real whole-food meals at home.',
    scoreGuide: '0 = Almost everything I eat is whole foods, mostly home-cooked · 3 = Mixed — some good days, some takeout / processed days · 5 = Fast food, packaged snacks, or convenience meals are my default',
    categoryNote: 'Food quality is the daily input that drives microbiome diversity, blood sugar, and energy.',
    solutionSlug: 'nutrition',
  },
  {
    id: 'pain-injury',
    n: '10',
    pillar: 'muscle',
    label: 'Pain / injury',
    prompt: "Chronic or acute pain, or an injury, keeps me from being as active as I'd like.",
    scoreGuide: "0 = Pain-free and fully active · 3 = A nagging issue I work around — it limits some activities · 5 = Pain or an injury shuts down most of the activity I'd like to do",
    categoryNote: 'Pain that blocks movement quietly costs you the muscle, sleep, and mood that protect the brain. It is fixable more often than people assume.',
    solutionSlug: 'pain-chronic',
  },

  // ── MITIGATE — remove the harm ──────────────────────────────────────────
  {
    id: 'blood-pressure',
    n: '11',
    pillar: 'mitigate',
    label: 'Blood pressure',
    prompt: "My blood pressure runs high — or I honestly don't know my numbers.",
    scoreGuide: "0 = Measured recently, consistently in range · 3 = Borderline readings, or I haven't checked in over a year · 5 = Known high blood pressure that isn't controlled — or I've never measured it",
    categoryNote: 'Midlife blood pressure is one of the strongest predictors of late-life cognitive decline. Not knowing your numbers scores like a problem — because it is one.',
    solutionSlug: 'chronic-conditions',
  },
  {
    id: 'blood-sugar',
    n: '12',
    pillar: 'mitigate',
    label: 'Blood sugar',
    prompt: "I have diabetes or prediabetes — or I've never had my blood sugar checked.",
    scoreGuide: "0 = Checked recently, fully in range · 3 = Prediabetic range, or no check in years · 5 = Diagnosed diabetes that isn't well controlled — or completely unknown",
    categoryNote: "Alzheimer's is often called type 3 diabetes for a reason — the brain runs on glucose signaling, and insulin resistance degrades it.",
    solutionSlug: 'chronic-conditions',
  },
  {
    id: 'ldl-cholesterol',
    n: '13',
    pillar: 'mitigate',
    label: 'LDL cholesterol',
    prompt: "My cholesterol (LDL) is high — or I don't know where it stands.",
    scoreGuide: "0 = Measured recently, in range · 3 = Borderline, or no lipid panel in over two years · 5 = Known high LDL that isn't being managed — or never tested",
    categoryNote: 'The arteries that feed the brain are the smallest in the body — they clog first. LDL is a brain number, not just a heart number.',
    solutionSlug: 'chronic-conditions',
  },
  {
    id: 'smoking-nicotine',
    n: '14',
    pillar: 'mitigate',
    label: 'Smoking / nicotine',
    prompt: 'I use tobacco or nicotine regularly.',
    scoreGuide: '0 = Never, or quit years ago · 3 = Occasional use, or recently quit · 5 = Daily tobacco or nicotine use',
    categoryNote: 'Smoking is the single most reversible vascular insult on this list — the brain benefits start within weeks of stopping.',
    solutionSlug: 'substance-use',
  },
  {
    id: 'alcohol',
    n: '15',
    pillar: 'mitigate',
    label: 'Alcohol',
    prompt: 'I drink more than I should — alcohol is a regular part of my week.',
    scoreGuide: "0 = I don't drink · 1 = Up to 2 drinks per week · 2 = 3-7 drinks per week, never more than 2 per sitting · 3 = More than 7 drinks per week, OR more than 2 per sitting regularly · 4 = Daily drinker (1-2 drinks per day) · 5 = Daily heavy drinker (3+ drinks per day)",
    categoryNote: 'Alcohol disrupts gut, sleep, hormones, and cognition simultaneously. Cutting back affects every other pillar.',
    solutionSlug: 'alcohol',
  },
  {
    id: 'gut-microbiome',
    n: '16',
    pillar: 'mitigate',
    label: 'Gut health',
    prompt: "I deal with bloating, gas, irregular stools, food reactions, or brain fog after meals — my gut clearly isn't happy.",
    scoreGuide: "0 = No gut issues at all · 3 = Occasional bloating or food reactions a few times a month · 5 = Daily bloating, irregular stools, multiple food sensitivities, foggy after most meals",
    categoryNote: 'The gut-brain axis sits underneath nearly everything else — fix this first and other categories often improve on their own.',
    solutionSlug: 'gut',
  },
  {
    id: 'hormone-balance',
    n: '17',
    pillar: 'mitigate',
    label: 'Hormones',
    prompt: 'My hormones feel off — persistent fatigue, low drive, mood swings, poor recovery, or loss of muscle despite trying.',
    scoreGuide: '0 = Energy, libido, mood, and recovery all feel optimal · 3 = Occasional symptoms, especially under stress · 5 = Multiple hormone-related symptoms most days affecting daily function',
    categoryNote: 'Testosterone, estrogen, progesterone, and cortisol balance underlie resilience — proper labs and a physician-led plan beat guessing.',
    solutionSlug: 'hormones',
  },
  {
    id: 'erectile-dysfunction',
    n: '18',
    pillar: 'mitigate',
    label: 'Sexual function',
    prompt: "My sex drive has dropped and sexual function isn't what it used to be — desire, arousal, or (for men) erection frequency and hardness have declined in the past year or two.",
    scoreGuide: '0 = Drive and function feel completely normal · 3 = Some noticeable off-weeks but not a steady pattern · 5 = Clear, sustained decline in desire, arousal, or erectile function',
    categoryNote: 'Declining sexual function is an early-warning signal — the canary in the mine — for hormones, cardiovascular health, and cognitive trajectory. For men it shows up as ED; for women, often as the first sign of the perimenopausal transition. Not a verdict.',
    solutionSlug: 'erectile-dysfunction',
  },
  {
    id: 'environment',
    n: '19',
    pillar: 'mitigate',
    label: 'Environment',
    prompt: "I don't get morning sunlight or meaningful outdoor time — I'm under artificial light most of the day, drinking tap water, and surrounded by screens and EMF.",
    scoreGuide: '0 = I get morning sun daily, filtered air and water, low artificial light · 3 = Some exposure issues, partially managing · 5 = No morning sun, indoors all day under fluorescents/screens, tap water, no air filtration, constant EMF',
    categoryNote: 'Light, air, water, and EMF compound over years. Lack of morning sunlight is the most overlooked driver of poor sleep and mood.',
    solutionSlug: 'environment',
  },

  // ── MOTIVATE — make it stick ────────────────────────────────────────────
  {
    id: 'purpose-accountability',
    n: '20',
    pillar: 'motivate',
    label: 'Purpose & accountability',
    prompt: "I don't have clear health goals or anyone holding me accountable — I know what to do but don't follow through.",
    scoreGuide: "0 = Clear goals, and someone specific holds me to them · 3 = Goals exist but nobody checks — follow-through is patchy · 5 = No real goals, no accountability, and I know it",
    categoryNote: 'Knowledge is not the bottleneck — accountability is. Everyone in the program names a specific face they are doing this for.',
    solutionSlug: 'purpose-goals',
  },
];

/**
 * Separate Yes/No flag — NOT scored, not in the top-3 ranking, does not count
 * toward the /100 total. Yes routes to the regenerative-medicine path.
 * Transmitted in `scores` as `already-diagnosed: 0 | 5` for downstream compat.
 */
export const DIAGNOSED_QUESTION = {
  id: 'already-diagnosed',
  prompt: "Have you already been diagnosed with mild cognitive impairment, early dementia, Alzheimer's, or Parkinson's?",
  categoryNote: "If you're already in this category, regenerative medicine becomes time-sensitive.",
  solutionSlug: 'regenerative-medicine',
} as const;

/** Result bands over the 0-100 total. */
export const AUDIT_BANDS = [
  { min: 0, max: 15, label: 'Sharp', line: 'Protect it.' },
  { min: 16, max: 35, label: 'Early drift', line: 'Worth getting ahead of.' },
  { min: 36, max: 60, label: 'Time for a plan', line: '' },
  { min: 61, max: 100, label: 'Act now', line: 'While the choice is still yours.' },
] as const;

/**
 * Bonus map — additive weight applied in top-3 ranking (forfeited when the
 * raw score is 0 — a zero stays a zero).
 *
 * TJ 2026-07-13: gut +3 (leans into the gut-repair flagship as the singular
 * lead), weight +2. already-diagnosed is NOT ranked at all — it's a flag.
 */
export const AUDIT_BONUS_BY_ID: Record<string, number> = {
  'gut-microbiome': 3,
  'weight-body-fat': 2,
};
