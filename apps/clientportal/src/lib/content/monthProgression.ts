/**
 * Month-by-month program progression for the 4M system.
 * Month 1 ties directly to the four pillars; subsequent months build on the foundation.
 */

import type { PillarId } from './pillars'

export interface BonusModule {
  atWeek: number
  name: string
  slug: string
  description: string
}

export interface MonthDefinition {
  month: 1 | 2 | 3 | 4 | 'maintenance'
  title: string
  tagline: string
  description: string
  pillarIds?: PillarId[]
  primaryFormulas: string[]
  bonusModules?: BonusModule[]
  graduationCriteria?: string[]
}

export const months: MonthDefinition[] = [
  {
    month: 1,
    title: 'Foundation & Repair',
    tagline: 'Assess, repair, and build the base for everything that follows.',
    description:
      'Month 1 runs all four pillars in sequence — Mind, Muscle, Mitigate, Motivate — with a deep focus on one each week. Labs precede Week 1. Formulas are introduced week by week. The month ends with a full re-assessment and the regenerative therapies introduction.',
    pillarIds: ['mind', 'muscle', 'mitigate', 'motivate'],
    primaryFormulas: ['neurobridge', 'armorvita', 'biomeaxisforge', 'sleeprestore'],
    bonusModules: [
      {
        atWeek: 4,
        name: 'Regenerative Therapies Introduction',
        slug: 'rpa',
        description:
          'End-of-month introduction to the regenerative protocol. Candidacy review begins here for members who qualify based on their Month 1 labs and compliance score.',
      },
    ],
    graduationCriteria: [
      'All 10 factors scored in Week 1 assessment',
      'Week 4 re-assessment completed with delta documented',
      'Identity statement written and submitted',
      'Month 1 wins documented (minimum 3)',
      'Month 2 commitment signed',
    ],
  },
  {
    month: 2,
    title: 'Build',
    tagline: 'Workout protocol + nutrition deepening.',
    description:
      'Month 2 increases training intensity and extends the fasting window to 16:8. Nutrition deepens with liver introduction and protein precision. Regenerative therapies candidacy review takes place mid-month for qualifying Tier 3 members.',
    primaryFormulas: ['armorvita', 'neurobridge'],
    bonusModules: [
      {
        atWeek: 2,
        name: 'Regenerative Therapies Candidacy Review',
        slug: 'rpa-candidacy',
        description:
          'Mid-Month 2 review for members who completed the regenerative therapies introduction. Healthcare provider reviews Month 1 labs and compliance before approving candidacy.',
      },
    ],
    graduationCriteria: [
      '16:8 fasting window established consistently',
      'Resistance training protocol at full 3-day volume',
      'Organ meat introduced (liver 1–2x/week)',
      'Month 1 vs Month 2 cognitive ratings compared',
    ],
  },
  {
    month: 3,
    title: 'Intensify',
    tagline: 'Higher intensity + cognitive re-test.',
    description:
      'Month 3 pushes VO2 max work, advances fasting to 18:6, and runs a formal cognitive re-test. A tier decision point determines the Month 4 and beyond protocol track.',
    primaryFormulas: ['armorvita', 'neurobridge'],
    graduationCriteria: [
      'VO2 max training incorporated',
      '18:6 fasting window achieved',
      'Formal cognitive re-test completed',
      'Tier decision documented for Month 4+',
    ],
  },
  {
    month: 4,
    title: 'Integrate & Transition',
    tagline: 'End-of-program labs + graduation + maintenance tier selection.',
    description:
      'Month 4 closes the structured program. End-of-program labs compare to baseline. Graduation milestone is documented. Member selects a maintenance tier and ongoing support level.',
    primaryFormulas: ['armorvita', 'neurobridge'],
    graduationCriteria: [
      'End-of-program labs completed and reviewed',
      'Full program delta documented (Week 1 vs Month 4)',
      'Maintenance tier selected',
      'Graduation submission completed',
    ],
  },
  {
    month: 'maintenance',
    title: 'Ongoing Optimization',
    tagline: 'Long-term support, periodic re-testing, protocol evolution.',
    description:
      'Post-graduation maintenance track. Quarterly lab reviews, protocol evolution as biology changes, and ongoing member community access. Designed to lock in gains and continue compounding.',
    primaryFormulas: ['armorvita', 'neurobridge'],
  },
]
