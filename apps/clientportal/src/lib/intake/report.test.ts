import { describe, it, expect } from 'vitest';
import { buildIntakeReport } from './report.js';
import type { IntakeResult } from '../data/intake.js';
import type { Product, LabPanel, MembershipTier } from '../data/catalog.js';

// ─── Minimal stubs ────────────────────────────────────────────────────────────

const stubProduct = (slug: string, price = 99): Product => ({
  id: slug, slug, name: slug, category: 'supplement',
  tagline: '', description: '', mechanismBullets: [], indications: [],
  pricing: { type: 'one-time', retailUSD: price },
  requiresRx: false,
  tierAvailability: { foundation: 'addon', optimization: 'addon', longevity: 'addon', concierge: 'addon' },
  tags: [],
});

const stubLab = (slug: string, price = 50): LabPanel => ({
  id: slug, slug, name: slug, category: 'lab',
  tagline: '', description: '', mechanismBullets: [], indications: [],
  pricing: { type: 'one-time', retailUSD: price },
  requiresRx: false,
  tierAvailability: { foundation: 'addon', optimization: 'addon', longevity: 'addon', concierge: 'addon' },
  tags: [],
  tests: [],
});

const stubTier = (id: string, includedSlugs: string[] = []): MembershipTier => ({
  id, name: id, tagline: '', includedProductSlugs: includedSlugs,
  features: [], description: '', idealFor: [],
});

const foundationResult: IntakeResult = {
  triggeredProducts: [{ slug: 'biomeaxisforge', reasons: ['gut'] }],
  triggeredLabs: [{ slug: 'lab-foundation', reasons: ['baseline'] }],
  recommendedTier: 'foundation',
  tierRationale: '1 domain — foundation',
  clinicianFlags: [],
  topPriorities: [{ domain: 'gut', severity: 2 }],
  summary: 'Good baseline.',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildIntakeReport', () => {

  it('recommended tier flows through to report.recommendedTier', () => {
    const products = [stubProduct('biomeaxisforge')];
    const labs = [stubLab('lab-foundation')];
    const tiers = [stubTier('foundation')];
    const report = buildIntakeReport(foundationResult, products, labs, tiers);
    expect(report.recommendedTier?.id).toBe('foundation');
  });

  it('foundation tier: estimated cart total = onboarding (499) + lab price', () => {
    // Foundation with isMember=true (tier matched). includedSlugs empty → add biomeaxisforge price too.
    // isMember logic: recommendedTier !== 'foundation' || tier !== null
    // tier !== null because 'foundation' tier exists in tiers array.
    const products = [stubProduct('biomeaxisforge', 249)];
    const labs = [stubLab('lab-foundation', 75)];
    const tiers = [stubTier('foundation')];
    const report = buildIntakeReport(foundationResult, products, labs, tiers);
    // isMember=true → 499 onboarding + biomeaxisforge (not in includedSlugs) = 499+249 + lab 75 = 823
    expect(report.suggestedCart.estimatedTotalUSD).toBe(499 + 249 + 75);
  });

  it('clinician flags appear in report when router sets them', () => {
    const resultWithFlag: IntakeResult = {
      ...foundationResult,
      clinicianFlags: [{ questionId: 'mh_suicidal_ideation', reason: 'Safety screen positive' }],
    };
    const report = buildIntakeReport(resultWithFlag, [], [], []);
    expect(report.clinicianFlags).toHaveLength(1);
    expect(report.clinicianFlags[0].questionId).toBe('mh_suicidal_ideation');
    expect(report.ctaPath).toBe('/consult');
  });

});
