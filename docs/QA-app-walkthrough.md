# My4MLife App — New Protégé QA Walkthrough

Date: 2026-04-28  
Scope: clientportal at https://app.my4mlife.com  
Method: Full source read of `apps/clientportal/src/`; live HTTP check (200 OK); grep scans for stale terms and dead links.

---

## Critical issues (ship blockers)

- [ ] **W4 re-audit comparison table always shows "—" for Week 1 column.** `renderer.ts:1400` reads `W.factorScores[String(f.n)]` where `f.n` values are legacy numeric strings (`'00'`–`'13'`). But `Stage4Audit.submit()` syncs audit using `AUDIT_CATEGORIES` slug-keyed scores (e.g. `'gut-microbiome'`). The keys never match, so every Week 1 baseline cell in the side-by-side comparison will be blank for any user who completed intake with the new 3-stage flow. File: `renderer.ts:1398–1412` + `Stage4Audit.svelte:60–66`. **Severity: Critical — breaks the only Month 1 progress comparison.**

- [ ] **`/cart` links are dead (404).** `renderer.ts:195` and `App.svelte:276` emit `<a href="/cart">` buttons in the Gut Health Self-Assessment result card ("Anchor with BiomeAxisForge →"). No `/cart` route exists in this SPA. Clicking navigates to the login page or a 404. **Severity: Critical — only conversion CTA in the gut assessment goes nowhere.**

- [ ] **Profile component is unreachable — sign-out is impossible.** `Profile.svelte` exists but is not imported by `App.svelte`, `Sidebar.svelte`, or any routed tab. There is no "Profile" or "Sign Out" nav item in `tabs` (weeks.ts) or rendered sidebar. A signed-in user has no way to change their email or sign out without clearing browser storage manually. `cognito.ts:92` and `store.svelte.ts:26` implement sign-out correctly — it just has no UI surface. **Severity: Critical — users are permanently logged in with no escape.**

---

## Functional issues

- [ ] **`renderGutAssessment()` is exported but never called.** `renderer.ts:152` exports the function; no call site exists in the entire codebase (`grep -rn` confirmed). `gutAssessmentAction` and `allergyAssessmentAction` are still wired to `window` in `App.svelte:402–405`, and the `gut-assessment-v1` localStorage key is wiped by the clean slate in `IntakeModule.svelte:40`. The function is dead code, but the wiring (50+ lines in `App.svelte`) is live overhead. File: `App.svelte:186–291`, `renderer.ts:89–226`.

- [ ] **W2 and W3 factor re-score inputs use 1–5 scale but intake audit stored 0–10.** `renderer.ts:955–956` labels "Week 1 score (1–5) you gave it" and `renderer.ts:1166` "Re-score this factor (1–5)." The intake audit (Stage2Likert + Stage4Audit) stores per-category scores on a 0–10 scale. Pre-filled Top-3 labels show `(score/10)` values (e.g. "Gut microbiome health (8/10)"). A user re-entering their Week 1 score as "8" into a field capped at max=5 will be confused or silently cropped. File: `renderer.ts:955–956`, `renderer.ts:1166–1169`.

- [ ] **W4 re-audit score instruction says "1–5 scale from Week 1" but intake used 0–5 displayed / 0–10 stored.** `renderer.ts:1381` says "Score every factor again using the same 1–5 scale from Week 1" and `renderer.ts:1411` says "Score 1–5 per factor." The re-audit table also reads `W.factorScores` (legacy numeric keys, see Critical issue above). File: `renderer.ts:1381`, `renderer.ts:1411`.

- [ ] **`audit-review` tab is not in `tabs` array but two buttons link to it.** `renderer.ts:562` and `renderer.ts:778` call `portalAction('goTo','audit-review')`. `renderPage` handles this case (`renderer.ts:1793`), so the page itself works. However, the `renderAuditReview()` back button (`renderer.ts:1742–1769`) likely calls `portalAction('goTo','dash')`, but the tab is not in the sidebar nav, so users cannot return to it via nav — they must use the "Review Full Audit →" button each time. Acceptable if intentional, but no sidebar item = no discoverability.

