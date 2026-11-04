# Logbook vs app audit, with women's coverage (2026-11-04)

**Scope.** Read-only audit of The Logbook (`docs/cohort-workbook/draft/_MASTER.md`, the v11 source) against the live app (`apps/clientportal`). Nothing was edited, committed, or deployed except this report.

**Line numbers** are from the files as read today. The v11 change only touches electrolyte wording on the same lines, so they should hold. Apply edits by matching the string, not the line.

## Bottom line

- **The app is not at the Logbook's version, and the Logbook is not at the rules' version.** There are **32 protocol mismatches** (§1): 25 MUST-FIX, 7 NICE-TO-HAVE. Neither surface is simply right. The Logbook is wrong on gut timing. The app is wrong on eating-window hours, electrolytes, and assessment scale.
- **Two more print-rule violations** sit outside the mismatch count (§1b): brand names in print, and BPC-157 tied to the proprietary gut prescription.
- **Women's coverage is strong in Week 3 of both surfaces and thin nearly everywhere else.** A woman with `sex` unset does see her track. But nothing on the app's dashboard points her to it, her top-priority Hormones factor hands her weight-loss actions, and a high Q18 score can show her an "erectile dysfunction" pill.
- **The v11 PDFs being produced now do not contain these fixes.** Applying the Logbook MUST-FIX list means a re-render.

## Decisions only TJ can make

| # | Decision | Why it blocks | My recommendation |
|---|---|---|---|
| D1 | The real Zoom slot | Logbook prints Wed 7:00 PM **CT**; the ops-agent config and book say Wed 7 PM **Eastern**; `renderer.ts:2157` says Sunday; `holes-audit-2026-11-01.md` #21 found the Events table has 0 rows and no Zoom scheduled. "Wednesday" appears on 19 Logbook lines. | Take the clock time out of print. Keep "Wednesday" only if TJ commits to it. |
| D2 | Strength count | Book and Logbook say 2–3 a week. `program.ts` scores 4 (TJ 2026-07-06, "3–4×"). App copy says 3 and 4 on different pages. | Align the app to 2–3. Book v25 is already submitted on KDP. |
| D3 | Program length | Logbook says "four-month cohort". App says "Week N of 12". | Print twelve weeks, and leave Month 4 as what comes after. |
| D4 | Pregnancy and conception line | Neither surface mentions it, and a protocol with fasting, a supplement stack, and Rx lanes now centers on women around 42. Wording is not in the book. | Add L14 after TJ approves the wording. |
| D5 | Fasted training during the transition | Logbook prescribes fasted training for everyone. The book has no women's note on fasting. I did not invent one. | TJ's clinical call: does the guidance change if a woman's sleep worsens on it? |
| D6 | Can a partner prescribe menopause hormone therapy today? | Logbook 2018 and 3087 promise a live prescriber visit. The 2026-09-02 plan listed the women's line as "when partner prescribes", and the site is in coordinator mode. I could not confirm fulfillment from the repo. | Confirm before print. |

---

## 1. Protocol mismatch table

**L** = `_MASTER.md` line. **Fix** points to the edit in §3 (L = Logbook, A = app).

