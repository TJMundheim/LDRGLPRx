# Intake Questionnaire — Symptom → Solution Mapping

Working draft. Used by the AI intake agent to vet patients into solutions we sell. Every question maps to one or more products/protocols. Questions a patient answers "yes / often / severe" trigger a recommendation in the report.

Scoring: 0 = none, 1 = mild/occasional, 2 = moderate/frequent, 3 = severe/daily. Triggers fire at ≥2 unless noted.

Compliance: never use "treat / cure / diagnose." Use "help with," "support," "address."

---

## Section 1 — Demographics & baseline

- Age, sex assigned at birth, height, weight, waist circumference
- Goals (multi-select): lose weight · sharper focus · more energy · better sleep · sex drive / ED · joint pain · anxiety / mood · longevity / prevention · injury recovery · post-concussion recovery · memory concerns · gut issues · hormone balance
- Current medications, supplements, allergies
- Past surgeries, hospitalizations, head injuries (count + dates)
- Family history: dementia / Alzheimer's, heart disease, diabetes, cancer, autoimmune

---

## Section 2 — Gut & digestion → BiomeAxisForge primary

| Question | Trigger |
|---|---|
| Bloating after meals? | BiomeAxisForge + SIBO breath test |
| Frequent gas, belching, reflux / GERD? | BiomeAxisForge + GI-MAP |
| Loose stools, constipation, or alternating? | GI-MAP + BiomeAxisForge |
| Diagnosed IBS, IBD, Crohn's, colitis? | GI-MAP + BiomeAxisForge (clinician review) |
| Multiple courses of antibiotics in last 5 years? | BiomeAxisForge (post-antibiotic repair) |
| Multiple food sensitivities or intolerances? | BiomeAxisForge + GI-MAP + zonulin |
| Skin issues: acne, eczema, rosacea? | BiomeAxisForge (gut-skin axis) |
| Brain fog after eating? | BiomeAxisForge + OAT |

---

## Section 3 — Brain, mood, cognition → Neuro stack + RPA

| Question | Trigger |
|---|---|
| Brain fog / mental fatigue? | BiomeAxisForge + Foundation neuro stack |
| Trouble focusing or staying on task? | Citicoline / Alpha-GPC stack + cognitive baseline test |
| Memory lapses (names, words, why-I-walked-in-here)? | Foundation neuro + cognitive baseline + APOE genotype |
| Family history of dementia / Alzheimer's? | APOE genotype + GFAP/p-tau biomarkers + Longevity tier |
| History of concussion(s) — count and severity? | **Genesis RPA (intranasal/IV) — post-concussion indication** |
| Persistent post-concussion symptoms (headache, fog, light sensitivity)? | **Genesis RPA + neuro stack** |
| Diagnosed mild cognitive impairment or early dementia? | **Genesis RPA (intrathecal/intranasal) — clinician-led** |
| Mood: low mood, anhedonia, irritability? | BiomeAxisForge (gut-brain) + omega-3 + clinician eval (ketamine candidacy) |
| Anxiety, racing thoughts, panic? | Methylation panel (COMT) + adaptogens + clinician eval |
| History of depression unresponsive to SSRIs? | PGx panel + ketamine track eligibility |
| Chronic stress, burnout? | Adaptogen stack + DUTCH cortisol pattern |

---

## Section 4 — Sleep → sleep stack + downstream

| Question | Trigger |
|---|---|
| Trouble falling asleep? | Magnesium threonate + apigenin + clinician eval |
| Wake during night, can't return to sleep? | DUTCH cortisol + DSIP peptide |
| Snoring, witnessed apnea, daytime sleepiness? | **Home sleep study (WatchPAT)** — high-priority |
| Wake unrefreshed despite 7+ hrs? | Sleep study + Oura/Whoop integration |
| Restless legs / leg cramps? | RBC magnesium + iron panel |

---

## Section 5 — Metabolic, weight, energy → GLP-1 + foundation labs

| Question | Trigger |
|---|---|
| BMI ≥27, or unable to lose weight despite effort? | GLP-1 track (sema/tirz) + foundation labs |
| Waist circumference ≥40 (M) / ≥35 (F)? | Foundation labs + CGM trial |
| Pre-diabetes or diabetes diagnosis? | GLP-1 + CGM + ApoB/insulin |
| Strong sugar/carb cravings, energy crashes? | Fasting insulin + CGM + nutrition module |
| Family history T2D or cardiovascular disease? | ApoB + Lp(a) + advanced lipid panel |
| Stalled weight loss on diet alone? | GLP-1 + thyroid panel + DUTCH |

---

## Section 6 — Hormones → TRT/HRT + DUTCH

### Male
| Question | Trigger |
|---|---|
| Low libido, ED, weak morning erections? | ED track + full hormone panel |
| Loss of muscle mass, harder to build muscle? | Total/free T + IGF-1 + TRT eligibility |
| Decreased motivation, drive, competitive edge? | Full hormone panel |
| Fatigue despite adequate sleep? | Hormone + thyroid + ferritin |

