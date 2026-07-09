/**
 * audit-solutions.ts — Shared OTC + Rx recommendation map per assessment category.
 *
 * Imported by both /audit.astro and /assessment.astro so SOLUTIONS stays DRY.
 * Locked 2026-05-25.
 */

export type RxOption = {
  name: string;
  tagline: string;
  /** Default (highlighted) consult SKU. $199 for non-T, $249 for T. */
  skuId: string;
  /** Optional "I have recent labs" downgrade. Omitted for testosterone — labs are mandatory there. */
  basicSkuId?: string;
};

export type SolutionRow = {
  otc: { skuId: string; name: string; tagline: string } | null;
  rx: RxOption | null;
};

// All non-testosterone Rx categories default to consult-comprehensive ($199, includes
// wellness lab + full hormone panel). The $99 consult-basic is available as a "recent labs
// in hand" downgrade. Hormones is the only category with no $99 option — labs are mandatory.
export const SOLUTIONS: Record<string, SolutionRow> = {
  gut: {
    otc: { skuId: 'biome-ns-ultra-sub', name: 'Biome NS Ultra', tagline: 'Daily gut-brain seal powder — L-glutamine, DGL, berberine, aloe, curcumin, zinc carnosine. The foundational starting protocol.' },
    rx: { skuId: 'consult-comprehensive', basicSkuId: 'consult-basic', name: 'Biome NS Rx — proprietary compounded prescription', tagline: 'Our proprietary deeper-repair Rx, compounded and written by your physician to your specific needs. Unique to My4MLife — you won\'t find this formulation anywhere else. Stacks on top of Biome NS Ultra. Prescribed via our telemedicine partner.' },
  },
  sleep: {
    otc: { skuId: 'sleeprestore-sub', name: 'SleepRestore', tagline: 'Magnesium bisglycinate + glycine + apigenin + L-theanine + KSM-66 ashwagandha. Sleep architecture + cortisol + nocturnal CV protection.' },
    rx: { skuId: 'consult-comprehensive', basicSkuId: 'consult-basic', name: 'SleepRestore Rx (oral nattokinase)', tagline: 'Compounded oral nattokinase prescribed via telemedicine consult — nocturnal cardiovascular fibrinolytic for the highest-risk hours.' },
  },
  weight: {
    otc: null,
    rx: { skuId: 'consult-comprehensive', basicSkuId: 'consult-basic', name: 'Weight-loss consult — GLP-1 candidacy', tagline: 'Telemedicine consult to evaluate GLP-1 candidacy (semaglutide/tirzepatide) plus the full metabolic protocol. The first move on weight is the clinical conversation.' },
  },
  nutrition: {
    otc: null,
    rx: { skuId: 'consult-comprehensive', basicSkuId: 'consult-basic', name: 'Nutrition consult', tagline: 'Telemedicine consult to map your nutrition protocol against your hormones, gut, and metabolic markers.' },
  },
  'erectile-dysfunction': {
    otc: { skuId: 'mitovita-sub', name: 'MitoVita', tagline: 'Creatine + L-citrulline + beetroot + electrolytes. Mitochondrial ATP + endothelial nitric oxide — the OTC foundation for ED and stamina.' },
    rx: { skuId: 'consult-comprehensive', basicSkuId: 'consult-basic', name: 'ED consult — PDE5i + hormonal review', tagline: 'ED is a canary. Telemedicine consult to evaluate hormones, vascular health, and PDE5-inhibitor or TRT candidacy.' },
  },
  environment: {
    otc: null,
    rx: null,
  },
  cognitive: {
    otc: { skuId: 'neurobridge-sub', name: 'NeuroBridge', tagline: 'Methylated B-complex (P-5-P, methylcobalamin, 5-MTHF) — homocysteine + methylation foundation for cognitive longevity.' },
    rx: { skuId: 'consult-comprehensive', basicSkuId: 'consult-basic', name: 'Cognitive consult', tagline: 'Telemedicine consult for cognitive baseline, peptide candidacy, and hormone-cognition integration.' },
  },
  hormones: {
    otc: null,
    // Testosterone-specific consult; no basicSkuId — labs are mandatory for any TRT script.
    rx: { skuId: 'consult-hormone', name: 'Testosterone consult — TRT candidacy', tagline: 'Telemedicine TRT consult + mandatory hormone panel labs. Required for any testosterone prescription.' },
  },
  'regenerative-medicine': {
    otc: null,
    rx: {
      skuId: 'consult-comprehensive',
      basicSkuId: 'consult-basic',
      name: 'Regenerative-medicine consult',
      tagline: 'Telemedicine consult to evaluate regenerative-medicine candidacy (stem cell, exosome, peptide protocols). Most treatments require an in-office visit with one of our network physicians.',
    },
  },
  'substance-use': {
    otc: null,
    rx: {
      skuId: 'consult-comprehensive',
      basicSkuId: 'consult-basic',
      name: 'Substance-use consult',
      tagline: 'Telemedicine consult to evaluate alcohol or substance-related risk and plan a reduction or cessation protocol with medical support.',
    },
  },
};