| # | Item | Logbook says | App says | Right per rules | Fix | Rank |
|---|---|---|---|---|---|---|
| 1 | Eating window hours | 9 AM–6 PM (L609, L539, trackers) | Dashboard 9–6 (`program.ts:42`), but tabs say **14:10, last meal before 7 PM** (`renderer.ts:1269, 1290, 1307, 1724, 1866, 2114`) and first meal 10–10:30 AM (`:2119`) | 9–6 (`project_protein_first_rule`) | A3 | MUST |
| 2 | Eating window frequency | "Daily", tracked /7 (L609) | 5 of 7, two off-days allowed (`program.ts:42, 183–186`; `MissionControl.svelte:380`) | 5 of 7 is the scored floor; daily is the aim | L21 | NICE |
| 3 | First-meal protein | L608 "Thirty grams"; 30–40g everywhere else | 30–40g (`program.ts:43`) | 30–40g | L2 | MUST |
| 4 | Protein-first frequency | L608 "Two times this week, minimum"; trackers daily | Daily, Week 3 Move 7× | Every fast-break | L2 | MUST |
| 5 | Daily protein target | Absent; L1386 counts "/21 feeding-window opens" | 1 g/lb ideal weight (`renderer.ts:642, 1037`), but **× 0.9** in `factors.ts:208`, which renders live | 1 g/lb ideal weight (`feedback_carry_forward_rule`) | A12, L2 | MUST |
| 6 | Gut product timing | **Empty stomach, 30 min before food** (L635, 662–842, 1003, 1282, 2060, 2493, 2936) | With or right after first meal (`supplements.ts:28`, `program.ts:41`) | **App.** The Logbook has the wording the rule calls wrong (`project_biome_timing_rule`) | L1 | MUST |
| 7 | Gut product itself | 1 scoop plus an ingredient list (L635, 2937–2938, 2941) | "Start Biome NS Ultra" (`program.ts:41`, `MissionControl.svelte:117`, `logParse.ts:59`), 1 scoop | Neither. Ultra is not in inventory; the current step is the two-product kit on /stack (`project_gut_kit_interim`) | L1, A7 | MUST |
| 8 | Creatine | Week 1 card correct (L637); Part 7 says only "With breakfast" (L2964); **trackers for Weeks 2–4 have no creatine row** | Note matches protocol (`renderer.ts:2213`) | Training days around the lift; otherwise breakfast | L13 | MUST |
| 9 | Electrolytes | "Zero-sugar, low-sodium", half before, half after (L638) | **Ultima Replenisher, zero calories, 55 mg sodium** (`renderer.ts:2211, 2218`). Only the dead `TodayView` got updated. | Dr. Berg, say "zero sugar" not "zero calories" (`project_electrolyte_protocol`) | A2 | MUST |
| 10 | Month 1 stack | Six products plus electrolytes | Panel shows Biome only (allowed by rule, `renderer.ts:2183`), yet says "full 7-supplement brain stack" (`:1626`), "Full Supplement Stack" (`weeks.ts:47`), "new supplements" (`:1787`), and "no additions this month" (`:1773`) | /stack is the bridge. The difference is allowed; the app's self-contradiction is not. | A5 | MUST |
| 11 | Walk | 8–15 min; "two times minimum" (L607); trackers daily | Fasted walk 2× (5× as the Week 6 Move), plus an undefined daily "Morning routine" row (`MissionControl.svelte:120, 122`) | 2× standing, daily is better | L22, A17 | NICE |
| 12 | Strength count | Week 1: 2; Week 2 on: 3; "2–3" (L539, 612, 1114) | Goal 4× (`MissionControl.svelte:121`), "3–4×" (`renderer.ts:1004`), "3 sessions" (`:319`), "4 sessions" (`:1724`) | Unsettled, see D2 | A8 | MUST |
| 13 | Strength content | Compound A/B lifts with load (L1143–1157) | Week 1 countertop push-ups (`renderer.ts:1004`); Week 2 KOT playlist (`:1266, 1307, 1366`) | Logbook and book; keep the app's version as the beginner option | A8 | MUST |
| 14 | Sleep anchors | Lights out 10:30, wind-down 9:30, room 65–68°F (L610, 1246–1253) | No lights-out anchor anywhere live; first sleep Move is Week 8 | Logbook | A17 | NICE |
| 15 | Weekly Move vs weekly page | Week 1 Foundation, Week 2 Add the Lift, Week 3 Hormones, Week 4 Mitigate/Synthesize | Moves: Week 1 Biome, Week 2 window, Week 3 protein, Week 4 pantry purge (`program.ts:41–44`) | Both are legitimate; nothing connects them | L6 | MUST |
| 16 | Week titles and focus | As above | Week 1 "Mind: Full Supplement Stack" while the page says gut; Week 3 banner "Mitigate", body "Deep focus is Mind"; Week 4 "Motivate" (`weeks.ts:47, 65, 77`; `renderer.ts:1625, 1729`) | Logbook | A5 | MUST |
| 17 | Program length | "four-month cohort", "next four months" (L89, 97, 149, 249); table through Month 4; 12-week Zoom log (L3792) | "Week N of 12" (`MissionControl.svelte:309`) | App, see D3 | L7 | MUST |
| 18 | How a week advances | "Attendance is the single mechanism that unlocks Week 2" (L616) | Calendar alone since 2026-10-30 (`program.ts:108`), but `renderer.ts:929` still says the attest unlocks it and **prints a developer note** to members | Calendar | L3, A4 | MUST |
| 19 | Measurements | 5 numbers, monthly: weight, waist, RHR, sleep, drinks (L478–486). No BP or SpO₂. | 6 numbers, daily, charted weekly: BP sys/dia, pulse, SpO₂, weight, waist (`MissionControl.svelte:162`) | App. Rule requires baseline plus weekly, in the Logbook too (`project_weekly_vitals_strategy`) | L8 | MUST |
| 20 | Assessment scale | 0–5 (L255) | 0–5 on review (`:2262`), but **0–10** on Week 2, 3, and 4 re-scores (`:1237, 1678, 1930, 1936`), "/10" (`:981`), "/50" and "of 10 categories" (`:729, 744, 1810`). Week 4 subtracts 0–5 from 0–10, so **the delta is wrong**. | 0–5, /100 | A6 | MUST |
| 21 | Month-end re-rate | L2642 "**0 = wrecked, 5 = excellent**", the opposite of Part 1 "0 = no issue, 5 = daily problem" (L256), and most rows have no Part 1 baseline | Lower is better | Part 1's scale. As printed, a reader's delta reads backwards. | L9 | MUST |
| 22 | Name of the weekly score | "MindSpan Score this week (from your app home screen)" (L1085, 1456, 2356, 2875) | Home screen says "Protocol Score — this week", higher is better (`MissionControl.svelte:313`). MindSpan is the assessment, lower is better. | App (commit 82e17071) | L10 | MUST |
| 23 | Zoom day and time | Wed 7:00 PM CT, links each Tuesday (L3788, 3822) | "Wednesday evening — link arrives by email" (`MissionControl.svelte:464`) | Unknown, see D1. No print time is safest. | L4 | MUST |
| 24 | Sunday Zoom | None; Sunday is solo reflection | "before each Sunday Zoom" (`renderer.ts:2157`) | Conflict, see D1 | A9 | MUST |
| 25 | App features the Logbook names | "Tap *Rx Consults*", "*Stack* → *Manage*", app thread, app community, app messaging (L3780, 3788, 3823–3824, 3830–3831) | **None exist.** Sidebar: Dashboard, Weeks 1–4, Regenerative, Settings. Also `factors.ts` "My4MLife App community" renders live. | Point to /consult and /stack | L5, A12 | MUST |
| 26 | Rx routing table | "Hormones… Q8 ≥ 3", "Weight Q3", "Gut Q1", "Cognitive Q7", "Diagnosed Q9 ≥ 3" (L3772–3777), all from the retired question set | Assessment has 20 categories; Hormones is Q17, Sexual function Q18, Weight Q8, Gut Q16, Cognitive Q1 | Current numbering. Also L3789–3790 cite the wrong Parts. | L5 | MUST |
| 27 | Women's ten markers | Includes muscle and strength response (L1839); no duplicate | Different set and order: no muscle response; brain fog and memory slips duplicate each other (`renderer.ts:1401–1412`) | Logbook | A10 | MUST |
| 28 | "/100" self-audit total | Men's #4 and women's #9 have no 0–10 rating (L1560, 1865), so the max is 90 | Both rated 0–10 (`renderer.ts:1392, 1404`) | App | L11 | MUST |
| 29 | When you name your face | Before Week 1, required (L109) | Also a Week 9 Move, "Name your face" (`program.ts:49`) | Logbook (`project_accountability_target_framing`) | A17 | NICE |
| 30 | Retired trackers | Week 1 says no cold plunges (L619) | "COLD SHOWERS" and "MORNINGS DONE" stats stuck on retired trackers (`renderer.ts:731–732, 2325`; `Sidebar.svelte:63–64`) | Retired 2026-07-06 | A17 | NICE |
| 31 | Advanced items | Zone 2 not in Week 1 (L619); heat and cold only after 90 days (L36, 3168) | Zone 2 and HIIT optional in Week 1 log (`renderer.ts:265`); heat or cold is the Week 10 Move (`program.ts:50`) | Minor; reader confusion only | No edit proposed | NICE |
| 32 | "Person at" age | "the person you want to be at 85", a prompt Part 1 never asks (L2787) | "at age 70" (`sex.ts:69, 88, 108`) | Pick one; fix the Logbook's false callback | L22 | NICE |

### 1a. Confirmed consistent or an allowed difference

Default window on the dashboard (9–6). Fast broken after morning training. Creatine 5 g with half a scoop of electrolytes before the lift and half after. Week 3 women's lab list (`renderer.ts:1425` matches L1911–1931). Men's ten markers (`renderer.ts:1388` matches L1521–1636). Consult lanes (`renderer.ts:1384–1385`, `consult.astro:776`). Brand names in the app vs generic names in print. App-only extras: daily reading habit (`renderer.ts:2062`), strength retests, voice log.

### 1b. Print-rule violations found along the way

**Brand names still in print** (`project_protocol_debrand_print_artifacts`): HigherDose, Polar Recovery, Earthing (L3319–3323), TrueDark (L1248, 3335, 3343), AirDoctor, AquaTru (L3337–3339), Magtein (14 lines), Kaneka QH (L2982), Polar/Whoop/Oura (L3272), BrainHQ (L3223), Boston Heart, Cleerly, Galleri (L3387–3389). The rule names HigherDose and Polar Recovery explicitly. Fix: L15.

**BPC-157 tied to the proprietary gut prescription** (`project_biome_ns_rx_proprietary_moat`, the one forbidden move): L3049, L3145, L3188. Independent BPC-157 mentions (L3778) are fine under the 2026-09-30 clarification. Fix: L16.

---

## 2. Women's coverage

### 2a. Where it appears, and who sees it