- [ ] **`runCleanSlate` in `IntakeModule.svelte:37` uses schema sentinel key `intake-schema-v3` with date `2026-05-01` (future at time of write, now past).** Any user who loaded the app before that date but after the sentinel was added will have their slate wiped once on that date. Users who first load after 2026-05-01 will never hit the clean slate at all — it only triggers if the key is absent. This is correct for new users, but returning users who saved gut/allergy/audit data under the old schema may be silently wiped on first load after the date without warning. File: `IntakeModule.svelte:37–45`.

- [ ] **`isStage1Complete()` SHA-check has a bypass.** `IntakeModule.svelte:68–69` shows: `shaMatch` returns `true` when either stored OR current SHA equals `'sha256-unavailable'`. This means consent can never be effectively invalidated on browsers that don't support `SubtleCrypto`. Minor but worth noting. File: `IntakeModule.svelte:68–69`.

- [ ] **`riskBand()` in renderer is unused.** `renderer.ts:56–60` defines `riskBand(score)` operating on a 0-70 scale (thresholds 28 and 49). The dashboard uses `auditBand200()` (0-200 scale). `riskBand()` has no call sites. File: `renderer.ts:56–60`.

- [ ] **Admin dashboard falls back to seed data silently.** `AdminDashboard.svelte:35–38` shows that if `adminListQueue` returns empty or throws, it replaces the live queue with `SEED_QUEUE`. An admin viewing a production queue with no pending items would see seed/fake records instead of a true empty state. File: `AdminDashboard.svelte:35–38`.

- [ ] **`Stage4Audit.submit()` — workbook sync only updates factorScores if workbook JSON already exists in localStorage.** `Stage4Audit.svelte:60–66`: if `workbook-local-workbook` key doesn't exist yet (e.g. first-time user with no prior workbook), the sync block is silently skipped. `App.svelte` also tries to merge on mount, but there's a race: `onMount` fires concurrently with `onIntakeComplete`. File: `Stage4Audit.svelte:60–66`.

---

## Content issues

- [ ] **"15-Factor Audit" in Week 3 banner.** `weeks.ts:56–58`: `focus: 'Mitigate (deep focus): 15-Factor Audit'` and `primaryHeadline: 'Remove the 15 factors stealing your brain & body.'` — the program now uses a 20-category audit. These strings appear in the Week 3 `weekBanner` that every Protégé sees. File: `weeks.ts:56,58`.

- [ ] **"Mitigate audit score (/70)" in W4 comparison table.** `renderer.ts:1296`: the metric label in the Week 4 side-by-side comparison still reads `/70` (14 factors × 5 max = 70), not `/200` (20 categories × 10 max = 200). File: `renderer.ts:1296`.

- [ ] **Dashboard "Program Group" field is user-visible with placeholder "Group ID".** `renderer.ts:633–635` renders an editable "Program Group" field on the dashboard. The comment says "retained for data compatibility" but there is no group system in the current app. A brand-new Protégé will see an empty field labeled "Group ID" with no explanation. Consider hiding or removing. File: `renderer.ts:633–635`.

- [ ] **`telemedicine` mentioned in Stage 1 field note.** `Stage1Basics.svelte:199`: "Other details (email, phone, state) will be collected at telemedicine booking." This is a forward reference to a booking flow that does not yet exist in the app. It will leave users wondering when/how to provide those details. File: `Stage1Basics.svelte:199`.

- [ ] **"telemedicine consult" mentioned in allergy assessment result copy.** `Stage4Allergy.svelte:86` (unused component): "flag for a telemedicine consult to discuss IgG/IgE testing options." This component is not rendered in the current intake flow (IntakeModule.svelte only imports Stage1, Stage2Likert, Stage4Audit) but the file exists and is not deleted. Also `App.svelte:359` (inside `allergyAssessmentAction`) contains the same copy. File: `Stage4Allergy.svelte:86`, `App.svelte:359`.

- [ ] **"Doctor TJ Special" branding inconsistency.** `renderer.ts:1047` uses the informal "The Doctor TJ Special (BPC-157 + L-Glutamine)" as a supplement name in the Week 2 compliance table. All other copy refers to "BiomeAxisForge." If the product is branded BiomeAxisForge, the supplement compliance row should use that name. File: `renderer.ts:1047`.

- [ ] **`renderConsultCTA()` Calendly link is hardcoded to `calendly.com/my4mlife/consult`.** `renderer.ts:584`. If this link is not live, all post-intake CTAs silently fail. Not confirmed dead, but hardcoded and untested via automation. File: `renderer.ts:584`.

