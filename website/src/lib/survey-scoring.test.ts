import { describe, it, expect } from 'vitest';
import { scoreToTop3, BONUS_MAP } from './survey-scoring';

const CATS = ['gut', 'sleep', 'weight', 'nutrition', 'erectile-dysfunction', 'environment', 'cognitive', 'hormones'];

const zeroes = (): Record<string, number> =>
  Object.fromEntries(CATS.map((c) => [c, 0]));

describe('BONUS_MAP', () => {
  it('exposes gut=2 only', () => {
    expect(BONUS_MAP).toEqual({ gut: 2 });
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

  it('applies gut +2 bonus before ranking', () => {
    const s = zeroes();
    s.gut = 6;
    s.sleep = 7;
    s.cognitive = 5;
    s.nutrition = 4;
    expect(scoreToTop3(s)).toEqual(['gut', 'sleep', 'cognitive']);
  });

  it('weight and hormones get no bonus — pure raw score ranking', () => {
    const s = zeroes();
    s.weight = 6;
    s.hormones = 6;
    s.sleep = 7;
    s.cognitive = 5;
    expect(scoreToTop3(s)[0]).toBe('sleep');
  });

  it('gut still wins ties via its +2 bonus', () => {
    const s = zeroes();
    s.gut = 5;
    s.weight = 7;
    s.sleep = 6;
    expect(scoreToTop3(s)).toEqual(['gut', 'weight', 'sleep']);
  });

  it('deterministic alphabetic tie-break when raw+bonus equal', () => {
    const s = zeroes();
    s.sleep = 5;
    s.cognitive = 5;
    s.nutrition = 5;
    s.environment = 5;
    expect(scoreToTop3(s)).toEqual(['cognitive', 'environment', 'nutrition']);
  });

  it('realistic full 8-category input', () => {
    const s: Record<string, number> = {
      gut: 4,
      sleep: 9,
      weight: 6,
      nutrition: 3,
      'erectile-dysfunction': 2,
      environment: 5,
      cognitive: 7,
      hormones: 8,
    };
    expect(scoreToTop3(s)).toEqual(['sleep', 'hormones', 'cognitive']);
  });
});
