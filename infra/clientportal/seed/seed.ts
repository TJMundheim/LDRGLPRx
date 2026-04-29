/**
 * Seed script — AppSync AppConfig + Program + WeeklyContent + TierCatalog
 *
 * Location: infra/clientportal/seed/seed.ts
 * Runner:   infra/clientportal/seed.sh (wraps `pnpm tsx seed/seed.ts "$@"`)
 *
 * Env vars required (unless --dry-run):
 *   APPSYNC_URL   - https://<api-id>.appsync-api.<region>.amazonaws.com/graphql
 *   AWS_REGION    - e.g. us-east-1
 *
 * Flags:
 *   --dry-run     Print planned mutations and exit 0 without network calls.
 *
 * Data sources:
 *   apps/clientportal/src/lib/content/tiers.ts    -> upsertTierCatalog
 *   apps/clientportal/src/lib/content/pillars.ts  -> upsertProgram
 *   apps/clientportal/src/lib/content/weeks.ts    -> upsertWeeklyContent
 *   Hardcoded AppConfig keys                       -> upsertAppConfig
 *
 * Auth: IAM-signed requests via aws4fetch (SigV4).
 * The executing role must be in the Admins Cognito group OR have an
 * IAM policy that allows appsync:GraphQL on the API ARN.
 */

import { AwsClient } from 'aws4fetch';

// ── Re-declare only the shapes we need from the content files ───────────────
// (Avoids pulling the full Svelte app into the seed context.)

interface MembershipTier {
  id: string;
  name: string;
  tagline: string;
  monthlyUSD?: number;
  annualUSD?: number;
  onboardingFeeUSD?: number;
  oneTimePriceUSD?: number;
  kind?: string;
  includedProductSlugs: string[];
  features: string[];
  description: string;
  idealFor: string[];
}

// ── Tier data (copied from apps/clientportal/src/lib/content/tiers.ts) ──────
// Only the four AppSync TierId enum values are seeded; cohort/discovery tiers
// are stored as AppConfig entries instead.

