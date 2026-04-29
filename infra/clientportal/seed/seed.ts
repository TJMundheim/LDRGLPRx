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
    description: 'Four weeks of guided onboarding into the 4M system. The basic workbook app is free for life. Live coaching with Dr. TJ is available as a Month-2+ upgrade.',
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
    includedProductSlugs: ['lab-foundation', 'biome-axis-forge', 'sleeprestore', 'armorvita', 'neurobridge'],
    features: [
      'Everything in Cohort Clinical',
      'Premium lab panel (Total T, Free T, SHBG, DHEA-S, Estradiol, Cortisol AM, MTHFR, RBC Mg, B12, Folate, Ferritin, HbA1c, full lipid, Lp(a))',
      'MTHFR genotype testing',
      'All 4 proprietary formulas prescribed: BiomeAxisForge, SleepRestore, ArmorVita, NeuroBridge',
      'Priority direct access to Dr. TJ',
    ],
    description: 'Full Optimization is the complete Month 1 picture — every relevant lab marker, MTHFR genotyping, and all four practitioner-grade formulas ready for Week 1.',
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
      'Available Month 2+: monthly live group coaching with Dr. TJ (avatar-led after initial cohorts).',
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
    title: 'Week 1',
    bodyMarkdown: `## Week 1 — All Four M's Begin Today\n\n### Morning Protocol\nDone fasted · Outdoors · Every morning · Cold shower closes. Check off each day in the tracker below.\n\n### Mitigate\n- Hydrate to ½ body weight in ounces daily. Lights out by 10:30pm. No screens 30 min before bed.\n\n### Muscle\n- Walk 20 min daily.\n\n### Mind\n- 5 min daily focused breathing or meditation.\n\n### Motivate\n- Write your "why" in one sentence. Read it daily.\n\n### Nutrition\n- Placeholder — your Week 1 meal plan goes here. Food log: 3 meals + snacks, free-text.`,
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
    title: 'Week 2',
    bodyMarkdown: `## Week 2 — Build the Foundation\n\n### Morning Protocol\nDone fasted · Outdoors · Every morning · Cold shower closes. This week adds the fireside/sumo squat. Check off each day in the tracker below.\n\n### Mitigate\n- Hydrate to ½ body weight in ounces daily. Lights out by 10:30pm. No screens 30 min before bed.\n- + Cut one inflammatory input — added sugar, alcohol, or seed oils (pick one).\n\n### Muscle\n- Walk 20 min daily.\n- + Resistance 2×/week — 5 push-ups, 10 squats, 30-sec plank (scale to your level).\n\n### Mind\n- 5 min daily focused breathing or meditation.\n- + Read 10 pages or listen to one long-form podcast/day.\n\n### Motivate\n- Write your "why" in one sentence. Read it daily.\n- + Tell one person what you're doing and why.\n\n### Nutrition\n- Placeholder — your Week 2 meal plan goes here. Food log: 3 meals + snacks, free-text.`,
    resources: [],
  },
  {
    id: `${PROGRAM_ID}-m1-w3`,
    programId: PROGRAM_ID,
    month: 'M1',
    week: 3,
    pillar: 'mind',
    title: 'Week 3',
    bodyMarkdown: `## Week 3 — Deepen the Work\n\n### Morning Protocol\nDone fasted · Outdoors · Every morning · Cold shower closes. This week adds the lunge stretch. Check off each day in the tracker below.\n\n### Mitigate\n- Hydrate to ½ body weight in ounces daily. Lights out by 10:30pm. No screens 30 min before bed.\n- + Cut one inflammatory input — added sugar, alcohol, or seed oils (pick one).\n- + Recovery practice 3×/week — sauna, Epsom-salt bath, or extended cold exposure.\n\n### Muscle\n- Walk 20 min daily.\n- + Resistance 2×/week — 5 push-ups, 10 squats, 30-sec plank (scale to your level).\n- + Mobility flow 3×/week — 5 min of hip circles, spinal rotation, shoulder rolls.\n\n### Mind\n- 5 min daily focused breathing or meditation.\n- + Read 10 pages or listen to one long-form podcast/day.\n- + Morning brain-dump journal — 5 min, whatever's in your head, no editing.\n\n### Motivate\n- Write your "why" in one sentence. Read it daily.\n- + Tell one person what you're doing and why.\n- + Share one win in the cohort space.\n\n### Nutrition\n- Placeholder — your Week 3 meal plan goes here. Food log: 3 meals + snacks, free-text.`,
    resources: [],
  },
  {
    id: `${PROGRAM_ID}-m1-w4`,
    programId: PROGRAM_ID,
    month: 'M1',
    week: 4,
    pillar: 'motivate',
    title: 'Week 4',
    bodyMarkdown: `## Week 4 — Integration & Identity\n\n### Morning Protocol\nAll elements — with more focus and passion. Check off each day in the tracker below.\n\n### Mitigate\n- All of above, daily, with intention.\n\n### Muscle\n- All of above + one challenging session/week (longer walk, more reps, harder hold).\n\n### Mind\n- All of above + one thing learned this month, written down.\n\n### Motivate\n- All of above + write what Month 2 looks like for you.\n\n### Nutrition\n- Placeholder — your Week 4 meal plan goes here. Food log: 3 meals + snacks, free-text.\n\n---\n\n**Want live coaching with Dr. TJ? Available Month 2+ as an upgrade tier.**`,
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
