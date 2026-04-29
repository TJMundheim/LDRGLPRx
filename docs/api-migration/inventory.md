# Data Shapes and Storage Seams Inventory
**Task:** P1 from `docs/plan/multi-user-appsync-cognito.md`  
**Scope:** Client portal (Svelte 5 + TypeScript) backed by localStorage  
**Date:** 2026-04-28

---

## Overview

This inventory documents all entities, their fields, storage patterns (per-user vs. global), and every callsite (file:line) where data is read or written. The client portal currently uses a single localStorage-backed adapter with keys:
- `4m:workbook:{id}` — Workbook JSON
- `4m:index:{userId}` — Array of workbook IDs owned by user
- `4m:admin:queue` — Admin queue items (global, seed-backed)

---

## 1. User (Auth Identity)

**Scope:** Per-user  
**Current Storage:** Not persisted (stub in `/lib/integrations/auth.ts`)

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Unique user ID |
| `email` | `string` | Email address |
| `cohortId?` | `string` | Optional cohort membership |
| `role?` | `'patient' \| 'clinician' \| 'admin'` | User role (TODO: from auth token) |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/integrations/auth.ts:26-29` | Read | `currentUser()` returns stub user `{ id: 'local-user', email: 'local@clientportal', role: 'admin' }` |
| `/App.svelte:177` | Read | `const user = await currentUser(); userRole = user?.role;` |

---

## 2. Workbook (Member Progress & Tracking)

**Scope:** Per-user (via `listWorkbooks(userId)`)  
**Current Storage:** localStorage key `4m:workbook:{id}`, indexed in `4m:index:{userId}`

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Workbook ID |
| `userId` | `string` | Owner (per-user scope key) |
| `cohortId?` | `string` | Optional cohort assignment |
| `startDate` | `string` | ISO date string |
| `motivation` | `MotivationChoice` (`'0'\|'1'\|'2'\|''`) | Intake motivation level |
| `personalWhy` | `string` | Free text: member's personal motivation |
| `name` | `string` | Member's name |
| `factorScores` | `Record<string, number>` | Factor assessments keyed by factor ID; values 0–5 |
| `factorPlans` | `Record<string, string>` | Action plans keyed by factor ID |
| `priorities` | `[string, string, string]` | Top 3 priority factor names |
| `commitments` | `[string, string, string]` | Top 3 commitment statements |
| `strengthBaseline` | `StrengthTest` | Week 1 strength: pullups, deadhang, pushups, squats, plank |
| `bodyBaseline` | `BodyBaseline` | Week 1 baseline: weight, waist, energy, focus, sleep, mood (all strings) |
| `trainLog` | `TrainingSession` | Free-form training rows keyed by movement ID |
| `fastingLog` | `Record<string, string>` | First/last meal times, keyed `w{week}d{n}_firstMeal\|lastMeal` |
| `weekLogs` | `Record<1\|2\|3\|4, WeekLog>` | Per-week: `{morn: Record<string, bool>, cold: Record<string, bool>, reflection: string}` |
| `w4audit` | `Record<string, number>` | Week 4 re-scores by factor ID |
| `w4` | `Week4Measurement` | Week 4 audit: weight, waist, energy, focus, sleep, mood, audit, squat, mornDays, coldDays |
| `supplements` | `Record<string, SupplementStatus>` | Supplement tracking: `{takingNow: bool, response?: 'Yes'\|'No'\|'', startedOn?: string}` |
| `cogRatings` | `CognitiveEntry` | Cognitive scores keyed `wN_focus`, `wN_memory`, `wN_mood` |
| `weekReflections` | `Record<string, string>` | Weekly free-text keyed `wN_*` |
| `protein` | `string` | Protein target (lbs) from input |
| `identityStatement` | `string` | Month 1 identity reflection |
| `month1Wins` | `[string, string, string]` | Top 3 wins at Month 1 graduation |
| `month2` | `{training, nutrition, supplements, cognitive, accountability: string}` | Month 2 focus areas |
| `graduation` | `string` | Graduation reflection |
| `regenPriority` | `string` | Genesis RPA priority selection |
| `regenNext` | `string` | Next steps for regen program |
| `currentMonth?` | `1\|2\|3\|4\|'maintenance'` | Current program month (per-user state) |
| `currentPillar?` | `PillarId` | Current pillar being worked (per-user state) |
| `graduatedFromMonth1?` | `boolean` | Month 1 completion flag (per-user state) |
| `rpaIntroSeen?` | `boolean` | Genesis RPA intro module seen flag (per-user state) |
| `weeklyOutcomes?` | `WeeklyOutcome[]` | Array of weekly outcome check-ins (per-user) |
| `createdAt` | `string` | ISO timestamp |
| `updatedAt` | `string` | ISO timestamp (updated on save) |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/App.svelte:19` | Create | `let workbook = $state<Workbook>(createEmptyWorkbook(WORKBOOK_ID, USER_ID));` |
| `/App.svelte:66` | Write | `void storage.saveWorkbook($state.snapshot(workbook) as Workbook);` (called from `persist()` on field/score/day/supp changes) |
| `/App.svelte:88` | Write | `workbook.factorScores[fId] = n;` then `persist()` |
| `/App.svelte:104` | Write | `const log = workbook.weekLogs[wk]; log[type][key] = !log[type][key];` then `persist()` |
| `/App.svelte:110` | Write | `workbook.supplements[key] = { takingNow: value === 'Yes', response: value };` then `persist()` |
| `/App.svelte:180` | Read | `const existing = await storage.getWorkbook(WORKBOOK_ID);` |
| `/App.svelte:183` | Merge | `workbook = { ...createEmptyWorkbook(WORKBOOK_ID, USER_ID), ...existing };` |
| `/lib/renderer.ts:35` | Read | `Object.values(W.factorScores).filter(v => (v ?? 0) > 0).length` in `auditFilled()` |
| `/lib/renderer.ts:38` | Read | `Object.values(W.factorScores).reduce((a, b) => a + (Number(b) \|\| 0), 0)` in `auditTotal()` |
| `/lib/renderer.ts:43` | Read | `Object.values(W.weekLogs[wk].morn).filter(Boolean).length` in `mornings()` |
| `/lib/renderer.ts:50` | Read | `Object.values(W.weekLogs[wk].cold).filter(Boolean).length` in `colds()` |
| `/lib/renderer.ts:78` | Read | `const sc = W.factorScores[fNum] \|\| 0;` in `scoreBtns()` |
| `/lib/renderer.ts:91` | Read | `const wl = W.weekLogs[w];` in `morningTracker()` |
| `/lib/renderer.ts:126` | Read | `oninput="portalField('weekLogs.${w}.reflection',this.value)" value="${esc(wl.reflection)}"` |
| `/lib/renderer.ts:750` | Read | `const resp = W.supplements[key]?.response ?? '';` |
| `/lib/renderer.ts:797` | Read | `const { supplements } = W;` in supplement render |
| `/lib/renderer.ts:1093` | Read | `const w1: number \| '' = W.factorScores[String(f.n)] \|\| '';` in audit table |
| `/lib/components/outcomes/OutcomePanel.svelte:25` | Read | `const outcomes: WeeklyOutcome[] = $derived(workbook.weeklyOutcomes ?? []);` |
| `/lib/components/outcomes/OutcomeCheckIn.svelte:26` | Write | `month: currentMonth` in outcome object |
| `/lib/components/outcomes/OutcomeCheckIn.svelte:34` | Write | `weeklyOutcomes: [...(workbook.weeklyOutcomes ?? []), outcome]` then save |
| `/lib/components/outcomes/OutcomeCheckIn.svelte:37` | Write | `void storage.saveWorkbook(updated);` |

