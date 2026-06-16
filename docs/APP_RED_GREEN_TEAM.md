# Protégé App — Red Team / Green Team + UX Friction Review

**Date:** 2026-06-14
**Scope:** `apps/clientportal/` (Svelte 5 PWA, the member-facing Protégé app)
**Method:** Code-level walkthrough by three parallel reviewers (data-entry inventory, red team, green team). Critical findings spot-verified against source by TJ's request. Not a live click-through — the app requires Cognito sign-in + production backend (real patient data) to reach the tracking screens, so a static-but-verified code audit was the safe, reliable path. Every claim below cites `file:line`.

---

## ✅ IMPLEMENTATION STATUS (2026-06-14)

All red-team P0/P1/P2 fixes below have been **implemented, committed, deployed to production, and verified on a real phone (TJ, 2026-06-14)** — bottom-nav Settings/Sign Out reachable, Sign Out works, Weeks 2–4 open content, nav labels readable, gut-assessment result readable. The app builds clean; the 8 pre-existing unit-test failures (in `client.test.ts`, `triggers.test.ts`, `AdminDashboard.test.ts`, `AuthGate.test.ts`) were confirmed present on clean `HEAD` before these changes — i.e. not regressions from this work.

### UX "less-typing, more-tapping" sweep — SHIPPED 2026-06-15 (Part 3 items)
Deployed to production:
- **Workout log → one checkbox per exercise** (squat, hip-hinge, push+pull + Zone 2 cardio + HIIT optional). Dropped weight/reps/notes/date free-text. `renderer.ts workoutLog()`, keys `trainLog.wNdM_<ex>_done`.
- **Weekly Monday retest kept** as the only number-entry surface; new **`strengthTrendCard`** on the dashboard (W1→W4 side-by-side + Δ), written to extend across Months 2-6 via month-prefixed keys.
- **Fasting log → per-day "Stuck to my window" toggle**; exact meal times collapse behind an optional link. Key `fastingLog.wNdM_stuck`.
- **Factor action-plans → tap-to-adopt commitment chips** (reusing each factor's "Immediate" actions), free text still editable.
- **Morning reflection → mood chips (Strong/OK/Hard) + multi-select "what improved" chips**; free text now optional. New optional `WeekLog.reflectionMood` / `reflectionWins`.

### HELD — needs a product decision, NOT a blind code change
- **Mount `TodayView.svelte` (one-tap "Today" hub + scoreboard).** The component is launch-quality and self-contained, BUT it logs to the **Adherence API/DDB** with a **different action-ID scheme** (`biome-ns-ultra`, `eating-window`, `fasted-walk`, `strength`, `protein-breakfast`, `cold-shower`, `10k-steps`) than the live Week-1 rows in `renderer.ts` (`mitigate-biome-ns`, `mitigate-eating-window`, `muscle-strength`, `mind-sunlight-walk`, `motivate-zoom`). Mounting it as-is would create **two divergent daily-logging surfaces** (a tap in one would not reflect in the other). Mounting requires: (1) reconcile the two action-ID schemes (+ migrate existing data), and (2) a product decision on whether TodayView REPLACES the Week-1 adherence rows as the canonical daily hub or lives alongside them. This needs an authenticated verification pass — deliberately not done blind on the live app.

- **P0 done:** R1 dead-end weeks now render content · R2 mobile Sign Out + Settings reachable (new Sign Out button, mobile bottom-bar layout) · R3 "Resend code" with 30s cooldown.
- **P1 done:** R4 unreadable text recolored (light-on-white only — the dark-gradient cards were correct and left alone) · R5 all "coming soon" + the leaked "TJ will provide exact recipes" removed · R6 protein field updates in place (no more focus loss) · R7 misleading "/5" toast fixed · R8 admin queue now rolls back + shows an error on failure.
- **P2 done:** off-brand blue → brand green (Sidebar + Manage Subscription) · dead "Take the Assessment" link removed · small fonts bumped · mobile nav labels always shown (not emoji-only) · 5 dead imports removed · on-screen `?diag=1` panel removed. (`?debug=1` console gate left intentionally — param-gated, harmless.)
- **NOT done (deliberately deferred — larger feature work, needs live testing):** the Part 3 UX-friction redesign sprint (mount TodayView/OutcomePanel, workout-log steppers, fasting toggle, reflection chips, factor-plan cards, intake steppers). These change data flow and are not surgical — recommend doing them as a focused next pass with the app actually running.

---

## TL;DR (read this if nothing else)

1. **Three things will make a 59-year-old quit at the door. Fix before launch:**
   - **Weeks 2, 3, 4 are dead-ends** — tapping them shows a one-line "unlocks when you attest…" message with no way forward. ~1,100 lines of week content never render. (`App.svelte:800-803`)
   - **On a phone, you can't reach Settings — and Settings is the only place to sign out.** (`Sidebar.svelte` mobile layout + `handleSignOut` wired to nothing)
   - **If the sign-in code doesn't arrive, there's no "Resend."** Re-entering your email within 90s silently does nothing. (`CodeEntry.svelte`, `EmailEntry.svelte:74-79`)

2. **The single biggest win available is already built but switched off.** A polished, low-typing "Today" screen, weekly check-in panel, and trend charts (`TodayView.svelte`, `OutcomePanel.svelte`, `OutcomeTrendChart.svelte`, `MonthProgressRail.svelte`) exist and are launch-quality — but **not mounted**. The live experience instead runs the old high-typing `renderer.ts` forms. Wiring up what's already built is most of the "make it easier to use" work.

3. **Your instinct is right: the heaviest typing is in activity logging.** Workout logs (~30 number fields/week), fasting times (14/week), and free-text reflections/action plans are the friction. The UX section below converts each to taps, steppers, chips, and "same as last time" defaults.

---

# PART 1 — RED TEAM (what's broken or risky)

### 🔴 P0 — Blocks launch (each one independently strands a user)

**R1. Weeks 2/3/4 render a dead-end, not the content.** `App.svelte:800-803`
The renderer was changed to open all 4 weeks (`renderer.ts:791`), but `App.svelte` still intercepts w2/w3/w4 and shows `"Week N unlocks when you attest you watched this week's Zoom."` instead of `pageHtml`. The attest UI that would unlock them lives in `TodayView.svelte:147` — which **isn't mounted anywhere**. So there is no path forward, and the sidebar advertises Week 2/3/4 tabs that all dead-end. *(Bonus: that stub text is `color:#A8D8C0` on a white background — unreadable even as an error.)*
**Fix:** delete the `w2/w3/w4` branch so they render `pageHtml` like Week 1 (matches the renderer's stated intent).

**R2. Mobile users can't open Settings or sign out.** `Sidebar.svelte:62-71`, `app.css:136-175`
At ≤820px the sidebar becomes a bottom nav where only `#nav-items` is laid out; the Settings/Admin/Manage-Subscription buttons are siblings *outside* it with no mobile rule, so they're crammed/invisible. Settings is the **only** sign-out surface. `Sidebar.handleSignOut` (`Sidebar.svelte:19`) is defined but **attached to no button at all**. Most of your audience is on phones.
**Fix:** give settings/sign-out a real mobile placement; wire a visible sign-out button.

**R3. OTP sign-in has no recovery path.** `CodeEntry.svelte`, `EmailEntry.svelte:74-79`
No "Resend code" button. If the email is slow, spam-filed, or mistyped, the user is stuck. The obvious move — go back, re-enter email — **reuses a cached session within the 90s cooldown and sends no new code**. Cognito codes also expire (~3 min) with only a generic error.
**Fix:** add "Resend code" (bypassing the cooldown cache); show expiry with a clear re-request path.

### 🟡 P1 — Should fix before launch

**R4. Gut-assessment results and some labels are invisible (light text on white).** `renderer.ts:194, 266, 270, 626-634, 872`
Result body uses `#A8D8C0`; labels use `#e8eaf0` — both on white `.card` backgrounds. After answering 10 questions the result is unreadable. This is the dark-theme leftover the recent commits tried to kill; it survived in the dynamically-injected blocks.
**Fix:** switch to the dark-green palette (`#1A2E1E` / `#3A6A44`).

**R5. "Coming soon" + leaked internal note violate the locked no-coming-soon rule.** `renderer.ts:1850, 1871, 1888`
Every week's supplements are stamped "Coming soon," and `1871` renders **"Full authored Week N meal plan coming soon — TJ will provide exact recipes."** to the member. Reads as half-built.
**Fix:** remove or replace with orderable/schedulable-now content.

**R6. Typing in a field re-renders the whole page and drops focus.** `renderer.ts:990-994`, `App.svelte:326-329`
The protein input fires a full `{@html} pageHtml` regeneration on blur/Enter (`renderTick++`). On a phone a slow typist loses their place after every entry. Motivation radios (`renderer.ts:891`) full-re-render on each tap too (scroll jump).
**Fix:** patch the derived value in place instead of re-rendering the page.

**R7. Score-scale inconsistency.** `App.svelte:204` toasts "scored n / 5" while everything else is 0–10 and shows "/200" (`renderer.ts:1167, 1378, 1593`). Confusing; the 1–5 path looks like legacy dead code — confirm before keeping.

**R8. Admin queue actions silently swallow failures.** `QueueList.svelte:33-39`
`act()` optimistically removes a card and `.catch(() => {})` with "no rollback." A failed mutation looks successful — a clinical data-integrity gap. *(Staff-facing, lower user harm, but a real correctness hole.)*

### 🟢 P2 — Polish (post-launch)
- **Fonts are small for the demographic** — uppercase labels 8–10px, nav stats 10px, mobile nav labels 8.5px and hidden unless active (`app.css:13,14,20,59,170`). Bump sizes.
- **Mobile nav is emoji-only for inactive tabs** (🧠💪🔬🎯) — not self-explanatory. (`app.css:170-172`)
- **Dead imports** in `App.svelte`: `TodayView`, `IntakeModule`, `EatingWindowModal`, `LockedGate`, `UpcomingZooms` imported, never rendered — maintenance trap.
- **Dev artifacts ship to prod**: `?diag=1`/`?debug=1` on-screen panel (`App.svelte:606-618`), DEBUG logging (`renderer.ts:491`).
- **Non-semantic clickable `<div>`s** with `onclick` but no role/tabindex/keyboard (`renderer.ts:819, 886-896`) — invisible to screen readers / keyboard.
- **Dead link**: Connected-Mind "Take the Assessment ↗" is `href="#"` (`renderer.ts:471`).
- **Off-brand blue** (`#4a9eff`) leftover in sidebar hover/active + Manage-Subscription button (`Sidebar.svelte:99-109`).

---

# PART 2 — GREEN TEAM (what works — preserve it)

**How tracking/accountability/support works today (plain version):** A signed-in user is a Protégé with full access (no in-app paywall). They land on a Dashboard (name, assessment score /200, risk band, progress), then work a Week 1 surface that tracks daily adherence (supplement, eating window, strength, cold shower), a morning protocol grid, a workout log with auto-computed week-over-week strength deltas, and a fasting log with auto-calculated eating-window hours. Accountability is built on the **"name a face"** mechanic + weekly Zoom cadence + a 4-month progression rail. Support shows up as client-side nudges today, with a Bedrock-ready AI coach (tiered cadence, safety/escalation rules) and care-coordinator consult CTAs.

**Strengths to keep:**
- **Protocol-aware check-ins** — weekly outcome questions only ask about domains the member's *active protocols* actually move (`outcomeQuestions.ts:55-74`). Keeps check-ins short as the catalog grows. This is the smartest thing in the tracking model.
- **The 90-second slider check-in** — 0–10 sliders default to neutral 5, free-text optional, time expectation stated, data reframed as care (`OutcomeCheckIn.svelte`). Right pattern for the demographic.
- **"Done this week / Due" idempotency by ISO week** — doesn't nag people who already checked in; shows a countdown instead (`OutcomePanel.svelte:29-124`).
- **Charts gated behind ≥2 data points** — no confusing empty charts on day one (`OutcomeTrendChart.svelte:39`).
- **"Name a face" accountability copy** — *"If no one is on the other end of this, you won't do it. Pick a person — see their face."* (`renderer.ts:901-904`). Strongest behavior-design line in the app. Preserve verbatim; propagate.
- **"Log facts, app computes meaning"** — strength deltas and fasting-window hours are auto-calculated; the user never does math (`renderer.ts:313-333, 393-411`).
- **Intake flows forward with zero re-entry** — name/weight/top-3 prefill the dashboard and Week 1 with a "from intake answers" hint (`renderer.ts:657-671, 922-942`).
- **Tone discipline** — TodayView explicitly bans emoji/exclamation/celebration popups; calm, non-gamified, age-appropriate (`TodayView.svelte:13`).
- **Safety-aware AI coach foundation** — tiered cadence, symptom ≥7 → 24h follow-up, explicit clinician-escalation list, compliance-safe "supports/helps with" language (`coach/scheduler.ts`, `coach/prompts.ts`).
- **A launch-quality component library is already built** (`TodayView`, `OutcomePanel`, `MonthProgressRail`, `PillarBanner`, `UpcomingZooms`) — typed Svelte 5, accessible, self-contained. The tracking/accountability expansion is mostly *wiring*, not *building*.

---

# PART 3 — MAKING IT EASIER TO USE (less typing, more tapping)

Your goal: as the app leans into **activity tracking, accountability, and support**, make logging feel like tapping a remote, not filling out a form. Below are the principles, then surface-by-surface fixes ranked by payoff.

## The 6 input principles (apply everywhere)

1. **Tap beats type.** Any open text field that has a predictable set of answers should become chips/toggles/steppers.
2. **"Same as last time" is the default.** Pre-fill today from yesterday / this week from last week; the user only changes what's different.
3. **Ask for detail only when they deviate.** Default path = one tap ("Stuck to plan ✓"). Detail fields appear only if they tap "off / different."
4. **Steppers (− / +) instead of keyboards** for numbers (weight, reps, age). No keyboard pop-up, no focus loss.
5. **Voice is an option, never the only path.** Add a 🎤 mic button to any remaining free-text so people *can* speak, but tapping is always the primary route.
6. **Autosave + never lose input.** (Also fixes red-team R6.) Every field saves on change; navigating away never wipes work.

## Surface-by-surface — ranked by payoff

### ① Workout log — the #1 typing hotspot (~30 number fields/week) — `renderer.ts:350-374`
- **"Repeat last session" button** → fills every exercise with last time's weight/reps; user edits only what changed. Cuts a 15-field session to ~2 taps on a steady week.
- **Replace number keyboards with − / + steppers** (weight in 5lb steps, reps in 1s). Hold-to-repeat for big jumps.
- **Add a "Quick log" mode**: just tap "Did it ✓" per exercise (binary), with numbers optional. Many members will never log weights — let them still mark the session done.
- **Drop the per-row notes field** from the default view; tuck it behind a small "add note" link (with mic).

### ② Fasting window — 14 time entries/week → 1 tap most days — `renderer.ts:376-415`
- **Default to their saved eating window**, show one toggle per day: **"Stuck to my window ✓"** vs **"Off today."**
- Only if they tap "Off" do the two time pickers appear. Steady days become a single tap.
- For first-meal time, offer **quick chips** (8a / 9a / 10a / 11a / 12p) before falling back to the picker.

### ③ Daily adherence — already great, make it one screen — `TodayView.svelte` (built, unmounted)
- **Mount TodayView.** It already consolidates the day's actions into tap tiles with a Sunday "scoreboard" (streak, completion %). This is the single highest-leverage change: it replaces scattered weekday checkbox rows with one calm "Today" hub and is already built and accessible.
- Add a **"Log my whole day ✓"** master tile for people who did everything — one tap sets all daily toggles.

### ④ Reflections / "what improved" — free text → chips + optional voice — `MorningTracker.svelte:76`, `OutcomeCheckIn.svelte:94`
- Replace "How did the week feel?" textarea with **3 mood chips** (Strong / OK / Hard) + a **multi-select chip row** of what moved (Sleep, Energy, Mood, Digestion, Focus, Cravings, Strength).
- Keep an optional free-text box **with a 🎤 mic** for anyone who wants to add words — but the chips alone are a complete answer.

### ⑤ 15-factor action plans — 15 empty textareas → tap-to-adopt menu — `renderer.ts:479-481`
- For each factor, show **3–5 prebuilt commitment cards** ("Walk 20 min after dinner," "Protein at breakfast," "Lights out by 10:30"). Tap to adopt; edit only if they want. Almost no one fills 15 blank boxes; almost everyone will tap a card.

### ⑥ Intake Stage 1 demographics — 5 keyboard fields → pickers/steppers — `Stage1Basics.svelte:94-124`
- **Height:** single ft+in wheel/stepper instead of two number fields.
- **Weight / Age:** steppers (with a tap-to-type fallback).
- Keep phone with OS autofill (already there). This is the first screen — making it feel effortless sets the tone.

### ⑦ Identity statement / "why" — sentence builder or voice — `renderer.ts:898-907`, Week-4 identity
- Offer a **starter scaffold** ("I am a man who ______") with chip options to assemble, or a **30-second voice memo** as the primary capture. Typing a paragraph on a phone is the highest-friction ask in the app — make speaking or assembling the default.

### Accountability & support quick wins (your stated direction)
- **One-tap "share my why"** with the accountability partner — prefilled SMS/email (`renderer.ts:1128-1138` already asks them to send it by Wednesday; make it a button, not homework).
- **Weekly toggle: "Checked in with my person? ✓"** — turns the accountability partner into a tracked, visible action.
- **Mount the scoreboard/streak** already in TodayView — visible progress *is* accountability, with zero extra input.
- **One-tap "Message my coordinator" / "Book a consult"** surfaced on the dashboard and after any rough check-in (symptom ≥7 already triggers a coach follow-up in `coach/scheduler.ts` — surface it as a visible support offer).

---

# PART 4 — Suggested order of operations

**Before public marketing (P0s — strands users):** R1 dead-end weeks → R2 mobile settings/sign-out → R3 resend code. Then R4 (unreadable results) + R5 (coming-soon) because they make a finished product look broken.

**The "easier to use" sprint (highest payoff, much already built):**
1. **Mount TodayView** (daily hub + scoreboard) — biggest single UX gain, already built.
2. **Wire OutcomePanel + trend charts** for the weekly check-in — already built.
3. **Workout log:** "repeat last session" + steppers + quick-log.
4. **Fasting log:** "stuck to my window" toggle.
5. **Reflections → chips + voice.**
6. **Factor plans → tap-to-adopt cards.**
7. **Intake Stage 1 → steppers/pickers.**

**Net:** items 1–2 are mostly wiring existing, launch-quality components; 3–7 convert the remaining typing hotspots to taps. Together they move the app from "fill out the form" to "tap the remote" for exactly the activity/accountability/support tracking you're building toward.

---
*Generated 2026-06-14 by an internal red/green-team review. Findings are code-grounded; critical P0s verified against source.*
