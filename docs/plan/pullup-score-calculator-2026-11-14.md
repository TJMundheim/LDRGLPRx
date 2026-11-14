# Plan: Pull-Up Challenge score calculator on /pullup

## Context
TJ (2026-11-14): people should plug in weight, age and pull-up counts and see where they stand. The official formula is already on my4mlife.com/pullup (Score = (final − starting reps) × bodyweight lb × age multiplier; multiplier = 1 + 1% per whole year over 30, no cap; 30 and under = 1.00). Client-side only: nothing is sent or stored; PostHog gets one event with no inputs.

## Decisions
- Inputs: bodyweight (lb, 60–600), age (whole years, 18–120, same bounds as the entry Lambda), starting max reps, final (or goal) max reps (0–200 whole numbers).
- Outputs: age multiplier (2 decimals), points per extra rep (bodyweight × multiplier), score rounded to a whole number with thousands separator, the worked line "7 x 200 x 1.10 = 1,540" in the page's own style; if final ≤ start, score 0 with "Only improvement counts."
- "Where you stand": compare against the three worked examples already printed on the page (1,540 / 1,050 / 1,796) and TJ's labeled math example (about 3,032, men's division only, labeled "math example, not my official score") and show "add N more reps to pass it". No real leaderboard (none exists).
- Placement: right after the SCORING examples, before the host callout. Same .pu-* styling, ≥16px inputs, works at 375px.

## Tasks

### [P1] TEST: score math  [parallel]
model: sonnet
`website/src/lib/pullup-score.test.ts`: `ageMultiplier(25)=1, (30)=1, (40)=1.10, (59)=1.29, (100)=1.70`; `pullupScore({start,final,bodyweightLb,age})` reproduces all four page examples (1,540; 1,050; 1,796; 3,031.5 → displays 3,032); final ≤ start → 0; `repsToPass(target, bodyweightLb, age, start)` = smallest whole final-reps count whose score is strictly greater than target; float safety (1.29 × 235 × 10 exact to cents).
✓ DONE WHEN: test fails only on missing module

### [P2] IMPL: score lib + page calculator  [sequential after P1]
model: sonnet
`website/src/lib/pullup-score.ts` (pure, integer-cent math). Calculator section on website/src/pages/pullup.astro per Decisions; live update on input; PostHog `pullup_calc_used` once, no payload values. Static test in website/tests/pullup-challenge.test.ts: section id `pu-calc` exists, placed after the SCORING examples, no fetch in calculator code.
✓ DONE WHEN: `pnpm --filter ldrglprx-website test` and `build` exit 0

### [REVIEW]  [sequential — runs last]
model: opus
- [ ] Numbers match the rules text and examples exactly
- [ ] Tests green, build green, no dead code
- [ ] No data leaves the page; mobile layout OK
✓ DONE WHEN: checklist green; then orchestrator browser-checks, deploys via website/deploy.sh, commits to main