### Storage Implementation
- **getWorkbook(id):** `localStorage.getItem('4m:workbook:' + id)` → JSON.parse
- **saveWorkbook(w):** Debounced 300ms; sets `4m:workbook:{w.id}` and adds to `4m:index:{w.userId}`
- **listWorkbooks(userId):** Reads `4m:index:{userId}`, then loads each workbook by ID

---

## 3. WeeklyOutcome (Per-User Symptom Tracking)

**Scope:** Per-user (nested in Workbook.weeklyOutcomes)  
**Current Storage:** Persisted as part of Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `weekISO` | `string` | ISO week format: `"2026-W16"` |
| `month` | `1\|2\|3\|4\|'maintenance'` | Program month |
| `week` | `number` | Week number within month |
| `scores` | `Partial<Record<OutcomeDomainKey, number>>` | Domain scores 0–10; domains: bloat, stool_quality, brain_fog, mood, sleep_quality, energy, focus, joint_pain, libido |
| `freeText?` | `string` | User free-text notes |
| `submittedAt` | `number` | Unix timestamp |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:147` | Definition | `weeklyOutcomes?: WeeklyOutcome[];` |
| `/lib/components/outcomes/OutcomePanel.svelte:25` | Read | `const outcomes: WeeklyOutcome[] = $derived(workbook.weeklyOutcomes ?? []);` |
| `/lib/components/outcomes/OutcomeCheckIn.svelte:17` | Read | Used via domains prop; `activeProductSlugs` mapped to outcome domains |
| `/lib/components/outcomes/OutcomeCheckIn.svelte:26-27` | Create | New outcome object: `{weekISO, month: currentMonth, week: currentWeek, scores: {...}, freeText, submittedAt: Date.now()}` |
| `/lib/components/outcomes/OutcomeCheckIn.svelte:34` | Write | Pushed to array: `weeklyOutcomes: [...(workbook.weeklyOutcomes ?? []), outcome]` |

---

## 4. Product (Catalog Item)

**Scope:** Global (static content)  
**Current Storage:** In-memory from `/lib/content/products.ts`; no persistence

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Product ID |
| `slug` | `string` | URL-friendly identifier |
| `name` | `string` | Product name |
| `shortName?` | `string` | Abbreviated name |
| `category` | `ProductCategory` | 'rx'\|'supplement'\|'peptide'\|'lab'\|'service'\|'membership'\|'protocol-bundle' |
| `tagline` | `string` | Short marketing line |
| `description` | `string` | Short description |
| `longDescription?` | `string` | Extended description |
| `heroClaim?` | `string` | Primary benefit claim |
| `mechanismBullets` | `string[]` | How it works bullets |
| `indications` | `string[]` | Indication/benefit list |
| `administrationRoutes?` | `string[]` | e.g., 'oral', 'IV', 'intranasal' |
| `protocol?` | `{duration: string, cycle?: string, cadence?: string}` | Usage protocol |
| `pricing` | `PricingModel` | Price structure |
| `requiresRx` | `boolean` | Prescription required |
| `fulfilledBy?` | `string` | Fulfillment partner |
| `tierAvailability` | `TierAvailability` | Per-tier: 'included'\|'discounted'\|'addon'\|'na' |
| `triggersFromIntake?` | `string[]` | Intake question trigger IDs |
| `tags` | `string[]` | Search/filter tags |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/content/products.ts:9` | Define | `export const products: Product[] = [...]` |
| `/lib/intake/report.ts:16` | Type | Import `type Product` |
| `/lib/intake/report.ts:30` | Type | `products: Product[];` |
| `/lib/intake/report.ts:43-44` | Field | `recommendedProducts: Product[];` |
| `/lib/intake/report.ts:85-87` | Read | Map `result.triggeredProducts` slugs to catalog: `products.find(p => p.slug === slug)` |
| `/lib/intake/router.ts:16` | Import | `TriggerRule` (references product slugs) |
| `/lib/components/discovery/IntakeReport.svelte:129` | Read | `{#each recommendedProducts as product}` render cards |
| `/lib/components/tiers/CartPreview.svelte:19-20` | Read | `addonProductSlugs.map(s => products.find(p => p.slug === s))` |
| `/lib/components/outcomes/OutcomePanel.svelte:31` | Read | `const domains = $derived(getDomainsForProtocols(activeProductSlugs));` |

