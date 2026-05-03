/**
 * LDRGLPRx membership tiers — ongoing subscriptions + program entry tiers.
 * Content only — no logic.
 *
 * Program entry tiers (Protégé / Insider) use kind: 'program'.
 * Use programTiers / membershipTiers filtered exports for each context.
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
      'First Biome-AF 4-week cycle included',
      '4M Workbook — Month 1 content + AI coach',
      'Member pricing on all catalog products',
      'Async clinician messaging (unlimited)',
      'Quarterly clinician check-in visits',
    ],
    description:
      'Foundation delivers the core clinical starting protocol: comprehensive labs, cognitive baseline, an initial clinician visit, and your first Biome-AF cycle — all included in the onboarding fee. Monthly membership maintains access to the AI coach, async clinician support, and member pricing.',
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
      'Biome-AF cycles — ongoing quarterly',
      'Foundation + Recovery + Focus supplement stacks included',
      'CGM trial (Stelo 14-day) included',
      'Sleep study (WatchPAT) included year 1',
      'Monthly clinician visits',
      '20% discount on additional Rx products',
      'Full 4M Workbook — all 4 months + AI coach',
    ],
    description:
      'Optimization is the complete personalisation tier: genomic mapping, gut-brain axis assessment, continuous metabolic monitoring, and monthly clinician access — all integrated into a single monthly membership. Includes ongoing Biome-AF cycles and three branded supplement stacks.',
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
      'Peptide stack: Biome-AF + Semax/Selank + DSIP/Epitalon (as indicated)',
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

  // ─── Program entry tiers (Protégé / Insider) ──────────────────────────────

  {
    id: 'protege',
    name: 'Protégé',
    tagline: 'Your free entry to the My4MLife framework. Yours forever — no card required.',
    kind: 'program',
    oneTimePriceUSD: 0,
    includedProductSlugs: [],
    features: [
      'Full access to the My4MLife App',
      'Weekly onboarding sessions — open to all Protégés',
      'Daily protocols and morning routine tracker',
      'Gut-brain repair protocol (Biome-AF overview)',
      'Mitigate Audit — personal 15-factor score',
    ],
    description:
      'Protégé is Tier 0, completely free. Full access to the My4MLife App, weekly onboarding sessions, daily protocols, gut-brain repair, morning routine tracker. Yours forever — no card required.',
    idealFor: [
      'The man starting his 4M journey and exploring the framework',
      'Anyone who wants the system in their hands before committing to more',
    ],
  },

  {
    id: 'insider',
    name: 'Insider',
    tagline: 'Inside the protocol. Live Insider sessions with Dr. TJ. Deeper education and member-only pricing.',
    kind: 'program',
    monthlyUSD: undefined, // TJ to confirm pricing
    oneTimePriceUSD: undefined,
    includedProductSlugs: ['lab-foundation'],
    features: [
      'Everything in Protégé',
      'Live Insider sessions with Dr. TJ',
      'Deeper clinical education modules',
      'Member-only Rx & supplement pricing',
      'Group coaching and community access',
      'Three sub-tiers: Insider, Insider Plus, Insider Concierge',
    ],
    description:
      'Inside the protocol. Live Insider sessions with Dr. TJ. Deeper education, member-only Rx & supplement pricing, group coaching. Three sub-tiers: Insider, Insider Plus, Insider Concierge.',
    idealFor: [
      'Members ready to go deeper than the free onboarding',
      'Those who want live access to Dr. TJ and clinical accountability',
    ],
  },

  {
    id: 'insider-plus',
    name: 'Insider Plus',
    tagline: 'More benefits, more contact — the next step inside the protocol.',
    kind: 'program',
    monthlyUSD: undefined, // TJ to confirm pricing
    oneTimePriceUSD: undefined,
    includedProductSlugs: ['lab-foundation', 'biome-axis-forge'],
    features: [
      'Everything in Insider',
      'More frequent contact and check-ins',
      'Priority session access',
      'Enhanced supplement and Rx guidance',
    ],
    description:
      'Insider Plus is the mid-tier inside the Insider track — more benefits, more contact, and priority access to Dr. TJ.',
    idealFor: [
      'Insiders who want more structure and contact',
      'Members managing multiple protocol areas simultaneously',
    ],
  },

  {
    id: 'insider-concierge',
    name: 'Insider Concierge',
    tagline: '1:1 access tier. Personal protocol design with Dr. TJ.',
    kind: 'program',
    monthlyUSD: undefined, // TJ to confirm pricing
    oneTimePriceUSD: undefined,
    includedProductSlugs: ['lab-foundation', 'biome-axis-forge', 'sleeprestore', 'armorvita', 'neurobridge'],
    features: [
      'Everything in Insider Plus',
      'Direct messaging access to Dr. TJ',
      'Personal protocol design',
      'Priority consult booking',
      'Full lab review included',
      'Limited founder slots',
    ],
    description:
      'Insider Concierge is the top Insider sub-tier. Personal protocol design with Dr. TJ. Direct messaging, priority consult booking, full lab review. Limited founder slots.',
    idealFor: [
      'The man who wants maximum access and personal accountability',
      'Those managing complex multi-system protocols requiring Dr. TJ\'s direct involvement',
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
/** Program entry tiers: Protégé, Insider, Insider Plus, Insider Concierge */
export const programTiers    = tiers.filter(t => t.kind === 'program');
/** Ongoing membership tiers: Foundation, Optimization, Longevity, Concierge */
export const membershipTiers = tiers.filter(t => t.kind !== 'program');
