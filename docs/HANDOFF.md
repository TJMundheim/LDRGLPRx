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

---

## 2026-06-01 (late evening) — Red/Green pre-launch audit punch list

Spawned red-team + green-team subagents across auth, Stripe pipeline, assessment scoring, and sitewide copy/brand. Green team confirmed the foundations (Cognito CUSTOM_AUTH triad, thin Lambdas, EventBridge partner-source wiring, dual-mode secret, retry ladder, welcome-email benefits block, terms.astro §6.6 discount lock) are solid. Red team found 23 substantive issues; 8 are launch-critical.

### 🔴 CRITICAL — fix before any live Stripe traffic

1. **Contact PK inconsistency.** protege-signup + audit-complete key Contact by `contactId` (UUIDv5 of email). Stripe handlers key by `email` or `cus_xxx`. Every purchase creates an orphan Contact instead of updating the Protégé.
   - Files: `lambdas/_shared/order-handler-core/src/process-event.ts:37`, `lambdas/_shared/subscription-handler-core/src/process-event.ts:21,28`, `lambdas/_shared/refund-dispute-handler-core/src/process-event.ts:74`, vs. `lambdas/protege-signup/src/handler.ts:182`, `lambdas/audit-complete/src/handler.ts:87`.
   - Fix: add `contactId` to checkout-session metadata (already in `lambdas/create-checkout-session` line 100), resolve `contactId = metadata.contactId ?? uuidv5(email, NAMESPACE)` in each handler, key DDB by `{contactId}`.

2. **refund-dispute uses event-id as charge/dispute-id.** `stripe.charges.retrieve(e.id)` and `stripe.disputes.retrieve(e.id)` — but `e.id` is `evt_...`. 100% of refunds/chargebacks 404. Lifetime-ban rule non-functional.
   - File: `lambdas/_shared/refund-dispute-handler-core/src/process-event.ts:46,61`.
   - Fix: read the object id from `detail.data.object.id` of the EventBridge payload, or `const ev = await stripe.events.retrieve(e.id); const obj = ev.data.object`.

3. **SQS DLQ missing resource policy** granting `events.amazonaws.com sqs:SendMessage`. Failed events silently dropped, DLQ empty, alarms never fire.
   - File: `infra/sqs/deploy.sh` (no Policy set), `infra/eventbridge/deploy-stripe-rules.sh:50` (target points at DLQ).
   - Fix: add `aws sqs set-queue-attributes` step with Policy allowing EventBridge with `SourceArn` condition on rule ARNs.

4. **Retry Lambda uses `rate()` not `at()`.** `ScheduleExpression: rate(${delaySec} seconds)` is recurring. EndDate is `now + delay + 60s` but schedule can fire twice in the window.
   - File: `lambdas/stripe-events-retry/src/handler.ts:60`.
   - Fix: use `at(${fireAt})` one-shot; remove EndDate.

5. **Subscription Touchpoints idempotency check is inverted.** `ConditionExpression: attribute_not_exists(stripeEventId)` checks the row being written — which always has that attr. Every write throws ConditionalCheckFailed; the catch at line 72 swallows it as success. Net: zero subscription touchpoints ever written.
   - File: `lambdas/_shared/subscription-handler-core/src/process-event.ts:60-69`.
   - Fix: use `attribute_not_exists(sk)` instead.

6. **Order handler's `lifetimeValueUSD +=` runs on every retry.** Touchpoints insert is idempotent; Contact +amount UpdateExpression is not. EventBridge retries can fire 1–6× per purchase → LTV inflated.
   - File: `lambdas/_shared/order-handler-core/src/process-event.ts:42`.
   - Fix: move the +amount inside the Orders insert success branch (conditional on `attribute_not_exists` of the order id).

7. **`auditTop3WithIds` ignores the diagnosis-override rule.** Used by Week 2 MITIGATE picker. Plain raw+bonus sort, no `already-diagnosed >= 3 → forced #1` logic.
   - File: `apps/clientportal/src/lib/renderer.ts:1056-1066`.
   - Fix: refactor `selectTop3` (~line 522) to return id+score and reuse inside `auditTop3WithIds`.