---

## 5. LabPanel (Lab Test Catalog Item)

**Scope:** Global (static content)  
**Current Storage:** In-memory from `/lib/content/labs.ts`; no persistence

### Fields (extends Product, overrides category)
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Lab panel ID |
| `slug` | `string` | URL identifier |
| `name` | `string` | Panel name |
| `category` | `'lab'` | Always 'lab' |
| `tests` | `string[]` | List of test names |
| `vendor?` | `string` | Lab vendor name |
| *(other Product fields)* | — | All other Product fields apply |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/content/labs.ts:8` | Define | `export const labs: LabPanel[] = [...]` |
| `/lib/intake/report.ts:16` | Type | Import `type LabPanel` |
| `/lib/intake/report.ts:31` | Type | `labs: LabPanel[];` |
| `/lib/intake/report.ts:45-46` | Field | `recommendedLabs: LabPanel[];` |
| `/lib/intake/report.ts:89-91` | Read | Map `result.triggeredLabs` slugs: `labs.find(l => l.slug === slug)` |
| `/lib/intake/report.test.ts:4` | Type | Import `type LabPanel` |
| `/lib/components/discovery/IntakeReport.svelte:11` | Read | Extract and render `recommendedLabs` cards |

---

## 6. MembershipTier (Pricing Tier)

**Scope:** Global (static content)  
**Current Storage:** In-memory from `/lib/content/tiers.ts`; no persistence

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Tier ID (foundation, optimization, longevity, concierge) |
| `name` | `string` | Display name |
| `tagline` | `string` | Short description |
| `monthlyUSD?` | `number` | Monthly subscription price |
| `annualUSD?` | `number` | Annual subscription price |
| `onboardingFeeUSD?` | `number` | Onboarding cost |
| `oneTimePriceUSD?` | `number` | For cohort/one-time tiers |
| `kind?` | `'membership'\|'cohort'` | Subscription vs. one-time |
| `includedProductSlugs` | `string[]` | Product slugs included at this tier |
| `features` | `string[]` | Feature list |
| `description` | `string` | Long description |
| `idealFor` | `string[]` | Use-case bullets |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/content/tiers.ts:11` | Define | `export const tiers: MembershipTier[] = [...]` |
| `/lib/intake/report.ts:16` | Type | Import `type MembershipTier` |
| `/lib/intake/report.ts:48` | Field | `recommendedTier: MembershipTier \| null;` |
| `/lib/intake/report.ts:95` | Read | Lookup by ID: `tierById.get(tierKey)` |
| `/lib/intake/report.ts:159` | Read | Filter products: `new Set(tier?.includedProductSlugs ?? [])` |
| `/lib/intake/report.test.ts:4` | Type | Import `type MembershipTier` |
| `/lib/components/discovery/CheckoutStub.svelte:3,7` | Type & Read | Import, use `recommendedTier: MembershipTier \| null` |
| `/lib/components/tiers/TierCard.svelte:2,6,26-27` | Read | Use `tier.includedProductSlugs.length`, render cards |
| `/lib/components/discovery/IntakeReport.svelte:11` | Read | Extract `recommendedTier` |

