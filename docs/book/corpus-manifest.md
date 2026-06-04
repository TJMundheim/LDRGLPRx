# Source Corpus Manifest — "Begin with the End in Mind"

**Book:** *Begin with the End in Mind: Don't Lose Your Identity. You Still Have a Choice.*
**Author:** Dr. TJ Mundheim, DC — for My4MLife
**Built:** 2026-06-01
**Purpose:** Index of every source the next agent needs to draft chapter outlines. Not a digest. File paths + line ranges only.

---

## 1. 4M Framework — Canonical Source

### Brand wordmark + tagline (locked)
- **Wordmark:** `My4MLife` — single word, exact casing `M-y-4-M-L-i-f-e` (locked 2026-04-30; memory: `feedback_brand_wordmark.md`).
- **Tagline:** *"Begin with the end in mind."* — triple entendre: Covey goal-setting + Mind-as-destination + circular journey back to Mind (locked 2026-04-30; memory: `project_tagline.md`).
- **Positioning:** "lifestyle company giving you the best chance of having the best mind possible until your last day of life" — TJ verbatim, locked 2026-05-01 (memory: `project_brand_positioning.md`).
- On-site instantiation of tagline: `website/src/pages/about.astro:19-21` and `website/src/pages/index.astro:5` (page title).

### Canonical per-pillar definitions
The four `/pillars/*.astro` pages are the single canonical source for each M. Each has hero tagline + "Role of [pillar] in the 4M Framework" prose block + sub-topic grid + app-delivery + CTA chain. **Use these as primary source for the book's pillar chapters.**

| Pillar | File | Hero tagline | "Role" prose |
|---|---|---|---|
| Mind | `website/src/pages/pillars/mind.astro` | L22: *"The mind is what we're protecting."* | L34-42 (`<h2>The Role of Mind in the 4M Framework</h2>`) |
| Muscle | `website/src/pages/pillars/muscle.astro` | L22: *"Strong body, sharp mind. Resistance training is neuroprotection."* | L34-42 |
| Mitigate | `website/src/pages/pillars/mitigate.astro` | L18: *"Stop hurting yourself first. Then add what works."* | L31-37 (largest by surface area; gut-brain axis central) |
| Motivate | `website/src/pages/pillars/motivate.astro` | L22: *"What sustains the work — and what closes the loop."* | L36-41 (recursive engine; closes loop back to Mind) |

### Framework one-liner (from Mind L37)
> "Mind is both the start and the end of the 4M cycle. Begin with the end in mind. Every other pillar serves this destination… Muscle builds the physical infrastructure the brain requires. Mitigate removes the chronic insults driving neuroinflammation. Motivate sustains the compliance that makes the other three work. All roads lead back here."

This is the single passage to anchor the book's framing chapter.

---

## 2. Solutions Catalog

All files live under `website/src/pages/solutions/`. OTC/Rx product names pulled from `<FoundationStackPair>` props on each page.

### Mind pillar
| File | Summary | OTC | Rx | Signature framing |
|---|---|---|---|---|
| `cognitive.astro` | Brain optimization via methylated B-complex + nootropic peptides (Mind destination) | NeuroBridge / MitoVita (dev) | Nootropic peptide consult (Semax, Selank, Cerebrolysin, BPC-157) | "Mind is the destination" |
| `sleep.astro` | Sleep optimization; glymphatic clearance framing | SleepRestore | SleepRestore Rx (nattokinase) | "Two Paths to Act"; insulting behavior |
| `stress.astro` | Stress & resilience; cortisol/hippocampal-shrinkage thesis | — | — | Resilience as measurable physiology |
| `purpose-goals.astro` | Purpose as cognitive risk factor | — | — | Identity-as-brain-health |
| `peptides.astro` | Nootropic + GH + recovery peptides | ArmorVita + NeuroBridge | Practitioner peptide protocols | Two Paths |

### Muscle pillar
| File | Summary | OTC | Rx | Signature framing |
|---|---|---|---|---|
| `hormones.astro` | TRT & hormone optimization | ArmorVita (D3, K2, boron, astaxanthin) + HormoneBalance Foundation | Hormone consult / TRT | "Don't accept the slow drift"; 1%/year T decline |
| `weight.astro` | GLP-1 (semaglutide/tirzepatide) | — | GLP-1 telemed | Brain-healthy weight loss; visceral fat as neurotoxin |
| `pain-acute.astro` | Acute pain blocks training | — | — | Pain as Muscle-pillar threat |
| `pain-chronic.astro` | Chronic pain | — | — | Same |
| `nutrition.astro` | Whole-food / metabolic markers | — | Metabolic panel + plan | Protein-first rule |
| `nutritional-supplements.astro` | Stack hub | (multiple) | — | Foundation stack |
| `vitamin-d.astro` | D3 single-topic | ArmorVita | — | Sun-skin 50% decline by 70 |

