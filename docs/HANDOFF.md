# 2026-05-31 — One-path Protégé flow is fully working

End-to-end signup → app dashboard with carried-forward assessment data is live and tested.

## The journey (debugging chain that landed us here)

1. **Phone E.164 normalization** — Protégé signups weren't landing in Contact because the form sent unformatted phone numbers; Lambda rejected with 400.
2. **Assessment results email missing** — added audit-complete → email-sender path.
3. **Assessment retake in app** — `Contact` and `Users` (UserProfile) are separate DDB tables; app couldn't see audit data. Extended UserProfile schema with `auditTop3` / `auditCompletedAt` / `intakeAnswers` and made protege-signup seed those from Contact.
4. **Duplicate signup form on /protege-signup** — replaced with `window.location.replace('/welcome-protege')` to make back-button safe.
5. **PWA service worker stale** — added `skipWaiting`/`clientsClaim` + controllerchange auto-reload.
6. **Welcome email pointed to non-existent /set-password** — rewrote to link to app root with honest email-OTP copy.
7. **One-path refactor** — removed Sign In from homepage, added phone-required + Protégé consent to assessment, built `/become-protege` page that POSTs signup behind the scenes + redirects to app with `?new=1&email=…`.
8. **Double sign-in code** — /become-protege pre-triggered OTP causing two codes; moved auto-trigger to EmailEntry onMount with `?new=1`.
9. **Intake gate stuck** — disabled the gate entirely per locked 2026-05-25 spec (signed-in = Protégé = full access).
10. **Renderer reading wrong localStorage key** — `audit-v1` vs `intake-audit-scores-v1`; hydration now writes both.
11. **AppSync client envelope confusion** — App.svelte was reading `profileResult.data.getMyProfile`; client already strips the `data` wrapper. Fixed to read `profileResult.getMyProfile`.
12. **AWSJSON double-encoded over the wire** — added `parseAwsJson()` that parses once and re-parses if the result is still a string.

## Working today

- Assessment carries name/email/phone/consent + answers + top3 to /become-protege.
- /become-protege auto-creates Protégé in Cognito + Contact + Users, redirects to app.
- App auth screen auto-sends OTP, skips firstName field for fresh signups.
- App dashboard hydrates `audit-v1` + workbook.factorScores + workbook.priorities from UserProfile on sign-in.
- Top-3 priorities show on dashboard + Week 1; sidebar fully unlocked.

## TJ blockers still pending (carryover; pre-existing)

- Stripe E2E #1/#2/#3 walkthroughs
- Bedrock daily token quota increase (optional)
- Zoom S2S credentials into `zoom-ops-creds` secret
- Phone number for SMS approval queue v2 (email approvals already working)

## 2026-05-31 (late) — Cross-device sync confirmed working

After fixing the workbookJson double-decode (commit dba622e7), TJ tested
Mac → iPhone signed-in cross-device flow with drtj@essentialmanage.com.
Phone dashboard populated with all Mac state: name, start date, top-3
priorities, Week 1 motivation answer. End-to-end Protégé flow is
production-ready for inner-circle UX testing.

The double-encoding pattern (parseAwsJson) now wraps all three AWSJSON
fields: auditTop3, intakeAnswers, workbookJson. Any future AWSJSON
field added to UserProfile should use the same defensive parse.

## 2026-06-01 — Pricing/tier scrub + Week 1 spec locked

### Done today
- **Pricing/tier UI removed** from website + app (31 files, 2173 lines deleted). Protégé is the only tier visible; /membership /tiers /4m-cohort redirect to /assessment; AdminDashboard, Sidebar, nudges all scrubbed. Backend `TierId` field on UserProfile retained (operational only). See commit `7a312ad4`.
- **OTP reload-after-success** fix shipped (`8c6fa960`) — dashboard now populates on first paint instead of needing a manual reload.
- **App installable on iPhone via Add to Home Screen** — TJ confirmed working.
- **Week 1 spec written and locked** at `docs/plan/week-1-spec.md` (commits `66b3f6e8` + `19f97311`).
  - Single track, baby steps, clinical-compliance tone.
  - 6 actions across 4 pillars (mix of daily + 2×/week).
  - Anchored on Biome NS Ultra (universal) + 9-to-6 eating window + protein-first breakfast + strength + fasted sunlight walks + weekly Zoom.
  - BPC-157 included in Week 1 as Rx framed via the consult bundle alongside GLP-1.
  - Affiliates: ButcherBox + Thrive Market + Amazon links on protein-breakfast tile.
  - Bonus toggle in profile for self-selecting high achievers.
  - End-of-week scoreboard (Sun → next Wed Zoom) with adherence stats.
  - Behavior-triggered Week 2 unlock via honor-system Zoom-attest tap (no Zoom S2S dependency for unlock loop).
  - Week 1 Zoom opens with ~10-12 min on what late-stage cognitive loss actually looks like — fear from truth, not framing.

