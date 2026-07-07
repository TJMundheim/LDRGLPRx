/**
 * Month-1 supplement stack. Consumed by components for display/logging.
 * `week1/week2/week3` gate when a supplement is introduced.
 *
 * Only My4MLife branded SKUs are listed here. Generic/affiliate items
 * (lion's mane, bacopa, phosphatidylserine, etc.) are out until we
 * either formulate them or carry them as vetted affiliates.
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
  {n:'Biome NS Ultra', d:'1 scoop in 8–12 oz water', t:'With or immediately after your first meal of the day', w:'Gut-brain seal — foundational starting protocol. Repairs leaky gut, calms neuroinflammation.', week1:true, special:true},
  {n:'SleepRestore', d:'1 capsule (Mg bisglycinate 350mg + glycine 2g + apigenin 50mg + L-theanine 200mg + KSM-66 300mg + B6 + Vitamin E)', t:'30–60 min before bed', w:'Sleep architecture, cortisol regulation, neuroprotection.', week1:true, special:true},
  {n:'OmegaCN Prime', d:'2 softgels (EPA 1200 + DHA 800, IFOS 5-star + Kaneka QH® ubiquinol CoQ10 200mg)', t:'With dinner', w:'Cardio-neuro foundation — omega-3 + mitochondrial CoQ10 in one stack.', week2:true, special:true},
  {n:'ArmorVita', d:'1 softgel (D3 5,000 IU + K2-MK7 100mcg + K2-MK4 + Boron 3mg + Retinol 2,500 IU + Astaxanthin 4mg)', t:'With a fatty meal', w:'Hormone-bone-immune scaffolding. K2 ensures calcium goes to bones not arteries.', week2:true, special:true},
  {n:'NeuroBridge', d:'1 capsule (methylated B-complex — P-5-P, methylcobalamin, methylfolate, B5, B1, B2)', t:'With breakfast', w:'Methylation, homocysteine clearance, neurotransmitter synthesis. Methylated forms only.', week3:true, special:true},
  {n:'MitoVita', d:'1 scoop (creatine 5g + L-citrulline 6g + beetroot + electrolytes + Redmond sea salt)', t:'Pre-workout or mid-day', w:'Mitochondrial ATP + endothelial nitric oxide — performance + cognitive + sexual support.', week3:true, special:true},
];