| Topic | Logbook | App (live code) | Does she see it? |
|---|---|---|---|
| Program intro | L49–57 "The medicine is for everyone"; L57 "women run the perimenopause/menopause track" | Not stated. Spine sentence absent from the app; identity line only on sign-in (`EmailEntry.svelte`) | Print yes; app no |
| Baseline symptoms | L432 "for women, cycle changes, hot flashes, night sweats"; L438 "first sign of the perimenopausal transition" | Assessment, website: only the sexual function note names it (`audit-questions.ts`); Q17 prompt does not (`:220`) | Partly; the retake at L3650 and the website both drop it |
| Pillar anchor | L549 "the perimenopause/menopause cluster for women" | None | Print only |
| Self-audit | §5.2b L1751–1894, ten markers | `renderer.ts:1401–1412`, ten markers | Yes on both |
| Mechanism | L1489–1499 estrogen as a neurological hormone, timing, "nobody honest will tell you…" | `renderer.ts:1577–1583` estrogen and the cluster. **No** timing window, no "does not prevent dementia" | App is thinner |
| Four-domain worksheet | §5.3b L1898–1998, including apnea, CVD, dementia worry, avoidance | **None**, only markers, labs, and a decision (same for men) | Print only |
| Labs | L1911–1917, L2018 | `renderer.ts:1425–1438`, `:1586`; `sex.ts:59–64` | Yes on both |
| Annual panel | §8.6 L3353–3359 is a male-shaped list: **no progesterone** | None | Gap |
| Prescriber path | L1996–1998, L2018, L3087 care coordinator at my4mlife.com; then **L3780, L3824 send her to a tab that does not exist**, and L3772 routes on the wrong question | `renderer.ts:1385, 1495–1498`: button to `/consult?lane=menopause-hrt`, which resolves (`consult.astro:638, 776`) | App works; print path dead-ends at §9.2 |
| Hormone therapy card | L3082–3091, including non-hormonal options and contraindications | **None**: no non-hormonal options, no contraindications | Print only |
| Stack note | L3089 K2 and creatine for women, buried in the Rx card | `sex.ts:59–64`, Week 3 and Regen tabs only | Partly |
| Pairing matrix | TRT row (L3150), **no hormone-therapy row** | n/a | Gap |
| Week 4 audit | §6.2 Hormones L2433–2441: **no women's items** | None | Gap |
| Month-end | L2653 "Libido / sexual function" only | None; Week 3 inputs overwrite on re-rate, despite "reassess with this same page" | Gap, both sexes |

### 2b. How sex-branching behaves (verified)

- **Capture.** The assessment requires Woman or Man (`assessment.astro:668–677`). `/women` pre-fills it (`women.astro:98`). The lambda stores it and never overwrites with blank (`audit-complete/handler.ts:92, 416`). The app loads it (`App.svelte:682`) and passes it to the renderer (`:179`).
- **Sex unset** means profiles from before 2026-09-22. `who()` returns the paired copy and **both tracks** (`sex.ts:105–123`), matching print. Tested at `renderer.sex.test.ts:62`. **She does see it.** Two weak spots: the ED worksheet comes first (`renderer.ts:1593`) with no "skip to yours" pointer like the Logbook's, and there is no way to set or correct sex in the app (`SettingsView` has no field and the upsert input lacks `sex`).
- **sex=female** sees only her track; **sex=male** sees only his. Tested (`renderer.sex.test.ts:40, 54`). I ran the sex and program tests: **42 passing**.
- **Dead code.** These are not imported anywhere, so their men-first wording does not reach members: `LockedGate.svelte:11, 14` ("Erectile + libido", "Hormones / TRT"), `TodayView.svelte`, `renderConsultCTA` and `factorDetail` in `renderer.ts`, `content/products.ts`, `content/labs.ts`, `content/pillars.ts`, `content/nutrition.ts`, `outcomeQuestions.ts`, and the `tools`/`adv` fields of `factors.ts` ("most men", "Good Men Project"). Do not spend edits there. If any is revived, sweep it first.

### 2c. Gaps, ranked

1. **"Erectile dysfunction" on a woman's dashboard.** `FACTOR_LABELS` keys `ed` and `hormones` never match real ids, so `erectile-dysfunction` falls through to the raw id (`MissionControl.svelte:76, 97`). Any woman with Q18 in her top 3 sees it; at a score of 3 or more it reads "highest priority". Fix A1.
2. **Hormones as a top priority gets weight-loss actions.** `'hormone-balance': 'Excess body fat'` and `'erectile-dysfunction': 'Physical inactivity & injuries'` (`renderer.ts:1106–1107`). The catalog has no hormone factor. Fix A11.
3. **Nothing on the dashboard points to Week 3.** Week 3's Move is protein-first, and the canary block sits below four pillar cards (`renderer.ts:1776`). She can finish Week 3 and never open it. Fix A5, A13.
4. **Print path dead-ends** (rows 25, 26). Fix L5.
5. **No target for her in Part 1.** L206 and L214 offer "morning erection frequency", with nothing for her. Fix L12.
6. **Symptoms vanish after Week 3, in both surfaces.** Men get no ongoing tracking either, but hot flashes, night sweats, and night wakes are the things she most wants to see move. Fix L9 (re-rate), A14 (tracker).
7. **App lacks the non-hormonal and contraindication language** the Logbook and book carry. Fix A10.
8. **Women past menopause, or with no cycle to read.** App title says perimenopause only; neither surface handles hysterectomy, ablation, a hormonal IUD, or already being on hormones. Fix L11, A10.
9. **Lab panel.** No progesterone, and ferritin is framed as "men over 50". Fix L17.
10. **Book content missing from Logbook:** two-thirds of Alzheimer's cases are women; alcohol's different effect, and its link to night sweats and breast cancer; endocrine disruptors; caregiver load; bone. Fix L18–L20.

---

## 3. Exact edits

### 3a. Logbook, MUST-FIX (in priority order)

**L1. Gut timing and product.** Rule: with or immediately after first meal.

| Line(s) | Old | New |
|---|---|---|
| 611 | `Anchored on the gut-barrier probiotic in the morning.` | `Anchored on the gut-barrier probiotic with your first meal.` |
| 635 | `\| **AM — empty stomach, 30 min before food** \| Gut-barrier probiotic (the gut-brain seal) \| 1 scoop in 8 oz water \|` | `\| **With or right after your first meal** \| Gut-barrier probiotic (the gut-brain seal) \| As labeled; see my4mlife.com/stack \|` |
| 662, 692, 722, 752, 782, 812, 842, 2493 | `Gut-barrier probiotic (AM, empty stomach)` | `Gut-barrier probiotic (with first meal)` |
| 1003 | `every morning on an empty stomach` | `every day with your first meal` |
| 1073 | `Gut-barrier probiotic (AM)` | `Gut-barrier probiotic (first meal)` |
| 1282 | `- ☐ Gut-barrier probiotic on empty stomach, 8oz water` | `- ☐ Gut-barrier probiotic with first meal` (move below line 1283) |
| 1445 | `AM stack (gut-barrier probiotic` | `Daily stack (gut-barrier probiotic` |
| 2060 | `Gut-barrier probiotic — AM, empty stomach, 8oz water` | `Gut-barrier probiotic — with first meal` |
| 2079, 2098, 2116, 2135, 2152, 2169, 2332, 2864, 2886 | `Gut-barrier probiotic AM` | `Gut-barrier probiotic (first meal)` |
| 2936 | `**When:** Morning, empty stomach, 8oz water, 30 minutes before first food` | `**When:** With or immediately after your first meal of the day` |
| 2937 | `**Dose:** 1 scoop daily` | `**Dose:** As labeled` |
| 2938 | `**What it is:** Gut-brain seal powder. L-glutamine + DGL + berberine + aloe + curcumin + zinc carnosine + vitamin A + vitamin D3. See my4mlife.com for the specific product we currently recommend.` | `**What it is:** The gut-brain seal, your daily over-the-counter gut-barrier step. See my4mlife.com/stack for the specific product we currently recommend.` |
| 2941 | `Some people report a mild detox-style headache in the first 3 days — usually berberine pulling biofilm. Drink more water and push through.` | (delete) |
| 3046 | `**When:** Morning, on top of the OTC gut-barrier probiotic` | `**When:** Per prescription, on top of the OTC gut-barrier probiotic` |