### Approved to build (TJ confirmed 2026-06-01 evening)
Build queue:
1. Adherence DDB table + recordAdherence AppSync mutation
2. UserProfile schema additions: `eatingWindowStart`, `eatingWindowEnd`, `weeklyZoomAttestedAt`, `bonusTargetsEnabled`, `glpStatus`
3. Today view component (replaces current Week 1 page) — daily tiles + this-week tiles + affiliate-placeholder links
4. End-of-week scoreboard mode (Sun → next Wed)
5. Eating window picker at signup
6. Profile / Settings with bonus toggle
7. AdminDashboard recording-URL paste page (Option a — manual for v1)
8. Week 1 fear-emphasis footer copy on dashboard
9. Replace legacy Week 1 renderer.ts content with Today view
10. End-to-end testing on Mac + iPhone

### Carryover TJ blockers (unchanged)
- Stripe E2E #1/#2/#3 walkthroughs
- Bedrock daily token quota increase (optional)
- Zoom S2S credentials into `zoom-ops-creds` secret (no longer blocking the Week 2 unlock; still needed for future Zoom auto-scheduling + recording webhook)
- 3 affiliate program signups: ButcherBox, Thrive Market, Amazon Associates (~45 min total, drops codes into `website/src/lib/affiliates.ts`)
- Phone number for SMS approval v2 (email approvals already working)

## 2026-06-01 (late) — Week 1 v1 shipped end-to-end

**Approved build queue (Steps 1-10): 9 of 10 done; Step 10 = TJ test.**

Live in prod:
- `Adherence` DDB table + `recordAdherence` / `listMyAdherence` AppSync ops.
- UserProfile schema: `eatingWindowStart/End`, `weeklyZoomAttestedAt/EventId`, `bonusTargetsEnabled`, `glpStatus`, `weekUnlocked`. Auto-flows through `upsertMyProfile`.
- `TodayView.svelte` (~430 lines) — daily mode for weekdays + scoreboard mode Sunday eve / post-Zoom. Replaces the legacy renderer Week 1 content. Single-tap tiles, no emoji, calm clinical tone. Affiliate-link expander on the protein-breakfast tile.
- `EatingWindowModal` first-sign-in overlay + `SettingsView` reachable from sidebar (Settings, Sign Out, eating window, bonus toggle).
- AdminDashboard third tab "Events" with `listEventsAdmin` + `updateEventRecordingUrl` for posting recording URLs.
- `affiliates.ts` (website + clientportal) — single-source codes file (PLACEHOLDERS until TJ signs up).

Known small fidelity gaps:
- Streak in scoreboard only spans the current week; will show fresh streak each Monday until we extend the Adherence fetch range.
- `Event.recordingUrl` is read defensively from `as any` in TodayView; will properly type once generated.ts is regenerated against the latest schema (cosmetic; runtime works).

TJ action items (none block app usage):
1. Add `drtj@essentialmanage.com` to the `Admins` Cognito group so the EventsAdmin tab renders for you (`aws cognito-idp admin-add-user-to-group --user-pool-id us-east-2_kIpKnr17R --username drtj@essentialmanage.com --group-name Admins`).
2. Sign up for ButcherBox Partner / Thrive Market Affiliates / Amazon Associates (~15 min each). Drop the codes into `website/src/lib/affiliates.ts` AND `apps/clientportal/src/lib/affiliates.ts`.
3. Test the full Week 1 flow end-to-end on Mac + iPhone: sign in → eating window modal pops → pick a window → land on TodayView → tap a tile → confirm it persists across reload.

Carryover blockers unchanged: Stripe E2E walkthroughs, Bedrock quota, Zoom S2S, SMS phone.
