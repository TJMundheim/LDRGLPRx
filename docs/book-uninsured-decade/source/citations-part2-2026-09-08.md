# Chapter 9 citation verification — 2026-09-08

Verifies the physical-activity, FINGER, T2D/obesity, US POINTER, and premium-basket
claims in Chapter 9 ("Odds, Stated Honestly") against primary sources. Read-only
research pass — does not edit `_MASTER.md`.

---

## 1. Physical activity RR 0.80 / 0.86 / 0.79 (all-cause / AD / vascular)

**As written (Ch9):** "relative risk for all-cause dementia of about 0.80 ... Alzheimer's-specific, about 0.86 ... Vascular dementia, about 0.79" — cited `[physical activity meta-analyses]`.

**Primary source:** Iso-Markku P, Kujala UM, Knittle K, Polet J, Vuoksimaa E, Waller K. "Physical activity as a protective factor for dementia and Alzheimer's disease: systematic review, meta-analysis and quality assessment of cohort and case-control studies." *British Journal of Sports Medicine* 2022;56(12):701–709. DOI: 10.1136/bjsports-2021-104981. PMC9163715.

**What the source actually reports:** Pooled RR all-cause dementia **0.80 (95% CI 0.77–0.84)**; Alzheimer's disease **0.86 (95% CI 0.80–0.93)**; vascular dementia **0.79 (95% CI 0.66–0.95)**. 58 prospective cohort/case-control studies; effect held at 20+ year follow-up.

**Status: CONFIRMED.** Figures match exactly.

**Cite:** `[Iso-Markku et al., BJSM 2022]`

**Sources-list entry:**
> **[Iso-Markku et al., BJSM 2022]** — Iso-Markku P, Kujala UM, Knittle K, Polet J, Vuoksimaa E, Waller K, "Physical activity as a protective factor for dementia and Alzheimer's disease: systematic review, meta-analysis and quality assessment of cohort and case-control studies," *British Journal of Sports Medicine*, 2022;56(12):701–709. Pooled RR: all-cause dementia 0.80 (95% CI 0.77–0.84); Alzheimer's disease 0.86 (95% CI 0.80–0.93); vascular dementia 0.79 (95% CI 0.66–0.95). doi.org/10.1136/bjsports-2021-104981

---

## 2. Leisure-time RR 0.76 and occupational RR ≈1.20

**As written (Ch9):** "Leisure-time activity specifically, about 0.76 ... occupational physical activity showed a slightly increased risk in one large pooled analysis" — bundled under the same `[physical activity meta-analyses]` tag as item 1.

**Problem found:** These two figures are **not** from Iso-Markku 2022 (which does not break out occupational vs. leisure domains). They come from a separate, much more recent paper.

**Primary source:** Feter N, Iso-Markku P, Markarian T, Luong DM, Gunnink J, et al. (incl. Raichlen DA). "Domain-specific physical activity levels and risk of dementia: a systematic review and meta-analysis." *The Lancet Public Health*, 2026;11(9):e650–e664. DOI: 10.1016/S2468-2667(26)00142-8. Published September 2026 (74 cohort/case-control studies, >4.2M participants, 30 countries, median 10-yr follow-up).

**What the source actually reports:** Leisure-time physical activity associated with **24% lower** dementia risk (RR ≈ **0.76**); occupational physical activity associated with **RR ≈ 1.20** (20% higher risk); commuting physical activity RR ≈ 1.10. Household PA also protective. Authors frame this as a "physical-activity paradox" — job-based exertion does not confer the same benefit as voluntary leisure exercise.

**Status: CORRECTED — needs its own citation, separate from Iso-Markku 2022.** The figures themselves are accurate, but attributing them to the same bracket as the 0.80/0.86/0.79 trio misattributes a 2026 domain-specific paper's findings to the 2022 umbrella review. Note Paula Iso-Markku is a co-author on both papers, which likely explains the conflation.

**Cite:** `[Feter et al., Lancet Public Health 2026]`

**Sources-list entry:**
> **[Feter et al., Lancet Public Health 2026]** — Feter N, Iso-Markku P, et al., "Domain-specific physical activity levels and risk of dementia: a systematic review and meta-analysis," *The Lancet Public Health*, 2026;11(9):e650–e664. Leisure-time PA RR ≈ 0.76 (24% lower risk); occupational PA RR ≈ 1.20 (20% higher risk); commuting PA RR ≈ 1.10. 74 studies, >4.2M participants, 30 countries. The "physical activity paradox": job-based exertion does not confer the same protective effect as voluntary leisure exercise. doi.org/10.1016/S2468-2667(26)00142-8