**L2. Protein (line 608, 1386).**

Old: `- **Protein-first breakfast.** Thirty grams of lean protein, thirty minutes before any other macro enters your mouth. Two times this week, minimum. Aim for more.`

New: `- **Protein-first breakfast.** Thirty to forty grams of lean protein at every fast-break, thirty minutes before any other macro enters your mouth. Every day. Your daily target is one gram per pound of your ideal body weight.`

L1386 old: `**Protein-first hits this week:** _____ / 21 feeding-window opens` → new: `**Protein-first hits this week:** _____ / 7 fast-breaks`

**L3. Week advance (line 616).**

Old: `- **The Wednesday Zoom.** Show up live or watch the recording. Attendance is the single mechanism that unlocks Week 2.`

New: `- **The Wednesday Zoom.** Show up live or watch the recording. The calendar moves you to Week 2 on Monday either way. The Zoom is what keeps you from running it alone.`

**L4. Zoom (lines 3788, 3822). Depends on D1.**

3788 old: `- **Wednesday Zoom — 7:00 PM CT** — Live with Dr. TJ. Cohort Q&A, protocol updates, case discussions. Recording posted to the app within 24 hours. If you can't attend live, drop your question in the app thread and watch the replay.`

3788 new: `- **Wednesday Zoom — time and link arrive by email** — Live with Dr. TJ. Cohort Q&A, protocol updates, case discussions. When a recording is posted, it appears on your app home screen. If you can't attend live, email your question to support@my4mlife.com and watch the replay.`

3822 old: `| **Weekly Zoom links** | Sent via the app + email each Tuesday |` → new: `| **Weekly Zoom links** | Sent by email before each call |`

**L5. Dead app references and stale routing (§9).**

| Line | Old | New |
|---|---|---|
| 3772 | `perimenopause/menopause symptoms in women, Q8 ≥ 3)` | `perimenopause/menopause symptoms in women, Q17 or Q18 ≥ 3)` |
| 3773 | `**Weight** (Q3 ≥ 3,` | `**Weight** (Q8 ≥ 3,` |
| 3774 | `**Gut** (Q1 ≥ 3,` | `**Gut** (Q16 ≥ 3,` |
| 3776 | `**Cognitive optimization** (Q7 ≥ 3,` | `**Cognitive optimization** (Q1 ≥ 3,` |
| 3777 | `**Already-diagnosed cognitive decline** (Q9 ≥ 3)` | `**Already-diagnosed cognitive decline** (a Yes on the final question)` |
| 3780 | `Every Rx path begins inside the app. Tap *Rx Consults* and pick the lane. Labs you've had in the last 90 days carry forward.` | `Every Rx path begins with the care coordinator at my4mlife.com/consult. Pick your lane on the form, and bring any labs from the last 90 days.` |
| 3789 | `The reflection prompts are in Part 7.` | `The reflection prompts are at the end of each week.` |
| 3790 | `The tear-out page from Part 6.` | `The tear-out page at the end of each week.` |
| 3819 | `Protégé welcome gift in the app, or` | `Protégé welcome gift by email, or` |
| 3823 | `\| **Product reorder & subscription management** \| Inside the app — *Stack* → *Manage* \|` | `\| **The current products** \| https://my4mlife.com/stack \|` |
| 3824 | `\| **Rx Consult booking** \| Inside the app — *Rx Consults* \|` | `\| **Rx Consult booking** \| https://my4mlife.com/consult \|` |
| 3830 | `- **Rx / clinical** — through the app messaging only (HIPAA)` | `- **Rx / clinical** — through your care coordinator at my4mlife.com/consult (HIPAA)` |
| 3831 | `- **Cohort + Zoom** — posted weekly in the app community` | `- **Cohort + Zoom** — sent by email each week` |

Also 1996 and 1741: `booked through the care coordinator at my4mlife.com` → `booked through the care coordinator at my4mlife.com/consult`.

**L6. Connect the Logbook to the Moves.** Insert after line 37:

```markdown
### How this logbook fits the app

This logbook gives you the month's work, week by week. The app adds one thing on top: a single **Move** the whole cohort tracks together, for twelve weeks. Neither replaces the other. In Month 1:

| Week | This logbook | The app's Move |
|---|---|---|
| 1 | Foundation | Start your gut protocol, with your first meal, every day |
| 2 | Add the Lift | Hold the 9–6 eating window 5 of 7 days |
| 3 | Hormones and the Canaries | Protein-first 30–40g at every fast-break |
| 4 | Mitigate, Synthesize, Recommit | Pantry purge: zero seed oils in the house |

Everything you run here stays in place while the Move changes. The retake in Part 9 is your day-30 read; the app asks for a formal retake in Week 12.
```

**L7. Program length (depends on D3).** L89 `a four-month cohort` → `a twelve-week cohort`. L97 `makes the next four months non-negotiable` → `makes the next twelve weeks non-negotiable`. L149 `for the next four months` → `for the next twelve weeks`. L249 `four months from now` → `twelve weeks from now`.

**L8. Measurements (lines 478–486).** Replace the block with:

```markdown
Six numbers the app charts, plus two only you can keep. Take them today, before Week 1. Then once a week: same day, same conditions. Log the first six on your app home screen so the chart builds.

| Measure | Baseline | Wk 1 | Wk 2 | Wk 3 | Wk 4 |
| --- | --- | --- | --- | --- | --- |
| Body weight (lb) | ____ | ____ | ____ | ____ | ____ |
| Waist at navel (in) | ____ | ____ | ____ | ____ | ____ |
| Blood pressure (sys / dia) | ____ | ____ | ____ | ____ | ____ |
| Resting pulse (bpm, AM) | ____ | ____ | ____ | ____ | ____ |
| SpO₂ (%) | ____ | ____ | ____ | ____ | ____ |
| Average sleep (hr/night, last 7 nights) | ____ | ____ | ____ | ____ | ____ |
| Alcoholic drinks per week (honest) | ____ | ____ | ____ | ____ | ____ |
```

Also at L2663, in the §6.5 physiology table: `| Resting HR | __ | __ | __ |` → add a row below it: `| Blood pressure | __ | __ | __ |`.

**L9. Month-end scale and re-rate (lines 2642–2655).** Replace with:

