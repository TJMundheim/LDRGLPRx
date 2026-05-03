/**
 * Intake report builder — pure logic, no I/O.
 * Takes an IntakeResult + catalog data and returns a structured object
 * ready to render in the UI.
 *
 * Catalog files (products.ts, labs.ts, tiers.ts) are being built in parallel.
 * Imports are type-only until those files land.
 * TODO: wire up after products.ts / labs.ts / tiers.ts land
 */

import type { IntakeResult, TierRec } from '../data/intake';

// TODO: wire up after products.ts lands — import { products } from '../content/products'
// TODO: wire up after labs.ts lands — import { labs } from '../content/labs'
// TODO: wire up after tiers.ts lands — import { tiers } from '../content/tiers'
import type { Product, LabPanel, MembershipTier } from '../data/catalog';

// ─── Output types ─────────────────────────────────────────────────────────────

export interface PriorityCard {
  domain: string;
  severity: number;
  title: string;
  body: string;
  /** Product slugs that address this domain */
  productSlugs: string[];
}

export interface SuggestedCart {
  products: Product[];
  labs: LabPanel[];
  /** Sum of retail prices for all suggested items */
  estimatedTotalUSD: number;
}

export interface IntakeReport {
  /** Short (≤ 8 words) personalised headline */
  headline: string;
  /** 2–3 sentence summary from IntakeResult */
  summary: string;
  /** Top priority domain cards, max 3 */
  priorityCards: PriorityCard[];
  /** Matched Product records for recommended product slugs */
  recommendedProducts: Product[];
  /** Matched LabPanel records for recommended lab slugs */
  recommendedLabs: LabPanel[];
  /** Matched MembershipTier record */
  recommendedTier: MembershipTier | null;
  suggestedCart: SuggestedCart;
  /** URL path to send the user to (e.g. /checkout or /consult) */
  ctaPath: string;
  /** Clinician flags from the intake result — surfaces to the UI for the banner */
  clinicianFlags: { questionId: string; reason: string }[];
}

// ─── Domain → display copy ────────────────────────────────────────────────────
const DOMAIN_COPY: Record<string, { title: string; body: string }> = {
  gut:          { title: 'Gut & Digestive Health', body: 'Addressing your gut microbiome helps support digestion, immunity, and the gut-brain connection that influences mood and cognition.' },
  brain:        { title: 'Cognitive & Mental Wellbeing', body: 'Supporting brain health through targeted nutrients, gut-brain protocols, and cognitive-baseline testing helps address focus, memory, and mood concerns.' },
  sleep:        { title: 'Sleep Optimisation', body: 'Restorative sleep is foundational. Identifying sleep-architecture issues — including sleep apnea — is often the highest-leverage intervention.' },
  metabolic:    { title: 'Metabolic Health & Weight', body: 'Blood-sugar stability and healthy body composition are linked to long-term cardiovascular and cognitive health.' },
  hormone:      { title: 'Hormonal Balance', body: 'Optimising hormone levels helps support energy, body composition, mood, and libido for both men and women.' },
  joint:        { title: 'Joint & Musculoskeletal Recovery', body: 'Regenerative approaches can help support tissue repair, reduce chronic inflammation, and restore function after injury or degeneration.' },
  sexual:       { title: 'Sexual Health', body: 'Sexual health is a meaningful marker of overall metabolic, hormonal, and cardiovascular function — and very treatable.' },
  inflammation: { title: 'Inflammation & Immune Regulation', body: 'Chronic low-grade inflammation underlies many complex conditions; addressing root causes through the gut and lifestyle is the starting point.' },
};

// ─── Pricing constants ────────────────────────────────────────────────────────
const FOUNDATION_ONBOARDING_USD = 499;
const BIOMEAXISFORGE_STANDALONE_USD = 249;