8. **Duplicate OTP root cause identified.** On SES `LimitExceededException`/`NotAuthorized`, `request-otp` returns `{status:'queued'}` with NO session. Frontend `cognito.ts:43-46` throws "Code queued but no session returned". User clicks retry → Cognito sends another code. This is the months-long bug.
   - Files: `infra/clientportal/cdk/lambdas/auth/request-otp.ts:103-105`, `apps/clientportal/src/lib/auth/cognito.ts:43-47`.
   - Fix: on LimitExceededException return the auth.Session if available; on NotAuthorized return a 4xx with clear message; never return 200 without a session when UI expects one.

### 🟠 HIGH — this week

9. **Discount inconsistency** — audit-complete email says 15% first-order, signup/welcome/terms say 25%. (`lambdas/audit-complete/src/handler.ts:44` vs others). Pick one, sweep.
10. **25%-bundle discount documented in memory but missing from membership.astro/tiers.astro and welcome email.**
11. **Two scoring formulas live** — `audit.astro:167` has `{gut:2, sleep:2, weight:2, ed:1, hormones:1}` while `assessment.astro` + `survey-scoring.ts` use only `{gut:2, weight:2}`. Different entry points produce different top-3.
12. **EmailEntry `requestInFlight` never resets in finally** — `apps/clientportal/src/lib/components/auth/EmailEntry.svelte:35-58`. Success path keeps flag stuck true; parent re-mount = permanently dead button.
13. **request-otp omits `given_name`** on Cognito create — "Welcome, undefined" across app.
14. **CORS `*` on signup/audit Lambdas** — `lambdas/audit-complete/src/handler.ts:18`, `lambdas/protege-signup/src/handler.ts:21`. Allowlist instead.
15. **Order handler accepts empty email** — `lambdas/_shared/order-handler-core/src/process-event.ts:24-29`. All anonymous purchases collapse into one corrupt Contact.
16. **Stale $197/$497/$697 on `/solutions/financial-stress`** (`website/src/pages/solutions/financial-stress.astro:33`).
17. **CloudWatch alarms missing `treat-missing-data`** — `infra/cloudwatch/deploy.sh:11-23,29-42`. Add `notBreaching` (or `breaching` for primary).
18. **EmailEntry allows brand-new signups in-app** — bypasses website's AI-consent capture. Change to "Sign In" only, redirect unknowns to website.
19. **EventBridge rule lists non-existent `charge.dispute.closed`** — `infra/eventbridge/deploy-stripe-rules.sh:71`. Inert but misleading.

### 🟡 MEDIUM — before public launch

20. `audit-handoff` ingests `#audit=` with no validation — workbook gating bypass via crafted link. `apps/clientportal/src/lib/auth/audit-handoff.ts:37-39`.
21. `audit.astro:225` uses plain `btoa()` — breaks for non-ASCII first names (José, André). `assessment.astro` uses UTF-safe variant; align.
22. SNS alarm email mismatch — plan says `drtj@my4mlife.com`, env says `drtj@essentialmanage.com`. `docs/plan/stripe-eventbridge-implementation.md:267`.
23. selectTop3 still has subtle tie-break-position divergence — `survey-scoring.ts` has no priorityTier tiebreak; `assessment.astro` folds bonus into total. Align all three to `score desc → bonus desc → priorityTier desc → id asc`.

### Recommended fix order
**Today**: #8 (OTP) → #1 (Contact PK) → #2 (refund-dispute) → #5,#6 (sub idempotency, LTV double-count) → #3,#4 (DLQ policy, scheduler). Redeploy. Clean E2E with drtj@essentialmanage.com.
**This week**: #9-19. **Before public launch**: #20-23.

### Working in this session when handoff written
Starting on #8 (OTP duplicate-code root cause fix).

---

## 2026-06-01 (later) — CRITICAL #8 shipped; #1,#2,#5,#6 coded (tests + deploy pending)