```markdown
**Audit categories (0 = no issue, 5 = daily and affecting my life. Same scale as Part 1; a lower Day 30 is the win.)**

| Category | Day 1 | Day 30 | Delta |
|---|---|---|---|
| Cognitive / brain fog | __ | __ | __ |
| Sleep | __ | __ | __ |
| Mood | __ | __ | __ |
| Gut health | __ | __ | __ |
| Movement & strength | __ | __ | __ |
| Weight | __ | __ | __ |
| Alcohol | __ | __ | __ |
| Hormones | __ | __ | __ |
| Sexual function | __ | __ | __ |
| Purpose & accountability | __ | __ | __ |

**Your canary, re-rated.** Go back to §5.2 or §5.2b. Copy your three lowest markers and rate them again today.

| Marker | Week 3 | Day 30 | Delta |
|---|---|---|---|
| ____________ | __ | __ | __ |
| ____________ | __ | __ | __ |
| ____________ | __ | __ | __ |
```

**L10. Score name (lines 1085, 1456, 2356, 2875).**

Old: `**MindSpan Score this week:  ____**  (from your app home screen)`

New: `**Protocol Score this week:  ____**  (the ring on your app home screen; higher is better)`

**L11. Self-audit arithmetic, and women with no cycle to read.**

Men's #4, after line 1561 add: `*(0 = days to feel normal, 10 = next day)*` and the scale line `` `0 — 1 — 2 — 3 — 4 — 5 — 6 — 7 — 8 — 9 — 10` ``.

Women's #9, after line 1865 add:

```markdown
*(0 = markedly changed, 10 = unchanged. Past your last period? Rate how settled things are. No cycle to read — hysterectomy, ablation, a hormonal IUD? Note it below and score this one 5.)*

`0 — 1 — 2 — 3 — 4 — 5 — 6 — 7 — 8 — 9 — 10`
```

L2254 old: `My recovery rating (§5.2 #4 / §5.2b #5): ______    Five years ago: ______` → new: `My recovery rating (§5.2 #4), or my 3 PM energy (§5.2b #5): ______    Five years ago: ______`

**L12. A target for her (Exercise 3).**

L206 old: `A morning erection frequency. A sleep score.` → new: `A morning erection frequency. Nights broken by sweats or a 3 AM wake-up. A sleep score.`

After line 214 add: `- Hot flashes or night sweats (days per week, honest): ____ today → ____ in 6 months`

**L13. Creatine back on the trackers.** No box counts change.

| Line(s) | Old | New |
|---|---|---|
| 1106 | `the gut-barrier probiotic / D3+K2 stack / omega-3+CoQ10 softgel` | `the gut-barrier probiotic / D3+K2 stack / creatine / omega-3+CoQ10 softgel` |
| 1284 | `- ☐ D3 + K2 stack with breakfast` | `- ☐ D3 + K2 stack with breakfast; creatine with breakfast, or around the lift on training days` |
| 1445 | `D3+K2 stack + omega-3+CoQ10 softgel)` | `D3+K2 stack + creatine + omega-3+CoQ10 softgel)` |
| 1487, 2038 | `the D3+K2 stack, the omega-3` / `D3+K2 stack, omega-3` | add `creatine,` after the D3+K2 item |
| 2063 | `D3 + K2 stack with breakfast` | `D3 + K2 stack + creatine with breakfast (creatine around the lift on training days)` |
| 2082, 2101, 2119, 2138, 2155, 2172, 2335 | `\| D3 + K2 stack \|` | `\| D3 + K2 stack + creatine \|` |
| 2494, 2512, 2528, 2544, 2560, 2576, 2592, 2865, 2887 | `D3 + K2 stack + omega-3 + CoQ10 softgel` | `D3 + K2 stack + creatine + omega-3 + CoQ10 softgel` |
| 2964 | `**When:** With breakfast, year-round, no cycling` | `**When:** Around the lift on training days, with breakfast otherwise. Year-round, no cycling.` |

**L14. Pregnancy line. Needs TJ's wording approval (D4).** Insert after line 2929:

`**If you are pregnant, nursing, or trying to conceive,** stop here and take this section to your own clinician before you start the stack, the fast, or any Rx.`

**L15. De-brand.**

| Line(s) | Old | New |
|---|---|---|
| All | `Magtein PM` | `Mag L-threonate PM` |
| 1487, 2038, 2066 | `Magtein` | `magnesium L-threonate` |
| 2997 | `Magnesium L-threonate (Magtein)` | `Magnesium L-threonate` |
| 3003 | `## Magnesium L-Threonate (Magtein)` | `## Magnesium L-Threonate` |
| 3007 | `1.5-2 g of Magtein (delivers` | `1.5-2 g (delivers` |
| 3008 | `The patented Magtein form of magnesium-L-threonate. This matters:` | `Magnesium L-threonate. This matters:` |
| 2982 | `Plus Kaneka QH® ubiquinol 200 mg` | `Plus ubiquinol 200 mg` |
| 1248 | `TrueDark or red-spectrum glasses only` | `red-spectrum glasses only` |
| 3217 | `Lumosity settled with the FTC over its claims. ` | (delete) |
| 3223 | `**BrainHQ (Posit Science).** Paid. The most-evidenced consumer brain-training product. If you're going to pay for a brain-training app, this is the one.` | `**A clinically studied brain-training program.** Paid. See my4mlife.com for the one we currently recommend.` |
| 3272 | `Polar, Whoop, Oura, or any HRV tool with biofeedback mode works.` | `Any HRV tool with biofeedback mode works.` |
| 3274 | `**Muse-style EEG meditation aid.**` | `**EEG meditation aid.**` |
| 3319 | ` Brand: HigherDose for home, any commercial sauna otherwise.` | ` A home infrared sauna or any commercial sauna.` |
| 3321 | ` Brand: Polar Recovery for home plunges, or just turn the shower to cold for the last two minutes.` | ` A home cold-plunge unit, or just turn the shower to cold for the last two minutes.` |
| 3323 | ` Brand: Earthing for grounding mats if outdoor contact isn't accessible.` | ` A grounding mat if outdoor contact isn't accessible.` |
| 3335 | `(or TrueDark glasses if exposed to screens)` | `(or red-spectrum glasses if exposed to screens)` |
| 3337 | `(AirDoctor or equivalent — HEPA + VOC)` | `(HEPA + VOC)` |
| 3339 | ` (AquaTru or similar)` | (delete) |
| 3343 | `☐ TrueDark glasses if you're at screens after 8 PM` | `☐ Red-spectrum glasses if you're at screens after 8 PM` |
| 3387–3389 | `Boston Heart panel`; `Cleerly coronary CT (if vascular risk)`; `Galleri or comparable cancer screen (annual after 50)` | `Advanced cardiovascular panel`; `Coronary CT angiography (if vascular risk)`; `Multi-cancer blood screen` |

**L16. Gut Rx moat.**

| Line | Old | New |
|---|---|---|
| 3049 | `prior ulcer, chronic reflux — BPC-157 adds a regenerative repair signal that the OTC tier can't reach.` | `prior ulcer, chronic reflux — the prescription adds a deeper repair signal that the OTC tier can't reach.` |
| 3145 | `**Gut-barrier probiotic ↔ Prescription gut-barrier peptide (BPC-157)**` | `**Gut-barrier probiotic ↔ Prescription gut-barrier protocol**` |
| 3188 | ` The same molecule that anchors the prescription gut-barrier peptide protocol; here it's used for cognitive purpose.` | ` Here it's used for cognitive purpose.` |

**L17. Women's labs (§8.6).** Clinical wording in the Ferritin line needs TJ's sign-off.