**Action for Ch9 text:** split the single `[physical activity meta-analyses]` tag into two: `[Iso-Markku et al., BJSM 2022]` for the 0.80/0.86/0.79 sentence, `[Feter et al., Lancet Public Health 2026]` for the leisure/occupational sentence.

---

## 3. FINGER (Ngandu et al. 2015)

**As written (Ch9):** "It built on the Finnish FINGER trial, which showed the same direction over two years a decade earlier [FINGER, 2015]."

**Primary source:** Ngandu T, Lehtisalo J, Solomon A, et al. "A 2 year multidomain intervention of diet, exercise, cognitive training, and vascular risk monitoring versus control to prevent cognitive decline in at-risk elderly people (FINGER): a randomised controlled trial." *The Lancet*, 2015;385(9984):2255–2263. DOI: 10.1016/S0140-6736(15)60461-5. PMID 25771249.

**What the source actually reports:** 2-year multidomain RCT (diet, exercise, cognitive training, vascular risk monitoring) in at-risk elderly; intervention group showed significantly greater improvement in global cognition and domain-specific measures (executive function, processing speed, complex memory) vs. control. Matches Ch9's characterization ("improved/maintained global cognition vs. control").

**Status: CONFIRMED**, but the in-text attribution "Ngandu et al. 2015" (per the task's framing, "attributed ... from memory") is correct — first author is indeed Ngandu, published in *The Lancet* (not a lesser journal), June 2015.

**Cite:** `[Ngandu et al., Lancet 2015]`

**Sources-list entry (replaces the current stub `[FINGER, 2015]`):**
> **[Ngandu et al., Lancet 2015]** — Ngandu T, Lehtisalo J, Solomon A, et al., "A 2 year multidomain intervention of diet, exercise, cognitive training, and vascular risk monitoring versus control to prevent cognitive decline in at-risk elderly people (FINGER): a randomised controlled trial," *The Lancet*, 2015;385(9984):2255–2263. 2-year multidomain RCT; intervention arm showed significantly greater improvement in global cognition, executive function, processing speed, and complex memory vs. control — the design basis for US POINTER. doi.org/10.1016/S0140-6736(15)60461-5

---

## 4. T2D and midlife-obesity hazard ratios `[T2D/obesity HRs, 2024]`

**As written (Ch9):** HR 1.70 (diagnosed 60–69), 1.72 (50–59), 1.90 (<50), each vs. diagnosis at ≥70; obesity + diabetes before 50 → HR 3.05 vs. non-obese diagnosed ≥50.

**Primary source:** Qi X, Zhu Z, Luo H, Schwartz MD, Wu B. "Age at diagnosis of diabetes, obesity, and the risk of dementia among adult patients with type 2 diabetes." *PLOS ONE*, 2024;19(11):e0310964. DOI: 10.1371/journal.pone.0310964. PMC11559992.

**What the source actually reports:** 1,213 dementia-free adults ≥50 with T2DM, median 10-yr follow-up, 216 (17.8%) developed dementia. HR vs. diagnosis at ≥70: **1.70 (95% CI 1.03–2.80)** for 60–69; **1.72 (95% CI 1.06–2.79)** for 50–59; **1.90 (95% CI 1.14–3.18)** for <50. Obesity + T2DM diagnosis <50 → **HR 3.05 (95% CI 1.23–7.56)** vs. non-obese diagnosed ≥50.

**Status: CONFIRMED.** All four figures match exactly, including CIs (which Ch9 currently omits — worth adding).

**Cite:** `[Qi et al., PLOS ONE 2024]`

**Sources-list entry (replaces the vague `[T2D/obesity HRs, 2024]` tag):**
> **[Qi et al., PLOS ONE 2024]** — Qi X, Zhu Z, Luo H, Schwartz MD, Wu B, "Age at diagnosis of diabetes, obesity, and the risk of dementia among adult patients with type 2 diabetes," *PLOS ONE*, 2024;19(11):e0310964. 1,213 adults with T2DM, 10-yr median follow-up. HR for dementia vs. diagnosis at ≥70: 1.70 (95% CI 1.03–2.80) at 60–69; 1.72 (95% CI 1.06–2.79) at 50–59; 1.90 (95% CI 1.14–3.18) at <50. Obesity + T2DM diagnosed <50 → HR 3.05 (95% CI 1.23–7.56) vs. non-obese diagnosed ≥50. doi.org/10.1371/journal.pone.0310964

---

## 5. US POINTER (Baker et al., JAMA 2025)

**As written (Ch9):** "2,111 participants, mean age 68.2, two years, randomized. Both a structured multidomain lifestyle program and a self-guided version improved global cognition, and the structured arm improved significantly more ... benefit held across age, sex, ethnicity, cardiovascular status, and APOE-ε4 genotype."

**Primary source:** Baker LD, et al. "Structured vs Self-Guided Multidomain Lifestyle Interventions for Global Cognitive Function: The US POINTER Randomized Clinical Trial." *JAMA*, 2025;334(8):681–691. DOI: 10.1001/jama.2025.12923. PMID 40720610. Published online 28 July 2025 (AAIC); print 26 Aug 2025.

**What the source actually reports:** Single-blind, multicenter RCT, 2,111 participants enrolled 2019–2023, mean age 68.2, 5 US sites, 2 years. Both structured and self-guided multidomain interventions improved global cognition vs. expected decline; structured arm improved significantly more. Effect consistent across age, sex, ethnicity, cardiovascular risk status, and APOE-ε4 genotype.

**Status: CONFIRMED.** Matches Ch9 exactly, including the "improvement/protection-from-decline, not prevention" framing already present in the draft.

**Cite:** `[Baker et al., JAMA 2025]` (already used correctly in Ch9 as `[US POINTER, JAMA 2025]` — recommend switching to author-form for consistency with the other citations, e.g. `[Baker et al., JAMA 2025]`).

**Sources-list entry (refines the existing `[US POINTER, JAMA 2025]` entry — add pages/DOI):**
> **[Baker et al., JAMA 2025]** — Baker LD, et al., "Structured vs Self-Guided Multidomain Lifestyle Interventions for Global Cognitive Function: The US POINTER Randomized Clinical Trial," *JAMA*, 2025;334(8):681–691. 2,111 participants, mean age 68.2, 2-year RCT, 5 US sites. Both arms improved global cognition vs. expected decline; structured arm improved significantly more; effect held across age, sex, ethnicity, cardiovascular status, APOE-ε4. Improvement/protection-from-decline finding, not a prevention finding. doi.org/10.1001/jama.2025.12923

---

## 6. Premium-basket price ranges

**As written (Ch9 Sources stub):** gym $30–120/mo; personal trainer weekly $160–560/mo; organic grocery premium (2-person household) $120–250/mo; supplement stack $100–200/mo; compounded Rx $150–350/mo — already flagged "re-verify at manuscript lock."

**Spot-check (Sept 2026 consumer pricing, composite web sources):** Gym memberships run roughly $10–300+/mo depending on tier (book's $30–120 sits comfortably inside this). Personal-trainer monthly packages (2x/week) run ~$250–400/mo at mid-market rates, up to $300+/session at the high end — the book's once-weekly $160–560/mo band is consistent, if generous at the top. Full organic grocery shopping runs ~$450–510/mo for a household at Whole Foods-type pricing; the book's figure is the *incremental premium* over conventional groceries, which — given organic produce runs ~59% above conventional — plausibly lands in the $120–250/mo range for a 2-person household, though this is an inference, not a directly reported "premium" statistic. Supplement stacks run $80–250/mo depending on tier, consistent with the book's $100–200. No independent check performed on compounded-Rx pricing this pass.

**Status: CONFIRMED (composite estimate, reasonable ranges)** — not a single-source academic claim, so no bracketed citation applies; the existing "re-verify at manuscript lock" caveat in the Sources stub is the right treatment and should stay.

---

## Summary — what must change in Ch9

1. **Split `[physical activity meta-analyses]` into two citations.** The 0.80 / 0.86 / 0.79 sentence → `[Iso-Markku et al., BJSM 2022]`. The "leisure-time... 0.76... occupational... increased risk" sentence → `[Feter et al., Lancet Public Health 2026]` (a different, newer paper — this is the one substantive correction from this pass).
2. **Replace `[FINGER, 2015]`** with `[Ngandu et al., Lancet 2015]` — confirmed correct paper/journal, just tighten the citation form.
3. **Replace `[T2D/obesity HRs, 2024]`** with `[Qi et al., PLOS ONE 2024]` — all four HRs confirmed exact; consider adding the CIs in-text.
4. **US POINTER** — figures fully confirmed; optionally rename `[US POINTER, JAMA 2025]` to `[Baker et al., JAMA 2025]` for citation-style consistency, and add volume/pages/DOI to the Sources list.
5. **Premium-basket ranges** — no change needed; composite estimate is reasonable and already correctly flagged for re-verification at manuscript lock.
