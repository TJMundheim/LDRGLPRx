// ─────────────────────────────────────────────────────────────────────────────
// GENESIS PUSH PATCH BLENDS — single source of truth for /go/push-patch.
// Source of record: docs/plan/push-patch-2026-09-30.md (locked 2026-09-30).
//
// Each blend is a 6-patch, 6-week transdermal delivery via iontophoresis.
// Wear: 12-hour only (TJ decision 2026-09-30).
// ─────────────────────────────────────────────────────────────────────────────

export type PushPatchBlend = {
  skuId: string;
  name: string;
  formula: string;
  ingredients: string[];
  priceUsd: number;
  hasNad: boolean;
  patches: 6;
  weeks: 6;
};

export const PUSH_PATCH_BLENDS: PushPatchBlend[] = [
  {
    skuId: 'push-patch-nad-ghk',
    name: 'NAD+ Restore',
    formula: 'NAD+ 1300 mg / GHK-Cu 5 mg',
    ingredients: ['NAD+ 1300 mg', 'GHK-Cu 5 mg'],
    priceUsd: 650,
    hasNad: true,
    patches: 6,
    weeks: 6,
  },
  {
    skuId: 'push-patch-bpc-nad-ghk',
    name: 'Repair',
    formula: 'BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg',
    ingredients: ['BPC-157 2000 mcg', 'NAD+ 250 mg', 'GHK-Cu 5 mg'],
    priceUsd: 650,
    hasNad: true,
    patches: 6,
    weeks: 6,
  },
  {
    skuId: 'push-patch-kpv-nad-ghk',
    name: 'Calm Gut',
    formula: 'KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg',
    ingredients: ['KPV 10 mg', 'NAD+ 250 mg', 'GHK-Cu 5 mg'],
    priceUsd: 650,
    hasNad: true,
    patches: 6,
    weeks: 6,
  },
  {
    skuId: 'push-patch-nad-motsc-ghk',
    name: 'Metabolic',
    formula: 'NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg',
    ingredients: ['NAD+ 1300 mg', 'MOTS-c 5 mg', 'GHK-Cu 5 mg'],
    priceUsd: 650,
    hasNad: true,
    patches: 6,
    weeks: 6,
  },
  {
    skuId: 'push-patch-enhanced-glow',
    name: 'Advanced Glow',
    formula: 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg',
    ingredients: ['NAD+ 250 mg', 'TB-500 2 mg', 'BPC-157 2000 mcg', 'GHK-Cu 15 mg'],
    priceUsd: 650,
    hasNad: true,
    patches: 6,
    weeks: 6,
  },
  {
    skuId: 'push-patch-wolverine',
    name: 'Wolverine',
    formula: 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg',
    ingredients: ['NAD+ 250 mg', 'TB-500 2 mg', 'BPC-157 2000 mcg', 'GHK-Cu 5 mg'],
    priceUsd: 650,
    hasNad: true,
    patches: 6,
    weeks: 6,
  },
  {
    skuId: 'push-patch-glutathione-ghk',
    name: 'Glutathione Glow',
    formula: 'Glutathione 500 mg / GHK-Cu 5 mg',
    ingredients: ['Glutathione 500 mg', 'GHK-Cu 5 mg'],
    priceUsd: 550,
    hasNad: false,
    patches: 6,
    weeks: 6,
  },
];