- [ ] **Audit-review page title says "Risk Factor Audit" with subtitle "Your 20-category intake assessment."** `renderer.ts:1767–1768`. The body copy on the same page says: "Score each area is 0–10." This is consistent, but the band thresholds (Low ≤60, Moderate ≤120, Elevated >120) are not labelled or explained anywhere on this page. Users see a number like 92 with label "Moderate" but no legend. File: `renderer.ts:1767–1784`.

---

## UX / new-user experience issues

- [ ] **No sign-out mechanism.** (See Critical issues.) A Protégé who uses a shared device or realizes they signed in with the wrong email is completely stuck. This is a trust/safety issue.

- [ ] **After completing intake, the app drops directly to the Dashboard with no celebration or orientation moment.** `IntakeModule.svelte:136–141`: `complete()` calls `onComplete()` which sets `intakeComplete = true`, causing `App.svelte` to render the dashboard. There is no "Intake complete — here's what's next" screen. The user immediately sees the full dashboard (with Profile card, audit stats, Quick Navigation, Consult CTA, Audit Summary Card) with no guidance on where to start. The Consult CTA and "Explore Week 1" button are present but visually compete for attention.

- [ ] **The Consult CTA appears before the Audit Summary Card on the dashboard.** `renderer.ts:677–679` renders `renderConsultCTA()` then `renderAuditSummaryCard()`. Many new users will not have scheduled a consult and the prominent "Book My Comprehensive 4M Consult →" button is the first thing they see after intake. The audit results — which they just spent 5+ minutes completing — appear below the fold on mobile.

- [ ] **Height field asks for inches with no ft/in helper.** `Stage1Basics.svelte:191–193`: `<input type="number" ... placeholder="e.g. 70" min="48" max="96">`. For a man who is 5'10", the expected value is 70 inches. Most men do not know their height in inches. No conversion helper or hint is provided beyond the placeholder. This is the single most friction-generating field in Stage 1.

- [ ] **Stage 2 sticky header stacks on top of IntakeModule progress bar on mobile.** `IntakeModule.svelte:189–198` renders `.progress-shell { position: sticky; top: 0; z-index: 20 }`. `Stage2Likert.svelte:282–289` renders `.sticky-header { position: sticky; top: 0; z-index: 10 }`. Both are `sticky; top:0` — on mobile they stack, but since the IntakeModule header has `z-index:20` and Stage 2 has `z-index:10`, the Stage 2 sticky header will overlap the first question cards when scrolled, while the progress bar from IntakeModule potentially covers the Stage 2 sticky header on some viewport heights. TJ flagged this. File: `IntakeModule.svelte:189`, `Stage2Likert.svelte:282`.

- [ ] **No loading state during the initial `onMount` async calls in App.svelte.** `App.svelte:401–423`: on mount, the app calls `currentUserLegacy()` and `storage.getWorkbook()` but shows the full shell immediately. If these calls take more than ~200ms, the user sees a flash of "incomplete" workbook data before the loaded data replaces it. No skeleton or loading spinner is shown.

- [ ] **W2/W3 "Priority Factor" selects pre-fill factor names from `factors.ts` (legacy list of 14 factors, numbered 00–13) rather than the 20-category audit.** `renderer.ts:428–436` builds a dropdown from `factors` (the old 14-factor content file). A user's Top 3 from their intake will be labeled "Gut microbiome health" (AUDIT_CATEGORIES) but the W2 dropdown lists "Gut microbiome health" as `02. Gut microbiome health` — these may or may not align. If a user's top-3 priority is one of the 6 new AUDIT_CATEGORIES not in `factors` (e.g. `self-image`, `financial-stress`, `access-knowledge`, `access-care`, `pain-acute`, `pain-chronic`), it will not appear in the dropdown. File: `renderer.ts:428–436`.

- [ ] **Stage 3 (audit review) submit button is never disabled even if user hasn't reviewed anything.** `Stage4Audit.svelte:121–125`: "Complete Intake & Unlock Program →" button has no `disabled` guard. A user can click it immediately on arriving at Stage 3 without reviewing any auto-populated scores. This is intentional per the spec ("Your audit was auto-populated...") but worth documenting as a potential confusion point — the auto-filled values are all 0 if Stage 2 was never completed.