---

## 7. IntakeAnswer (User Answer to a Question)

**Scope:** Per-user, in-session (not persisted to workbook)  
**Current Storage:** localStorage `intake_answers_{formKey}` (sessionStorage-like)

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `questionId` | `string` | Question ID |
| `value` | `number\|string\|string[]\|boolean` | Answer value (type depends on question) |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/intake.ts:128-130` | Define | Type definition |
| `/lib/components/discovery/IntakeForm.svelte:16` | Read | `loadSaved(key)` from localStorage |
| `/lib/components/discovery/IntakeForm.svelte:25` | State | `let answers = $state<Record<string, IntakeAnswer['value']>>(loadSaved(...))` |
| `/lib/components/discovery/IntakeForm.svelte:66` | Write | `setAnswer(qId, value): answers[qId] = value` |
| `/lib/components/discovery/IntakeForm.svelte:98` | Convert | `Object.entries(answers).map(([questionId, value]) => ({questionId, value}))` |
| `/lib/components/discovery/DiscoveryFlow.svelte:29` | State | `let lastAnswers = $state<IntakeAnswer[]>([]);` |
| `/lib/components/discovery/DiscoveryFlow.svelte:36` | Receive | `function handleIntakeComplete(answers: IntakeAnswer[])` |
| `/lib/integrations/coach.ts:172` | Type | Function parameter |

---

## 8. IntakeResult (Evaluation Output)

**Scope:** Per-user, session (generated from IntakeAnswer set)  
**Current Storage:** Not persisted; generated on-demand by `evaluateIntake()`

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `triggeredProducts` | `{slug: string; reasons: string[]}[]` | Recommended products and why |
| `triggeredLabs` | `{slug: string; reasons: string[]}[]` | Recommended labs and why |
| `recommendedTier` | `TierRec` | Tier recommendation: foundation\|optimization\|longevity\|concierge |
| `tierRationale` | `string` | Why this tier |
| `clinicianFlags` | `{questionId: string; reason: string}[]` | Flags for clinician review |
| `topPriorities` | `{domain: string; severity: number}[]` | Sorted by severity |
| `summary` | `string` | 2–3 sentence plain-language summary |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/intake.ts:136-146` | Define | Type definition |
| `/lib/intake/router.ts:69` | Create | `evaluateIntake(answers, sections): IntakeResult` |
| `/lib/intake/router.ts:267-271` | Populate | Build result object from trigger evaluation |
| `/lib/components/discovery/DiscoveryFlow.svelte:36-45` | Read | Receive answers, evaluate to result |
| `/lib/intake/report.ts:74-77` | Read | Function: `buildIntakeReport(result, products, labs, tiers)` |
| `/lib/intake/report.ts:85-116` | Read | Extract triggered products/labs/tier, build report |
| `/lib/integrations/coach.ts:173` | Type | Function parameter: `result: IntakeResult` |

