// Treatment lanes offered at consent time. Customer-facing labels only —
// never an ingredient or formula name (Biome NS Rx, not its actives).
// Keep this file identical to lambdas/consent-sign/src/lanes.ts; Lambdas do
// not import from each other.
export interface Lane {
  slug: string;
  label: string;
  defaultPriceCents: number;
}

export const LANES: Lane[] = [
  { slug: 'leaky-gut', label: 'Biome NS Rx', defaultPriceCents: 12500 },
  { slug: 'weight-loss', label: 'GLP-1 program', defaultPriceCents: 0 },
  { slug: 'gh-peptide', label: 'Tesamorelin program', defaultPriceCents: 0 },
  { slug: 'testosterone-ed', label: 'Testosterone program', defaultPriceCents: 0 },
  { slug: 'menopause-hrt', label: 'Menopause & HRT program', defaultPriceCents: 0 },
];

export function findLane(slug?: string | null): Lane | undefined {
  if (!slug) return undefined;
  return LANES.filter((l) => l.slug === slug)[0];
}

/** "$125" for 12500; "$99.50" when there are cents. Empty string for 0/unset. */
export function formatPrice(priceCents?: number | null): string {
  if (typeof priceCents !== 'number' || !Number.isFinite(priceCents) || priceCents <= 0) return '';
  const dollars = priceCents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}