- [ ] **Week views use emoji icons in the tab bar** (`weeks.ts:11–16`), but there is no text fallback if emoji are blocked. On some enterprise/Windows environments, emoji render as boxes. Minor but inconsistent with the brand.

---

## Mobile / responsive concerns

- [ ] **Dual sticky headers on Stage 2 on mobile** (see UX section — TJ-flagged). The IntakeModule progress bar (`z-index:20, position:sticky, top:0`) and the Stage2Likert sticky question counter (`z-index:10, position:sticky, top:0`) will visually stack. On a 375px viewport with both displayed, questions near the top of the scroll will be partially obscured. Stage 2 header should use `top: <progress-bar-height>` instead of `top: 0`.

- [ ] **Workout log and fasting tracker use fixed grid columns (`grid-template-columns:1.6fr 1fr 0.8fr 1.2fr`).** `renderer.ts:354–355`. On screens narrower than ~360px, these cells will be extremely narrow and the inline inputs inside them will overflow or be unreadable. No responsive breakpoint or `overflow-x:auto` wrapper exists for the workout log grid itself (the W4 comparison table does have an `overflow-x:auto` wrapper at `renderer.ts:1435`).

- [ ] **3-field row in Stage 1 basics (age / height / weight) may be cramped on small screens.** `Stage1Basics.svelte:185–194`: `grid-template-columns: repeat(3, 1fr)` with no responsive override. On 320px screens, 3 number inputs at equal widths become very narrow (~95px each). No media query adjusts this to stack vertically.

- [ ] **Touch targets for Likert buttons are adequate (padding: 10px 4px, flex:1).** On a 375px screen with 6 buttons, each is ~58px wide including gap — passes the 44px minimum. This is fine.

- [ ] **Sidebar has no mobile navigation affordance.** The `.shell` layout (App.svelte) likely uses a CSS flex or grid layout that positions the sidebar as a fixed left column. On narrow viewports, the sidebar likely causes horizontal scroll or is hidden with overflow. No hamburger menu or slide-in panel was found. The sidebar content (nav items, stats, Discovery/Pricing buttons) is inaccessible on small screens if the sidebar is overflow:hidden.

---

## Accessibility (light pass)

- [ ] **Form labels in `renderer.ts` HTML strings use `<label>` without `for` attributes pointing to the subsequent `<input>`.** The renderer emits patterns like `<label>Full name</label><input ...>` without `id` on the input or `for` on the label (e.g. `renderer.ts:628`). These are not programmatically associated. Screen readers will not announce the label when the input is focused. This affects the entire dashboard, all week views, and the factor plan textareas.

- [ ] **Factor accordion toggle buttons in week views have no `aria-controls`.** `renderer.ts:83–87` emits `<button class="score-btn" onclick="...">` without `aria-label`, `aria-pressed`, or `role` attributes. The score value is the button text (1–5), but there is no screen-reader context for which factor is being scored.

- [ ] **Gut and allergy assessment Yes/No buttons have no accessible label.** `renderer.ts:166–171`: buttons have text content "Yes"/"No" but are inside a flex row with `data-gut-row`. The question text is in a sibling `<span>`, not associated via `aria-describedby`. Screen readers will announce "Yes button" without the question context.

- [ ] **Auth cards (EmailEntry, CodeEntry) have correct ARIA.** `EmailEntry.svelte:44` uses `role="alert"` on error `<p>` and labels are associated via `for/id`. This is good. ✓

- [ ] **Stage1Basics consent checkboxes become `<span class="accepted-tick">` once accepted.** `Stage1Basics.svelte:212–213`: after a consent is accepted, the checkbox is replaced by a `<span>` with `aria-hidden="true"`. The `<label for="cb-npp">` now has a dangling `for` pointing to a non-existent `id`. Keyboard users who tabbed past the checkbox before accepting can no longer reach it by keyboard after reload. File: `Stage1Basics.svelte:212–213`.

- [ ] **Stage 2 Likert buttons correctly use `aria-pressed` and `aria-label`.** `Stage2Likert.svelte:226–232`. ✓

- [ ] **Color contrast on `#9ba3b2` text on `#0f1117` background.** Multiple muted text spans use `var(--text-muted, #9ba3b2)` on the `#0f1117` background. Contrast ratio is approximately 4.3:1, which passes AA for normal text at ≥14pt but may fail for the smallest labels (0.68rem ≈ 10.9px) which require 4.5:1 for AA. Worth a proper pass with a contrast checker on small-label instances.