---

## 9. AdminQueueItem (Clinician Work Queue)

**Scope:** Global (admin view only; seeded on first access)  
**Current Storage:** localStorage key `4m:admin:queue`; JSON array

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Item ID |
| `kind` | `QueueItemKind` | intake-review\|clinician-escalation\|rx-approval\|protocol-check\|lab-result-review\|outcome-flag |
| `patientId` | `string` | Patient reference ID |
| `patientLabel` | `string` | De-identified patient label (e.g., "Patient #A7K2 · M1W3") |
| `summary` | `string` | Human-readable description |
| `draftedAction?` | `string` | Proposed action / recommendation |
| `createdAt` | `number` | Unix timestamp |
| `urgency` | `QueueUrgency` | routine\|soon\|urgent |
| `status` | `QueueStatus` | pending\|in-progress\|resolved\|deferred |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/adminQueue.ts:20-30` | Define | Type definition |
| `/lib/data/adminQueue.ts:34-89` | Seed | `SEED_ITEMS` array for first init |
| `/lib/data/adminQueue.ts:104` | Read | `getPendingQueue()` returns non-resolved items |
| `/lib/data/adminQueue.ts:91-101` | Load | `loadQueue()` from localStorage with seed fallback |
| `/lib/data/adminQueue.ts:109-119` | Write | `resolveQueueItem(id, status)` updates status and persists |
| `/lib/components/admin/AdminDashboard.svelte:2` | Read | `import { getPendingQueue, type QueueItem }` |

---

## 10. MotivationChoice (Intake Response Type)

**Scope:** Per-user (single field in Workbook)  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| value | `'0'\|'1'\|'2'\|''` | Motivation level or empty string |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:8` | Define | Type definition |
| `/lib/data/schema.ts:88` | Field | `motivation: MotivationChoice;` in Workbook |
| `/lib/data/schema.ts:182` | Init | `motivation: ''` in createEmptyWorkbook |

---

## 11. FactorScoreEntry (Deprecated; Unused Type)