### Shipped & deployed
**#8 OTP duplicate-code root cause** — three-layer fix:
- `infra/clientportal/cdk/lambdas/auth/request-otp.ts` — returns 429 `rate_limited` on Cognito LimitExceeded (was returning 200 `queued` with no session, which forced the frontend to error and users to retry → second InitiateAuth → second OTP). 401 on NotAuthorized, 502 on other failures.
- `apps/clientportal/src/lib/auth/cognito.ts` — new typed `RateLimitError`; no more "no session returned" generic throw.
- `apps/clientportal/src/lib/components/auth/EmailEntry.svelte` — 90s sessionStorage cooldown caches the issued session alongside timestamp. Any remount within the window reuses the cached session via `onsuccess` instead of calling InitiateAuth again — neutralizes SW reload, back/forward, hydration race. Also reset `requestInFlight` in `finally` (closes item #12 too).

Deployed via CDK + clientportal PWA (invalidation `IDAIS9CX51X1TUSUC6Q5LYD6CW`).

### Coded but NOT yet deployed (tests failing — they need new mocks)
**#1 Contact PK unification + #2 refund-dispute object IDs + #5 sub touchpoint idempotency + #6 order LTV double-count** — all four fixes touch the three Stripe core handlers in one batch.

- New shared package `lambdas/_shared/contact-id/` with `deriveContactId(email)` and `resolveContactId({metadataContactId, email})`. NAMESPACE matches protege-signup + audit-complete (`f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0`).
- `lambdas/_shared/order-handler-core/src/process-event.ts`:
  - Now does `stripe.events.retrieve(e.id)` first → extracts `data.object.id` → then retrieves checkout session by that id (previously called sessions.retrieve with the event id).
  - Resolves `contactId` via `resolveContactId({metadataContactId: session.metadata.contactId, email})` and keys Contact PK by `{contactId}` instead of `{email}`.
  - Throws (→ DLQ) instead of accepting empty email — kills the `{email:''}` corrupt-row failure mode (item #15 too).
  - Orders insert moved BEFORE Contact update; LTV `+=amount` only runs when `isNewOrder = true` (i.e. when the ConditionalCheckFailedException did NOT fire) — fixes #6.
- `lambdas/_shared/subscription-handler-core/src/process-event.ts`:
  - Same `stripe.events.retrieve()` pattern.
  - Resolves contactId via metadata, falls back to retrieving customer for email + deriving — no more `cus_xxx` as PK (item #1 fallback bug).
  - Reads `current_period_end` from `sub.items.data[0]` first, then top-level — kills the apiVersion-drift null-Date bug (item #12 in original red-team list).
  - Touchpoint idempotency: `attribute_not_exists(sk)` instead of `attribute_not_exists(stripeEventId)` — fixes #5.
- `lambdas/_shared/refund-dispute-handler-core/src/process-event.ts`:
  - Same `stripe.events.retrieve()` pattern — fixes #2 (was passing event id to `stripe.charges.retrieve` and `stripe.disputes.retrieve`, every call 404'd).
  - Resolves contactId via charge.metadata.contactId / charge.metadata.contactEmail / billing_details.email / receipt_email.
  - `writeTouchpoint` moved to END of both branches (refund + dispute-lost) so a touchpoint never marks success when the ban/refund write failed.

### What broke that needs picking up
The three core handler test files mock `stripe.checkout.sessions.retrieve` (or `subscriptions.retrieve`, `charges.retrieve`, `disputes.retrieve`) directly. They do NOT mock `stripe.events.retrieve`. After the change, every test fails with `Cannot read properties of undefined (reading 'retrieve')`.

Next-session work:
1. Update `lambdas/_shared/order-handler-core/src/process-event.test.ts` — add `events.retrieve` mock that returns `{ data: { object: { id: 'cs_test_123' } } }` for each test.
2. Same for `subscription-handler-core` (returns `{ data: { object: { id: 'sub_test_123' } } }`).
3. Same for `refund-dispute-handler-core` (returns the relevant charge or dispute id depending on event.type).
4. Add tests for: contactId resolution from metadata vs email derivation; LTV only-incremented-on-new-order; PK is `contactId` not `email`.
5. Add a test in `subscription-handler-core` that verifies the `attribute_not_exists(sk)` condition (write twice, verify second write swallowed cleanly).
6. Once green, deploy via `lambdas/order-handler/deploy.sh` and the analogous deploy scripts (or whatever bundler the wrapper Lambdas use).

### Still pending from CRITICAL batch
- **#7 `auditTop3WithIds` diagnosis override** — `apps/clientportal/src/lib/renderer.ts:1056`. Refactor `selectTop3` (line 522) to return id+score and reuse inside `auditTop3WithIds`. APP-side, not Stripe-blocking.

### 2026-06-02 — CRITICAL Stripe batch SHIPPED
- ✅ #1/#2/#5/#6 — three Stripe core handlers updated with `stripe.events.retrieve()` first, `resolveContactId` from new `@my4mlife/contact-id` shared pkg, idempotent LTV gated on `isNewOrder`, sub touchpoint `attribute_not_exists(sk)`, refund-dispute writes touchpoint AFTER refund/ban writes. All test mocks updated (8+7+16 = 31 tests green). Deployed via `lambdas/{order,subscription,refund-dispute}-handler/infra/deploy.sh`.
- ✅ #3 — SQS DLQ resource policy applied via `infra/sqs/deploy.sh`. Allows `events.amazonaws.com sqs:SendMessage` scoped to `arn:aws:events:us-east-2:879696522760:rule/aws.partner/stripe.com/*`. Verified via `aws sqs get-queue-attributes`.
- ✅ #4 — `lambdas/stripe-events-retry/src/handler.ts` switched from `rate(N seconds)` to `at(<UTC>)` one-shot with `ActionAfterCompletion: 'DELETE'`. Dropped the 60s EndDate window. 7 tests green. Deployed.

### Verified live (post-deploy of #8)
- ✅ **Test 1 (golden-path OTP):** TJ wiped + signed up fresh as drtj@essentialmanage.com. Exactly one OTP delivered. Sign-in succeeded.
- ✅ **Test 2 (refresh mid-flow):** Refreshed on the OTP entry screen pre-code. Cached session was reused (no second InitiateAuth), no second code arrived. Months-long duplicate-OTP bug is dead on both paths.
- ⏸ **Test 3 (rate-limit error path):** Shelved per TJ 2026-06-02 — revisit before public launch. Steps documented in conversation; tl;dr is rapid resend across fresh incognito windows until Cognito's per-user rate limit trips, then verify friendly error text + no extra codes.

### New bug surfaced during Test 2 (separate from OTP) — needs fixing
**Symptom:** When TJ retook the assessment with different answers (Test 2), the email & website results showed Test 2 values correctly, but the app dashboard hydrated with Test 1's cached values.

Two likely converging causes:
1. **App localStorage not cleared on sign-out.** `audit-v1` retains the prior session's scores; on next sign-in the app reads localStorage first and shows that.
2. **Race between `audit-complete` and `protege-signup` Contact writes.** assessment.astro POSTs `audit-complete` fire-and-forget, then redirects to /become-protege which POSTs `protege-signup`. If signup wins the race, UserProfile gets seeded from whatever was in Contact *before* Test 2's write landed.

Fixes to consider:
- `apps/clientportal/src/lib/auth/cognito.ts` `signOut()` — also clear `audit-v1`, `intake-audit-scores-v1`, `workbook-*`, `basics-v1`.
- assessment.astro — `await fetch(audit-complete)` (not fire-and-forget) before navigating to /become-protege.
- protege-signup — pass the freshly-submitted scores in the request body and seed UserProfile from those, not from Contact.

Add to HIGH batch as item #11b "Assessment retake re-seeds app correctly" — TJ to confirm priority based on how often real users will retake.


