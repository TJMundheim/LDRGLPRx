/**
 * skus.ts — My4MLife product SKU catalog.
 *
 * Locked 2026-05-12. Source-of-truth for cart, checkout, Stripe webhook routing.
 *
 * Prices are placeholder/TBD where TJ hasn't finalized. Update before launch.
 * `stripePriceId` will be filled when Stripe products are created.
 */

export interface SKU {
  /** URL-safe ID used in /cart?sku=<id> */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short marketing tagline */
  tagline: string;
  /** Price in USD (member). null if pricing not finalized. */
  memberPriceUSD: number | null;
  /** Retail price in USD (non-member). null if pricing not finalized. */
  retailPriceUSD: number | null;
  /** Subscription cadence — 'one-time', 'monthly', 'annual', or null for not-yet-subscriptionable */
  cadence: 'one-time' | 'monthly' | 'annual' | null;
  /** Stripe Price ID (live), filled after Stripe setup */
  stripePriceId: string | null;
  /** Whether the product is purchasable today */
  available: boolean;
  /** Friendly "available date" if not available */
  availableNote?: string;
  /** Solution-page slug this SKU primarily belongs to */
  solutionSlug: string;
}

export const SKUS: Record<string, SKU> = {
  // ========== Proprietary supplement line ==========
  'biome-ns-ultra': {
    id: 'biome-ns-ultra',
    name: 'Biome NS Ultra',
    tagline: 'L-Glutamine + DGL + Berberine + Aloe + Curcumin + Zinc Carnosine — gut-brain seal',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'gut',
  },
  'omegacn-prime': {
    id: 'omegacn-prime',
    name: 'OmegaCN Prime',
    tagline: 'Omega-3 (EPA + DHA 2g) + Ubiquinol CoQ10 200mg — Cardio Neuro foundation',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
  },
  'sleeprestore': {
    id: 'sleeprestore',
    name: 'SleepRestore',
    tagline: 'Mg + Glycine + Apigenin + L-Theanine + KSM-66 + Zinc',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'sleep',
  },
  'armorvita': {
    id: 'armorvita',
    name: 'ArmorVita',
    tagline: 'D3 + K2 + Boron + Astaxanthin — testosterone-adjacent foundation',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'hormones',
  },
  'neurobridge': {
    id: 'neurobridge',
    name: 'NeuroBridge',
    tagline: 'Methylated B-complex — neurotransmitter + methylation support',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
  },
  'mitovita': {
    id: 'mitovita',
    name: 'MitoVita',
    tagline: 'Creatine + L-citrulline + beetroot + electrolytes (four-pillar)',
    memberPriceUSD: 59,
    retailPriceUSD: 79,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'In development — Q4 2026',
    solutionSlug: 'erectile-dysfunction',
  },

  // ========== Service SKUs ==========
  'comprehensive-consult': {
    id: 'comprehensive-consult',
    name: 'Comprehensive 4M Consult',
    tagline: 'Full lab review, hormone panel, personalized protocol via licensed telemedicine partner',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Consult opening soon — get notified at /consult',
    solutionSlug: 'consult',
  },

  // ========== Membership tier subscriptions ==========
  'insider': {
    id: 'insider',
    name: 'Insider Membership',
    tagline: 'Member pricing on OTC supplements, weekly group coaching with Dr. TJ',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing TBD',
    solutionSlug: 'membership',
  },
  'insider-plus': {
    id: 'insider-plus',
    name: 'Insider Plus',
    tagline: 'Insider + monthly 1:1 coaching + premium content + 15% off',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing TBD',
    solutionSlug: 'membership',
  },
  'insider-concierge': {
    id: 'insider-concierge',
    name: 'Insider Concierge',
    tagline: 'Bi-weekly 1:1 with Dr. TJ, bespoke protocol, 20% off all products',
    memberPriceUSD: null,
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing TBD',
    solutionSlug: 'membership',
  },
};

export function getSKU(id: string): SKU | null {
  return SKUS[id] ?? null;
}
