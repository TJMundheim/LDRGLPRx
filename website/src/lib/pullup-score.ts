// Pull-Up Challenge scoring. Pure math, integer arithmetic (hundredths) to avoid float drift.
// Score = (final - start) x bodyweight lb x age multiplier; multiplier = 1 + 1% per year over 30, no cap.

export interface ScoreInput { start: number; final: number; bodyweightLb: number; age: number }

/** Age multiplier in whole hundredths (100 = 1.00). */
const multHundredths = (age: number): number => 100 + Math.max(0, Math.floor(age) - 30);

export const ageMultiplier = (age: number): number => multHundredths(age) / 100;

/** Points earned per added rep, in cents of a point (integer). */
const perRepCents = (bodyweightLb: number, age: number): number =>
  Math.round(bodyweightLb * multHundredths(age));

export const pointsPerRep = (bodyweightLb: number, age: number): number =>
  perRepCents(bodyweightLb, age) / 100;

export function pullupScore({ start, final, bodyweightLb, age }: ScoreInput): number {
  const reps = final - start;
  if (reps <= 0) return 0;
  return (reps * perRepCents(bodyweightLb, age)) / 100;
}

/** Smallest final-reps count whose score is strictly greater than target. */
export function repsToPass(target: number, bodyweightLb: number, age: number, start: number): number {
  const per = perRepCents(bodyweightLb, age);
  const added = Math.floor(Math.round(target * 100) / per) + 1;
  return start + Math.max(1, added);
}

export const formatScore = (n: number): string => Math.round(n).toLocaleString('en-US');

export function workedLine(i: ScoreInput): string {
  return `Score: ${i.final - i.start} x ${i.bodyweightLb} x ${ageMultiplier(i.age).toFixed(2)} = ${formatScore(pullupScore(i))}`;
}