---

## Suggested polish (not blocking)

- [ ] Stage 3 (audit review): add a "Nothing to adjust — looks right" confirmation pattern or a brief animation after submit, so users feel closure before transitioning to the dashboard.
- [ ] Height field in Stage 1: add a small ft/in to inches converter hint or allow dual-format input (e.g. "5ft 10in").
- [ ] `renderGutAssessment()` and all gut/allergy assessment wiring in `App.svelte` can be deleted — it's dead code and a maintenance risk. ~120 lines in `App.svelte` + 80 lines in `renderer.ts`.
- [ ] Replace the legacy `factors.ts`-based W2/W3 factor name selects with a dynamic list built from `AUDIT_CATEGORIES` so the dropdowns reflect the actual 20-category audit.
- [ ] `sidebarStats` shows both "Audit: X / 200" and "Score: X / 200" — these are identical. Remove the duplicate or replace with "Risk band: Moderate" etc.
- [ ] Week 3 banner tag line "Mitigate (deep focus): 15-Factor Audit" → "20-Category Audit". File: `weeks.ts:56`.
- [ ] `renderConsultCTA`: add `?prefill_email=...` to the Calendly link using the logged-in user's email from the auth store to reduce friction at booking.
- [ ] W2 Week 1 score input for each factor (`type="number" min="1" max="5"`) should reflect the 0–10 intake scale or be replaced with a read-only display of the pre-filled audit score.
- [ ] Add a `<title>` and `<meta name="description">` update on tab change for PWA sharing / bookmarking.

---

## Verified working

- [ ] Live app returns HTTP 200 at `https://app.my4mlife.com`. ✓
- [ ] Sign-in flow: `EmailEntry` → email submit → `CodeEntry` code entry → `AuthGate` shows children. OTP wait message shows the email address clearly. "← Use a different email" back button present. Error state via `role="alert"`. ✓
- [ ] `IntakeModule` progress bar correctly shows "Stage 1 of 3," "Stage 2 of 3," "Stage 3 of 3" with fill %. ✓
- [ ] Stage 1 `canContinue` `$derived` uses `String()` coercion to avoid `.trim()` crash on numeric fields. ✓
- [ ] Stage 1 consent flow: "Read document" → modal open → checkbox enabled → checked → "Accepted X ago" timestamp shown. ✓
- [ ] Stage 2 Likert: 20 questions rendered, all answered required before Continue, "0 if doesn't apply" hint shown. ✓
- [ ] Stage 2 → Stage 3 transition: audit-v1 is written with `scores` key × 2 (0-10 scale); Stage 4 reads same key. Pre-population chain is technically correct. ✓
- [ ] Stage 3 Top-3 panel renders from `selectTop3()` which is imported from `data/selectTop3.ts`. ✓
- [ ] Stage 3 submit: writes `intake-complete-v1`, fires `onComplete()`, `App.svelte` transitions from intake to dashboard. ✓
- [ ] Dashboard greeting reads name from `basics-v1` localStorage fallback when workbook name is empty. ✓
- [ ] Dashboard audit stats read from `audit-v1` via `loadAuditScores()`. ✓
- [ ] "Review Full Audit →" button routes to `renderAuditReview()`. ✓
- [ ] Sidebar shows Discovery, Pricing, Admin (staff only) buttons. ✓
- [ ] Sidebar locks week tabs (`pointer-events: none`, lock overlay) until intake complete. ✓
- [ ] Week 1–4 and Regen views all have `case` entries in `renderPage()` switch. ✓
- [ ] Morning tracker day buttons work via `portalAction('toggleDay',...)`. ✓
- [ ] Admin dashboard shows `Forbidden403` to non-admin users. ✓
- [ ] Admin dashboard falls back to seed data if API is unavailable. ✓ (see also issue — no empty-state vs. seed-data distinction)
- [ ] `intake-schema-v3` clean slate runs once and wipes prior multi-stage keys. ✓
- [ ] `basics-v1` weight pre-fills Week 1 body composition baseline. ✓
- [ ] `renderConsultCTA()` only shows after `intake-complete-v1` is set. ✓