**Scope:** Not actively used (legacy definition)  
**Current Storage:** None (fields stored directly in Workbook.factorScores and Workbook.factorPlans)

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `score` | `number` | 1–5 score; 0 or undefined = unscored |
| `plan?` | `string` | Personal action plan text |
| `updatedAt?` | `string` | ISO timestamp |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:15-21` | Define | Type definition (not used) |

**Note:** Current schema stores scores in `factorScores: Record<string, number>` and plans in `factorPlans: Record<string, string>` rather than as objects of this type.

---

## 12. TrainingSession (Workout Logs)

**Scope:** Per-user (Workbook.trainLog)  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `[movementId: string]` | `string` | Free-form log rows keyed by movement ID |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:56-59` | Define | Type definition |
| `/lib/data/schema.ts:102` | Field | `trainLog: TrainingSession;` in Workbook |
| `/lib/data/schema.ts:191` | Init | `trainLog: {}` in createEmptyWorkbook |
| `/lib/components/TrainingLog.svelte:2,8` | Read | Import and use `log: TrainingSession` |

---

## 13. WeekLog (Weekly Tracking)

**Scope:** Per-user, per-week (Workbook.weekLogs[1|2|3|4])  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `week` | `1\|2\|3\|4` | Week number |
| `morn` | `Record<string, boolean>` | Morning protocol checkmarks, keyed `w{w}d{n}` |
| `cold` | `Record<string, boolean>` | Cold exposure checkmarks, keyed `c{w}d{n}` |
| `reflection` | `string` | Free-text weekly reflection |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:66-74` | Define | Type definition |
| `/lib/data/schema.ts:106` | Field | `weekLogs: Record<1\|2\|3\|4, WeekLog>;` in Workbook |
| `/lib/data/schema.ts:193-198` | Init | Four empty weeks in createEmptyWorkbook |
| `/App.svelte:104` | Write | `workbook.weekLogs[wk][type][key] = !workbook.weekLogs[wk][type][key];` in `toggleDay()` |
| `/lib/renderer.ts:43` | Read | Count morn checkmarks |
| `/lib/renderer.ts:50` | Read | Count cold checkmarks |
| `/lib/renderer.ts:91` | Read | Access week log for rendering |
| `/lib/renderer.ts:126` | Read | `oninput="portalField('weekLogs.${w}.reflection',this.value)"` |

---

## 14. SupplementStatus (Supplement Tracking)

**Scope:** Per-user, per-supplement (Workbook.supplements[key])  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `startedOn?` | `string` | ISO date when started |
| `takingNow` | `boolean` | Currently taking |
| `response?` | `'Yes'\|'No'\|''` | Raw response preserved for compatibility |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:76-81` | Define | Type definition |
| `/lib/data/schema.ts:112` | Field | `supplements: Record<string, SupplementStatus>;` in Workbook |
| `/lib/data/schema.ts:204` | Init | `supplements: {}` in createEmptyWorkbook |
| `/App.svelte:110-111` | Write | `workbook.supplements[key] = { takingNow: value === 'Yes', response: value };` then `persist()` |
| `/lib/renderer.ts:750` | Read | `W.supplements[key]?.response ?? ''` |
| `/lib/renderer.ts:797` | Read | `const { supplements } = W;` for rendering |
| `/lib/renderer.ts:1265` | Read | Iterate and render supplement cards |

---

## 15. BodyBaseline (Week 1 Measurements)

**Scope:** Per-user (Workbook.bodyBaseline)  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `weight` | `string` | Starting weight |
| `waist` | `string` | Starting waist |
| `energy` | `string` | Energy baseline (1–10) |
| `focus` | `string` | Focus baseline (1–10) |
| `sleep` | `string` | Sleep baseline (hours?) |
| `mood` | `string` | Mood baseline (1–10) |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:40-47` | Define | Type definition |
| `/lib/data/schema.ts:101` | Field | `bodyBaseline: BodyBaseline;` in Workbook |
| `/lib/data/schema.ts:190` | Init | Initialize with empty strings |

---

## 16. Week4Measurement (Week 4 Audit Data)

**Scope:** Per-user (Workbook.w4)  
**Current Storage:** Persisted in Workbook

### Fields (extends BodyBaseline)
| Field | Type | Notes |
|-------|------|-------|
| *(BodyBaseline fields)* | — | weight, waist, energy, focus, sleep, mood |
| `audit` | `string` | Audit notes |
| `squat` | `string` | Squat re-test value |
| `mornDays` | `string` | Days of morning protocol completed |
| `coldDays` | `string` | Days of cold exposure completed |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:49-54` | Define | Type definition |
| `/lib/data/schema.ts:110` | Field | `w4: Week4Measurement;` in Workbook |
| `/lib/data/schema.ts:200-202` | Init | Initialize with empty strings |