// ─── Main builder ─────────────────────────────────────────────────────────────
export function buildIntakeReport(
  result: IntakeResult,
  products: Product[],
  labs: LabPanel[],
  tiers: MembershipTier[],
): IntakeReport {
  // Index catalogs by slug for O(1) lookup
  const productBySlug = new Map(products.map(p => [p.slug, p]));
  const labBySlug     = new Map(labs.map(l => [l.slug, l]));
  const tierById      = new Map(tiers.map(t => [t.id, t]));

  // Match triggered products and labs
  const recommendedProducts: Product[] = result.triggeredProducts
    .map((tp: { slug: string; reasons: string[] }) => productBySlug.get(tp.slug))
    .filter((p: Product | undefined): p is Product => p !== undefined);

  const recommendedLabs: LabPanel[] = result.triggeredLabs
    .map((tl: { slug: string; reasons: string[] }) => labBySlug.get(tl.slug))
    .filter((l: LabPanel | undefined): l is LabPanel => l !== undefined);

  // Match tier
  const tierKey = result.recommendedTier satisfies TierRec;
  const recommendedTier: MembershipTier | null = tierById.get(tierKey) ?? null;

  // Priority cards — top 3 domains
  const priorityCards: PriorityCard[] = result.topPriorities.slice(0, 3).map((p: { domain: string; severity: number }) => {
    const copy = DOMAIN_COPY[p.domain] ?? { title: p.domain, body: '' };
    const domainProductSlugs = result.triggeredProducts
      .filter((tp: { slug: string; reasons: string[] }) => {
        const rule = result.triggeredProducts.find((x: { slug: string; reasons: string[] }) => x.slug === tp.slug);
        return rule !== undefined;
      })
      .map((tp: { slug: string; reasons: string[] }) => tp.slug);
    return {
      domain: p.domain,
      severity: p.severity,
      title: copy.title,
      body: copy.body,
      productSlugs: domainProductSlugs,
    };
  });

  // Suggested cart
  const suggestedCart = buildSuggestedCart(result, recommendedProducts, recommendedLabs, recommendedTier);

  // CTA path
  const ctaPath = result.clinicianFlags.length > 0 ? '/consult' : '/checkout';

  // Headline
  const headline = buildHeadline(result);

  return {
    headline,
    summary: result.summary,
    priorityCards,
    recommendedProducts,
    recommendedLabs,
    recommendedTier,
    suggestedCart,
    ctaPath,
    clinicianFlags: result.clinicianFlags,
  };
}

// ─── Cart builder ─────────────────────────────────────────────────────────────
function buildSuggestedCart(
  result: IntakeResult,
  recommendedProducts: Product[],
  recommendedLabs: LabPanel[],
  tier: MembershipTier | null,
): SuggestedCart {
  const isMember = result.recommendedTier !== 'foundation' || tier !== null;

  // For non-members — offer standalone Biome-AF as entry point
  const standaloneEntry = !isMember
    ? recommendedProducts.filter(p => p.slug === 'biomeaxisforge')
    : [];

  // For members — Foundation onboarding fee + first month + recommended add-ons
  const memberProducts = isMember ? recommendedProducts : standaloneEntry;

  // Compute total: onboarding (member) or standalone biomeaxisforge + labs
  let estimatedTotalUSD = 0;
  if (isMember) {
    estimatedTotalUSD += FOUNDATION_ONBOARDING_USD;
    // Add retail prices of recommended add-on products (non-included in tier)
    const includedSlugs = new Set(tier?.includedProductSlugs ?? []);
    for (const p of memberProducts) {
      if (!includedSlugs.has(p.slug)) {
        estimatedTotalUSD += p.pricing.memberUSD ?? p.pricing.retailUSD;
      }
    }
  } else {
    estimatedTotalUSD += BIOMEAXISFORGE_STANDALONE_USD;
  }

  // Always add recommended labs at retail
  for (const l of recommendedLabs) {
    estimatedTotalUSD += l.pricing.memberUSD ?? l.pricing.retailUSD;
  }

  return {
    products: memberProducts,
    labs: recommendedLabs,
    estimatedTotalUSD,
  };
}

// ─── Headline builder ─────────────────────────────────────────────────────────
function buildHeadline(result: IntakeResult): string {
  const top = result.topPriorities[0];
  if (!top) return 'Your personalised protocol is ready';

  const domainHeadlines: Record<string, string> = {
    brain:        'Sharper thinking starts here',
    gut:          'Heal your gut, reset your health',
    sleep:        'Reclaim your sleep',
    metabolic:    'Rebalance your metabolism',
    hormone:      'Optimise your hormones',
    joint:        'Recover and rebuild your joints',
    sexual:       'Restore your vitality',
    inflammation: 'Calm the fire within',
  };

  return domainHeadlines[top.domain] ?? 'Your personalised protocol is ready';
}
