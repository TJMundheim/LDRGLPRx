// Push Patch blend catalog. SOURCE OF TRUTH: lambdas/_shared/order-handler-core/src/push-patch-notify.ts
// (itself a copy of website/src/data/pushPatch.ts). order-handler-core exports no catalog and is not a
// dependency of this package, so the 7 entries are duplicated here — keep in sync.
export const BLENDS: Record<string, { name: string; formula: string }> = {
  'push-patch-nad-ghk': { name: 'NAD+ Restore', formula: 'NAD+ 1300 mg / GHK-Cu 5 mg' },
  'push-patch-bpc-nad-ghk': { name: 'Repair', formula: 'BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg' },
  'push-patch-kpv-nad-ghk': { name: 'Calm Gut', formula: 'KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg' },
  'push-patch-nad-motsc-ghk': { name: 'Metabolic', formula: 'NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg' },
  'push-patch-enhanced-glow': { name: 'Enhanced Glow', formula: 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg' },
  'push-patch-wolverine': { name: 'Wolverine', formula: 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg' },
  'push-patch-glutathione-ghk': { name: 'Glutathione Radiance', formula: 'Glutathione 500 mg / GHK-Cu 5 mg' },
};

export const blendFor = (sku: string): { name: string; formula: string } =>
  BLENDS[sku] ?? { name: sku || 'Unknown blend', formula: '(unknown — check Stripe)' };

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
