/** Level-1 morning protocol step. */
export interface MorningStep {
  /** Name. */
  n: string;
  /** Prescription / detail. */
  p: string;
  /** Optional video URL. */
  u: string | null;
  /** Week this step is first unlocked (1–4). */
  unlockedAt: 1 | 2 | 3 | 4;
}

/**
 * All morning protocol steps in order.
 * Steps are unlocked cumulatively by week — Week 1 unlocks steps with unlockedAt:1,
 * Week 2 adds unlockedAt:2, etc.
 */
export const morningProtocol: MorningStep[] = [
  {n:'Box breathing',         p:'4–6 rounds of 4-4-4-4 · set intention · do this in fireside squat if possible',  u:'https://www.youtube.com/watch?v=tybOi4hjZFQ',     unlockedAt:1},
  {n:'Morning sunlight',      p:'10–20 min · face toward sky · no sunglasses · stack with breathing',              u:null,                                                 unlockedAt:1},
  {n:'Cold shower/plunge',    p:'1 min minimum fully cold · non-negotiable from Day 1',                            u:'https://youtube.com/watch?v=pq6WHJzOkno',            unlockedAt:1},
  {n:'Fireside or sumo squat',p:"60–90 sec · Fireside = heels flat, hips below parallel · Sumo = feet wide, press knees out · choose based on mobility", u:'https://youtube.com/watch?v=xHQ5ZPdqvJo', unlockedAt:2},
  {n:'Lunge stretch',         p:'45 sec each side · back knee down · press hips forward',                         u:'https://youtube.com/watch?v=1l5ZEcHJ0yU',            unlockedAt:3},
];

/**
 * Returns the steps that are unlocked for the given week number.
 * Week 4 returns all steps (same as Week 3) — the framing is "with more focus and passion."
 */
export function stepsForWeek(week: 1 | 2 | 3 | 4): MorningStep[] {
  const effectiveWeek = week === 4 ? 3 : week;
  return morningProtocol.filter(s => s.unlockedAt <= effectiveWeek);
}
