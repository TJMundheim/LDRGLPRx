/**
 * Top-3 ranking for the 20-question MindSpan assessment (2026-07-13).
 *
 * Rules (TJ 2026-07-13, superseding the 2026-06-01 rules):
 *   - 'already-diagnosed' is a Yes/No FLAG, never ranked — it routes to the
 *     regenerative-medicine path outside the top-3.
 *   - gut-microbiome +3, weight-body-fat +2 bonus — forfeited when the raw
 *     score is 0 (a zero stays a zero; the bonus never lifts an unmarked
 *     category).
 *   - Ties break by question order (pillar order Mind → Muscle → Mitigate →
 *     Motivate is embedded in the item order).
 */
export const BONUS_MAP: Record<string, number> = {
  gut: 3,
  'gut-microbiome': 3,
  weight: 2,
  'weight-body-fat': 2,
};

const FLAG_IDS = new Set(['already-diagnosed']);

/**
 * Rank raw scores and return the top-3 ids.
 * @param rawScores  { [id]: 0-5 }
 * @param order      optional canonical id order for tie-breaking (question
 *                   order). Ids not in the list sort after listed ones;
 *                   with no list, ties break alphabetically.
 */
export function scoreToTop3(rawScores: Record<string, number>, order?: string[]): string[] {
  const orderIndex = (id: string): number => {
    if (!order) return 0;
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  return Object.keys(rawScores)
    .filter((id) => !FLAG_IDS.has(id))
    .map((id) => {
      const raw = rawScores[id] ?? 0;
      const bonus = raw > 0 ? BONUS_MAP[id] ?? 0 : 0;
      return { id, total: raw + bonus };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      const oi = orderIndex(a.id) - orderIndex(b.id);
      if (oi !== 0) return oi;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 3)
    .map((e) => e.id);
}
