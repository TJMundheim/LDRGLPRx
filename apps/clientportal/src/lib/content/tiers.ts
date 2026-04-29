/**
 * LDRGLPRx membership tiers — ongoing subscriptions + cohort one-time tiers.
 * Content only — no logic.
 *
 * Cohort tiers use id prefix "cohort-" and kind: 'cohort'.
 * Use cohortTiers / membershipTiers filtered exports for each context.
 */

import type { MembershipTier } from '../data/catalog';

export const tiers: MembershipTier[] = [
  {
    id: 'discovery',
    name: 'Discovery',
    tagline: 'Start with a clear picture of where you stand — free, no commitment.',
    monthlyUSD: 0,
    annualUSD: 0,
    onboardingFeeUSD: 0,
    includedProductSlugs: [],
    features: [
      'AI health quiz (full 4M assessment)',
      'Personalised health avatar presentation',
      '1 free async clinician message',
      'Access to product catalog and tier overview',
    ],
    description:
      'Discovery is the free entry point — complete the AI-powered intake quiz, receive a personalised health avatar, and get one free async message to a clinician. No credit card required.',
    idealFor: [
      'Prospective members exploring the program',
      'Anyone who wants a data-driven health snapshot before committing',
      'Referral recipients and introductory lead magnet users',
    ],
  },

  {
    id: 'foundation',
    name: 'Foundation',
    tagline: 'The complete starting protocol — labs, clinician, and your first Rx cycle included.',
    monthlyUSD: 99,
    annualUSD: 990,
    onboardingFeeUSD: 499,
    includedProductSlugs: [
      'lab-foundation',
      'lab-cognitive-baseline',
      'biome-axis-forge',
      'stack-foundation',
    ],
    features: [
      'Foundation lab panel included (onboarding)',
      'Cognitive baseline (Creyos) included',
      'Initial clinician intake visit (60 min)',
      'First BiomeAxisForge 4-week cycle included',
      '4M Workbook — Month 1 content + AI coach',
      'Member pricing on all catalog products',
      'Async clinician messaging (unlimited)',
      'Quarterly clinician check-in visits',
    ],
    description:
      'Foundation delivers the core clinical starting protocol: comprehensive labs, cognitive baseline, an initial clinician visit, and your first BiomeAxisForge cycle — all included in the onboarding fee. Monthly membership maintains access to the AI coach, async clinician support, and member pricing.',
    idealFor: [
      'Members ready to begin a structured health optimisation protocol',
      'Those who want clinical oversight without high monthly costs',
      'Anyone new to personalised medicine wanting a guided starting point',
    ],
  },

  {
    id: 'optimization',
    name: 'Optimization',
    tagline: 'Full-stack personalisation — genomics, gut, metabolic tracking, and monthly clinician access.',
    monthlyUSD: 299,
    annualUSD: 2990,
    includedProductSlugs: [
      'lab-foundation',
      'lab-cognitive-baseline',
      'lab-genomic-blueprint',
      'lab-gut-brain',
      'lab-sleep-study',
      'biome-axis-forge',
      'stack-foundation',
      'stack-recovery',
      'stack-focus',
      'cgm-stelo',
    ],
    features: [
      'Everything in Foundation',
      'Genomic Blueprint (one-time, included year 1)',
      'Gut + Brain panel annually',
      'BiomeAxisForge cycles — ongoing quarterly',
      'Foundation + Recovery + Focus supplement stacks included',
      'CGM trial (Stelo 14-day) included',
      'Sleep study (WatchPAT) included year 1',
      'Monthly clinician visits',
      '20% discount on additional Rx products',
      'Full 4M Workbook — all 4 months + AI coach',
    ],
    description:
      'Optimization is the complete personalisation tier: genomic mapping, gut-brain axis assessment, continuous metabolic monitoring, and monthly clinician access — all integrated into a single monthly membership. Includes ongoing BiomeAxisForge cycles and three branded supplement stacks.',
    idealFor: [
      'High performers who want data-driven protocol individualisation',
      'Members ready to integrate genomics and gut microbiome testing',
      'Those managing metabolic health, cognitive performance, or body composition simultaneously',
    ],
  },

  {
    id: 'longevity',
    name: 'Longevity',
    tagline: 'Advanced regenerative protocols, hormones, peptides, and bi-weekly clinician access.',
    monthlyUSD: 799,
    annualUSD: 7990,
    includedProductSlugs: [
      'lab-foundation',
      'lab-cognitive-baseline',
      'lab-genomic-blueprint',
      'lab-gut-brain',
      'lab-sleep-study',
      'lab-hormone-optimization',
      'lab-brain-biomarkers',
      'lab-mycotoxin',
      'lab-heavy-metals',
      'lab-advanced-cardiovascular',
      'biome-axis-forge',
      'trt-male',
      'hrt-female',
      'stack-foundation',
      'stack-recovery',
      'stack-focus',
      'stack-longevity',
      'semax',
      'selank',
      'dsip',
      'epitalon',
      'cgm-stelo',
      'pbm-device',
    ],
    features: [
      'Everything in Optimization',
      'Hormone optimisation track (TRT or HRT) included',
      'Brain biomarkers panel included annually',
      'Peptide stack: BiomeAxisForge + Semax/Selank + DSIP/Epitalon (as indicated)',
      'All four supplement stacks included (Foundation, Focus, Recovery, Longevity)',
      'Photobiomodulation device included (Vielight-class)',
      'Mycotoxin and heavy metals panels annually',
      'Ketamine troches — clinician eligibility assessment included',
      'Advanced cardiovascular panel included',
      'Coronary calcium score (year 1)',
      'Bi-weekly clinician visits',
      'Full AI coach + longitudinal protocol tracking',
    ],
    description:
      'Longevity is the comprehensive regenerative tier — hormone optimisation, advanced brain biomarkers, the full peptide protocol, and environmental toxin testing combined with bi-weekly clinician oversight. Designed for members committed to measurable lifespan and healthspan extension.',
    idealFor: [
      'Members with serious longevity and anti-aging goals',
      'Those managing hormones, cognitive decline risk, or complex chronic conditions',
      'High-net-worth individuals who want a full-spectrum protocol under clinical supervision',
    ],
  },

  // ─── Cohort tiers (one-time; id prefix "cohort-") ────────────────────────

  {
    id: 'cohort-foundation',
    name: 'Cohort — Foundation',
    tagline: 'Your free Month-1 onboarding into the 4M system.',
    kind: 'cohort',
    oneTimePriceUSD: 197,
    includedProductSlugs: [],
    features: [
      '4 weekly onboarding guides — how to use the app and get the most out of it.',
      '4M Month 1 Digital Workbook',
      'Morning Protocol — all 4 levels',
      'Mitigate Audit — personal 15-factor score',
      'Private cohort community access',
    ],
    description:
      'Four weeks of guided onboarding into the 4M system. The basic workbook app is free for life. Live coaching with Dr. TJ is available as a Month-2+ upgrade.',
    idealFor: [
      'The man who wants the system, the sessions, and the accountability — and is ready to start',
      'Those exploring the program before committing to a higher tier',
    ],
  },

  {
    id: 'cohort-clinical',
    name: 'Cohort — Clinical',
    tagline: 'Everything in Foundation, plus labs and a telemedicine visit.',
    kind: 'cohort',
    oneTimePriceUSD: 497,
    includedProductSlugs: ['lab-foundation'],
    features: [
      'Everything in Cohort Foundation',
      'Base lab panel (5 markers: 25(OH)D, hs-CRP, homocysteine, fasting glucose, TSH)',
      'Licensed provider telemedicine visit — reviewed before Week 1',
      'Personalized supplement guidance based on your labs',
      'Monthly ongoing coaching option ($67/mo add-on)',
    ],
    description:
      'Clinical adds the base lab panel and a telemedicine visit so you walk into Week 1 knowing your numbers. This is where personalisation begins — no more guessing.',
    idealFor: [
      'Members who want labs and a healthcare provider review before starting',
      '"Your labs are normal" doesn\'t cut it anymore — you want optimal',
    ],
  },

  {
    id: 'cohort-full-optimization',
    name: 'Cohort — Full Optimization',
    tagline: 'The complete picture. Every test. All four formulas. Priority access.',
    kind: 'cohort',
    oneTimePriceUSD: 697,
    includedProductSlugs: [
      'lab-foundation',
      'biome-axis-forge',
      'sleeprestore',
      'armorvita',
      'neurobridge',
    ],
    features: [
      'Everything in Cohort Clinical',
      'Premium lab panel (Total T, Free T, SHBG, DHEA-S, Estradiol, Cortisol AM, MTHFR, RBC Mg, B12, Folate, Ferritin, HbA1c, full lipid, Lp(a))',
      'MTHFR genotype testing',
      'All 4 proprietary formulas prescribed: BiomeAxisForge, SleepRestore, ArmorVita, NeuroBridge',
      'Priority direct access to Dr. TJ',
    ],
    description:
      'Full Optimization is the complete Month 1 picture — every relevant lab marker, MTHFR genotyping, and all four practitioner-grade formulas ready for Week 1. Priority access to Dr. TJ throughout.',
    idealFor: [
      'The man who is done guessing and wants every data point and every tool from day one',
      '"I\'ve tried everything" — now let\'s find out why with actual data',
    ],
  },

  {
    id: 'cohort-ongoing',
    name: 'Ongoing Coaching',
    tagline: 'Month 2 and beyond — stay in the system after Month 1.',
    kind: 'cohort',
    monthlyUSD: 67,
    oneTimePriceUSD: undefined,
    includedProductSlugs: [],
    features: [
      'Available Month 2+: monthly live group coaching with Dr. TJ (avatar-led after initial cohorts).',
      'Continued access to private cohort community',
      'Protocol check-ins and accountability',
      'Add-on after any cohort tier — begins Month 2',
    ],
    description:
      'Month 1 builds the system. Ongoing Coaching keeps it running. $67/mo after you complete your first cohort — the lowest-cost way to stay in the room and stay on protocol.',
    idealFor: [
      'Cohort graduates who want to maintain momentum after Month 1',
      'Members not ready for a full membership tier but wanting continued access to Dr. TJ',
    ],
  },

  {
    id: 'concierge',
    name: 'Concierge',
    tagline: 'A dedicated clinician, a personal AI agent, and the full breadth of the protocol — capped at 100 members.',
    monthlyUSD: 1499,
    annualUSD: 14990,
    includedProductSlugs: [
      'lab-foundation',
      'lab-cognitive-baseline',
      'lab-genomic-blueprint',
      'lab-gut-brain',
      'lab-sleep-study',
      'lab-hormone-optimization',
      'lab-brain-biomarkers',
      'lab-mycotoxin',
      'lab-heavy-metals',
      'lab-advanced-cardiovascular',
      'biome-axis-forge',
      'trt-male',
      'hrt-female',
      'ketamine-troches',
      'stack-foundation',
      'stack-recovery',
      'stack-focus',
      'stack-longevity',
      'semax',
      'selank',
      'dsip',
      'epitalon',
      'cgm-stelo',
      'pbm-device',
    ],
    features: [
      'Everything in Longevity',
      'Dedicated clinician — 24-hour response guarantee',
      'Spectracell micronutrient or NutrEval panel annually',
      'Senolytic protocols (as indicated)',
      'Plasma exchange referral coordination (as indicated)',
      'Quarterly comprehensive labs (all core panels)',
      'Dedicated AI agent (personalised to member history)',
      'Annual longevity review — comprehensive strategy session',
      'Family plan option available (+50% per additional member)',
      'Capped at 100 members per clinician to guarantee access',
    ],
    description:
      'Concierge is the highest tier — a dedicated clinician with 24-hour response, a personal AI agent trained on your full history, senolytic and plasma exchange protocols, and quarterly comprehensive lab monitoring. Hard-capped at 100 members per clinician to ensure genuine access.',
    idealFor: [
      'Executives and athletes who require true concierge-level medical access',
      'Members managing complex multi-system protocols requiring tight clinical coordination',
      'Families seeking a single high-trust provider for multiple members',
    ],
  },
];

// ─── Filtered views ────────────────────────────────────────────────────────────
export const cohortTiers     = tiers.filter(t => t.id.startsWith('cohort-'));
export const membershipTiers = tiers.filter(t => !t.id.startsWith('cohort-'));
