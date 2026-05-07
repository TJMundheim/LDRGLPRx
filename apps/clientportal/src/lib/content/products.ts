/**
 * LDRGLPRx product catalog.
 * Content only — no logic. Prices marked // TBD where exact pharmacy spreads are unknown.
 * Compliance framing: "helps with", "supports", "addresses" — never "treats".
 */

import type { Product } from '../data/catalog';

export const products: Product[] = [
  // ─── Flagship compounded Rx ───────────────────────────────────────────────

  {
    id: 'biomeaxisforge',
    slug: 'biome-axis-forge',
    name: 'Biome-AF',
    shortName: 'BAF',
    category: 'rx',
    tagline: 'Gut-brain axis restoration in a single compound.',
    description:
      'Oral compounded formulation of BPC-157, L-Glutamine, and aloe vera designed to support gut lining integrity and reduce neuroinflammation across a 4-week cycle.',
    longDescription:
      'Biome-AF combines BPC-157 (a pentadecapeptide with documented cytoprotective effects), L-Glutamine (primary fuel for enterocytes), and standardised aloe vera polysaccharides into a single daily oral capsule. The combination addresses the gut-brain axis from the mucosal layer upward, making it the foundational Rx intervention for all new members.',
    heroClaim: 'Repair the gut-brain axis in 28 days.',
    mechanismBullets: [
      'BPC-157 upregulates growth hormone receptor expression in gut tissue',
      'L-Glutamine maintains tight-junction integrity and reduces intestinal permeability',
      'Aloe vera polysaccharides modulate mucosal immune response and support barrier repair',
      'Dual gut + neuroinflammation pathway coverage in a single daily capsule',
    ],
    indications: [
      'Helps with leaky gut and intestinal permeability',
      'Helps with neuroinflammation and brain fog',
      'Supports post-antibiotic microbiome recovery',
      'Supports gut-brain axis signalling and mood regulation',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: '4 weeks',
      cycle: 'Repeat quarterly or as clinician directed',
      cadence: 'Once daily, morning — fasted or with small meal',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 249,
      memberUSD: 179,
      cogsNote: 'Fulfilled by MD Specialty Group; exact COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'included',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['gut_symptoms', 'brain_fog', 'leaky_gut', 'ibs'],
    tags: ['flagship', 'gut-brain', 'bpc-157', 'compounded', 'rx', 'foundation-onboarding'],
  },

  // ─── SleepRestore (Wk 1) ─────────────────────────────────────────────────

  {
    id: 'sleeprestore',
    slug: 'sleeprestore',
    name: 'SleepRestore',
    shortName: 'SR',
    category: 'rx',
    tagline: 'Deep sleep architecture in a single compound.',
    description:
      'Oral compounded formulation of Mg bisglycinate (200mg elemental), Glycine 3g, KSM-66 Ashwagandha 600mg, L-Theanine, Apigenin, and Zinc designed to support sleep onset, sleep depth, and morning restoration.',
    longDescription:
      'SleepRestore delivers the clinical doses that most sleep supplements skip: 3 grams of glycine to lower core body temperature and deepen slow-wave sleep, KSM-66 ashwagandha at 600mg to dampen cortisol and improve sleep efficiency per published RCTs, and 200mg elemental Mg bisglycinate to support NMDA receptor function and sleep architecture. L-Theanine and apigenin round out the GABA-adjacent calming pathway. A Wk 1 formula — taken the first night, felt by morning.',
    heroClaim: 'Sleep that actually restores you — starting night one.',
    mechanismBullets: [
      'Glycine 3g lowers core body temperature and increases slow-wave sleep depth',
      'KSM-66 ashwagandha 600mg reduces evening cortisol (28% reduction in RCT, 60 days)',
      'Mg bisglycinate 200mg elemental supports NMDA-receptor sleep architecture without GI upset',
      'L-Theanine promotes alpha-wave relaxation without sedation',
      'Apigenin modulates GABA-A receptors for sleep-onset support',
    ],
    indications: [
      'Helps with sleep onset difficulty',
      'Helps with sleep depth and slow-wave sleep architecture',
      'Supports morning restoration and reducing unrefreshed waking',
      'Addresses HPA-axis-driven sleep disruption via cortisol modulation',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: '4 weeks (Wk 1 formula)',
      cycle: 'Repeat quarterly or as clinician directed',
      cadence: '30–60 minutes before bed',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 149,
      memberUSD: 109,
      cogsNote: 'Fulfilled by MD Specialty Group; exact COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['s4_onset', 's4_maintenance', 's4_unrefreshed', 'insomnia', 'poor_sleep_quality', 'sleep_onset'],
    tags: ['sleep', 'compounded', 'rx', 'ashwagandha', 'glycine', 'magnesium', '4m-formula'],
  },

  // ─── ArmorVita (Wk 2) ─────────────────────────────────────────────────────

  {
    id: 'armorvita',
    slug: 'armorvita',
    name: 'ArmorVita',
    shortName: 'AV',
    category: 'rx',
    tagline: 'Fat-soluble defense — practitioner-grade and precision-dosed.',
    description:
      'Oral compounded formulation of D3 5,000IU, K2 (MK7 + MK4), Boron 6mg, Astaxanthin 8mg, Vitamin A, and MCT base supporting fat-soluble vitamin defense, bone/cardiovascular health, and hormone optimisation.',
    longDescription:
      'ArmorVita combines the fat-soluble micronutrients most commonly deficient in men into a single capsule with an MCT base for maximum absorption. Boron at the clinical dose of 6mg has NIH-published data showing +28% free testosterone in 7 days. Astaxanthin at 8mg provides potent mitochondrial and cardiovascular antioxidant activity. K2 with both MK7 and MK4 isoforms ensures calcium is directed to bone rather than arterial walls.',
    heroClaim: 'The fat-soluble foundation most protocols miss.',
    mechanismBullets: [
      'D3 5,000IU restores vitamin D sufficiency — 1 in 3 men over 45 are deficient',
      'K2 MK7 + MK4 activates matrix GLA protein to prevent arterial calcium deposition',
      'Boron 6mg raises free testosterone +28% in 7 days (NIH published)',
      'Astaxanthin 8mg provides mitochondrial and LDL antioxidant protection',
      'MCT base maximises fat-soluble vitamin absorption in a single capsule',
    ],
    indications: [
      'Supports fat-soluble vitamin defense and sufficiency',
      'Supports bone and cardiovascular health via K2-mediated calcium partitioning',
      'Supports hormone optimisation — especially free testosterone via boron',
      'Addresses vitamin D deficiency common in low-sun-exposure populations',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: '4 weeks (Wk 2 formula)',
      cycle: 'Ongoing or quarterly as clinician directed',
      cadence: 'Once daily with the largest meal of the day',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 89,
      memberUSD: 69,
      cogsNote: 'Fulfilled by MD Specialty Group; exact COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['low_vitamin_d', 'low_sun_exposure', 'hormone_adjacent', 'low_testosterone', 'cardiovascular_risk', 'bone_density_concern'],
    tags: ['vitamins', 'fat-soluble', 'compounded', 'rx', 'boron', 'vitamin-d', '4m-formula'],
  },

  // ─── NeuroBridge (Wk 3) ───────────────────────────────────────────────────

  {
    id: 'neurobridge',
    slug: 'neurobridge',
    name: 'NeuroBridge',
    shortName: 'NB',
    category: 'rx',
    tagline: 'Methylated B-complex for the 60% whose brain has been waiting.',
    description:
      'Oral compounded formulation of B6 P-5-P, B12 methylcobalamin, methylfolate (5-MTHF) 1mg, B5, B1, and B2 in active forms supporting methylation, energy, mood, and cognitive function — especially for people with MTHFR variants.',
    longDescription:
      'Up to 60% of people carry MTHFR gene variants that impair conversion of standard B vitamins into their active forms. NeuroBridge bypasses this entirely by delivering every B vitamin in its bioavailable, methylated form. B12 as methylcobalamin (not cyanocobalamin), B6 as pyridoxal-5-phosphate, and 5-MTHF (not folic acid) for folate — the exact forms the body actually uses. For those with MTHFR, this can be the first time the methylation cycle runs unimpaired.',
    heroClaim: 'For the 60% whose brain has been running on empty — not laziness.',
    mechanismBullets: [
      'Methylfolate 5-MTHF 1mg bypasses MTHFR enzyme impairment directly into the methylation cycle',
      'Methylcobalamin B12 supports myelin synthesis, homocysteine clearance, and neurotransmitter production',
      'Pyridoxal-5-phosphate B6 is the co-factor for serotonin, dopamine, and GABA synthesis',
      'Active B5, B1, and B2 support mitochondrial energy (Krebs cycle and fatty acid metabolism)',
    ],
    indications: [
      'Supports methylation cycle function — especially for MTHFR variant carriers',
      'Helps with energy, mood, and cognitive function tied to B-vitamin insufficiency',
      'Supports homocysteine clearance and cardiovascular + brain protection',
      'Addresses fatigue, brain fog, and mood symptoms with a methylation root cause',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: '4 weeks (Wk 3 formula)',
      cycle: 'Ongoing — methylation support is lifelong for MTHFR carriers',
      cadence: 'Once daily with breakfast',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 99,
      memberUSD: 79,
      cogsNote: 'Fulfilled by MD Specialty Group; exact COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['mthfr_interest', 's11_methylation', 'mood_low', 'energy_low', 'brain_fog', 'cognitive_decline', 's3_mood', 's3_brain_fog'],
    tags: ['methylation', 'b-vitamins', 'compounded', 'rx', 'mthfr', 'cognitive', '4m-formula'],
  },

  // ─── Genesis RPA ──────────────────────────────────────────────────────────

  {
    id: 'genesis-rpa',
    slug: 'genesis-rpa',
    name: 'Genesis RPA',
    shortName: 'Genesis',
    category: 'rx',
    tagline: 'Regenerative precision administration — delivered nationwide.',
    description:
      'Advanced regenerative protocol delivered via mobile clinical team; addresses joint injuries, post-concussion syndrome, long-COVID sequelae, cognitive decline, and chronic inflammation.',
    longDescription:
      'Genesis RPA is a high-touch regenerative administration service providing clinician-supervised delivery across intra-articular, IV, nebulizer, intrathecal, and intranasal routes. A nationwide mobile delivery model eliminates the need for clinic visits. Each protocol is individually designed based on intake assessment and lab findings. Approximate COGS ~$5,000 per administration.',
    heroClaim: 'Regenerative medicine, delivered to your door.',
    mechanismBullets: [
      'Multi-route administration targets tissue, systemic, CNS, and pulmonary compartments',
      'Intra-articular delivery addresses synovial inflammation and cartilage remodelling',
      'Intranasal / intrathecal routes support CNS compartment access for neuro indications',
      'IV and nebulizer routes address systemic and pulmonary inflammatory burden',
    ],
    indications: [
      'Helps with joint injuries and chronic musculoskeletal pain',
      'Supports recovery from post-concussion syndrome',
      'Helps with mild cognitive impairment and early-stage dementia',
      'Addresses long-COVID fatigue and inflammatory sequelae',
      'Supports chronic inflammation reduction',
    ],
    administrationRoutes: [
      'intra-articular',
      'IV',
      'nebulizer',
      'intrathecal',
      'intranasal',
    ],
    protocol: {
      duration: 'Single or 3-administration protocol',
      cycle: '3-pack protocol recommended for CNS and systemic indications',
      cadence: 'As clinician directed; spaced 4–8 weeks apart for multi-administration protocols',
    },
    pricing: {
      type: 'per-administration',
      retailUSD: 9500, // Single administration — range $9,500–$12,500; TBD final pricing
      memberUSD: 9500, // TBD member discount
      bundlePricing: [
        { quantity: 3, totalUSD: 27500, label: '3-pack protocol' },
      ],
      cogsNote: 'Approximate COGS ~$5,000 per administration; exact spread TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'addon',
      concierge: 'addon',
    },
    triggersFromIntake: ['joint_injury', 'post_concussion', 'long_covid', 'mci', 'chronic_inflammation'],
    tags: ['regenerative', 'mobile-delivery', 'high-touch', 'rx', 'nationwide'],
  },

  // ─── GLP-1 track ──────────────────────────────────────────────────────────

  {
    id: 'semaglutide',
    slug: 'semaglutide',
    name: 'Semaglutide',
    shortName: 'Sema',
    category: 'rx',
    tagline: 'GLP-1 agonist for metabolic and weight optimisation.',
    description:
      'Compounded semaglutide titrated to therapeutic dose; supports weight management, insulin sensitivity, and cardiovascular risk reduction.',
    mechanismBullets: [
      'GLP-1 receptor agonism slows gastric emptying and reduces appetite signalling',
      'Increases first-phase insulin secretion in a glucose-dependent manner',
      'Reduces glucagon secretion and hepatic glucose output',
      'Demonstrated cardiovascular risk reduction in high-risk populations',
    ],
    indications: [
      'Helps with weight management and metabolic syndrome',
      'Supports improvement in insulin sensitivity and blood glucose regulation',
      'Addresses cardiovascular risk factors associated with obesity',
    ],
    administrationRoutes: ['subcutaneous injection'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: 'Once weekly subcutaneous injection; titrated over 4–8 weeks',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 349, // TBD — range $249–$449/mo depending on dose
      memberUSD: 299, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'discounted',
      longevity: 'discounted',
      concierge: 'discounted',
    },
    triggersFromIntake: ['weight_loss_goal', 'metabolic_syndrome', 'high_bmi', 'insulin_resistance'],
    tags: ['glp-1', 'weight-management', 'metabolic', 'rx'],
  },

  {
    id: 'tirzepatide',
    slug: 'tirzepatide',
    name: 'Tirzepatide',
    shortName: 'Tirze',
    category: 'rx',
    tagline: 'Dual GIP/GLP-1 agonist — next-generation metabolic support.',
    description:
      'Compounded tirzepatide targeting both GIP and GLP-1 receptors for enhanced metabolic effect and greater weight reduction potential than single-agonist protocols.',
    mechanismBullets: [
      'Dual GIP + GLP-1 receptor agonism provides additive metabolic signalling',
      'Greater average weight reduction versus single GLP-1 agonists in clinical data',
      'Improves insulin sensitivity and reduces ectopic fat deposition',
    ],
    indications: [
      'Helps with significant weight management goals',
      'Supports metabolic optimisation where semaglutide response is suboptimal',
      'Addresses insulin resistance and type-2 diabetes risk factors',
    ],
    administrationRoutes: ['subcutaneous injection'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: 'Once weekly subcutaneous injection; titrated over 4–8 weeks',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 449, // TBD — range $349–$449/mo depending on dose
      memberUSD: 379, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'discounted',
      longevity: 'discounted',
      concierge: 'discounted',
    },
    triggersFromIntake: ['weight_loss_goal', 'metabolic_syndrome', 'high_bmi', 'glp1_inadequate_response'],
    tags: ['glp-1', 'gip', 'dual-agonist', 'weight-management', 'metabolic', 'rx'],
  },

  // ─── ED track ─────────────────────────────────────────────────────────────

  {
    id: 'sildenafil-tadalafil',
    slug: 'ed-support',
    name: 'ED Support Rx',
    shortName: 'ED Rx',
    category: 'rx',
    tagline: 'PDE5 inhibitor therapy — sildenafil or tadalafil as indicated.',
    description:
      'Compounded or generic sildenafil / tadalafil protocol selected based on onset preference and cardiovascular profile; supports erectile function and vascular health.',
    mechanismBullets: [
      'PDE5 inhibition increases cGMP, causing smooth muscle relaxation and vasodilation',
      'Sildenafil: faster onset (~30–60 min), shorter duration (~4–6 hr)',
      'Tadalafil: longer duration (~36 hr), suitable for daily low-dose use',
      'Daily low-dose tadalafil supports endothelial health independent of sexual activity',
    ],
    indications: [
      'Helps with erectile dysfunction of vascular or psychogenic origin',
      'Supports male sexual health and confidence',
      'Daily tadalafil addresses endothelial function and cardiovascular risk markers',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: 'On-demand or daily low-dose as clinician directed',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 79, // TBD — range $39–$99/mo
      memberUSD: 59, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'discounted',
      longevity: 'discounted',
      concierge: 'discounted',
    },
    triggersFromIntake: ['erectile_dysfunction', 'male_sexual_health'],
    tags: ['ed', 'pde5-inhibitor', 'mens-health', 'rx'],
  },

  // ─── TRT / male hormone ───────────────────────────────────────────────────

  {
    id: 'trt-male',
    slug: 'trt-male',
    name: 'Testosterone Replacement Therapy',
    shortName: 'TRT',
    category: 'rx',
    tagline: 'Evidence-based male hormone optimisation with ongoing lab monitoring.',
    description:
      'Compounded testosterone (cypionate or enanthate) protocol with baseline and ongoing labs; supports energy, muscle mass, mood, libido, and metabolic health in men with suboptimal levels.',
    mechanismBullets: [
      'Restores physiological testosterone levels for androgen-sensitive tissue function',
      'Supports lean mass preservation and body composition improvement',
      'Improves insulin sensitivity and metabolic markers in hypogonadal men',
      'Lab monitoring (total T, free T, E2, CBC, PSA) ensures safety and optimisation',
    ],
    indications: [
      'Helps with low testosterone symptoms (fatigue, low libido, mood changes, poor recovery)',
      'Supports muscle mass and strength optimisation',
      'Addresses metabolic consequences of androgen deficiency',
    ],
    administrationRoutes: ['subcutaneous injection', 'intramuscular injection', 'topical cream'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: '1–2x weekly injection or daily topical; labs every 90 days',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 149, // Medication only; labs billed separately
      memberUSD: 129, // TBD
      cogsNote: 'Pharmacy partner COGS TBD; labs separate line item', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['low_testosterone', 'fatigue_male', 'low_libido_male', 'poor_recovery'],
    tags: ['trt', 'mens-health', 'hormones', 'rx'],
  },

  // ─── HRT / female hormone track ───────────────────────────────────────────

  {
    id: 'hrt-female',
    slug: 'hrt-female',
    name: 'Female Hormone Replacement Therapy',
    shortName: 'HRT',
    category: 'rx',
    tagline: 'Bioidentical hormone support tailored to the female hormonal lifecycle.',
    description:
      'Compounded bioidentical estradiol and/or progesterone protocol with DUTCH panel baseline; supports perimenopause and menopause symptoms, bone density, mood, and cognitive health.',
    mechanismBullets: [
      'Bioidentical estradiol restores estrogen receptor signalling in target tissues',
      'Micronised progesterone supports uterine protection and sleep quality',
      'DUTCH panel guides individualised dosing and metabolite monitoring',
      'Neuroprotective estrogen effects support cognitive function in perimenopausal women',
    ],
    indications: [
      'Helps with perimenopause and menopause symptoms (hot flashes, sleep disruption, mood changes)',
      'Supports bone density maintenance and osteoporosis risk reduction',
      'Addresses cognitive changes associated with hormonal transition',
      'Supports libido and sexual health in women with hormone deficiency',
    ],
    administrationRoutes: ['topical cream', 'transdermal patch', 'oral', 'vaginal'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: 'As clinician directed based on DUTCH panel results; quarterly monitoring',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 199, // TBD — exact pricing depends on formulation
      memberUSD: 169, // TBD
      cogsNote: 'Pharmacy partner COGS TBD; DUTCH panel separate line item', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['perimenopause', 'menopause', 'female_hormone_symptoms', 'bone_density_concern'],
    tags: ['hrt', 'womens-health', 'hormones', 'bioidentical', 'rx'],
  },

  // ─── Enclomiphene ─────────────────────────────────────────────────────────

  {
    id: 'enclomiphene',
    slug: 'enclomiphene',
    name: 'Enclomiphene',
    category: 'rx',
    tagline: 'Fertility-preserving testosterone support without exogenous testosterone.',
    description:
      'Selective estrogen receptor modulator that stimulates endogenous LH and FSH, raising testosterone while preserving spermatogenesis — ideal for men seeking fertility-compatible hormone optimisation.',
    mechanismBullets: [
      'Blocks hypothalamic estrogen receptors, increasing LH and FSH output',
      'Stimulates endogenous testosterone production via Leydig cell activation',
      'Preserves sperm production unlike exogenous testosterone',
      'Typically raises total testosterone 150–300 ng/dL from baseline',
    ],
    indications: [
      'Helps with secondary hypogonadism while preserving fertility',
      'Supports testosterone optimisation for men planning to conceive',
      'Addresses low testosterone symptoms without suppressing spermatogenesis',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: '12.5–25mg daily oral; labs every 90 days',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 129, // TBD
      memberUSD: 99, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['low_testosterone', 'fertility_preservation', 'male_fertility'],
    tags: ['serm', 'fertility', 'mens-health', 'hormones', 'rx'],
  },

  // ─── Ketamine track ───────────────────────────────────────────────────────

  {
    id: 'ketamine-troches',
    slug: 'ketamine-troches',
    name: 'Low-Dose Oral Ketamine',
    shortName: 'Ketamine Rx',
    category: 'rx',
    tagline: 'Sub-anesthetic ketamine for mood, resilience, and neuroplasticity support.',
    description:
      'Compounded low-dose ketamine troches prescribed for off-label support of treatment-resistant mood challenges, neuroplasticity, and stress resilience under clinician supervision.',
    mechanismBullets: [
      'NMDA receptor antagonism rapidly increases synaptic AMPA receptor activity',
      'Triggers BDNF release and dendritic spine growth within hours of administration',
      'Sub-anesthetic doses preserve cognitive function while delivering neuroplastic effects',
      'Glutamate modulation addresses neuroinflammatory pathways implicated in mood disorders',
    ],
    indications: [
      'Helps with treatment-resistant low mood and anhedonia',
      'Supports neuroplasticity and stress resilience',
      'Addresses PTSD-related symptoms with clinician supervision',
    ],
    administrationRoutes: ['sublingual troche'],
    protocol: {
      duration: 'Monthly subscription',
      cycle: 'Initial induction course + maintenance dosing',
      cadence: '1–3x weekly troche as clinician directed; telehealth check-ins required',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 299,
      memberUSD: 249, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'na',
      optimization: 'addon',
      longevity: 'addon',
      concierge: 'included',
    },
    triggersFromIntake: ['mood_disorder', 'treatment_resistant_depression', 'ptsd', 'anhedonia'],
    tags: ['ketamine', 'mental-health', 'neuroplasticity', 'rx'],
  },

  // ─── Peptides ─────────────────────────────────────────────────────────────

  {
    id: 'semax',
    slug: 'semax',
    name: 'Semax',
    category: 'peptide',
    tagline: 'Russian-derived neuropeptide for cognitive enhancement and stress resilience.',
    description:
      'Semax is a synthetic ACTH(4-10) analogue that supports BDNF production, dopaminergic tone, and cognitive sharpness — particularly under stress or acute cognitive demand.',
    mechanismBullets: [
      'Upregulates BDNF and NGF in prefrontal and hippocampal regions',
      'Modulates dopaminergic and serotonergic neurotransmission',
      'Anti-inflammatory effects on CNS via melanocortin receptor activity',
      'Rapid onset via intranasal route (minutes)',
    ],
    indications: [
      'Helps with cognitive performance under high-demand periods',
      'Supports focus, working memory, and executive function',
      'Addresses stress-related cognitive decline',
    ],
    administrationRoutes: ['intranasal'],
    protocol: {
      duration: 'Cycle-based',
      cycle: '2–4 week on / 2 week off',
      cadence: 'Daily intranasal — 1–2 drops per nostril AM',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 89, // TBD — per vial/cycle
      memberUSD: 69, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['brain_fog', 'cognitive_decline', 'focus_issues', 'stress'],
    tags: ['peptide', 'nootropic', 'bdnf', 'cognitive', 'rx'],
  },

  {
    id: 'selank',
    slug: 'selank',
    name: 'Selank',
    category: 'peptide',
    tagline: 'Anxiolytic peptide with immunomodulatory and cognitive benefits.',
    description:
      'Selank is a synthetic analogue of tuftsin with anxiolytic, nootropic, and immunomodulatory properties — supports anxiety reduction and cognitive clarity without sedation.',
    mechanismBullets: [
      'Modulates GABAergic transmission for anxiolytic effect without dependence risk',
      'Increases BDNF expression and supports memory consolidation',
      'Immunomodulatory: upregulates IL-2 and natural killer cell activity',
      'Enkephalin metabolism modulation reduces stress response amplitude',
    ],
    indications: [
      'Helps with anxiety and generalised stress response',
      'Supports cognitive clarity in high-anxiety states',
      'Addresses immune dysregulation associated with chronic stress',
    ],
    administrationRoutes: ['intranasal'],
    protocol: {
      duration: 'Cycle-based',
      cycle: '2–4 week on / 2 week off',
      cadence: 'Daily intranasal — 1–2 drops per nostril AM or as needed',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 89, // TBD — per vial/cycle
      memberUSD: 69, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['anxiety', 'chronic_stress', 'brain_fog'],
    tags: ['peptide', 'anxiolytic', 'nootropic', 'immune', 'rx'],
  },

  {
    id: 'cerebrolysin',
    slug: 'cerebrolysin',
    name: 'Cerebrolysin',
    category: 'peptide',
    tagline: 'Neuropeptide complex for cognitive restoration and neuroregeneration.',
    description:
      'Cerebrolysin is a porcine-derived neuropeptide mixture with decades of clinical use supporting neuroregeneration, neuroprotection, and cognitive function in neurological indications.',
    mechanismBullets: [
      'Multi-peptide mixture mimics endogenous neurotrophic factors (BDNF, NGF, NT-3)',
      'Supports synaptic plasticity and neuronal survival under ischemic or degenerative conditions',
      'Reduces amyloid precursor protein processing — studied in Alzheimer\'s context',
      'Anti-apoptotic and anti-inflammatory effects in neuronal tissue',
    ],
    indications: [
      'Helps with age-related cognitive decline and MCI',
      'Supports neurological recovery post-injury or post-ischemic events',
      'Addresses neurodegenerative risk factors in longevity protocols',
    ],
    administrationRoutes: ['IM injection', 'IV infusion'],
    protocol: {
      duration: '10–20 day infusion course',
      cycle: 'Repeat 2–3x per year as indicated',
      cadence: 'Daily IM or IV for 10–20 consecutive days per course',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 599, // TBD — per course depending on route and duration
      memberUSD: 499, // TBD
      cogsNote: 'Pharmacy partner COGS TBD; route affects total cost', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'na',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['cognitive_decline', 'mci', 'dementia_risk', 'post_brain_injury'],
    tags: ['peptide', 'neuroregeneration', 'nootropic', 'longevity', 'rx'],
  },

  {
    id: 'dsip',
    slug: 'dsip',
    name: 'DSIP',
    shortName: 'DSIP',
    category: 'peptide',
    tagline: 'Delta sleep-inducing peptide for deep sleep restoration.',
    description:
      'DSIP (delta sleep-inducing peptide) supports slow-wave sleep architecture, cortisol regulation, and HPA axis normalisation — a targeted intervention for chronic sleep disruption.',
    mechanismBullets: [
      'Endogenous neuropeptide that increases delta-wave sleep amplitude',
      'Modulates HPA axis and reduces nocturnal cortisol spikes',
      'Anti-oxidant properties in CNS tissue',
      'Supports LH and somatostatin release patterns linked to restorative sleep',
    ],
    indications: [
      'Helps with chronic insomnia and poor sleep architecture',
      'Supports deep (slow-wave) sleep restoration',
      'Addresses HPA axis dysregulation contributing to sleep disruption',
    ],
    administrationRoutes: ['subcutaneous injection', 'intranasal'],
    protocol: {
      duration: 'Cycle-based',
      cycle: '4–6 week cycle; reassess and repeat as needed',
      cadence: 'Nightly before bed or as clinician directed',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 129, // TBD — per cycle
      memberUSD: 99, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['insomnia', 'poor_sleep_quality', 'sleep_architecture'],
    tags: ['peptide', 'sleep', 'hpa-axis', 'rx'],
  },

  {
    id: 'epitalon',
    slug: 'epitalon',
    name: 'Epitalon',
    category: 'peptide',
    tagline: 'Telomere-supporting tetrapeptide for longevity and circadian restoration.',
    description:
      'Epitalon is a synthetic tetrapeptide that activates telomerase, supports circadian rhythm regulation, and promotes antioxidant defence — a cornerstone of longevity peptide protocols.',
    mechanismBullets: [
      'Activates telomerase, supporting telomere length maintenance',
      'Regulates pineal gland melatonin output for circadian restoration',
      'Upregulates antioxidant enzyme activity (SOD, catalase)',
      'Studied for anti-aging effects on immune and endocrine function',
    ],
    indications: [
      'Supports longevity and cellular aging deceleration',
      'Helps with circadian rhythm disruption and melatonin deficiency',
      'Supports immune function decline associated with aging',
    ],
    administrationRoutes: ['subcutaneous injection', 'intranasal'],
    protocol: {
      duration: 'Annual or semi-annual cycle',
      cycle: '10–20 day course, 1–2x per year',
      cadence: 'Daily SC injection or intranasal for course duration',
    },
    pricing: {
      type: 'cycle',
      retailUSD: 199, // TBD — per course
      memberUSD: 159, // TBD
      cogsNote: 'Pharmacy partner COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'na',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['longevity_focus', 'circadian_disruption', 'immune_decline'],
    tags: ['peptide', 'longevity', 'telomere', 'circadian', 'rx'],
  },

  {
    id: 'methylene-blue',
    slug: 'methylene-blue',
    name: 'Methylene Blue',
    category: 'peptide', // categorised with peptides per protocol positioning
    tagline: 'Mitochondrial electron carrier for cognitive and metabolic energy support.',
    description:
      'Low-dose pharmaceutical-grade methylene blue acts as an alternative electron carrier in the mitochondrial transport chain, supporting ATP production, cognitive function, and neuroprotection.',
    mechanismBullets: [
      'Alternative electron acceptor in complex I/IV, enhancing mitochondrial respiration',
      'Reduces reactive oxygen species via redox cycling between oxidised and reduced forms',
      'Inhibits MAO-A and increases monoamine availability',
      'Neuroprotective: inhibits tau aggregation and amyloid fibril formation',
    ],
    indications: [
      'Helps with cognitive fatigue and mitochondrial dysfunction',
      'Supports energy production and mental clarity',
      'Addresses mitochondria-related decline in longevity protocols',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: 'Cycle-based or ongoing',
      cadence: 'Low dose (0.5–4 mg/kg) orally AM; cycling recommended',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 79, // TBD — per month at low dose
      memberUSD: 59, // TBD
      cogsNote: 'Pharmacy partner COGS TBD; pharmaceutical grade required', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['cognitive_fatigue', 'mitochondrial_dysfunction', 'brain_fog'],
    tags: ['methylene-blue', 'mitochondria', 'cognitive', 'nootropic', 'rx'],
  },

  // ─── Sleep Rx ──────────────────────────────────────────────────────────────

  {
    id: 'trazodone-sleep',
    slug: 'trazodone-sleep',
    name: 'Low-Dose Trazodone',
    category: 'rx',
    tagline: 'Serotonin antagonist/reuptake inhibitor for sleep onset and continuity.',
    description:
      'Low-dose trazodone (25–100mg) supports sleep onset and sleep maintenance through antihistaminergic and serotonin 5-HT2A antagonism without significant dependence risk.',
    mechanismBullets: [
      '5-HT2A antagonism promotes sleep by reducing arousal',
      'Mild H1 antihistaminergic effect contributes to sedation at low doses',
      'Non-habit-forming at therapeutic sleep doses versus benzodiazepine alternatives',
    ],
    indications: [
      'Helps with sleep onset insomnia',
      'Supports sleep continuity and middle-of-night waking',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: 'Ongoing subscription or as-needed',
      cadence: '25–100mg 30–60 minutes before bed as clinician directed',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 49, // TBD
      memberUSD: 39, // TBD
      cogsNote: 'Generic; pharmacy COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'discounted',
      longevity: 'discounted',
      concierge: 'included',
    },
    triggersFromIntake: ['insomnia', 'sleep_onset', 'sleep_maintenance'],
    tags: ['sleep', 'rx', 'trazodone'],
  },

  {
    id: 'ramelteon',
    slug: 'ramelteon',
    name: 'Ramelteon',
    category: 'rx',
    tagline: 'Melatonin receptor agonist for circadian-driven sleep support.',
    description:
      'Ramelteon is a selective MT1/MT2 melatonin receptor agonist that addresses circadian phase disorders and sleep onset without dependence risk.',
    mechanismBullets: [
      'MT1/MT2 agonism directly mimics melatonin\'s circadian sleep-onset signal',
      'No GABA modulation — zero dependence or tolerance risk',
      'Addresses circadian misalignment common in shift workers and jet-lag',
    ],
    indications: [
      'Helps with circadian rhythm disruption and delayed sleep phase',
      'Supports sleep onset in melatonin-deficient individuals',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: '8mg 30 minutes before bed; do not take with or after high-fat meal',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 49, // TBD
      memberUSD: 39, // TBD
      cogsNote: 'Pharmacy COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'discounted',
      longevity: 'discounted',
      concierge: 'included',
    },
    triggersFromIntake: ['insomnia', 'circadian_disruption', 'shift_work', 'sleep_onset'],
    tags: ['sleep', 'rx', 'circadian', 'melatonin-receptor'],
  },

  {
    id: 'doxepin-sleep',
    slug: 'doxepin-sleep',
    name: 'Low-Dose Doxepin',
    category: 'rx',
    tagline: 'Selective H1 antihistamine for sleep maintenance without morning sedation.',
    description:
      'Low-dose doxepin (3–6mg) is the only FDA-approved agent for sleep maintenance insomnia; highly selective H1 antagonism at low doses without tricyclic side effects.',
    mechanismBullets: [
      'Ultra-low-dose H1 histamine antagonism selectively promotes sleep continuity',
      'Minimal anticholinergic activity at 3–6mg versus tricyclic antidepressant doses',
      'FDA-approved specifically for sleep maintenance — documented middle-of-night waking reduction',
    ],
    indications: [
      'Helps with sleep maintenance insomnia (early morning awakening)',
      'Supports sleep consolidation in the second half of the night',
    ],
    administrationRoutes: ['oral'],
    protocol: {
      duration: 'Ongoing subscription',
      cadence: '3–6mg 30 minutes before bed; take on empty stomach',
    },
    pricing: {
      type: 'subscription',
      retailUSD: 49, // TBD
      memberUSD: 39, // TBD
      cogsNote: 'Pharmacy COGS TBD', // TBD
    },
    requiresRx: true,
    fulfilledBy: 'MD Specialty Group',
    tierAvailability: {
      foundation: 'addon',
      optimization: 'discounted',
      longevity: 'discounted',
      concierge: 'included',
    },
    triggersFromIntake: ['sleep_maintenance', 'early_awakening', 'insomnia'],
    tags: ['sleep', 'rx', 'doxepin'],
  },

  // ─── Supplement stacks ────────────────────────────────────────────────────

  {
    id: 'stack-foundation',
    slug: 'stack-foundation',
    name: 'Foundation Stack',
    category: 'supplement',
    tagline: 'Core micronutrient and metabolic support — the daily baseline.',
    description:
      'Methyl-B12, methylfolate, high-EPA omega-3, D3+K2, magnesium threonate, and creatine formulated as a 30-day supply; covers the most impactful evidence-based foundations.',
    mechanismBullets: [
      'Methyl-B12 + methylfolate support methylation cycle and homocysteine clearance',
      'High-EPA omega-3 reduces neuroinflammation and supports cardiovascular lipid profile',
      'D3+K2 optimises calcium metabolism, testosterone support, and immune function',
      'Magnesium threonate crosses blood-brain barrier for cognitive and sleep support',
      'Creatine provides phosphocreatine buffer for brain and muscle energy demand',
    ],
    indications: [
      'Supports micronutrient sufficiency across key metabolic pathways',
      'Helps with energy, focus, and recovery as a daily baseline protocol',
    ],
    pricing: {
      type: 'subscription',
      retailUSD: 79,
      memberUSD: 59,
    },
    requiresRx: false,
    tierAvailability: {
      foundation: 'included',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['micronutrient_gaps', 'general_wellness'],
    tags: ['supplement', 'stack', 'methylation', 'omega3', 'foundation'],
  },

  {
    id: 'stack-focus',
    slug: 'stack-focus',
    name: 'Focus Stack',
    category: 'supplement',
    tagline: 'Cholinergic and nootropic support for sustained cognitive performance.',
    description:
      'Citicoline (CDP-choline), Alpha-GPC, Lion\'s Mane mushroom, and Bacopa monnieri combined for acetylcholine support, NGF stimulation, and memory consolidation.',
    mechanismBullets: [
      'CDP-choline provides uridine and choline for phosphatidylcholine synthesis and dopamine support',
      'Alpha-GPC rapidly raises acetylcholine availability in the brain',
      'Lion\'s Mane stimulates NGF production and promotes neuroplasticity',
      'Bacopa monnieri modulates serotonin and acetylcholine for memory consolidation (takes 8–12 wk)',
    ],
    indications: [
      'Supports focus, attention, and working memory',
      'Helps with age-related cognitive decline at subclinical levels',
      'Addresses cholinergic deficit in cognitively demanding lifestyles',
    ],
    pricing: {
      type: 'subscription',
      retailUSD: 89,
      memberUSD: 69,
    },
    requiresRx: false,
    tierAvailability: {
      foundation: 'addon',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['brain_fog', 'focus_issues', 'cognitive_decline'],
    tags: ['supplement', 'stack', 'nootropic', 'cholinergic', 'focus'],
  },

  {
    id: 'stack-recovery',
    slug: 'stack-recovery',
    name: 'Recovery Stack',
    category: 'supplement',
    tagline: 'Sleep quality, cortisol modulation, and overnight restoration.',
    description:
      'Apigenin, glycine, magnesium threonate, and ashwagandha KSM-66 formulated for evening use to support deep sleep, cortisol normalisation, and physical recovery.',
    mechanismBullets: [
      'Apigenin inhibits CD38, an NAD+ consumer, and modulates GABA-A receptors for sleep',
      'Glycine lowers core body temperature and improves slow-wave sleep depth',
      'Magnesium threonate supports NMDA receptor function and sleep architecture',
      'Ashwagandha KSM-66 reduces evening cortisol and improves recovery markers',
    ],
    indications: [
      'Supports deep sleep and overnight physical recovery',
      'Helps with elevated cortisol and HPA axis dysregulation',
      'Addresses training recovery deficit and muscle repair',
    ],
    pricing: {
      type: 'subscription',
      retailUSD: 69,
      memberUSD: 49,
    },
    requiresRx: false,
    tierAvailability: {
      foundation: 'addon',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['poor_recovery', 'insomnia', 'high_cortisol', 'training_load'],
    tags: ['supplement', 'stack', 'sleep', 'cortisol', 'recovery'],
  },

  {
    id: 'stack-longevity',
    slug: 'stack-longevity',
    name: 'Longevity Stack',
    category: 'supplement',
    tagline: 'NAD+ precursors, mitophagy activators, and cellular defence compounds.',
    description:
      'NR (nicotinamide riboside), urolithin A, PQQ+CoQ10, sulforaphane, and Longvida curcumin combined to support NAD+ levels, mitochondrial biogenesis, and anti-inflammatory signalling.',
    mechanismBullets: [
      'NR raises NAD+ levels, fuelling sirtuin and PARP-dependent repair pathways',
      'Urolithin A activates mitophagy to clear damaged mitochondria (clinically studied)',
      'PQQ stimulates mitochondrial biogenesis; CoQ10 maintains electron transport efficiency',
      'Sulforaphane activates Nrf2 pathway for robust antioxidant and detox gene expression',
      'Longvida curcumin (enhanced bioavailability) inhibits NF-κB and reduces systemic inflammation',
    ],
    indications: [
      'Supports cellular longevity and mitochondrial health',
      'Helps with chronic low-grade inflammation',
      'Addresses age-related NAD+ decline and mitochondrial dysfunction',
    ],
    pricing: {
      type: 'subscription',
      retailUSD: 129,
      memberUSD: 99,
    },
    requiresRx: false,
    tierAvailability: {
      foundation: 'addon',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['longevity_focus', 'chronic_inflammation', 'mitochondrial_dysfunction'],
    tags: ['supplement', 'stack', 'longevity', 'nad', 'mitochondria'],
  },

  // ─── Devices / affiliate ──────────────────────────────────────────────────

  {
    id: 'pbm-device',
    slug: 'pbm-device',
    name: 'Photobiomodulation Device',
    shortName: 'PBM',
    category: 'service', // affiliate — no inventory
    tagline: 'Transcranial and systemic photobiomodulation for brain and cellular health.',
    description:
      'Vielight-class intranasal and transcranial near-infrared photobiomodulation device; recommended through affiliate relationship — no inventory held.',
    longDescription:
      'Photobiomodulation (PBM) uses near-infrared light (810nm) to stimulate cytochrome c oxidase in mitochondria, supporting ATP production and reducing neuroinflammation. Intranasal delivery provides direct access to the olfactory-limbic pathway. Affiliate-only; members purchase direct from vendor.',
    mechanismBullets: [
      '810nm near-infrared light activates cytochrome c oxidase (complex IV) in mitochondria',
      'Increases ATP synthesis and reduces reactive oxygen species in neuronal tissue',
      'Transcranial delivery supports default mode network and memory-related regions',
      'Intranasal route provides direct limbic and olfactory pathway access',
    ],
    indications: [
      'Supports cognitive performance and memory',
      'Helps with neuroinflammation and post-concussion recovery',
      'Addresses mitochondrial function in brain tissue',
    ],
    pricing: {
      type: 'one-time',
      retailUSD: 1749, // Reference price for Vielight Neuro Gamma; affiliate — price may vary
      cogsNote: 'Affiliate — no COGS; commission-based', // TBD commission rate
    },
    requiresRx: false,
    tierAvailability: {
      foundation: 'na',
      optimization: 'addon',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['cognitive_decline', 'post_concussion', 'longevity_focus'],
    tags: ['device', 'pbm', 'affiliate', 'cognitive', 'longevity'],
  },

  {
    id: 'cgm-stelo',
    slug: 'cgm-stelo',
    name: 'Stelo CGM Trial',
    shortName: 'CGM',
    category: 'service', // affiliate
    tagline: '14-day continuous glucose monitoring — see how food, sleep, and stress affect your blood sugar.',
    description:
      'Stelo 14-day OTC CGM patch (Dexcom) provides real-time glucose data without prescription; recommended through affiliate relationship for metabolic awareness and protocol personalisation.',
    mechanismBullets: [
      'Interstitial glucose measured every 15 minutes for 14 days',
      'No fingerstick calibration required (OTC, no Rx)',
      'Data reveals postprandial glucose spikes, nocturnal patterns, and stress/exercise responses',
    ],
    indications: [
      'Supports metabolic awareness and dietary personalisation',
      'Helps with identifying glucose dysregulation before lab thresholds are crossed',
    ],
    pricing: {
      type: 'one-time',
      retailUSD: 99, // Approximate retail; affiliate — exact price may vary
      cogsNote: 'Affiliate — no COGS; commission-based', // TBD commission rate
    },
    requiresRx: false,
    tierAvailability: {
      foundation: 'addon',
      optimization: 'included',
      longevity: 'included',
      concierge: 'included',
    },
    triggersFromIntake: ['metabolic_syndrome', 'insulin_resistance', 'weight_loss_goal', 'general_wellness'],
    tags: ['cgm', 'glucose', 'metabolic', 'affiliate', 'device'],
  },
];
