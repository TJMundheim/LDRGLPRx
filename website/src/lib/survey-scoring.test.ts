import { describe, it, expect } from 'vitest';
import { scoreToTop3, BONUS_MAP } from './survey-scoring';

const CATS = ['gut', 'sleep', 'weight', 'nutrition', 'erectile-dysfunction', 'environment', 'cognitive', 'hormones'];

const zeroes = (): Record<string, number> =>
  Object.fromEntries(CATS.map((c) => [c, 0]));

describe('BONUS_MAP', () => {
  it('exposes gut=2, weight=1, hormones=1 only', () => {
    expect(BONUS_MAP).toEqual({ gut: 2, weight: 1, hormones: 1 });
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

  it('applies weight +1 bonus', () => {
    const s = zeroes();
    s.weight = 6;
    s.sleep = 6;
    s.cognitive = 4;
    expect(scoreToTop3(s)[0]).toBe('weight');
  });

  it('applies hormones +1 bonus', () => {
    const s = zeroes();
    s.hormones = 5;
    s.sleep = 5;
    s.cognitive = 3;
    expect(scoreToTop3(s)[0]).toBe('hormones');
  });

  it('breaks ties by bonus desc (gut > weight > non-bonus)', () => {
    const s = zeroes();
    s.gut = 5;
    s.weight = 7;
    s.sleep = 8;
    expect(scoreToTop3(s)).toEqual(['weight', 'sleep', 'gut']);
  });

  it('deterministic alphabetic tie-break when raw+bonus and bonus both equal', () => {
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
    expect(scoreToTop3(s)).toEqual(['hormones', 'sleep', 'weight']);
  });
});
