// Product-aware wording. GLP-1 lane ('glp1') orders carry skuId glp1-sema | glp1-tirzep | glp1-reta.
export const GLP1_NAMES: Record<string, string> = {
  'glp1-sema': 'GLP-1 · Sema',
  'glp1-tirzep': 'GLP-2 · Tirzep',
  'glp1-reta': 'GLP-3 · Reta',
};

export const isGlp1 = (lane?: string, skuId?: string): boolean => lane === 'glp1' || !!skuId?.startsWith('glp1-');

/** Display name for a GLP-1 sku, or the generic "GLP-1 order" when unknown. */
export const glp1Name = (skuId?: string): string => (skuId && GLP1_NAMES[skuId]) || 'GLP-1';
