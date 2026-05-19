import { describe, it, expect } from 'vitest';
import { scoreToTop3, BONUS_MAP } from './survey-scoring';

const CATS = ['gut', 'sleep', 'weight', 'nutrition', 'erectile-dysfunction', 'environment', 'cognitive', 'hormones'];

const zeroes = (): Record<string, number> =>
  Object.fromEntries(CATS.map((c) => [c, 0]));

describe('BONUS_MAP', () => {
  it('matches the 2026-05-19 escalation: gut/sleep/weight +2, ED/hormones +1', () => {
    expect(BONUS_MAP).toEqual({
      gut: 2, sleep: 2, weight: 2, 'erectile-dysfunction': 1, hormones: 1,
    });
  });
});

describe('scoreToTop3', () => {
  it('returns exactly 3 ids', () => {
    const s = zeroes();
    s.sleep = 8;
    s.cognitive = 6;
    s.nutrition = 4;
    expect(scoreToTop3(s)).toHaveLength(3);
  });

  it('sorts by raw score descending when no bonus categories present', () => {
    const s = zeroes();
    s.sleep = 9;
    s.cognitive = 7;
    s.nutrition = 5;
    s.environment = 3;
    expect(scoreToTop3(s)).toEqual(['sleep', 'cognitive', 'nutrition']);
  });

  it('applies gut +2 / sleep +2 / weight +2 bonuses before ranking', () => {
    const s = zeroes();
    s.gut = 5;       // 5 + 2 = 7
    s.sleep = 4;     // 4 + 2 = 6
    s.weight = 4;    // 4 + 2 = 6
    s.cognitive = 6; // 6 + 0 = 6
    expect(scoreToTop3(s)[0]).toBe('gut');
  });

  it('applies ED +1 / hormones +1', () => {
    const s = zeroes();
    s['erectile-dysfunction'] = 6; // 6 + 1 = 7
    s.hormones = 6;                // 6 + 1 = 7
    s.cognitive = 7;               // 7 + 0 = 7 (ties; tier-2 bonuses win bonus tiebreak)
    s.nutrition = 5;
    const top3 = scoreToTop3(s);
    expect(top3.slice(0, 2).sort()).toEqual(['erectile-dysfunction', 'hormones']);
    expect(top3[2]).toBe('cognitive');
  });

  it('tiebreak by bonus desc: gut(+2) > ED(+1) > cognitive(+0) at equal totals', () => {
    const s = zeroes();
    s.gut = 5;                     // 5+2 = 7
    s['erectile-dysfunction'] = 6; // 6+1 = 7
    s.cognitive = 7;               // 7+0 = 7
    expect(scoreToTop3(s)).toEqual(['gut', 'erectile-dysfunction', 'cognitive']);
  });

  it('deterministic alphabetic tie-break when raw+bonus and bonus both equal', () => {
    const s = zeroes();
    s.cognitive = 5;
    s.nutrition = 5;
    s.environment = 5;
    expect(scoreToTop3(s)).toEqual(['cognitive', 'environment', 'nutrition']);
  });

  it('realistic full 8-category input', () => {
    const s: Record<string, number> = {
      gut: 4,                  // 4+2 = 6
      sleep: 9,                // 9+2 = 11
      weight: 6,               // 6+2 = 8
      nutrition: 3,            // 3+0 = 3
      'erectile-dysfunction': 2, // 2+1 = 3
      environment: 5,          // 5+0 = 5
      cognitive: 7,            // 7+0 = 7
      hormones: 8,             // 8+1 = 9
    };
    expect(scoreToTop3(s)).toEqual(['sleep', 'hormones', 'weight']);
  });
});
