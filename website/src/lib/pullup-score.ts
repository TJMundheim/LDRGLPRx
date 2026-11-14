// Pull-Up Challenge scoring. Pure math, integer arithmetic to avoid float drift.
// Score = (final - start) x bodyweight lb x age multiplier; multiplier = 1 + 1% per whole year over 30, no cap.
// Bodyweight may be a decimal (the entry form accepts e.g. 187.5); it is carried to the hundredth of a pound.

export interface ScoreInput { start: number; final: number; bodyweightLb: number; age: number }

/** Age multiplier in whole hundredths (100 = 1.00). Partial years do not count. */
const multHundredths = (age: number): number => 100 + Math.max(0, Math.floor(age) - 30);

export const ageMultiplier = (age: number): number => multHundredths(age) / 100;

/** Bodyweight in hundredths of a pound. */
const bwHundredths = (bodyweightLb: number): number => Math.round(bodyweightLb * 100);

/** Points per added rep in units of 1/10,000 of a point (exact integer). */
const perRepUnits = (bodyweightLb: number, age: number): number =>
  bwHundredths(bodyweightLb) * multHundredths(age);

const UNIT = 10_000;

export const pointsPerRep = (bodyweightLb: number, age: number): number =>
  perRepUnits(bodyweightLb, age) / UNIT;

export function pullupScore({ start, final, bodyweightLb, age }: ScoreInput): number {
  const reps = final - start;
  if (reps <= 0) return 0;
  return (reps * perRepUnits(bodyweightLb, age)) / UNIT;
}

/** Smallest final-reps count whose score is strictly greater than target. */
export function repsToPass(target: number, bodyweightLb: number, age: number, start: number): number {
  const per = perRepUnits(bodyweightLb, age);
  const added = Math.floor(Math.round(target * UNIT) / per) + 1;
  return start + Math.max(1, added);
}

/** How a score compares with a benchmark, on the exact (unrounded) values. */
export type Standing = 'beat' | 'tie' | 'below';
export function compareScore(mine: number, benchmark: number): Standing {
  const a = Math.round(mine * UNIT), b = Math.round(benchmark * UNIT);
  return a > b ? 'beat' : a === b ? 'tie' : 'below';
}

/** Score as printed on the page: whole number, thousands separator (3031.5 -> "3,032"). */
export const formatScore = (n: number): string => Math.round(n).toLocaleString('en-US');

/** A non-integer amount (bodyweight, points per rep) to at most 2 decimals, no trailing zeros. */
export const formatAmount = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function workedLine(i: ScoreInput): string {
  return `Score: ${i.final - i.start} x ${formatAmount(i.bodyweightLb)} x ${ageMultiplier(i.age).toFixed(2)} = ${formatScore(pullupScore(i))}`;
}

/** Plain-language "where you stand" sentence against one benchmark. */
export function standingText(i: ScoreInput, benchmark: number): string {
  const mine = pullupScore(i);
  const s = compareScore(mine, benchmark);
  // Both print the same whole number (e.g. 1,796 vs 1,796) but yours is higher before rounding.
  if (s === 'beat') return formatScore(mine) === formatScore(benchmark) ? 'You beat it by less than a point.' : 'You beat it.';
  const more = repsToPass(benchmark, i.bodyweightLb, i.age, i.start) - i.final;
  const add = `Add ${more} more rep${more === 1 ? '' : 's'} to pass it.`;
  return s === 'tie' ? `You tie it. ${add}` : add;
}
