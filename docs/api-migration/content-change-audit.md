# Content Change Audit — LDRGLPRx ClientPortal

**Date:** 2026-04-28  
**Scope:** apps/clientportal/src, infra/clientportal/seed/, deployed DynamoDB WeeklyContent  
**Purpose:** Identify all content references TJ needs to change: supervisor language, weekly titles, live calls → onboarding guides, morning protocol location.

---

## 1. Physician-Supervised / Medically-Supervised References

### Discovery Flow
- **WelcomeScreen.svelte:15** — Badge: `PHYSICIAN-SUPERVISED · 4M PROGRAM`
- **WelcomeScreen.svelte:23** — Subhead: `A physician-supervised brain optimization program.`
- **WelcomeScreen.svelte:24** — Subhead-quiet: `Root cause. Real labs. Physician-prescribed precision.`
- **WelcomeScreen.svelte:65** — CTA description: `A physician reviews every flagged response.`
- **AvatarPlaceholder.svelte** (line pending) — `four weeks of physician-supervised root-cause work. Real labs. Real prescriptions. Real precision.`
- **IntakeReport.svelte:125** — `Physician-prescribed compounds — not available anywhere else.`

### Membership Tiers (seed.ts)
- **seed.ts:214** — Cohort-Clinical ideal-for: `Members who want labs and a physician's eyes on their numbers before starting`
- **seed.ts:232** — Cohort-Full-Optimization description: `all four physician-prescribed formulas prescribed and ready for Week 1`
- **seed.ts:232** — Cohort-Full-Optimization description: `Full Optimization is the complete Month 1 clinical picture...and all four physician-prescribed formulas`

### Product/Content Files
- **tiers.ts** (app bundle) — Not seeded; mirrors seed.ts data; has `physician's eyes` and `physician-prescribed`
- **products.ts:tiers** — `physician-prescribed and precision-dosed` (ArmorVita tagline)
- **products.ts:products** — `physician-prescribed capsule with an MCT base` (ArmorVita description)
- **factors.ts** — Three factor guidance lines reference physician: `Request...from your physician`, `speak with your physician`

### monthProgression.ts (in-app content)
- **monthProgression.ts:57** — Month 2 description: `Genesis RPA candidacy review takes place mid-month for qualifying Tier 3 members` (implies clinician gatekeeping)

---

## 2. Weekly Titles — Seed vs. Deployed

### Seed Data (infra/clientportal/seed/seed.ts)
| Week | Seed Title |
|------|-----------|
| 1 | `Week 1 — All 4 Pillars Begin Today` |
| 2 | `Week 2 — Build the Foundation` |
| 3 | `Week 3 — Deepen the Work` |
| 4 | `Week 4 — Integration & Identity` |

### Deployed DynamoDB (us-east-2, WeeklyContent table)
| Week | Deployed Title |
|------|-----------|
| 1 | `Week 1 — All 4 Pillars Begin Today` |
| 2 | `Week 2 — Build the Foundation` |
| 3 | `Week 3 — Deepen the Work` |
| 4 | `Week 4 — Integration & Identity` |

**Status:** Seed and deployed are identical. To simplify to "Week 1", "Week 2", etc., update seed.ts lines 332, 344, 354, 364 and re-seed DynamoDB.

---

## 3. Live Calls / Coaching Sessions → Onboarding Guides

### Cohort Tiers (seed.ts)
- **seed.ts:181** — Cohort-Foundation tagline: `Four weeks of live clinical education and your personal 15-factor audit.`
- **seed.ts:186** — Cohort-Foundation feature: `4 weekly live Zoom sessions with Dr. TJ`
- **seed.ts:192** — Cohort-Foundation description: `four weekly sessions, your personal 15-factor audit...`

### Client Portal UI (app source)
- **factors.ts** — `Introduce yourself actively in the 4M cohort group before the next live call` (adv tab guidance)
- **tiers.ts** (not directly seeded) — Similar live Zoom references in cohort tier descriptions

### Ongoing Coaching Tier (seed.ts:240-250)
- **seed.ts:240** — Cohort-Ongoing name: `Ongoing Coaching`
- **seed.ts:241** — Cohort-Ongoing tagline: `Month 2 and beyond — stay in the system after Month 1.`
- **seed.ts:246** — Feature: `Monthly group coaching session with Dr. TJ`
- **seed.ts:251** — Description: `Month 1 builds the system. Ongoing Coaching keeps it running. $67/mo after you complete your first cohort.`

**Recharacterization needed:** Cohort-Foundation and Cohort-Clinical become "Month 1 Onboarding Guide" (free or $X), drop live Zoom language. Ongoing Coaching becomes Month 2+ live coaching tier.

---

## 4. Morning Protocol — Content Location & Tracker Integration

### Morning Protocol Content File
- **morningProtocol.ts** — defines `MorningStep[]` interface; hard-coded 6 steps (box breathing, fireside squat, lunge stretch, hip circles, sunlight, cold shower)
- **morningProtocol.ts:16** — `Morning sunlight` — `10–20 min · face toward sky · no sunglasses`
- **morningProtocol.ts:17** — `Cold shower finish` — `1 min minimum fully cold · non-negotiable from Day 1`

