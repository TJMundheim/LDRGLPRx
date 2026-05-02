/**
 * Product catalog types for the LDRGLPRx client portal.
 * Companion to schema.ts — no logic, pure type definitions.
 */

export type ProductCategory =
  | 'rx'
  | 'supplement'
  | 'peptide'
  | 'lab'
  | 'service'
  | 'membership'
  | 'protocol-bundle';

export interface PricingModel {
  type: 'one-time' | 'subscription' | 'cycle' | 'per-administration';
  retailUSD: number;
  memberUSD?: number;
  bundlePricing?: { quantity: number; totalUSD: number; label: string }[];
  cogsNote?: string;
}

export interface TierAvailability {
  foundation: 'included' | 'discounted' | 'addon' | 'na';
  optimization: 'included' | 'discounted' | 'addon' | 'na';
  longevity: 'included' | 'discounted' | 'addon' | 'na';
  concierge: 'included' | 'discounted' | 'addon' | 'na';
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  category: ProductCategory;
  tagline: string;
  description: string;
  longDescription?: string;
  heroClaim?: string;
  mechanismBullets: string[];
  indications: string[];
  administrationRoutes?: string[];
  protocol?: {
    duration: string;
    cycle?: string;
    cadence?: string;
  };
  pricing: PricingModel;
  requiresRx: boolean;
  fulfilledBy?: string;
  tierAvailability: TierAvailability;
  triggersFromIntake?: string[];
  tags: string[];
}

export interface LabPanel extends Omit<Product, 'category'> {
  category: 'lab';
  tests: string[];
  vendor?: string;
}

export interface MembershipTier {
  id: string;
  name: string;
  tagline: string;
  monthlyUSD?: number;
  annualUSD?: number;
  onboardingFeeUSD?: number;
  /** For program entry / one-time tiers; undefined for subscription tiers. */
  oneTimePriceUSD?: number;
  /** Distinguishes ongoing membership tiers from program entry tiers (Protégé/Insider). */
  kind?: 'membership' | 'program';
  includedProductSlugs: string[];
  features: string[];
  description: string;
  idealFor: string[];
}