---

## 17. StrengthTest (Strength Baseline)

**Scope:** Per-user (Workbook.strengthBaseline)  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `pullups?` | `string` | Reps or max |
| `deadhang?` | `string` | Seconds |
| `pushups?` | `string` | Reps or max |
| `pushupsType?` | `'full'\|'incline'\|'knee'\|''` | Push-up variation |
| `squats?` | `string` | Reps or max |
| `squatsType?` | `'full'\|'assisted'\|''` | Squat type |
| `plankSec?` | `string` | Plank hold seconds |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:30-38` | Define | Type definition |
| `/lib/data/schema.ts:100` | Field | `strengthBaseline: StrengthTest;` in Workbook |
| `/lib/data/schema.ts:189` | Init | Empty object `{}` |

---

## 18. CognitiveEntry (Cognitive Ratings)

**Scope:** Per-user (Workbook.cogRatings)  
**Current Storage:** Persisted in Workbook

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `wN_focus?` | `string` | Week N focus rating |
| `wN_memory?` | `string` | Week N memory rating |
| `wN_mood?` | `string` | Week N mood rating |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/schema.ts:61-64` | Define | Type definition |
| `/lib/data/schema.ts:114` | Field | `cogRatings: CognitiveEntry;` in Workbook |
| `/lib/data/schema.ts:205` | Init | `cogRatings: {}` in createEmptyWorkbook |

---

## 19. PricingModel (Product Pricing)

**Scope:** Global (static, part of Product)  
**Current Storage:** In-memory from product catalog

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `type` | `'one-time'\|'subscription'\|'cycle'\|'per-administration'` | Pricing model |
| `retailUSD` | `number` | Retail price |
| `memberUSD?` | `number` | Member/discounted price |
| `bundlePricing?` | `{quantity: number; totalUSD: number; label: string}[]` | Bundle options |
| `cogsNote?` | `string` | Internal COGS note |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/catalog.ts:15-21` | Define | Type definition |
| `/lib/data/catalog.ts:48` | Field | `pricing: PricingModel;` in Product |

---

## 20. TierAvailability (Tier Product Availability)

**Scope:** Global (static, part of Product)  
**Current Storage:** In-memory from product catalog

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `foundation` | `'included'\|'discounted'\|'addon'\|'na'` | Availability in Foundation tier |
| `optimization` | `'included'\|'discounted'\|'addon'\|'na'` | Availability in Optimization tier |
| `longevity` | `'included'\|'discounted'\|'addon'\|'na'` | Availability in Longevity tier |
| `concierge` | `'included'\|'discounted'\|'addon'\|'na'` | Availability in Concierge tier |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/catalog.ts:23-28` | Define | Type definition |
| `/lib/data/catalog.ts:51` | Field | `tierAvailability: TierAvailability;` in Product |

---

## 21. TriggerRule (Intake Evaluation Rule)

**Scope:** Global (static, embedded in intake questions)  
**Current Storage:** In-memory from intake questions

### Fields
| Field | Type | Notes |
|-------|------|-------|
| `threshold?` | `number` | Min severity/score (0–3) to trigger |
| `productSlugs?` | `string[]` | Recommended product slugs |
| `labSlugs?` | `string[]` | Recommended lab slugs |
| `tierRecommendation?` | `TierRec` | Min tier (foundation\|optimization\|longevity\|concierge) |
| `clinicianFlag?` | `boolean` | Flag for clinician review |
| `tag?` | `string` | Domain tag for aggregation |

