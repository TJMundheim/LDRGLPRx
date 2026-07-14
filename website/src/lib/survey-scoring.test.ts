import { describe, it, expect } from 'vitest';
import { scoreToTop3, BONUS_MAP } from './survey-scoring';
import { AUDIT_QUESTIONS } from '../data/audit-questions';

const ORDER = AUDIT_QUESTIONS.map((q) => q.id);

const zeroes = (): Record<string, number> =>
  Object.fromEntries(ORDER.map((c) => [c, 0]));

describe('BONUS_MAP', () => {
  it('matches the 2026-07-13 rule: gut +3, weight +2 (plus slug aliases)', () => {
    expect(BONUS_MAP).toEqual({
      gut: 3, 'gut-microbiome': 3, weight: 2, 'weight-body-fat': 2,
    });
  });
});

describe('scoreToTop3 (20-question rules, 2026-07-13)', () => {
  it('returns exactly 3 ids', () => {
    const s = zeroes();
    s.sleep = 5;
    s.cognitive = 4;
    s.nutrition = 3;
    expect(scoreToTop3(s, ORDER)).toHaveLength(3);
  });

  it('sorts by raw score descending when no bonus categories present', () => {
    const s = zeroes();
    s.sleep = 5;
    s.cognitive = 4;
    s.nutrition = 3;
    s.environment = 2;
    expect(scoreToTop3(s, ORDER)).toEqual(['sleep', 'cognitive', 'nutrition']);
  });

  it('applies gut +3 and weight +2 before ranking', () => {
    const s = zeroes();
    s['gut-microbiome'] = 3;   // 3 + 3 = 6
    s['weight-body-fat'] = 4;  // 4 + 2 = 6
    s.cognitive = 5;           // 5 + 0 = 5
    const top3 = scoreToTop3(s, ORDER);
    expect(top3.slice(0, 2)).toEqual(['weight-body-fat', 'gut-microbiome']); // question order breaks the 6-6 tie
    expect(top3[2]).toBe('cognitive');
  });

  it('forfeits the bonus when the raw score is 0 — a zero stays a zero', () => {
    const s = zeroes();
    s.sleep = 1;
    s.mood = 1;
    s.alcohol = 1;
    // gut-microbiome stays 0 despite its +3 bonus
    expect(scoreToTop3(s, ORDER)).not.toContain('gut-microbiome');
  });

  it('never ranks the already-diagnosed flag', () => {
    const s = zeroes();
    s['already-diagnosed'] = 5; // flag transmitted as 5 for downstream compat
    s.sleep = 4;
    s.cognitive = 3;
    s.nutrition = 2;
    const top3 = scoreToTop3(s, ORDER);
    expect(top3).toEqual(['sleep', 'cognitive', 'nutrition']);
  });

  it('breaks ties by question order (pillar order embedded)', () => {
    const s = zeroes();
    s.mood = 4;              // Mind #4
    s['pain-injury'] = 4;    // Muscle #10
    s.environment = 4;       // Mitigate #19
    s['purpose-accountability'] = 4; // Motivate #20
    expect(scoreToTop3(s, ORDER)).toEqual(['mood', 'pain-injury', 'environment']);
  });

  it('realistic full 20-item input steers toward gut at equal severity', () => {
    const s = zeroes();
    s.cognitive = 3;
    s.sleep = 4;
    s.mood = 2;
    s['movement-strength'] = 3;
    s['weight-body-fat'] = 3;  // 3+2 = 5
    s['gut-microbiome'] = 3;   // 3+3 = 6
    s['hormone-balance'] = 4;  // 4
    s.alcohol = 2;
    expect(scoreToTop3(s, ORDER)).toEqual(['gut-microbiome', 'weight-body-fat', 'sleep']);
  });
});
