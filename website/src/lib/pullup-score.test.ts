import { describe, it, expect } from 'vitest';
import { ageMultiplier, pointsPerRep, pullupScore, repsToPass, formatScore, formatAmount, workedLine, compareScore, standingText } from './pullup-score';

describe('ageMultiplier', () => {
  it('is 1 at 30 and under, +1% per year over 30, no cap', () => {
    expect(ageMultiplier(18)).toBe(1);
    expect(ageMultiplier(25)).toBe(1);
    expect(ageMultiplier(30)).toBe(1);
    expect(ageMultiplier(40)).toBe(1.1);
    expect(ageMultiplier(59)).toBe(1.29);
    expect(ageMultiplier(65)).toBe(1.35);
    expect(ageMultiplier(100)).toBe(1.7);
    expect(ageMultiplier(120)).toBe(1.9);
  });
  it('matches the rules text examples and ignores partial years', () => {
    expect(ageMultiplier(60)).toBe(1.3);
    expect(ageMultiplier(70)).toBe(1.4);
    expect(ageMultiplier(31)).toBe(1.01);
    expect(ageMultiplier(30.9)).toBe(1);
    expect(ageMultiplier(40.5)).toBe(1.1);
  });
});

describe('pullupScore', () => {
  it('reproduces the page examples', () => {
    expect(pullupScore({ start: 3, final: 10, bodyweightLb: 200, age: 40 })).toBe(1540);
    expect(pullupScore({ start: 5, final: 12, bodyweightLb: 150, age: 25 })).toBe(1050);
    expect(pullupScore({ start: 4, final: 11, bodyweightLb: 190, age: 65 })).toBe(1795.5);
    expect(pullupScore({ start: 5, final: 15, bodyweightLb: 235, age: 59 })).toBe(3031.5);
  });
  it('is exact to the cent (no float drift)', () => {
    expect(pullupScore({ start: 0, final: 10, bodyweightLb: 235, age: 59 })).toBe(3031.5);
    expect(pullupScore({ start: 0, final: 3, bodyweightLb: 187, age: 47 })).toBe(656.37);
  });
  it('is 0 when final is not above start', () => {
    expect(pullupScore({ start: 10, final: 10, bodyweightLb: 200, age: 40 })).toBe(0);
    expect(pullupScore({ start: 10, final: 4, bodyweightLb: 200, age: 40 })).toBe(0);
  });
});

describe('formatScore / workedLine', () => {
  it('rounds to a whole number with a thousands separator', () => {
    expect(formatScore(3031.5)).toBe('3,032');
    expect(formatScore(1795.5)).toBe('1,796');
    expect(formatScore(1050)).toBe('1,050');
    expect(formatScore(0)).toBe('0');
  });
  it('writes the worked line in the page style', () => {
    expect(workedLine({ start: 3, final: 10, bodyweightLb: 200, age: 40 })).toBe('Score: 7 x 200 x 1.10 = 1,540');
    expect(workedLine({ start: 5, final: 15, bodyweightLb: 235, age: 59 })).toBe('Score: 10 x 235 x 1.29 = 3,032');
  });
});

describe('repsToPass', () => {
  it('is the smallest final count whose score is strictly greater than the target', () => {
    // 200 lb, age 40: 220 per rep. 1540 / 220 = 7 exactly, so 7 ties; 8 passes.
    expect(repsToPass(1540, 200, 40, 3)).toBe(11);
    // 150 lb, age 25: 150 per rep. 1050 = 7 reps exactly; 8 passes.
    expect(repsToPass(1050, 150, 25, 5)).toBe(13);
    // 190 lb, age 65: 256.5 per rep. 1795.5 = 7 reps exactly; 8 passes.
    expect(repsToPass(1795.5, 190, 65, 4)).toBe(12);
    // 235 lb, age 59: 303.15 per rep. 3031.5 = 10 reps exactly; 11 passes.
    expect(repsToPass(3031.5, 235, 59, 5)).toBe(16);
  });
  it('rounds up when the target is not an exact multiple', () => {
    // 150 lb, age 25: 150 per rep; 1000 needs 7 reps (1050 > 1000).
    expect(repsToPass(1000, 150, 25, 0)).toBe(7);
  });
});

describe('decimal bodyweight', () => {
  it('scores a decimal bodyweight exactly', () => {
    // 3 x 187.5 x 1.17 = 658.125
    expect(pullupScore({ start: 0, final: 3, bodyweightLb: 187.5, age: 47 })).toBe(658.125);
    expect(pointsPerRep(187.5, 47)).toBe(219.375);
    expect(pullupScore({ start: 2, final: 9, bodyweightLb: 200.25, age: 40 })).toBe(1541.925);
  });
  it('prints the bodyweight and points per rep sensibly', () => {
    expect(workedLine({ start: 0, final: 3, bodyweightLb: 187.5, age: 47 })).toBe('Score: 3 x 187.5 x 1.17 = 658');
    expect(formatAmount(219.375)).toBe('219.38');
    expect(formatAmount(256.5)).toBe('256.5');
    expect(formatAmount(220)).toBe('220');
    expect(formatAmount(pointsPerRep(235, 59))).toBe('303.15');
  });
  it('repsToPass stays exact with a decimal bodyweight', () => {
    // 100.5 lb, age 30: 100.5 per rep; 10 reps = 1005 ties 1005, 11 passes.
    expect(repsToPass(1005, 100.5, 30, 0)).toBe(11);
    expect(repsToPass(1004.99, 100.5, 30, 0)).toBe(10);
  });
});

describe('standing vs a benchmark', () => {
  it('compares exact values (1795.5 is not rounded up to 1,796 for the comparison)', () => {
    expect(compareScore(1795.5, 1795.5)).toBe('tie');
    expect(compareScore(1796, 1795.5)).toBe('beat');
    expect(compareScore(1795.4, 1795.5)).toBe('below');
  });
  it('tells someone who exactly ties the 65-year-old example that they tie, then how to pass', () => {
    const i = { start: 4, final: 11, bodyweightLb: 190, age: 65 };
    expect(standingText(i, 1795.5)).toBe('You tie it. Add 1 more rep to pass it.');
    expect(standingText({ start: 5, final: 15, bodyweightLb: 235, age: 59 }, 3031.5)).toBe('You tie it. Add 1 more rep to pass it.');
  });
  it('says "by less than a point" when the rounded numbers print the same', () => {
    // 7 x 190.04 x 1.35 = 1795.878 -> prints 1,796, same as the example's 1,796.
    expect(standingText({ start: 4, final: 11, bodyweightLb: 190.04, age: 65 }, 1795.5)).toBe('You beat it by less than a point.');
    expect(standingText({ start: 3, final: 11, bodyweightLb: 200, age: 40 }, 1540)).toBe('You beat it.');
  });
  it('uses singular and plural correctly', () => {
    // 200 lb age 40, 3 -> 9 = 1320; 1540 needs final 11 (8 reps): 2 more.
    expect(standingText({ start: 3, final: 9, bodyweightLb: 200, age: 40 }, 1540)).toBe('Add 2 more reps to pass it.');
    expect(standingText({ start: 3, final: 10, bodyweightLb: 199, age: 40 }, 1540)).toBe('Add 1 more rep to pass it.');
  });
});