### Read/Write Callsites

| Location | Type | Action |
|----------|------|--------|
| `/lib/data/intake.ts:18-31` | Define | Type definition |
| `/lib/intake/router.ts:18` | Import | Import type |
| `/lib/intake/router.ts:33-62` | Use | Evaluate rules in `fireRule()` |

---

## Storage Layer Summary

### Current Backend: LocalStorageAdapter

**File:** `/lib/storage/localStorageAdapter.ts`

| Method | Behavior | Keys |
|--------|----------|------|
| `getWorkbook(id)` | Read JSON from localStorage | `4m:workbook:{id}` |
| `saveWorkbook(w)` | Debounced 300ms write; updates index | `4m:workbook:{id}`, `4m:index:{userId}` |
| `listWorkbooks(userId)` | List workbooks by user | `4m:index:{userId}` → multiple `4m:workbook:*` |
| `deleteWorkbook(id)` | Remove workbook; leave index alone | `4m:workbook:{id}` |
| `subscribe(id, handler)` | Register callback on save | In-memory subscription set |

**Key Patterns:**
- Workbook saves are per-ID, debounced to reduce thrashing
- Index is maintained per `userId` for multi-workbook retrieval
- No conflict resolution or concurrency control
- Subscribers are notified post-save

---

## Multi-User and Access Control

**Current State (Beta):**
- Single hardcoded user: `{ id: 'local-user', email: 'local@clientportal', role: 'admin' }`
- Role is currently always 'admin' (bypasses access checks for testing)

**Per-User Data:**
- Workbook (scoped by `userId` via `4m:index:{userId}`)
- WeeklyOutcomes (nested in Workbook)
- IntakeAnswer responses (in-session, not persisted)

**Global Data:**
- Products, LabPanels, MembershipTiers, IntakeQuestions (all in-memory)
- AdminQueueItems (localStorage, all clinicians share one queue)

**Missing (For Multi-User Migration):**
- User authentication (auth.ts is stubbed)
- Role-based access control (no checks on admin view)
- Clinician/patient data isolation
- Multi-clinician queue locking or assignment

---

## Migration Recommendations

**For Supabase + AppSync migration:**

1. **Workbook** → Per-user table with `userId` partition key
2. **WeeklyOutcome** → Nested or separate table with `workbookId` + timestamp sort key
3. **AdminQueueItem** → Global table (clinicians share); consider `assignedCliniciansId` set for future
4. **Products, LabPanels, MembershipTiers** → Static (CDN-backed, rarely updated)
5. **User** → Cognito identity; pull role from token claims

**Storage Interface Abstraction:**
- Current: `Storage` interface in `/lib/storage/types.ts`
- Keep the same interface; swap `LocalStorageAdapter` for `SupabaseAdapter` at export time
- No changes to calling code (App.svelte, OutcomeCheckIn, etc.)

---

## Entity Relationship Diagram (Logical)

```
User (Cognito)
  ├─ Workbook (per-user)
  │   ├─ weeklyOutcomes: WeeklyOutcome[] (per-user)
  │   ├─ factorScores: Record<factorId, score> (per-user)
  │   ├─ supplements: Record<key, SupplementStatus> (per-user)
  │   ├─ weekLogs: Record<week, WeekLog> (per-user)
  │   └─ [currentMonth, currentPillar, graduatedFromMonth1, rpaIntroSeen] (per-user state)
  │
  └─ [IntakeAnswer] (session-only)
      └─ → evaluateIntake() → IntakeResult (generated)
          ├─ triggeredProducts (refs Product.slug)
          ├─ triggeredLabs (refs LabPanel.slug)
          └─ recommendedTier (refs MembershipTier.id)

Global:
  ├─ Product[] (static catalog)
  ├─ LabPanel[] (static catalog)
  ├─ MembershipTier[] (static catalog)
  ├─ IntakeQuestion[] (static intake form)
  └─ AdminQueueItem[] (shared clinician queue)
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-28  
**Prepared By:** Claude Code Agent