const TIERS: MembershipTier[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    tagline: 'The complete starting protocol — labs, clinician, and your first Rx cycle included.',
    monthlyUSD: 99,
    annualUSD: 990,
    onboardingFeeUSD: 499,
    kind: 'membership',
    includedProductSlugs: ['lab-foundation', 'lab-cognitive-baseline', 'biome-axis-forge', 'stack-foundation'],
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
    description: 'Foundation delivers the core clinical starting protocol: comprehensive labs, cognitive baseline, an initial clinician visit, and your first BiomeAxisForge cycle — all included in the onboarding fee.',
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
    kind: 'membership',
    includedProductSlugs: [
      'lab-foundation', 'lab-cognitive-baseline', 'lab-genomic-blueprint', 'lab-gut-brain',
      'lab-sleep-study', 'biome-axis-forge', 'stack-foundation', 'stack-recovery', 'stack-focus', 'cgm-stelo',
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
    description: 'Optimization is the complete personalisation tier: genomic mapping, gut-brain axis assessment, continuous metabolic monitoring, and monthly clinician access.',
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
    kind: 'membership',
    includedProductSlugs: [
      'lab-foundation', 'lab-cognitive-baseline', 'lab-genomic-blueprint', 'lab-gut-brain',
      'lab-sleep-study', 'lab-hormone-optimization', 'lab-brain-biomarkers', 'lab-mycotoxin',
      'lab-heavy-metals', 'lab-advanced-cardiovascular', 'biome-axis-forge', 'trt-male', 'hrt-female',
      'stack-foundation', 'stack-recovery', 'stack-focus', 'stack-longevity',
      'semax', 'selank', 'dsip', 'epitalon', 'cgm-stelo', 'pbm-device',
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
    description: 'Longevity is the comprehensive regenerative tier — hormone optimisation, advanced brain biomarkers, the full peptide protocol, and environmental toxin testing combined with bi-weekly clinician oversight.',
    idealFor: [
      'Members with serious longevity and anti-aging goals',
      'Those managing hormones, cognitive decline risk, or complex chronic conditions',
      'High-net-worth individuals who want a full-spectrum protocol under clinical supervision',
    ],
  },
  {
    id: 'concierge',
    name: 'Concierge',
    tagline: 'A dedicated clinician, a personal AI agent, and the full breadth of the protocol — capped at 100 members.',
    monthlyUSD: 1499,
    annualUSD: 14990,
    kind: 'membership',
    includedProductSlugs: [
      'lab-foundation', 'lab-cognitive-baseline', 'lab-genomic-blueprint', 'lab-gut-brain',
      'lab-sleep-study', 'lab-hormone-optimization', 'lab-brain-biomarkers', 'lab-mycotoxin',
      'lab-heavy-metals', 'lab-advanced-cardiovascular', 'biome-axis-forge', 'trt-male', 'hrt-female',
      'ketamine-troches', 'stack-foundation', 'stack-recovery', 'stack-focus', 'stack-longevity',
      'semax', 'selank', 'dsip', 'epitalon', 'cgm-stelo', 'pbm-device',
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
    description: 'Concierge is the highest tier — a dedicated clinician with 24-hour response, a personal AI agent trained on your full history, senolytic and plasma exchange protocols, and quarterly comprehensive lab monitoring.',
    idealFor: [
      'Executives and athletes who require true concierge-level medical access',
      'Members managing complex multi-system protocols requiring tight clinical coordination',
      'Families seeking a single high-trust provider for multiple members',
    ],
  },
];

// Cohort tiers serialised as AppConfig for reference by the client portal.
const COHORT_TIERS: MembershipTier[] = [
  {
    id: 'cohort-foundation',
    name: 'Cohort — Foundation',
    tagline: 'Four weeks of live clinical education and your personal 15-factor audit.',
    kind: 'cohort',
    oneTimePriceUSD: 197,
    includedProductSlugs: [],
    features: [
      '4 weekly live Zoom sessions with Dr. TJ',
      '4M Month 1 Digital Workbook',
      'Morning Protocol — all 4 levels',
      'Mitigate Audit — personal 15-factor score',
      'Private cohort community access',
    ],
    description: 'The Foundation cohort tier gets you into the live program — four weekly sessions, your personal 15-factor audit, the complete Morning Protocol, and the Month 1 workbook.',
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
    description: "Clinical adds the base lab panel and a telemedicine visit so you walk into Week 1 knowing your numbers.",
    idealFor: [
      "Members who want labs and a physician's eyes on their numbers before starting",
      '"Your labs are normal" doesn\'t cut it anymore — you want optimal',
    ],
  },
  {
    id: 'cohort-full-optimization',
    name: 'Cohort — Full Optimization',
    tagline: 'The complete picture. Every test. All four formulas. Priority access.',
    kind: 'cohort',
    oneTimePriceUSD: 697,
    includedProductSlugs: ['lab-foundation', 'biome-axis-forge', 'sleeprestore', 'armorvita', 'neurobridge'],
    features: [
      'Everything in Cohort Clinical',
      'Premium lab panel (Total T, Free T, SHBG, DHEA-S, Estradiol, Cortisol AM, MTHFR, RBC Mg, B12, Folate, Ferritin, HbA1c, full lipid, Lp(a))',
      'MTHFR genotype testing',
      'All 4 proprietary formulas prescribed: BiomeAxisForge, SleepRestore, ArmorVita, NeuroBridge',
      'Priority direct access to Dr. TJ',
    ],
    description: 'Full Optimization is the complete Month 1 clinical picture — every relevant lab marker, MTHFR genotyping, and all four physician-prescribed formulas prescribed and ready for Week 1.',
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
    includedProductSlugs: [],
    features: [
      'Monthly group coaching session with Dr. TJ',
      'Continued access to private cohort community',
      'Protocol check-ins and accountability',
      'Add-on after any cohort tier — begins Month 2',
    ],
    description: 'Month 1 builds the system. Ongoing Coaching keeps it running. $67/mo after you complete your first cohort.',
    idealFor: [
      'Cohort graduates who want to maintain momentum after Month 1',
      'Members not ready for a full membership tier but wanting continued access to Dr. TJ',
    ],
  },
];

// ── Program / pillar data ────────────────────────────────────────────────────

const PROGRAM_ID = '4m-month1';

const PROGRAM_INPUT = {
  id: PROGRAM_ID,
  name: '4M — Month 1: Mitigate · Muscle · Mind · Motivate',
  description: 'The flagship Month 1 protocol: four weekly pillars building the foundation of personalised healthspan — gut-brain repair, strength, cognition, and identity.',
  pillars: [
    {
      month: 'M1',
      pillar: 'mitigate',
      title: 'MITIGATE — Remove the 15 factors stealing your brain & body.',
      summary: 'We start by removing what is working against you. Your personal 15-factor audit scores every root cause — gut, sleep, stress, and more.',
      objectives: [
        '15-Factor personal audit and scoring',
        'Gut-brain axis repair (BiomeAxisForge)',
        'Sleep architecture optimization',
        'Allergen and immune load reduction',
        'Baseline labs — know your numbers before Week 1 begins',
      ],
    },
    {
      month: 'M1',
      pillar: 'muscle',
      title: 'MUSCLE — Rebuild the body that powers the brain.',
      summary: 'We build the body that supports the brain. Morning protocol, outdoor fasted movement, and the fat-soluble defense stack.',
      objectives: [
        'Morning protocol — full progression',
        'Fasted outdoor training sessions',
        'Vitamin D3/K2 optimization',
        'Boron for free testosterone (+28% in 7 days · NIH)',
        'Zone 2 cardio and resistance protocol',
      ],
    },
    {
      month: 'M1',
      pillar: 'mind',
      title: 'MIND — Feed, fuel, and sharpen your cognitive edge.',
      summary: 'We feed the brain. Nutrition quality, methylation support, and the active-form B-complex.',
      objectives: [
        'Nutrition quality tiers — food audit and upgrade',
        'Methylation and MTHFR support',
        'Fasting window progression',
        'Cognitive performance tracking',
        'Full supplement stack review',
      ],
    },
    {
      month: 'M1',
      pillar: 'motivate',
      title: 'MOTIVATE — Lock in your identity and daily system.',
      summary: 'By Week 4, you do not have a program — you have a system.',
      objectives: [
        'Identity statement — who you are becoming',
        'Week 4 re-audit: re-score all 15 factors',
        'Month 1 wins review and celebration',
        'Genesis RPA introduction (bonus module)',
        'Month 2 commitment and graduation criteria',
      ],
    },
  ],
};

// ── Weekly content ────────────────────────────────────────────────────────────

const WEEKLY_CONTENT = [
  {
    id: `${PROGRAM_ID}-m1-w1`,
    programId: PROGRAM_ID,
    month: 'M1',
    week: 1,
    pillar: 'mitigate',
    title: 'Week 1 — All 4 Pillars Begin Today',
    bodyMarkdown: `## Week 1 — Mitigate (Deep Focus)\n\n**Remove the 15 factors stealing your brain & body.**\n\nThis week you complete your personal 15-factor audit. Score each root cause honestly — gut, sleep, stress, toxins, and more. Your score tells us exactly where to begin.\n\n### Actions\n- Complete the 15-Factor Audit (score 0–5 per factor)\n- Set your Top 3 priorities and write your commitments\n- Record your body baseline: weight, waist, energy, focus, sleep, mood\n- Record your strength baseline: pull-ups, push-ups, dead hang, squats, plank\n- Start BiomeAxisForge (gut-brain axis repair)\n\n### Morning Protocol — Level 1\nGlass of water upon waking. That is the entire protocol this week — consistency over complexity.`,
    resources: [
      { name: '15-Factor Audit Guide', url: 'https://app.my4mlife.com/#w1' },
    ],
  },
  {
    id: `${PROGRAM_ID}-m1-w2`,
    programId: PROGRAM_ID,
    month: 'M1',
    week: 2,
    pillar: 'muscle',
    title: 'Week 2 — Build the Foundation',
    bodyMarkdown: `## Week 2 — Muscle (Deep Focus)\n\n**Rebuild the body that powers the brain.**\n\nThe body is the vehicle. This week we add movement, outdoor fasted training, and the ArmorVita fat-soluble stack (D3/K2/Boron).\n\n### Actions\n- Begin fasted outdoor training (minimum 20 min, 3×/week)\n- Start ArmorVita supplementation\n- Track morning protocol days (target: 5/7 days)\n- Track cold exposure days (optional — target: 3/7 days)\n- Log protein intake (target: 1 g/lb bodyweight)\n\n### Morning Protocol — Level 2\nWater + 5 minutes outdoor light exposure within 30 minutes of waking.`,
    resources: [],
  },
  {
    id: `${PROGRAM_ID}-m1-w3`,
    programId: PROGRAM_ID,
    month: 'M1',
    week: 3,
    pillar: 'mind',
    title: 'Week 3 — Deepen the Work',
    bodyMarkdown: `## Week 3 — Mind (Deep Focus)\n\n**Feed, fuel, and sharpen your cognitive edge.**\n\nNutrition quality, methylation support, and the NeuroBridge active-form B-complex — especially critical if you carry MTHFR.\n\n### Actions\n- Complete food quality audit (Tier 1 / 2 / 3 categorisation)\n- Start NeuroBridge (active methylated B-complex)\n- Extend fasting window by 1–2 hours from Week 2 baseline\n- Log cognitive ratings (focus / memory / mood) weekly\n- Review full supplement stack — confirm all three formulas are running\n\n### Morning Protocol — Level 3\nWater + light + 10 minutes of focused breath or meditation work.`,
    resources: [],
  },
  {
    id: `${PROGRAM_ID}-m1-w4`,
    programId: PROGRAM_ID,
    month: 'M1',
    week: 4,
    pillar: 'motivate',
    title: 'Week 4 — Integration & Identity',
    bodyMarkdown: `## Week 4 — Motivate (Deep Focus)\n\n**Lock in your identity and daily system.**\n\nBy Week 4, you do not have a program — you have a system. Re-audit all 15 factors, write your identity statement, and prepare for Month 2.\n\n### Actions\n- Re-score the 15-Factor Audit (compare Week 1 vs Week 4)\n- Write your identity statement\n- Record your Month 1 wins (top 3)\n- Complete Month 2 commitment (training / nutrition / supplements / cognitive / accountability)\n- Watch the Genesis RPA bonus module\n\n### Graduation Criteria\n- 20+ morning protocol days completed\n- 10+ cold exposure sessions\n- Factor score improvement ≥ 10 points vs Week 1 baseline\n\n### Morning Protocol — Level 4\nFull stack: water + light + movement + breath + protein within 60 minutes of waking.`,
    resources: [
      { name: 'Genesis RPA — Introduction', url: 'https://genesisregenerative.com' },
    ],
  },
];

// ── AppConfig entries ─────────────────────────────────────────────────────────

const APP_CONFIGS = [
  {
    key: 'program:active',
    valueJson: JSON.stringify({ programId: PROGRAM_ID }),
  },
  {
    key: 'cohort:tiers',
    valueJson: JSON.stringify(COHORT_TIERS),
  },
  {
    key: 'discovery:tier',
    valueJson: JSON.stringify({
      id: 'discovery',
      name: 'Discovery',
      tagline: 'Start with a clear picture of where you stand — free, no commitment.',
      monthlyUSD: 0,
      features: [
        'AI health quiz (full 4M assessment)',
        'Personalised health avatar presentation',
        '1 free async clinician message',
        'Access to product catalog and tier overview',
      ],
      description: 'Discovery is the free entry point — complete the AI-powered intake quiz, receive a personalised health avatar, and get one free async message to a clinician.',
    }),
  },
];

// ── Mutation builders ─────────────────────────────────────────────────────────

function buildTierCatalogMutation(): { name: string; doc: string; vars: Record<string, unknown> } {
  return {
    name: 'upsertTierCatalog',
    doc: `
      mutation UpsertTierCatalog($input: UpsertTierCatalogInput!) {
        upsertTierCatalog(input: $input) {
          id
          updatedAt
        }
      }
    `,
    vars: {
      input: {
        id: 'default',
        tiers: TIERS.map(t => ({
          id: t.id,
          name: t.name,
          tagline: t.tagline,
          monthlyUSD: t.monthlyUSD ?? null,
          annualUSD: t.annualUSD ?? null,
          onboardingFeeUSD: t.onboardingFeeUSD ?? null,
          oneTimePriceUSD: t.oneTimePriceUSD ?? null,
          kind: t.kind ?? null,
          includedProductSlugs: t.includedProductSlugs,
          features: t.features,
          description: t.description,
          idealFor: t.idealFor,
        })),
      },
    },
  };
}

function buildProgramMutation(): { name: string; doc: string; vars: Record<string, unknown> } {
  return {
    name: 'upsertProgram',
    doc: `
      mutation UpsertProgram($input: UpsertProgramInput!) {
        upsertProgram(input: $input) {
          id
          updatedAt
        }
      }
    `,
    vars: { input: PROGRAM_INPUT },
  };
}

function buildWeeklyContentMutations(): { name: string; doc: string; vars: Record<string, unknown> }[] {
  return WEEKLY_CONTENT.map(wc => ({
    name: `upsertWeeklyContent:${wc.id}`,
    doc: `
      mutation UpsertWeeklyContent($input: UpsertWeeklyContentInput!) {
        upsertWeeklyContent(input: $input) {
          id
          updatedAt
        }
      }
    `,
    vars: { input: wc },
  }));
}

function buildAppConfigMutations(): { name: string; doc: string; vars: Record<string, unknown> }[] {
  return APP_CONFIGS.map(cfg => ({
    name: `upsertAppConfig:${cfg.key}`,
    doc: `
      mutation UpsertAppConfig($input: UpsertAppConfigInput!) {
        upsertAppConfig(input: $input) {
          key
          updatedAt
        }
      }
    `,
    vars: { input: cfg },
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const mutations = [
    ...buildAppConfigMutations(),
    buildProgramMutation(),
    ...buildWeeklyContentMutations(),
    buildTierCatalogMutation(),
  ];

  if (isDryRun) {
    console.log(`\n[dry-run] ${mutations.length} mutations planned:\n`);
    for (const m of mutations) {
      console.log(`  ✓ ${m.name}`);
      console.log(`    vars: ${JSON.stringify(m.vars, null, 2).split('\n').join('\n    ')}\n`);
    }
    console.log(`[dry-run] No network calls made. Exiting 0.`);
    process.exit(0);
  }

  const url = process.env.APPSYNC_URL;
  const region = process.env.AWS_REGION;

  if (!url || !region) {
    console.error('ERROR: APPSYNC_URL and AWS_REGION must be set in env.');
    process.exit(1);
  }

  const aws = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region,
    service: 'appsync',
  });

  let failed = 0;
  for (const m of mutations) {
    const body = JSON.stringify({ query: m.doc, variables: m.vars });
    const res = await aws.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const json = await res.json() as { errors?: unknown[]; data?: unknown };
    if (!res.ok || json.errors) {
      console.error(`FAIL ${m.name}:`, JSON.stringify(json.errors ?? res.status));
      failed++;
    } else {
      console.log(`OK   ${m.name}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} mutation(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${mutations.length} mutations applied successfully.`);
}

main().catch(err => { console.error(err); process.exit(1); });