### Mitigate pillar
| File | Summary | OTC | Rx | Signature framing |
|---|---|---|---|---|
| `gut.astro` | **Anchor** — leaky gut + gut-brain axis | Biome NS Ultra (L-glutamine, DGL, berberine, aloe, curcumin, zinc carnosine, A+D3) | Biome NS Rx (oral BPC-157 + L-glutamine + aloe) | "Gut-brain seal"; "fix the gut" L57 |
| `environment.astro` + `environment/*.astro` (air, water, light, EMF, grounding, sauna, cold-plunge, mineral-bath) | 8 sub-pages; affiliate-product band | (affiliate hardware: AirDoctor, AquaTru, TrueDark, TriField, Earthing, HigherDose, Polar Recovery) | — | "Eliminate the insulting behavior — environment" |
| `dental.astro` | Oral biome contiguous with gut | (Biome NS Ultra referenced) | — | Microbiome contiguity |
| `allergies.astro` | Mucosal barrier = immune tolerance | Biome NS Ultra | — | Gut-immune anchor |
| `substance-use.astro` | Alcohol/substance reduction | — | — | Cuts across all pillars |
| `chronic-conditions.astro` | Stacked chronic-disease patient | (Foundation Stack) | — | Two Paths |

### Motivate pillar
| File | Summary | OTC | Rx | Signature framing |
|---|---|---|---|---|
| `self-image.astro` | Identity reframe | — | — | "Make the protocol who you are" |
| `health-knowledge.astro` | Knowledge access | — | — | Compliance infrastructure |
| `financial-stress.astro` | Chronic cortisol from money stress | — | — | "No supplement can fully offset" |
| `healthcare-access.astro` | Access as barrier | — | — | — |
| `morning-routine.astro` | Daily ritual anchor | — | — | Sunrise walk = circadian anchor |

### Cross-pillar / canary
| `erectile-dysfunction.astro` | **ED canary** — first warning across hormones, CV, cognitive, QoL | ArmorVita + MitoVita (creatine + L-citrulline + beetroot + electrolytes) | ED Rx consult | "ED is the canary in the coal mine" (L9 title); L17-150 = 4-domain "why" structure (Hormones / CV / Cognitive / Quality of life) — **this is the strongest single source for a chapter on early-warning signals**. |

---

## 3. Audit / Assessment Material

The diagnostic chapter of the book maps to the live audit. Single source of truth:

