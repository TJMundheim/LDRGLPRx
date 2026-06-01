/**
 * Scoring rules locked 2026-06-01:
 *   - already-diagnosed > 0 → automatic #1 (override)
 *   - already-diagnosed = 0 → excluded from top-3
 *   - gut and weight get +2 bonus
 *   - others use raw score only
 *
 * NOTE: id naming here mixes 'gut' / 'weight' / 'hormones' (legacy short
 * forms) with the canonical ids used elsewhere. Kept for back-compat with
 * any caller; the canonical scoring lives in assessment.astro's selectTop3
 * and apps/clientportal/src/lib/renderer.ts's selectTop3.
 */
export const BONUS_MAP: Record<string, number> = {
  gut: 2,
  'gut-microbiome': 2,
  weight: 2,
  'weight-body-fat': 2,
};

export function scoreToTop3(rawScores: Record<string, number>): string[] {
  const diagId = 'already-diagnosed';
  const diagScore = rawScores[diagId] ?? 0;
  const others = Object.keys(rawScores)
    .filter((id) => id !== diagId)
    .map((id) => {
      const bonus = BONUS_MAP[id] ?? 0;
      return { id, total: rawScores[id] + bonus, bonus };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.bonus !== a.bonus) return b.bonus - a.bonus;
      return a.id.localeCompare(b.id);
    });

  if (diagScore > 0) {
    return [diagId, ...others.slice(0, 2).map((e) => e.id)];
  }
  return others.slice(0, 3).map((e) => e.id);
}
