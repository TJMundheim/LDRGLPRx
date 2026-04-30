/**
 * selectTop3 — pure function.
 * Sorts 20 categories by score desc, takes top 3.
 * Tie-breaker: if a priorityTier category is tied with the lowest score in top-3
 * AND is sitting at position 4+, swap it in (replacing the lowest non-priority tied category).
 * Returns exactly 3 category ids.
 */

export interface ScoredCategory {
  id: string;
  score: number;
  priorityTier: boolean;
}

export function selectTop3(categories: ScoredCategory[]): string[] {
  if (categories.length === 0) return [];

  // Sort descending by score
  const sorted = [...categories].sort((a, b) => b.score - a.score);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const lowestTop3Score = top3[2]?.score ?? 0;

  // Find priority-tier categories in 4+ that are tied with lowestTop3Score
  const tiedPriority = rest.filter(
    c => c.priorityTier && c.score === lowestTop3Score
  );

  if (tiedPriority.length > 0) {
    // Count how many priority-tier are already in top3
    const priorityAlreadyIn = top3.filter(c => c.priorityTier).length;
    // Only do one swap (avoid double-swap when 2 priority-tier already in top-3)
    if (priorityAlreadyIn < 2) {
      // Find the lowest non-priority tied item in top-3 to swap out
      const swapOutIdx = [...top3]
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => !c.priorityTier && c.score === lowestTop3Score)
        .pop();

      if (swapOutIdx !== undefined) {
        top3.splice(swapOutIdx.i, 1, tiedPriority[0]);
      }
    }
  }

  return top3.slice(0, 3).map(c => c.id);
}
