export const BONUS_MAP: Record<string, number> = { gut: 2, weight: 1, hormones: 1 };

export function scoreToTop3(rawScores: Record<string, number>): string[] {
  return Object.keys(rawScores)
    .map((id) => {
      const bonus = BONUS_MAP[id] ?? 0;
      return { id, total: rawScores[id] + bonus, bonus };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.bonus !== a.bonus) return b.bonus - a.bonus;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 3)
    .map((e) => e.id);
}
