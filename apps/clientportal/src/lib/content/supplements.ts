/**
 * Month-1 supplement stack. Consumed by components for display/logging.
 * `week1/week2/week3` gate when a supplement is introduced.
 */
export interface Supplement {
  /** Display name. */
  n: string;
  /** Dose. */
  d: string;
  /** Timing. */
  t: string;
  /** Why — short description. */
  w: string;
  week1?: boolean;
  week2?: boolean;
  week3?: boolean;
  /** Month 2+ supplement. */
  future?: boolean;
  /** Proprietary / special formatting flag (e.g. compounded). */
  special?: boolean;
}

export const supplements: Supplement[] = [
  {n:'The Doctor TJ Special', d:'As directed (compounded)', t:'Morning — fasted or with small meal', w:'BPC-157 + L-Glutamine proprietary blend — gut lining repair, neuroinflammation reduction, dual gut-brain protection', week1:true, special:true},
  {n:'Magnesium glycinate', d:'300–400mg', t:'Before bed', w:'Sleep quality, cortisol regulation, neuroprotection — most impactful first supplement for sleep', week1:true, special:false},
  {n:'Omega-3 EPA/DHA', d:'2–3g EPA/DHA', t:'With a meal (Week 2+)', w:'Anti-inflammatory, neuronal membrane integrity, mood regulation, cardiovascular support', week2:true},
  {n:'Vitamin D3 + K2', d:'5,000 IU D3 + 100mcg K2-MK7', t:'With a fatty meal (Week 2+)', w:'Neuroprotection, testosterone support, immune function — K2 ensures calcium goes to bones not arteries', week2:true},
  {n:'B-complex (methylated)', d:'As directed', t:'With breakfast (Week 3+)', w:'Neurotransmitter synthesis, energy metabolism, homocysteine clearance — methylated forms only (B6 as P-5-P, B12 as methylcobalamin)', week3:true},
  {n:"Lion's mane mushroom", d:'500–1000mg', t:'Daily morning (Month 2+)', w:'NGF production, neuroplasticity, memory formation — introduced in Month 2', future:true},
  {n:'Bacopa monnieri', d:'300mg', t:'Daily — 12-week cycle (Month 2+)', w:'Memory consolidation, anxiety reduction — introduced in Month 2', future:true},
  {n:'Phosphatidylserine', d:'100–300mg', t:'Daily (Month 2+)', w:'Cortisol regulation, cognitive sharpness — introduced in Month 2', future:true}
];