- **Questions (10 total):** `website/src/data/audit-questions.ts:32-133` — 8 priority categories + already-diagnosed + alcohol. Each entry: `id`, `prompt`, `scoreGuide`, `categoryNote`, `solutionSlug`.
  - Canonical order: gut → sleep → weight → nutrition → ED → environment → cognitive → hormones, then already-diagnosed (#9), alcohol (#10).
- **Bonus map:** `audit-questions.ts:147-150` — `gut-microbiome` +2, `weight-body-fat` +2 (no others).
- **Override rule:** `website/src/lib/survey-scoring.ts:15-39` — `already-diagnosed >= 3` → auto #1; else ranked normally with raw+bonus.
- **App-side scorer (parallel):** `apps/clientportal/src/lib/data/audit.ts:1-151` — Likert 1-5 → 0-10 linear map + yes/no follow-up flags (+1 each, cap 10).
- **Live page wrapper:** `website/src/pages/assessment.astro:15-25` (hero), L18: *"Take the Free 4M Assessment"*, L19: *"10 quick questions. About 5 minutes. We'll show you your top 3 mitigating factors so you know where to start."*
- **Category notes (book-ready one-liners):** all 10 in `audit-questions.ts`, e.g.:
  - Gut L39: "The gut-brain axis sits underneath nearly everything else…"
  - Sleep L49: "Poor sleep silently degrades hormones, weight, mood, and memory."
  - Cognitive L99: "Mind is the destination of the 4M system…"

These category notes are the cleanest book-ready prose blurbs in the entire codebase. Recommend the diagnostic chapter quote them near-verbatim.

---

## 4. Protocol Material (Week 1 + cohort)

- **Week 1 single-source spec:** `docs/plan/week-1-spec.md` (357 lines) — vision/tone (L7-21), 6 actions across 4 pillars (L24-53), supplements list (L57-67), daily view layout (L72+). **This is the canonical "what to do Monday morning" source.**
- **App UI rendering:** `apps/clientportal/src/lib/components/TodayView.svelte` — tile copy + actions (the Week 1 spec made flesh).
- **Workbook renderer + Week 2 Mitigate picker:** `apps/clientportal/src/lib/renderer.ts` — has prose for prompts.
- **Intake content:** `apps/clientportal/src/lib/components/intake/` — Stage1Basics → Stage6Audit (8 files); category page at `intake/CategoryPage.svelte`.
- **Discovery / cohort progression:** `apps/clientportal/src/lib/data/discovery.ts`, `apps/clientportal/src/lib/components/discovery/`, `program/` directories.
- **30g protein-first rule:** memory `project_protein_first_rule.md` + Week 1 spec L34.
- **Eating window:** Week 1 spec L33 (9 AM – 6 PM) + `EatingWindowModal.svelte` / `EatingWindowPicker.svelte`.
- **Outcome questions (cohort-side):** `apps/clientportal/src/lib/content/outcomeQuestions.ts`.

---

## 5. Voice Samples — Dr. TJ from the website

Five of the highest-voltage passages, with file:line citations. Quote as authentic source for the book's voice.

1. **Founder bio lead** — `website/src/pages/about.astro:66-69`
   > "I built My4MLife because I'm living it. Every protocol you see in this program is one I run myself. The 4M framework is what I wish someone had handed me at 50… My4MLife isn't a clinic. It's a system. I'm here to teach it, refine it, and run it alongside you."

2. **The mission opener** — `about.astro:39-42`
   > "When your mind goes, everything else stops mattering. Most wellness platforms optimize for the things you can see in the mirror… None of them are working backwards from the destination that actually matters: cognitive longevity… The body is the delivery system. The mind is what we're protecting."

3. **Homepage hero punch** — `index.astro:79-81`
   > "Don't let cognitive decline rob you of your identity and your dignity! Take action now. Don't roll the dice."

4. **Gut page "why" reveal** — `solutions/gut.astro:57`
   > "When we say *fix the gut*, we don't mean drink kombucha. We mean specific strains, specific delivery, specific protocol, run for a specific length of time — which is exactly what Biome NS Ultra (and Biome NS Rx for deeper cases) is built to do."

5. **ED canary cardiovascular passage** — `solutions/erectile-dysfunction.astro` ("2. Cardiovascular" block, approx L55-65)
   > "The penile arteries are roughly 1–2 mm in diameter. The coronary arteries are 3–4 mm. Endothelial dysfunction… narrows the smaller arteries first. That is why ED often precedes overt cardiovascular disease symptoms by 3 to 5 years. An erection problem in your forties or fifties is a stress test the body is running on itself, and reporting back the results."

6. **Mitigate framework block** — `pillars/mitigate.astro:36` — the closed-loop microbiome ↔ visceral fat ↔ neuroinflammation passage. Use verbatim.

---

## 6. Recurring Brand Language — Catalog

| Phrase | Where it appears |
|---|---|
| "Begin with the end in mind" | `about.astro:19`, `index.astro:5` (title), `docs/plan/week-1-spec.md:1`, `pillars/mind.astro:27`, every page footer (via Footer.astro) |
| "Eliminate the insulting behavior" | `blog/eliminate-the-insulting-behavior-{gut,sleep,weight,cognitive,environment,hormones,peptides}.astro` (7 dedicated posts), `pillars/mitigate.astro:33` |
| "Mind is the destination" / "what we're protecting" | `about.astro:41`, `pillars/mind.astro:22`, `audit-questions.ts:99` |
| "ED is the canary in the coal mine" | `solutions/erectile-dysfunction.astro:9` (title), `blog/canary-in-the-mine-erectile-dysfunction.astro` |
| "Gut-brain seal" / "NS = NeuroSeal" | `solutions/gut.astro:14,19`, every Biome NS product description; required fine print per `project_biome_ns_restructure.md` |
| "The 4 Ms" / "4M framework" | `about.astro:21`, `pillars/*.astro` (all four), `assessment.astro:18`, `solutions/erectile-dysfunction.astro:134` ("How… touches all 4 Ms") |
| "Don't roll the dice" / "Take action now" | `index.astro:81` |
| "Stop hurting yourself first. Then add what works." | `pillars/mitigate.astro:18` |
| "Two Paths to Act" / "Two Paths" (OTC vs Rx) | `components/TwoPathsCTA.astro`, `MiniTwoPaths.astro`, `FoundationStackPair.astro`; appears in nearly every solution page |
| "Strong body, sharp mind. Resistance training is neuroprotection." | `pillars/muscle.astro:22` |
| "What sustains the work — and what closes the loop." | `pillars/motivate.astro:22` |
| "1% per year T decline after 30" | `solutions/hormones.astro:71` |
| "Keto Cattle Baron" (TJ cooking alias) | Memory only (`feedback_voice_dr_tj_and_team.md`) — **not yet on site**; book may want to use |
| "Best mind possible until your last day of life" | `about.astro:20` (mission statement verbatim) |

---

## 7. Finder Docs — Off-Repo Source Material

All times approximate from `stat`. ⭐ = strongest candidates for direct excerpt mining.

### Cohort week decks (PPTX) — ⭐ map 1:1 to book's pillar chapters
| Path | Size | Mod | Likely contents |
|---|---|---|---|
| ⭐ `~/Downloads/4M_Week1_Mitigate_FINAL.pptx` | 291 KB | 2026-04-13 | Week 1 Mitigate cohort deck (also `_UPDATED.pptx`) |
| ⭐ `~/Downloads/4M_Week2_Muscle_FINAL.pptx` | 136 KB | 2026-04-13 | Week 2 Muscle cohort deck |
| ⭐ `~/Downloads/4M_Week3_Mind_FINAL.pptx` | 174 KB | 2026-04-13 | Week 3 Mind cohort deck |
| ⭐ `~/Downloads/4M_Week4_Motivate_FINAL.pptx` | 268 KB | 2026-04-13 | Week 4 Motivate cohort deck |
| `~/Downloads/4M_Week{1-4}_*_UPDATED.pptx` | — | — | Later iteration; compare against FINAL |

### Sales / presenter scripts — ⭐ Tier 0 avatar voice source
| Path | Size | Mod | Likely contents |
|---|---|---|---|
| ⭐ `~/Downloads/4M_Sales_Presentation_PRESENTER_1.pptx` | 497 KB | 2026-04-19 | Sales presentation deck (the Tier 0 source per memory `reference_sales_deck.md`) |
| ⭐ `~/Downloads/4M_Presenter_Script.pdf` (and `_1.pdf`) | 2.6 MB | 2026-04-19 | Full presenter script — **likely the richest narrative-voice source** |

### Workbooks — ⭐ Month 1 progression
| Path | Size | Mod | Likely contents |
|---|---|---|---|
| ⭐ `~/Downloads/4M_Month1_Workbook_COMPLETE.pdf` (and `_1.pdf`) | 246 KB | 2026-04-13 | Final Month 1 workbook — chapter-structure analog |
| `~/Downloads/4M_Month1_Workbook.pdf`, `_v2.pdf`, `_v2_1.pdf` | — | — | Earlier iterations |
| ⭐ `~/Downloads/4M_Digital_Workbook_v2_14.html` | 143 KB | 2026-04-20 | Latest digital workbook (v14); HTML — easiest to grep |
| `~/Downloads/4M_Digital_Workbook_v2_{1..13}.html` | — | — | Iterative history; v14 supersedes |
| `~/Downloads/4M_Digital_Workbook_light.html`, `_1.html`, `.jsx` | — | — | Lighter/JSX variants |

### Brand / marketing
| Path | Size | Mod | Notes |
|---|---|---|---|
| `~/Downloads/4M_Master_Sales_Page.html` (+ `_1.html`) | 60 KB | 2026-04-16 | Master long-form sales page |
| `~/Downloads/4M_Sales_Page.html` | — | — | Earlier version |
| `~/Downloads/4M_Marketing_Playbook.html` | 44 KB | 2026-04-15 | Marketing playbook |
| `~/Downloads/4M_Movement_Blueprint{,_1,_2,_3}.html` | — | — | 4M Movement (back-burner nonprofit) — likely SKIP for book |
| `~/Downloads/4M_MASTER_HANDOFF_3.md` | 17 KB | 2026-04-27 | Master handoff — index pointer |
| `~/Downloads/4M_Brand_Ownership_Page.html` | — | — | Brand/domain — likely SKIP |
| `~/Downloads/4M_Domain_Availability_Report{,_1,_2}.html` | — | — | SKIP — operational |
| `~/Downloads/4M_Website_index.html` + `~/Downloads/4m-website/*.html` (enroll/about/supplements/program/clinical) | — | — | Pre-Astro static site — may have legacy copy worth mining for voice |

### Aggregated 4M docs
| Path | Size | Mod | Notes |
|---|---|---|---|
| `~/Downloads/4M.pdf`, `4M_1.pdf`, `4M_2.pdf` | — | — | Unknown variant PDFs — open first; could be deck exports |
| `~/Downloads/4M_1 (1).pdf`, `(2).pdf`, `(3).pdf` | — | — | Duplicates / variants |
| `~/Downloads/M4_Course_Package.docx` | — | — | Course package (note: M4 not 4M — possibly older naming) |
| `~/Documents/Collateral/_Old/4M_Digital_Workbook_v2_14.html` | — | — | Archived copy of v14 |

### Product / brochure source
| Path | Size | Mod | Notes |
|---|---|---|---|
| ⭐ `~/Documents/Under Development/Reta Marketing/BiomeAxisForge_Patient_Brochure.pdf` | 6 KB | 2026-04-23 | BiomeAxisForge patient brochure — flagship product narrative |
| `~/Downloads/BiomeAxisForge_Brochure_2.pdf` | — | — | v2 |
| `~/Desktop/Development/BiomeAF.pdf` | — | — | BiomeAF |
| `~/Downloads/BiomeAF green.pdf` | — | — | Variant |
| `~/Documents/Under Development/Reta Marketing/BIOME-AF_Patient_Brochure.pdf` | — | — | Hyphenated variant |
| `~/Documents/Under Development/Reta Marketing/Retatrutide_Patient_Brochure.pdf` | — | — | Retatrutide brochure (Reta = retatrutide) |
| `~/Downloads/GLOW_Peptide_Brochure.pdf` | — | — | GLOW peptide brochure |

### Other
| Path | Notes |
|---|---|
| `~/Documents/AI_Operations_Plan_THE4MLIFE.pdf` | AI ops plan (operational, not for book) |
| `~/Documents/my4mlife-homepage-redesign-handover.md` | Redesign handoff |
| `~/Downloads/My_4M_Life_*.docx` (NPP, Patient Auth, AI Comm Consent, BAA) | Legal — SKIP for book |
| `~/Downloads/chatHandoff .zip` | Unknown handoff archive |
| `docs/4m_deck_extract.txt` (in repo) | Already-extracted deck text — **check first before opening PPTX** |
| `docs/intake_questionnaire.md` (in repo) | Intake doc |
| `docs/operating-model.md` (in repo) | Operating model |

**Recommended Finder dig order for next agent:**
1. `docs/4m_deck_extract.txt` (already extracted)
2. `~/Downloads/4M_Presenter_Script.pdf` (TJ voice, full narrative)
3. `~/Downloads/4M_Month1_Workbook_COMPLETE.pdf` (chapter analog)
4. `~/Downloads/4M_Digital_Workbook_v2_14.html` (easiest to grep)
5. Four Week_X_FINAL.pptx decks (pillar-chapter scaffolds)
6. `~/Downloads/4M_Master_Sales_Page.html` (sales narrative voice)
7. BiomeAxisForge brochures (flagship-product chapter)

---

## 8. Notable Gaps

The corpus is strong on pillar definitions, the audit, product positioning, and Mitigate. It is weak on:

1. **Opening hook / fear chapter.** The homepage hero (`index.astro:79-81`) and the about mission (`about.astro:39-42`) gesture at the dignity-loss fear, but no long-form passage develops it. Book needs an opening chapter that lives in the dread of cognitive decline — written, not borrowed.
2. **Transition / connective tissue between pillars.** Every pillar page stands alone; nothing walks the reader from Mind → Muscle → Mitigate → Motivate as a single argument. The book needs interstitial chapters or a "how the pillars hand off to each other" thread.
3. **Closing chapter — call-to-action + handoff to assessment + app.** The website has CTAs everywhere but no narrative resolution. The book needs a closing chapter that returns to "Begin with the end in mind" and physically routes the reader to `/assessment` and the app.
4. **TJ's personal story / clinical anecdotes.** `about.astro:66-69` is the only first-person founder voice on the site. The book lives or dies on personal narrative; the Presenter Script PDF is the most likely Finder source.
5. **"Why now / why men over 50" demographic chapter.** Memory has rich context (peak-power demographic, the 50-65 mental model from Week 1 spec L18) but no website page or doc develops the reader-identity argument at length. Book needs a chapter that names the reader explicitly.
6. **Motivate-pillar depth.** Pillar page is the shortest of the four; sub-topic pages (`self-image`, `financial-stress`, `purpose-goals`) are thin. Likely the weakest pillar to draft from website alone — lean heavily on Week 4 PPTX + cohort workbook.

---

**End of manifest.** Total scanned: 4 pillar pages + 24 solution pages + 9 blog posts + audit/scoring + Week 1 spec + 70+ Finder candidates indexed.