After line 3357 add: `- Progesterone (women)`

After line 3359 add: `*One number in isolation tells you nothing. Estradiol swings erratically in perimenopause; read the panel against symptoms.*`

L3382 old: `- Ferritin (men over 50 and post-menopausal women — iron load matters)` → new: `- Ferritin (iron load matters: it climbs once periods stop, and it can run low with heavy periods)`

**L18. Retake carries her symptoms (line 3650).**

Old: `*My hormones feel off — persistent fatigue, low drive, mood swings, poor recovery, or loss of muscle despite trying.*`

New: `*My hormones feel off — persistent fatigue, low drive, mood swings, poor recovery, or loss of muscle despite trying; for women, also cycle changes, hot flashes, or night sweats.*`

Same edit belongs in `website/src/data/audit-questions.ts:220` so "same 20 prompts" stays true.

**L19. Pairing matrix.** After line 3150 add:

`| **Menopause hormone therapy + Lifting + Protein-First** | Same foundation, different alarm. Bone and lean mass run the same equation; hormone therapy is individualized, and non-hormonal options are part of the same consult. |`

### 3b. Logbook, NICE-TO-HAVE

**L20. Book's women's content, one line each.** All from Book Ch. 8. Apply L20c together with the L57 edit, since it makes "the only place that splits" untrue.

a. After line 1497 add: `Roughly two-thirds of Alzheimer's cases in this country are women. Longevity explains part of that gap, not all of it, and the science is still being argued. You deserve to know the argument exists rather than find out at seventy.`

b. §6.2 Hormones, after line 2439 add:

```markdown
- ☐ Yes  ☐ Some  ☐ No — *(Women)* The evening glass I use to sleep is often what wakes me at three. It also carries a dose-dependent breast cancer association I have not reckoned with.
- ☐ Yes  ☐ Some  ☐ No — *(Women)* I have never audited what goes on my skin and hair every day: fragrance, cosmetics, nail products.
- ☐ Yes  ☐ Some  ☐ No — *(Women)* I am managing everyone else's health and deferring my own.
```

c. After line 1112: `For women, add bone. Estrogen has been protecting it, and when estrogen falls, bone runs the same use-it-or-lose-it equation as muscle. Through the transition, the lift stops being optional.`

d. L1252 end: add ` If night sweats wake you, this rule and the evening drink are the first two things to test.`

e. L2967 end: add ` Most women have never taken it and start with lower baseline stores than men.` and L3089 `Creatine (most women over 50 have never taken it and start from lower baseline stores)` → `Creatine (most women have never taken it and start from lower baseline stores)`.

f. L57 old: `Week 3 is the only place that splits:` → new: `Week 3 is where it splits:`. After `at the end of it.` add ` A few one-line notes elsewhere say where a woman's body changes the reason, not the work.`

**L21. Eating window (line 609).** Old: `Daily. First bite at nine or after.` → new: `Aim for every day; five of seven is the floor the app scores. A breakfast with the kids or grandkids doesn't break the program; walk thirty minutes after. First bite at nine or after.`

**L22. Smaller reader-confusion fixes.**
- L607 `Two times this week, minimum.` → `Two times this week, minimum. Daily is better; the tracker has a box for it.`
- L97 `or testosterone, or sleep architecture` → `or hormones, or sleep architecture`
- L2264 old: `☐ Sleep — most testosterone is made between 11 PM and 3 AM, and fragmented sleep degrades every hormone in the panel` → new: `☐ Sleep — fragmented sleep degrades every hormone in the panel. In men, most testosterone is made between 11 PM and 3 AM; in women, the 2–3 AM wake-up is often the transition itself.`
- L2787 `Four weeks ago you wrote about the person you want to be at 85 — sharp, present,` → `Four weeks ago you named a face. The person you want to be at 85 is sharp, present,`
- After L1666 (§5.3 Domain 1) add `Already on testosterone? ☐ Yes ☐ No  Since: ______`; after L1909 (§5.3b Domain 1) add `Already on hormone therapy? ☐ Yes ☐ No  Since: ______`.

**L23. Age gates vs the midlife center.** These are not ranges, but they push a 42-year-old reader out. L1110 `by 50, you are almost certainly sarcopenic` → `by midlife, sarcopenia has already started`, and `it accelerates after 50` → `it accelerates from here`. L2939, L2996 `most people over 50` / `Most people over 50` → `most people in midlife` / `Most people in midlife`. L2954 `nearly everyone over 50` → `nearly everyone in midlife`. L2965 `at our age` → delete the phrase. L2967 `for people 50+` → `in midlife`. L3062 `in people 50+ with` → `in people with`. L3075 `many men over 50` → `many men`.