### Weekly Content (seed.ts & deployed)
- **seed.ts:345-346** — Week 2 actions: `Track morning protocol days (target: 5/7 days)` and `Morning Protocol — Level 2: Water + 5 minutes outdoor light exposure...`
- **seed.ts:355** — Week 3: `Morning Protocol — Level 3: Water + light + 10 minutes of focused breath or meditation work.`
- **seed.ts:365** — Week 4: `Morning Protocol — Level 4: Full stack: water + light + movement + breath + protein within 60 minutes of waking.`

**Morning Protocol does NOT live in weekly content markdown — it is separate hardcoded content in morningProtocol.ts.**

### Morning Tracker Component
- **MorningTracker.svelte** — Renders as a card for Week N with:
  - 7-day checkbox grid for morning protocol completion (`morn` field)
  - 7-day checkbox grid for cold shower completion (`cold` field)
  - Text reflection input
  - Imports `weekMeta` from `lib/content/weeks` to get pillar color accent for styling

**Location:** /Users/thomasmundheim/Desktop/Development/LDRGLPRx/apps/clientportal/src/lib/components/MorningTracker.svelte

**Data shape expected:** `WeekLog` with `morn: { w1d1, w1d2, ..., w4d7 }`, `cold: { cw1d1, ... }`, `reflection: string`

**Action needed:** Merge morning protocol content into tracker or weekend content section; currently split across separate tab/component.

---

## 5. Weekly Content Rendering & 4M Pillar Structure

### Weekly Content Query
- **operations.ts** — `listWeeklyContent(programId, month?)` fetches from AppSync
- Query returns: `{ id, programId, month, week, pillar, title, bodyMarkdown, updatedAt, resources[] }`

### Pillar Structure (per-week in DynamoDB)
- **Week 1** — `pillar: "mitigate"` (deep focus)
- **Week 2** — `pillar: "muscle"` (deep focus)
- **Week 3** — `pillar: "mind"` (deep focus)
- **Week 4** — `pillar: "motivate"` (deep focus)
- **All weeks** include references to all 4M in the markdown body and sub-headings (not data-driven)

### Components Consuming WeeklyContent
- **NO Svelte components currently consume WeeklyContent from AppSync.** The API query is defined but unused in the app.
- Weekly content is currently rendered via `renderer.ts` hardcoded page generation (not component-based).
- `weekMeta` object in `weeks.ts` drives UI structure (colors, labels, focus pillar).

### Week Navigation (UI)
- **weeks.ts:10-19** — `tabs[]` define navigation: `{ id:'w1', label:'Week 1 — Mitigate', ...}`, `{ id:'morn', label:'Morning Protocol', ...}`, etc.
- **weeks.ts:35-72** — `weekMeta` Record maps 1|2|3|4 to metadata (pillarId, label, deckQuote, primaryHeadline, focus).

**Rendering:** App.svelte > renderer.ts > renderPage() outputs HTML strings with weekly content inlined. Swapping to component-based rendering of WeeklyContent rows is a larger refactor.

---

## 6. Nutrition / Meal Plan / Food Log / Macro Tracker

### Existing Nutrition Content
- **nutrition.ts** — Defines `FoodTier[]` (Tier 1 Foundation, Tier 2 Supporting, Eliminate Completely) and `FastingPhase[]` (14:10 → 16:8 → 18:6 → OMAD progression)
- **nutrition.ts** content is rendered in the app under the "Nutrition & Fasting" tab (`id:'nutr'`)
- **No macro tracker, meal logging, or food log component exists.**

### Related Components
- **TrainingLog.svelte** — Exists; tracks training/workouts (separate from nutrition)
- **No dedicated nutrition log, macro counter, or meal plan UI**

**Conclusion:** Nutrition content exists as reference tiers and fasting progression; no user-facing logging/tracking for meals or macros. Blueprint for that feature is absent.

---

## Summary of Edit Locations

| Task | Files & Lines |
|------|--------------|
| Strip physician language | WelcomeScreen.svelte:15,23-24,65; AvatarPlaceholder.svelte (TBD); IntakeReport.svelte:125; seed.ts:214,232; products.ts (bundle); factors.ts (bundle) |
| Simplify weekly titles | seed.ts:332,344,354,364 |
| Recharacterize live Zoom → onboarding | seed.ts:181,186,192,240-250; factors.ts (bundle) |
| Morning protocol merge/relocation | morningProtocol.ts (content), MorningTracker.svelte (tracker component), weeks.ts (nav) |
| WeeklyContent rendering | operations.ts (query defined but unused); renderer.ts (HTML generation); no component-level consumption yet |
| Nutrition logging | None exists; define scope before building |

---

## Next Steps

1. Run `find /Users/thomasmundheim/Desktop/Development/LDRGLPRx -name "*.ts" -o -name "*.svelte"` and replace all instances of the above strings
2. Re-seed DynamoDB with updated titles (run infra/clientportal/seed.sh after edits)
3. Decide: integrate morning protocol into WeeklyContent markdown or keep as separate tracker sidebar
4. If building nutrition logging, define component structure and DynamoDB schema first
