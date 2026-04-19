/** Level-1 morning protocol step. */
export interface MorningStep {
  /** Name. */
  n: string;
  /** Prescription / detail. */
  p: string;
  /** Optional video URL. */
  u: string | null;
}

export const morningProtocol: MorningStep[] = [
  {n:'Box breathing', p:'4–6 rounds of 4-4-4-4 throughout · set intention in fireside squat', u:'https://www.youtube.com/watch?v=tybOi4hjZFQ'},
  {n:'Fireside squat (or Sumo)', p:"60–90 sec · Fireside = heels flat, hips below parallel · Sumo = feet wide, press knees out · choose based on current mobility · sumo is the modification", u:'https://youtube.com/watch?v=xHQ5ZPdqvJo'},
  {n:'Lunge stretch', p:'45 sec each side · back knee down · press hips forward', u:'https://youtube.com/watch?v=1l5ZEcHJ0yU'},
  {n:'Hip circles', p:'30 sec each direction · large slow deliberate circles', u:'https://youtube.com/watch?v=Zzh_cBhAQsA'},
  {n:'Morning sunlight', p:'10–20 min · face toward sky · no sunglasses · stack with breathing', u:null},
  {n:'Cold shower finish', p:'1 min minimum fully cold · non-negotiable from Day 1', u:'https://youtube.com/watch?v=pq6WHJzOkno'}
];
