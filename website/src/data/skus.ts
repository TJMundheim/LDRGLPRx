/**
 * skus.ts — My4MLife product SKU catalog.
 *
 * Locked 2026-05-12, restructured 2026-05-18.
 *
 * Each subscription-default supplement now has TWO purchase variants:
 *   - <product>-sub  — monthly subscription (recurring)
 *   - <product>-90d  — 90-day one-time bundle (3-bottle pack)
 *
 * Pricing model (updated 2026-06-09): all products priced at retail.
 * No member discount tiers pre-launch — OTC via Amazon (no discount possible),
 * Rx via pharmacy partner. See project_membership_active_member_spec.md.
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
  /** Retail price in USD. null if pricing not finalized. */
  retailPriceUSD: number | null;
  /** Subscription cadence — 'one-time', 'monthly', 'annual', or null */
  cadence: 'one-time' | 'monthly' | 'annual' | null;
  /** Stripe Price ID (LIVE mode), filled after Stripe setup */
  stripePriceId: string | null;
  /** Stripe Price ID for test mode (demo testing). When sessionStorage demo flag is set, cart uses this instead of stripePriceId. */
  stripePriceTestId: string | null;
  /** Whether the product is purchasable today */
  available: boolean;
  /** Friendly "available date" if not available */
  availableNote?: string;
  /** Solution-page slug this SKU primarily belongs to */
  solutionSlug: string;
  /** SKU variant kind — drives cart UX */
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
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
    stripePriceTestId: null,
    available: false,
    availableNote: 'Pricing announced at launch',
    solutionSlug: 'cognitive',
    variant: 'ninety-day-bundle',
    servingDescription: '90-day supply (180 softgels), one-time purchase',
  },

  // ========== Service SKUs ==========
  // Entry SKU added 2026-05-23 — $5 Fast Start Protocol. Activates Protégé app
  // access + cohort + personalized assessment report.
  'fast-start-protocol': {
    id: 'fast-start-protocol',
    name: 'Fast Start Protocol',
    tagline: 'For the man who wants to understand the system before he puts a supplement in his body. Complete Fast Start Protocol + app access + 12-week cohort + your personalized assessment report.',
    retailPriceUSD: 5,
    cadence: 'one-time',
    stripePriceId: 'price_1TbpnQBSbDAyoIVy0AyOTNlq',
    stripePriceTestId: 'price_1TaDrGBSbDAyoIVyBmFxpT9I',
    available: true,
    solutionSlug: 'fast-start',
    variant: 'service',
    servingDescription: 'Fast Start Protocol + app access + 12-week cohort + personalized assessment report',
  },
  // Path Two bundles — Fast Start + ONE foundation supplement, $99 each. Three SKUs,
  // one per foundation choice (gut / sleep / cognitive). Pending Stripe products.
  'fast-start-foundation-gut': {
    id: 'fast-start-foundation-gut',
    name: 'Fast Start + Foundation (Biome NS Ultra)',
    tagline: 'The Fast Start Protocol plus your first foundation supplement, Biome NS Ultra — the gut-brain seal that protects cognitive longevity.',
    retailPriceUSD: 99,
    cadence: 'one-time',
    stripePriceId: null,
    stripePriceTestId: null,
    available: false,
    availableNote: 'Bundle opening shortly — pending Stripe setup',
    solutionSlug: 'fast-start',
    variant: 'service',
    servingDescription: 'Fast Start Protocol + Biome NS Ultra (gut foundation) + app + cohort + personalized report',
  },
  'fast-start-foundation-sleep': {
    id: 'fast-start-foundation-sleep',
    name: 'Fast Start + Foundation (SleepRestore)',
    tagline: 'The Fast Start Protocol plus your first foundation supplement, SleepRestore — sleep architecture + cortisol regulation + nocturnal cardiovascular protection.',
    retailPriceUSD: 99,
    cadence: 'one-time',
    stripePriceId: null,
    stripePriceTestId: null,
    available: false,
    availableNote: 'Bundle opening shortly — pending Stripe setup',
    solutionSlug: 'fast-start',
    variant: 'service',
    servingDescription: 'Fast Start Protocol + SleepRestore (sleep foundation) + app + cohort + personalized report',
  },
  'fast-start-foundation-cognitive': {
    id: 'fast-start-foundation-cognitive',
    name: 'Fast Start + Foundation (NeuroBridge)',
    tagline: 'The Fast Start Protocol plus your first foundation supplement, NeuroBridge — methylated B-complex for the cognitive build.',
    retailPriceUSD: 99,
    cadence: 'one-time',
    stripePriceId: null,
    stripePriceTestId: null,
    available: false,
    availableNote: 'Bundle opening shortly — pending Stripe setup',
    solutionSlug: 'fast-start',
    variant: 'service',
    servingDescription: 'Fast Start Protocol + NeuroBridge (cognitive foundation) + app + cohort + personalized report',
  },
  // Path Three — The Stack. Fast Start + Biome NS Ultra + SleepRestore. The "smart pick."
  'fast-start-stack': {
    id: 'fast-start-stack',
    name: 'The Stack — Fast Start + Biome NS Ultra + SleepRestore',
    tagline: 'Two foundations together — Biome NS Ultra for the gut work and SleepRestore for the sleep architecture, plus the complete Fast Start Protocol on top. This is what about 70% of clinic patients start with — the gut and the sleep are the two pillars that change everything else fastest.',
    retailPriceUSD: 149,
    cadence: 'one-time',
    stripePriceId: null,
    stripePriceTestId: null,
    available: false,
    availableNote: 'Bundle opening shortly — pending Stripe setup',
    solutionSlug: 'fast-start',
    variant: 'service',
    servingDescription: 'Fast Start Protocol + Biome NS Ultra + SleepRestore + app + cohort + personalized report',
  },
  // Consult pricing locked 2026-05-20 (placeholder — final pending telemed + lab quotes):
  //   $199 = default for every non-testosterone Rx (consult + comprehensive wellness lab,
  //          full hormone panel included so testosterone deficiency surfaces opportunistically)
  //   $99  = "I have recent labs" downgrade — same consult, no lab order
  //   $249 = testosterone-specific (telemed partner charges more for T review + script)
  'consult-comprehensive': {
    id: 'consult-comprehensive',
    name: 'Comprehensive 4M Consult + Wellness Labs',
    tagline: 'Telemedicine consult + comprehensive wellness lab including a full hormone panel. The default starting point for every Rx category except testosterone.',
    retailPriceUSD: 199,
    cadence: 'one-time',
    stripePriceId: 'price_1TaDtxBSbDAyoIVyQBNUVxOH',
    stripePriceTestId: null,
    available: true,
    solutionSlug: 'consult',
    variant: 'service',
    servingDescription: 'Single consult + comprehensive wellness lab + lifetime app access',
  },
  'consult-basic': {
    id: 'consult-basic',
    name: '4M Consult (recent labs in hand)',
    tagline: 'Telemedicine consult only — bring your recent lab results (within 6 months). Skips the new lab order and saves $100.',
    retailPriceUSD: 99,
    cadence: 'one-time',
    stripePriceId: 'price_1TaEKmBSbDAyoIVyRZ3ZM1yU',
    stripePriceTestId: null,
    available: true,
    solutionSlug: 'consult',
    variant: 'service',
    servingDescription: 'Single consult + lifetime app access (lab order not included)',
  },
  'consult-hormone': {
    id: 'consult-hormone',
    name: 'Testosterone Consult + Hormone Panel',
    tagline: 'Telemedicine TRT consult + mandatory hormone panel labs (required for any testosterone prescription). Includes lifetime app access.',
    retailPriceUSD: 249,
    cadence: 'one-time',
    stripePriceId: 'price_1TaEPtBSbDAyoIVyS4CnOFNZ',
    stripePriceTestId: null,
    available: true,
    solutionSlug: 'hormones',
    variant: 'service',
    servingDescription: 'TRT consult + hormone panel + lifetime app access',
  },
  // Legacy alias — keep so any old links to ?sku=comprehensive-consult still route
  // to the new comprehensive SKU. Safe to remove after the next sweep verifies no
  // references remain across website + app + emails.
  'comprehensive-consult': {
    id: 'comprehensive-consult',
    name: 'Comprehensive 4M Consult + Wellness Labs',
    tagline: 'Telemedicine consult + comprehensive wellness lab including a full hormone panel.',
    retailPriceUSD: 199,
    cadence: 'one-time',
    stripePriceId: null,
    stripePriceTestId: null,
    available: false,
    availableNote: 'Consult opening soon — get notified at /consult',
    solutionSlug: 'consult',
    variant: 'service',
    servingDescription: 'Single consult + comprehensive wellness lab + lifetime app access',
  },
};

export function getSKU(id: string): SKU | null {
  return SKUS[id] ?? null;
}

/**
 * Discount calculation — retained for API compatibility.
 * Updated 2026-06-09: all discounts removed pre-launch. Always returns 0.
 */
export function computeDiscountPercent(opts: {
  sku: SKU;
  isFirstPurchase: boolean;
  hasActiveSubscription: boolean;
  acquisitionSku?: string;
}): number {
  return 0;
}
