# Plan: Mission Control restyle — clientportal
Approved by TJ 2026-07-02 (Direction C from docs/design/enterprise-design-directions.html).

## Context
Restyle apps/clientportal onto a navy/gold token system with self-hosted Playfair Display + Inter,
rebuild TodayView as the MindSpan-hero **Daily Brief** and PatientsAdmin as the triage **Care Console**
(with an explicit charge-confirmation step + visible audit trail), branded PWA assets, and retry toasts
for failed mutations. All behaviors, data flows, and tests stay intact.

## MindSpan Score v1 (locked formula)
`score = clamp(round(0.45·adherencePct + 0.35·(100 − riskLoad) + 0.20·(min(streak,14)/14)·100), 0, 100)`
- adherencePct: trailing-7-day completion of the two daily actions (biome-ns-ultra, eating-window)
- riskLoad: 0–100 from intake audit factor scores (0–5 scale), neutral 50 when absent
- streak: best consecutive-day run of biome-ns-ultra in a 14-day lookback
- `mindspanSeries` = per-day trailing scores (sparkline); `weeklyDelta` = last − first
Implemented in `src/lib/mindspan.ts` with unit tests. Labs slot in as a 4th term later (v2).

## Phases
- **P1 (parallel):** self-host fonts (assets/fonts + fonts.css) · tokens.css (--mc-* vars) ·
  TEST mindspan · light-theme color audit (renderer.ts + all components) · branded PWA icons +
  manifest #070e1d · TEST retry-toast store
- **P2:** IMPL mindspan.ts · IMPL toast store + Toast.svelte · rewrite app.css onto tokens
  (class-compatible with legacy renderer.ts; fix audited clashes)
- **P3:** TodayView → Daily Brief (ring hero, sparkline, tiles, remaining-today; every existing
  behavior kept; failures → retry toast) · PatientsAdmin → Care Console (triage lanes, waiting-age,
  5-node stepper, charge CONFIRM step, audit trail) · token sweep of Sidebar/Settings/AdminDashboard/
  ProtegesPanel/EventsAdmin/auth/modals
- **P4:** build + full test pass (baseline ~7–8 env failures excepted) → **REVIEW (opus)** →
  commit to main → `bash apps/clientportal/deploy.sh` → live verify

## Constraints
Single branch main, no worktrees. pnpm only. No emoji in member UI, calm clinical tone.
Wordmark exact casing My4MLife. Charge/state-machine/mutation contracts unchanged
(operations.schema-validation.test.ts must stay green). PostHog app instrumentation waits on the
real project key from TJ (separate task).
