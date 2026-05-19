/**
 * skus.ts — My4MLife product SKU catalog.
 *
 * Locked 2026-05-12, restructured 2026-05-18.
 *
 * Each subscription-default supplement now has TWO purchase variants:
 *   - <product>-sub  — monthly autoship subscription (recurring)
 *   - <product>-90d  — 90-day one-time bundle (3-bottle pack)
 *
 * Pricing model (locked 2026-05-18 — see project_membership_active_member_spec.md):
 *   - First-ever purchase 90-day bundle: 20% off retail
 *   - First-ever purchase anything else: 15% off retail
 *   - Active subscriber, any future purchase: 15% off retail
 *   - Repeat one-time buyer, no active subscription: full retail
 *
 * Stripe wiring: `stripePriceId` will be filled when Stripe products are created.
 */

export interface SKU {
  /** URL-safe ID used in /cart?sku=<id> */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short marketing tagline */
  tagline: string;
  /** Retail price in USD (full retail — what someone pays with no discounts). null if pricing not finalized. */
  retailPriceUSD: number | null;
  /** Subscription cadence — 'one-time', 'monthly', 'annual', or null */
  cadence: 'one-time' | 'monthly' | 'annual' | null;
  /** Stripe Price ID (live), filled after Stripe setup */
  stripePriceId: string | null;
  /** Whether the product is purchasable today */
  available: boolean;
  /** Friendly "available date" if not available */
  availableNote?: string;
  /** Solution-page slug this SKU primarily belongs to */
  solutionSlug: string;
  /** SKU variant kind — drives discount logic + cart UX */
  variant: 'subscription' | 'ninety-day-bundle' | 'one-time' | 'service' | 'membership-tier';
  /** Quantity served by this SKU (e.g., '30-day supply', '90-day supply', 'single consult') */
  servingDescription?: string;
}

export const SKUS: Record<string, SKU> = {
  // ========== Biome NS Ultra ==========
  'biome-ns-ultra-sub': {
    id: 'biome-ns-ultra-sub',
    name: 'Biome NS Ultra — Monthly Autoship',
    tagline: 'L-Glutamine + DGL + Berberine + Aloe + Curcumin + Zinc Carnosine — gut-brain seal',
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'gut',
    variant: 'subscription',
    servingDescription: '30-day supply, ships monthly',
  },
  'biome-ns-ultra-90d': {
    id: 'biome-ns-ultra-90d',
    name: 'Biome NS Ultra — 90-Day Starter Bundle',
    tagline: '3-month supply of the gut-brain seal protocol — no auto-renewal',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'gut',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (3 containers), one-time purchase',
  },

  // ========== NeuroBridge ==========
  'neurobridge-sub': {
    id: 'neurobridge-sub',
    name: 'NeuroBridge — Monthly Autoship',
    tagline: 'Methylated B-complex — neurotransmitter + methylation support',
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
    variant: 'subscription',
    servingDescription: '30-day supply, ships monthly',
  },
  'neurobridge-90d': {
    id: 'neurobridge-90d',
    name: 'NeuroBridge — 90-Day Starter Bundle',
    tagline: '3-month supply of the methylated B-complex — no auto-renewal',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (3 bottles), one-time purchase',
  },

  // ========== SleepRestore ==========
  'sleeprestore-sub': {
    id: 'sleeprestore-sub',
    name: 'SleepRestore — Monthly Autoship',
    tagline: 'Mg + Glycine + Apigenin + L-Theanine + KSM-66 + Zinc + B6 + Vit E',
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'sleep',
    variant: 'subscription',
    servingDescription: '30-day supply, ships monthly',
  },
  'sleeprestore-90d': {
    id: 'sleeprestore-90d',
    name: 'SleepRestore — 90-Day Starter Bundle',
    tagline: '3-month supply of the deep-sleep + nocturnal cardiovascular stack',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'sleep',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (3 bottles), one-time purchase',
  },

  // ========== ArmorVita ==========
  'armorvita-sub': {
    id: 'armorvita-sub',
    name: 'ArmorVita — Monthly Autoship',
    tagline: 'D3 + K2 + Boron + Astaxanthin — testosterone-adjacent foundation',
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'hormones',
    variant: 'subscription',
    servingDescription: '30-day supply, ships monthly',
  },
  'armorvita-90d': {
    id: 'armorvita-90d',
    name: 'ArmorVita — 90-Day Starter Bundle',
    tagline: '3-month supply of the fat-soluble vitamin + boron foundation',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'hormones',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (3 bottles), one-time purchase',
  },

  // ========== MitoVita ==========
  'mitovita-sub': {
    id: 'mitovita-sub',
    name: 'MitoVita — Monthly Autoship',
    tagline: 'Creatine + L-citrulline + beetroot + electrolytes + selenium',
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'In development — Q4 2026',
    solutionSlug: 'erectile-dysfunction',
    variant: 'subscription',
    servingDescription: '30-day supply, ships monthly',
  },
  'mitovita-90d': {
    id: 'mitovita-90d',
    name: 'MitoVita — 90-Day Starter Bundle',
    tagline: '3-month supply of the mitochondrial + endothelial NO four-pillar stack',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'In development — Q4 2026',
    solutionSlug: 'erectile-dysfunction',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (3 containers), one-time purchase',
  },

  // ========== OmegaCN Prime ==========
  'omegacn-prime-sub': {
    id: 'omegacn-prime-sub',
    name: 'OmegaCN Prime — Monthly Autoship',
    tagline: 'Omega-3 (EPA 1200 + DHA 800) + Ubiquinol CoQ10 200mg — Cardio Neuro foundation',
    retailPriceUSD: null,
    cadence: 'monthly',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
    variant: 'subscription',
    servingDescription: '30-day supply (60 softgels), ships monthly',
  },
  'omegacn-prime-90d': {
    id: 'omegacn-prime-90d',
    name: 'OmegaCN Prime — 90-Day Starter Bundle',
    tagline: '3-month supply of the omega-3 + ubiquinol CoQ10 foundational fat-soluble stack',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (180 softgels), one-time purchase',
  },

  // ========== Service SKUs ==========
  'comprehensive-consult': {
    id: 'comprehensive-consult',
    name: 'Comprehensive 4M Consult',
    tagline: 'Full lab review, hormone panel, personalized protocol via licensed telemedicine partner — includes lifetime app access',
    retailPriceUSD: null,
    cadence: 'one-time',
    stripePriceId: null,
    available: false,
    availableNote: 'Consult opening soon — get notified at /consult',
    solutionSlug: 'consult',
    variant: 'service',
    servingDescription: 'Single comprehensive consult + lifetime app access',
  },
};

export function getSKU(id: string): SKU | null {
  return SKUS[id] ?? null;
}

/**
 * Discount calculation — single source of truth.
 *
 * Locked 2026-05-18:
 *   - First-ever purchase + 90-day bundle  → 20% off
 *   - First-ever purchase OR active subscriber → 15% off
 *   - Otherwise → 0% (full retail)
 *
 * Never stacks. Always one of: 0%, 15%, 20%.
 */
export function computeDiscountPercent(opts: {
  sku: SKU;
  isFirstPurchase: boolean;
  hasActiveSubscription: boolean;
}): number {
  const { sku, isFirstPurchase, hasActiveSubscription } = opts;
  if (isFirstPurchase && sku.variant === 'ninety-day-bundle') return 20;
  if (isFirstPurchase || hasActiveSubscription) return 15;
  return 0;
}
