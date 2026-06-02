/**
 * Scoring rules locked 2026-06-01 (revised mid-assessment):
 *   - already-diagnosed >= 3 → automatic #1 (override)
 *   - already-diagnosed 0/1/2 → ranked normally with raw score, no bonus
 *   - gut and weight get +2 bonus
 *   - others use raw score only
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
  if (diagScore >= 3) {
    const others = Object.keys(rawScores)
      .filter((id) => id !== diagId)
      .map((id) => ({ id, total: rawScores[id] + (BONUS_MAP[id] ?? 0), bonus: BONUS_MAP[id] ?? 0 }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.bonus !== a.bonus) return b.bonus - a.bonus;
        return a.id.localeCompare(b.id);
      });
    return [diagId, ...others.slice(0, 2).map((e) => e.id)];
  }
  // Diagnosis 0/1/2: rank alongside everything else with raw + bonus.
  return Object.keys(rawScores)
    .map((id) => ({ id, total: rawScores[id] + (BONUS_MAP[id] ?? 0), bonus: BONUS_MAP[id] ?? 0 }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.bonus !== a.bonus) return b.bonus - a.bonus;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 3)
    .map((e) => e.id);
}
