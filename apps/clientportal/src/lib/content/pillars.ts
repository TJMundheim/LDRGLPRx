/**
 * 4M Pillar definitions — source of truth is Slides 14-16 of the sales deck.
 * Each pillar maps to one week of Month 1.
 */

export type PillarId = 'mitigate' | 'muscle' | 'mind' | 'motivate'

export interface Pillar {
  id: PillarId
  week: 1 | 2 | 3 | 4
  /** Zero-padded week numeral: '01' | '02' | '03' | '04' */
  numeral: string
  /** Display name in caps: 'MITIGATE' etc. */
  name: string
  /** Short headline shown in UI and deck. */
  tagline: string
  /** 1–2 sentence description from deck. */
  description: string
  /** Bullet focus areas for this week. */
  focus: string[]
  /** Product slug for primary formula. */
  primaryFormula?: string
  /** Product slugs for secondary formulas. */
  secondaryFormulas?: string[]
  /** Factor ids from factors.ts associated with this pillar. */
  keyFactorIds?: number[]
  /** Keywords used to generate coach prompts and tag content. */
  themes: string[]
}

export const pillars: Pillar[] = [
  {
    id: 'mind',
    week: 1,
    numeral: '01',
    name: 'MIND',
    tagline: 'Feed, fuel, and sharpen your cognitive edge.',
    description:
      'We feed the brain. Nutrition quality, methylation support, and the active-form B-complex that works — especially if you carry MTHFR. If you carry that variant, this is where your brain has been waiting.',
    focus: [
      'Nutrition quality tiers — food audit and upgrade',
      'Methylation and MTHFR support',
      'Fasting window progression',
      'Cognitive performance tracking',
      'Full supplement stack review',
    ],
    primaryFormula: 'neurobridge',
    keyFactorIds: [7, 12],
    themes: ['nutrition quality', 'methylation', 'MTHFR', 'food tiers', 'fasting', 'B-vitamins', 'cognitive'],
  },
  {
    id: 'muscle',
    week: 2,
    numeral: '02',
    name: 'MUSCLE',
    tagline: 'Rebuild the body that powers the brain.',
    description:
      'We build the body that supports the brain. Morning protocol, outdoor fasted movement, and the fat-soluble defense stack — D3, K2, boron — that most men have never received at clinical dose.',
    focus: [
      'Morning protocol — full progression',
      'Fasted outdoor training sessions',
      'Vitamin D3/K2 optimization',
      'Boron for free testosterone (+28% in 7 days · NIH)',
      'Zone 2 cardio and resistance protocol',
    ],
    primaryFormula: 'armorvita',
    keyFactorIds: [4, 8],
    themes: ['morning protocol', 'outdoor', 'fasted training', 'vit D', 'K2', 'boron', 'BDNF', 'VO2max'],
  },
  {
    id: 'mitigate',
    week: 3,
    numeral: '03',
    name: 'MITIGATE',
    tagline: 'Remove the 15 factors stealing your brain & body.',
    description:
      'We start by removing what is working against you. Your personal 15-factor audit scores every root cause — gut, sleep, stress, and more — so we know exactly where to begin.',
    focus: [
      '15-Factor personal audit and scoring',
      'Gut-brain axis repair',
      'Sleep architecture optimization',
      'Allergen and immune load reduction',
      'Baseline labs — know your numbers before Week 1 begins',
    ],
    primaryFormula: 'biomeaxisforge',
    secondaryFormulas: ['sleeprestore'],
    keyFactorIds: [0, 2, 3, 5, 6, 9],
    themes: ['gut', 'sleep', 'audit', 'foundations', 'inflammation', 'cortisol'],
  },
  {
    id: 'motivate',
    week: 4,
    numeral: '04',
    name: 'MOTIVATE',
    tagline: 'Lock in your identity and daily system.',
    description:
      'By Week 4, you do not have a program — you have a system. We re-audit your 15 factors, write your identity statement, and build the maintenance protocol that carries your results forward.',
    focus: [
      'Identity statement — who you are becoming',
      'Week 4 re-audit: re-score all 15 factors',
      'Month 1 wins review and celebration',
      'Genesis RPA introduction (bonus module)',
      'Month 2 commitment and graduation criteria',
    ],
    keyFactorIds: [11],
    themes: ['identity statement', 'audit', 'graduation', 'maintenance transition', 'purpose', 'accountability'],
  },
]
