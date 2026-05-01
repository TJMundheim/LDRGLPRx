import { describe, it, expect } from 'vitest';
import { selectTop3 } from './selectTop3';
import type { ScoredCategory } from './selectTop3';

function cat(id: string, score: number, priorityTier = false): ScoredCategory {
  return { id, score, priorityTier };
}

describe('selectTop3', () => {
  it('(a) no ties — returns top 3 by score', () => {
    const cats: ScoredCategory[] = [
      cat('a', 8), cat('b', 6), cat('c', 9), cat('d', 4), cat('e', 2),
      ...Array.from({ length: 15 }, (_, i) => cat(`x${i}`, 1)),
    ];
    const result = selectTop3(cats);
    expect(result).toHaveLength(3);
    expect(result).toContain('c'); // 9
    expect(result).toContain('a'); // 8
    expect(result).toContain('b'); // 6
  });

  it('(b) tie at boundary — priority-tier in 4th swapped in', () => {
    const cats: ScoredCategory[] = [
      cat('top1', 9),
      cat('top2', 8),
      cat('top3-nonpriority', 5, false), // 3rd place, non-priority, score 5
      cat('gut-microbiome', 5, true),     // 4th place, priority, same score → swap in
      ...Array.from({ length: 16 }, (_, i) => cat(`x${i}`, 1)),
    ];
    const result = selectTop3(cats);
    expect(result).toHaveLength(3);
    expect(result).toContain('gut-microbiome');
    expect(result).not.toContain('top3-nonpriority');
  });

  it('(c) all priority-tier scored 0 — no forced insert', () => {
    const cats: ScoredCategory[] = [
      cat('a', 7),
      cat('b', 6),
      cat('c', 5),
      cat('gut-microbiome', 0, true),
      cat('weight-body-fat', 0, true),
      cat('hormone-balance', 0, true),
      ...Array.from({ length: 14 }, (_, i) => cat(`x${i}`, 1)),
    ];
    const result = selectTop3(cats);
    expect(result).toHaveLength(3);
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
    expect(result).not.toContain('gut-microbiome');
    expect(result).not.toContain('weight-body-fat');
    expect(result).not.toContain('hormone-balance');
  });

  it('(d) 2 priority-tier already in top-3 — no double swap', () => {
    const cats: ScoredCategory[] = [
      cat('gut-microbiome', 9, true),
      cat('weight-body-fat', 8, true),
      cat('non-priority-3rd', 5, false),     // 3rd, non-priority, score 5
      cat('hormone-balance', 5, true),        // 4th, priority, tied at 5
      ...Array.from({ length: 16 }, (_, i) => cat(`x${i}`, 1)),
    ];
    const result = selectTop3(cats);
    expect(result).toHaveLength(3);
    // 2 priority already in top-3 → no swap; non-priority-3rd stays
    expect(result).toContain('gut-microbiome');
    expect(result).toContain('weight-body-fat');
    expect(result).toContain('non-priority-3rd');
    expect(result).not.toContain('hormone-balance');
  });

  it('(e) all 20 categories scored equally — priority-tier wins top 3', () => {
    // gut-microbiome, weight-body-fat, hormone-balance are the 3 priority-tier ids.
    // All categories share the same score, so tie-breaker must promote them.
    const priorityIds = ['gut-microbiome', 'weight-body-fat', 'hormone-balance'];
    const nonPriorityIds = Array.from({ length: 17 }, (_, i) => `non-priority-${i}`);
    const allIds = [...priorityIds, ...nonPriorityIds];
    const cats: ScoredCategory[] = allIds.map((id) =>
      cat(id, 5, priorityIds.includes(id))
    );
    const result = selectTop3(cats);
    expect(result).toHaveLength(3);
    expect(result).toContain('gut-microbiome');
    expect(result).toContain('weight-body-fat');
    expect(result).toContain('hormone-balance');
    // No non-priority should appear when all 3 priority slots are filled
    for (const id of nonPriorityIds) {
      expect(result).not.toContain(id);
    }
  });
});