**L24. DEXA and mammogram (needs TJ's sign-off; not in book).** After L3382: `- Women: stay current on bone-density and mammogram screening through your own insurance.`

### 3c. App, MUST-FIX (in priority order)

Run `pnpm exec vitest run` in `apps/clientportal` after these. A grep of the member-facing tests found no assertions on the old Ultima, 14:10, or Biome strings. Some old strings below span line breaks in the source.

**A1. `MissionControl.svelte:76`.**

Old: `'weight-body-fat': 'Weight', nutrition: 'Nutrition', ed: 'ED', hormones: 'Hormones',`

New: `'weight-body-fat': 'Weight', nutrition: 'Nutrition', 'erectile-dysfunction': 'Sexual function', 'hormone-balance': 'Hormones',`

**A2. `renderer.ts:2211, 2218`, electrolytes.**

2211 old: `ELECTROLYTES — ULTIMA REPLENISHER (GRAPE)` → new: `ELECTROLYTES — DR. BERG ZERO SUGAR HYDRATION (LEMONADE)`

2218 old: `Zero calories, zero sugar, 55 mg sodium, potassium and magnesium citrates, stevia leaf.` → new: `Zero sugar, 40 mg sodium, potassium citrate, magnesium citrate, calcium lactate, trace minerals, stevia leaf.`

**A3. `renderer.ts`, eating window.**

| Line | Old | New |
|---|---|---|
| 1269 | `Eating window: still 14:10 (first meal after 9am, last before 7pm).` | `Eating window: still 9 AM to 6 PM, with your first bite after your morning training or walk.` |
| 1290 | `Days I held 14:10 eating window (out of 7)` | `Days I held the 9–6 eating window (out of 7)` |
| 1866 | `Nutrition focus (holding 14:10 eating window through Month 1)` | `Nutrition focus (holding the 9–6 eating window through Month 1)` |
| 2114 | `Hold your 14:10 window. Push your last meal 15 minutes earlier every 2 days — you are building the habit before we tighten the window next month.` | `Hold your 9–6 window. Break the fast with 30–40g of lean protein after your morning training or walk.` |
| 2119 | `Tighten your eating window slightly. Aim for your first meal closer to 10–10:30am this week. You are preparing your metabolism for the Month 2 progression to 16:8.` | `Hold your 9–6 window. Once it is consistent, you can experiment with moving your last bite earlier, around 4 or 5 PM, to further regulate cortisol before sleep.` |

Lines 1307 and 1724 are in A8.

**A4. `renderer.ts:929`.**

Old: `Attend (or watch the recording of) this week's Protégé Zoom, then <strong>attest on the dashboard</strong> — that's what unlocks next week. (Removed a duplicate log here 2026-07-07.)`

New: `Attend (or watch the recording of) this week's Protégé Zoom, then <strong>tick it on the dashboard</strong>. Next week opens Monday on its own.`

**A5. Week titles and moving the canary to the top of Week 3.**

`renderer.ts`: delete line 1776 `${renderW3Hormones(W, sex)}` and insert it right after line 1618 `${proteinTargetLine(W)}`.

`renderer.ts:1625–1627` old: `Two weeks in. This is where it gets real. Deep focus this week is <strong>Mind</strong> —` / `we introduce the full 7-supplement brain stack.` / `Every other pillar gets a mid-month check-in and upgraded actions.`

New: `Two weeks in. This is where it gets real. Your self-audit is above. This is a decision week, not a new-protocol week.` / `Every other pillar gets a mid-month check-in below.`

`renderer.ts:1729` old: `M3 — MIND: Week 3 Deep Focus — Consistency` → new: `M3 — MIND: Stay Consistent`

`renderer.ts:1732` old: `⭐ THIS WEEK'S DEEP FOCUS` → new: `⭐ KEEP RUNNING`

`renderer.ts:1787` old: `MIND: What is my body telling me about the new supplements?` → new: `MIND: What did this week's audit tell me about my mind?`

`weeks.ts`:

| Line | Old | New |
|---|---|---|
| `:47` Week 1 `focus` | `Mind (deep focus): Full Supplement Stack` | `Foundation: Repair the gut, set the floor` |
| `:64` Week 3 `sub` | `Mind · Muscle · Mitigate · Motivate — full personalized assessment + gut-brain repair` | `Mind · Muscle · Mitigate · Motivate — hormones, the two canaries, one decision` |
| `:65` Week 3 `focus` | `Mitigate (deep focus): MindSpan Personal Risk Assessment` | `Mitigate (deep focus): Hormones and the Canaries` |
| `:77` Week 4 `focus` | `Motivate (deep focus): Identity & Month 2 Vision` | `Synthesize and recommit: Identity & Month 2 Vision` |

`nudge/triggers.ts:159` old: `Week 3 down. The mind work this week is what most people skip — and it\'s where 4M earns its name.` → new: `Week 3 down. You audited the canary and made the call. Most people never do, and it\'s where 4M earns its name.`

**A6. `renderer.ts`, assessment scale.**

| Line | Old | New |
|---|---|---|
| 729 | `MINDSPAN SCORE /50` | `MINDSPAN SCORE /100` |
| 744 | `of 10 categories scored` | `of 20 categories scored` |
| 981 | `` `${fromAudit.label} (${fromAudit.score}/10)` `` | `` `${fromAudit.label}` `` (the score includes the ranking bonus, so no fraction is honest) |
| 1237–1238 | `Week 1 score (0–10) you gave it`, `max="10"`, `placeholder="0–10"` | `Week 1 score (0–5) you gave it`, `max="5"`, `placeholder="0–5"` |
| 1678–1679 | `Re-score this factor (0–10)`, `max="10"`, `placeholder="Better than Week 1?"` | `Re-score this factor (0–5)`, `max="5"`, keep placeholder |
| 1810 | `Mitigate MindSpan Score (/50)` | `MindSpan Score (/100)` |
| 1930 | `min="0" max="10" value=` | `min="0" max="5" value=` |
| 1936 | `Score 0–10 per category. &nbsp; <strong>0 = fully addressed</strong> &nbsp;·&nbsp; <strong>10 = major risk still present</strong>` | `Score 0–5 per category, the same scale as your assessment. &nbsp; <strong>0 = no issue</strong> &nbsp;·&nbsp; <strong>5 = daily and affecting my life</strong>` |

**A7. Gut protocol while Ultra is out of inventory.** Action ids stay. Keep `n:'Biome NS Ultra'` because `renderer.ts:2183` filters on `/biome/i`.

| File:line | Old | New |
|---|---|---|
| `program.ts:41` | `Start Biome NS Ultra — with your first meal, every day` | `Start your gut protocol — with your first meal, every day` |
| `MissionControl.svelte:117` | `label: 'Biome NS Ultra'` | `label: 'Gut protocol'` |
| `logParse.ts:59` | `label: 'Biome NS Ultra'` | `label: 'Gut protocol'` |
| `supplements.ts:28` `d` | `1 scoop in 8–12 oz water` | `Until Biome NS Ultra ships, the two-product gut kit: 1 scoop Bone Broth Collagen + 3 Gut Restore capsules. See my4mlife.com/stack.` |
| `renderer.ts:961` | `Log Biome NS Ultra and your eating window` | `Log your gut protocol and your eating window` |
| `renderer.ts:1329` | `['Biome NS Ultra'].map` | `['Gut protocol'].map` |
| `renderer.ts:1353` | `<strong>Biome NS Ultra continues every day</strong>` | `<strong>Your gut protocol continues every day</strong>` |
| `renderer.ts:1734` | `<strong>Biome NS Ultra with your first meal, no gaps</strong>` | `<strong>Your gut protocol with your first meal, no gaps</strong>` |
| `renderer.ts:1773` | `<strong>Biome NS Ultra with your first meal, every day — no additions this month.</strong>` | `<strong>Your gut protocol with your first meal, every day.</strong>` |

Lines 157–170 of `renderer.ts` (gut quiz CTAs) need the same sweep if that quiz is live; `renderGutAssessment` has no caller today.

**A8. Strength (depends on D2; written for 2–3).**

| File:line | Old | New |
|---|---|---|
| `renderer.ts:1004` | `(3–4× this week). Form: countertop push-ups 3×10 + supported air squats 3×10.` | `(2 this week, 3 from Week 2). Form: the Logbook's compound lifts. New to lifting? Start with countertop push-ups 3×10 + supported air squats 3×10.` |
| `renderer.ts:1266–1267` | `<strong>Movement starts now.</strong> The KOT beginner playlist (Ben Patrick / Knees Over Toes Guy) is your gym-free foundation. 3 sessions this week.` | `<strong>The lift goes in.</strong> 3 sessions this week, A / B / A, from the Logbook. No gym? The KOT beginner playlist (Ben Patrick / Knees Over Toes Guy) is your gym-free foundation.` |
| `renderer.ts:1307` | `3 KOT sessions. Hit protein 5 of 7 days. Hold your 14:10 window.` | `3 strength sessions. Hit protein 5 of 7 days. Hold your 9–6 window 5 of 7.` |
| `renderer.ts:1366` | `after your first KOT sessions?` | `after your first full week of lifting?` |
| `renderer.ts:1724` | `4 sessions this week. Hold the 14:10 window — first meal after 9am, last before 7pm. Month 1 stays at 14:10; we do not progress the fasting window this month.` | `3 sessions this week. Hold the 9–6 window. Month 1 stays at 9–6; we do not progress the eating window this month.` |
| `MissionControl.svelte:121` | `label: 'Strength', cap: 4,` | `label: 'Strength', cap: 3,` |
| `program.ts:186` | `['strength', 4]` | `['strength', 3]` |
| `program.ts:187` | `11 * PROGRAM_WEEKS` and the `// 312` comment | `10 * PROGRAM_WEEKS` and `// 300` |
| `program.ts:294` | `(2 * 7 + 11 + 1)` | `(2 * 7 + 10 + 1)` |

Update the slot comment at `program.ts:182–184` and `program.test.ts:43–44, 83`, which assert 312.

**A9. `renderer.ts:2157`. Depends on D1.** Old: `Your recommended recipes, shopping list, and a prep video arrive by email a few days before each Sunday Zoom.` → new: `Your recommended recipes, shopping list, and a prep video arrive by email each week.`

**A10. `renderer.ts`, women's card parity with the Logbook.**

`:1411` old: `'Memory slips — names, the word mid-sentence, walking into a room (0 = daily, 10 = rare)',` → new: `'Muscle and strength response to training (0 = absent, 10 = visible response within weeks)',`

(Same key, new label. Anyone who already rated `w3_peri_m10` keeps a stale number; expect few.)

`:1404` old: `'Cycle change — length, flow, PMS, or time since the last period (0 = markedly changed, 10 = unchanged)',` → new: `'Cycle change — length, flow, PMS (0 = markedly changed, 10 = unchanged). Past your last period, rate how settled things are. No cycle to read? Score it 5.',`

`:1576` old: `title: 'THE PERIMENOPAUSE CANARY — HORMONE SELF-AUDIT',` → new: `title: 'THE PERIMENOPAUSE CANARY — PERIMENOPAUSE + MENOPAUSE SELF-AUDIT',` (keeps the substring `renderer.sex.test.ts` asserts).

`:1583`, after `The fog is not imagined. It has a mechanism.` add:

```
Already past your last period? This page is still yours. Timing appears to matter: beginning a hormone conversation near the transition, with a healthy vascular system, is a different proposition than beginning a decade later. Nobody honest will tell you hormone therapy prevents dementia, but waiting to see how it goes is itself a decision. Exhausted after eight hours in bed, morning headaches, or insomnia treated as anxiety? Ask for a sleep evaluation; apnea is badly underdiagnosed in women.
```

`:1587`, after `every blank line is the gap the consult starts from.` add:

```
The Menopause &amp; HRT lane is a live visit with a licensed prescriber: hormone therapy where indicated, low-dose testosterone where indicated, and non-hormonal options where hormones are not the right call. A personal history of breast or uterine cancer, clotting, or certain cardiovascular or liver conditions bears on it, and that call is the clinician's.
```

**A11. Give hormones a real factor.** `factors.ts`, add to the array:

```ts
  { n:'13', name:'Hormones & the canaries', tag:null, pillarId:'mitigate',
    sub:'Hormone drift or a change in sexual function — the early alarm for hormones, vascular health, and cognition',
    imm:['Run the Week 3 self-audit now — rate the ten markers honestly',
         'Write down the date and value of every hormone lab you have had; every blank is the gap',
         'Book the hormone consult at my4mlife.com/consult, or put a 90-day reassessment date on your calendar'],
    res:[] },
```

`renderer.ts:1106` old: `'erectile-dysfunction': 'Physical inactivity & injuries',` → new: `'erectile-dysfunction': 'Hormones & the canaries',`

`renderer.ts:1107` old: `'hormone-balance': 'Excess body fat',` → new: `'hormone-balance': 'Hormones & the canaries',`

**A12. `factors.ts`, live action lines.**

`:208` old: `Calculate your protein target: target bodyweight (lbs) × 0.9 = daily grams` → new: `Calculate your protein target: 1 gram per pound of your ideal body weight`. Line 156 has the same × 0.9 in a `tools` field that does not render today; change it too so it cannot come back.

`:224` old: `Introduce yourself actively in the My4MLife App community during your first week.` → new: `Introduce yourself on this week's cohort Zoom.`

**A13. `MissionControl.svelte`, point Week 3 at the audit.**

Script, add:

```ts
import { who } from '../sex.js';
const canary = $derived.by(() => {
  const w = who(profile?.sex);
  if (w.showMensTrack && w.showWomensTrack) return 'the ED canary for men, the perimenopause and menopause canary for women';
  return w.showWomensTrack ? 'your perimenopause and menopause canary' : 'your ED canary';
});
function openWeek3(): void { (window as any).portalAction?.('goTo', 'w3'); }
```

Markup, after the `</div>` closing `.movebanner` (line 352):

```svelte
{#if currentWeek === 3}
  <div class="zoomcard" style="margin:0 0 12px">
    <div class="zt">Week 3 is the hormones week</div>
    <div class="zm">Ten honest markers for {canary}, your lab lane, and one decision: book the consult, or set a 90-day date.</div>
    <button class="zbtn" style="border:none;cursor:pointer" onclick={openWeek3}>Open the self-audit</button>
  </div>
{/if}
```

### 3d. App, NICE-TO-HAVE

**A14. Symptom tracker for women (`MissionControl.svelte:162`).** Rename the const `BASE_VITALS`, then:

```ts
const VITAL_METRICS = $derived<Array<[string, string, string]>>(
  normalizeSex(profile?.sex) === 'female'
    ? [...BASE_VITALS, ['hot-flashes', 'Hot flashes', 'per day'], ['night-wakes', 'Night wakes', 'per night']]
    : BASE_VITALS,
);
```

Import `normalizeSex` from `../sex.js`. Female only on purpose, so an unset man does not see it; an unset woman still has the Week 3 markers. Add a matching men's row only if TJ wants parity.

**A15. Unset pointer (`renderer.ts:1593`).** Before the two tracks add: `` ${w.showMensTrack && w.showWomensTrack ? `<div style="font-size:12px;color:${C.muted};margin:0 0 10px">Two tracks below. Run the one that is yours.</div>` : ''} ``

**A16. Let members set or correct sex.** Add a Woman/Man field to `SettingsView.svelte`. This needs `sex` on the `upsertMyProfile` input in the GraphQL schema and resolver, which it lacks today. It is the only way an unset member can stop seeing both tracks.

**A17. Smaller alignment.**
- `MissionControl.svelte:380` gridhint: after the sentence add ` Morning routine = sun, breath, and your walk. Your Logbook's floor also includes lights out by 10:30.`
- `program.ts:49` title → `Say it to their face — read your why to the person you named`, `gridLabel: 'Read your why'`. Name-the-face stays on Week 1 and the Logbook's Part 1.
- `renderer.ts:731–732` and `Sidebar.svelte:63–64`: remove the mornings and cold-shower stats.
- `sex.ts:69, 88, 108` "at age 70" vs the Logbook's "at 85": pick one. (`renderer.sex.test.ts` asserts "at age 70".)
- W1 hero (`renderer.ts:915`): add the spine sentence and identity line. Both standing rules; only the sign-in screen carries the identity line today.

---

## 4. What I did not verify

- **I did not open the app in a browser or read production data.** Findings come from source plus 42 passing unit tests. I do not know how many live members have `sex` unset.
- **Whether Wednesday is the real Zoom day.** See D1.
- **Clinical wording not in the book** (L14, L17 ferritin, L24) needs TJ's sign-off. Everything else women-specific is lifted from Book Ch. 8 or the Logbook's own §5.
- **Another agent changed `factors.ts:207` during this audit** (`workbook` → `Logbook`). Not part of this report; the working tree may keep moving.
- **None of these edits has been applied or tested.** A5, A7, A8, and A10 should be followed by a full test run.