### Female
| Question | Trigger |
|---|---|
| Cycle irregularity, PMS, perimenopause symptoms? | Full female panel + DUTCH |
| Hot flashes, night sweats, vaginal dryness? | HRT eligibility + DUTCH |
| Loss of libido? | Female hormone panel + clinician eval |
| Mood swings tied to cycle? | DUTCH + methylation (COMT) |

### Both
| Question | Trigger |
|---|---|
| Cold intolerance, hair thinning, weight gain, constipation? | Full thyroid panel (TSH/fT3/fT4/rT3/TPO/Tg) |

---

## Section 7 — Joint, musculoskeletal, injury → Genesis RPA + peptides

| Question | Trigger |
|---|---|
| Chronic joint pain (knee, shoulder, hip, back)? | **Genesis RPA intra-articular** + clinician eval |
| Diagnosed torn meniscus, labral tear, rotator cuff, ACL/MCL? | **Genesis RPA injection to joint — primary** |
| Osteoarthritis diagnosis? | **Genesis RPA + BPC-157 + clinician eval** |
| Recent injury not healing? | **Genesis RPA + BPC-157** |
| Tendon/ligament chronic issues (tennis elbow, plantar fasciitis, Achilles)? | BPC-157 + Genesis RPA candidacy |
| Post-surgical recovery, ongoing pain or stiffness? | **Genesis RPA** + BPC-157 + clinician eval |

---

## Section 8 — Sexual health → ED / hormone tracks

| Question | Trigger |
|---|---|
| ED — frequency, severity, duration? | ED track + hormone + cardiovascular workup |
| Decreased sensation or performance? | Hormone panel + clinician eval |
| Peyronie's, structural concerns? | Specialist referral + clinician |

---

## Section 9 — Inflammation, autoimmune, chronic illness

| Question | Trigger |
|---|---|
| Multiple unexplained symptoms post-viral (long COVID)? | **Genesis RPA IV/nebulizer** + advanced inflammation panel |
| Diagnosed autoimmune condition? | GI-MAP + zonulin + advanced inflammation + clinician eval |
| Chronic pain (fibromyalgia-like)? | Foundation labs + DUTCH + clinician eval |
| Mold/water-damage exposure history? | Mycotoxin panel + glutathione/NAC |
| Heavy metal exposure (occupational, dental, dietary)? | Heavy metals panel |

---

## Section 10 — Lifestyle context (informs protocol)

- Diet pattern (standard / Mediterranean / keto / vegetarian / etc.)
- Alcohol: drinks/week
- Tobacco / nicotine
- Caffeine intake
- Exercise frequency + type
- Sun exposure / outdoor time
- Subjective stress 1-10
- Social connection 1-10
- Tracked metrics (Oura, Whoop, Apple Watch, CGM, none)

---

## Section 11 — Genetic curiosity

| Question | Trigger |
|---|---|
| Want to know how you metabolize medications? | PGx panel |
| Want to know your Alzheimer's genetic risk? | APOE genotype + counseling protocol |
| Heard of MTHFR / methylation issues? | Full methylation panel |
| Done 23andMe / Ancestry and want clinical interpretation? | Genomic Blueprint upload + analysis |

---

## Section 12 — Diagnostics opt-ins (cash add-ons surfaced based on triggers)

- Foundation lab panel
- Gut + Brain panel (GI-MAP, SIBO, OAT, zonulin, oral microbiome, BDNF)
- Genomic Blueprint (methylation, APOE, PGx, detox SNPs, nutrigenomics)
- Hormone optimization panel + DUTCH
- Brain biomarkers (GFAP, p-tau 217, NfL)
- Cognitive baseline (Creyos)
- Home sleep study
- Mycotoxin / heavy metals
- CGM trial

---

## Output: AI-generated personalized report

Based on triggered solutions, the report renders:

1. **Top 3 priority issues** (ranked by symptom severity × on-thesis relevance × commercial fit)
2. **Recommended foundation:** always BiomeAxisForge if any gut/brain/cognitive trigger fires (which it almost always will)
3. **Recommended protocol path:** Discovery → Foundation onboarding → 4M program → Maintenance tier
4. **Recommended diagnostics bundle** (Foundation / Gut+Brain / Genomic / Hormone) based on triggers
5. **Marquee opportunity** (when triggered): Genesis RPA candidacy with explicit indication
6. **Pre-loaded cart** with one-click checkout
7. **Optional clinician message** to discuss the report

---

## Routing rules (for the AI agent)

- **BiomeAxisForge** is recommended for ≥80% of intakes (gut-brain framing covers most chief complaints). Default-on unless contraindicated.
- **Genesis RPA** is surfaced only with hard triggers (joint diagnosis, post-concussion symptoms, MCI/dementia, long-hauler) — never as a soft upsell.
- **GLP-1 track** triggers on BMI, waist, pre-diabetes, or stalled weight loss.
- **Hormone track** triggers on age + symptom cluster (men ≥35 + low T symptoms; women perimenopause symptom cluster).
- **Tier recommendation:**
  - 1-2 triggered domains → Foundation tier
  - 3-4 triggered domains → Optimization tier
  - Genesis RPA candidacy + ≥3 domains → Longevity tier
  - Complex case (multiple chronic issues, family history loaded) → Concierge consult
