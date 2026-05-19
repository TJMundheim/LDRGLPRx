# Plan: Survey-First Homepage Funnel

## Context

Pivot the homepage from a content-dense overview to a **survey-first funnel**: big "Take the Survey" CTA above the fold, all existing 4M/category content retained below with periodic survey re-CTAs. Capture 3 fields (name/email/phone) *before* the survey so partial-completers and non-purchasers are reachable. Survey results scored with category bonuses (gut +2, weight +1, hormones +1) surface the top-3 highest-need categories as purchase CTAs. Purchasers get an instant booking link via email+SMS; non-purchasers enter a nurture sequence anchored on a prerecorded "intro Zoom."

## Tasks

### [P1] TEST: scoring with category bonuses + top-3 selection  [parallel]
model: sonnet
Write a vitest spec at `website/src/lib/survey-scoring.test.ts` covering: (1) raw-score sort, (2) gut gets +2 added before ranking, (3) weight and hormones get +1, (4) ties broken by bonus value, (5) returns exactly the top-3 categoryIds. Use realistic 8-category score inputs.
✓ DONE WHEN: `pnpm --filter website test` exits 0 with this file present and failing (red).

### [P1] IMPL: scoring module  [sequential after TEST above]
model: sonnet
Create `website/src/lib/survey-scoring.ts` exporting `scoreToTop3(rawScores: Record<CategoryId, number>): CategoryId[]`. Apply bonus map `{ gut: 2, weight: 1, hormones: 1 }` (else 0). Sort by `(raw + bonus)` desc, tiebreak by bonus desc, then alphabetic for stability. Slice top 3.
✓ DONE WHEN: scoring test from P1 passes, no lint errors.

### [P1] TEST: 3-field lead-capture validates and writes Contact  [parallel]
model: sonnet
Vitest spec at `lambdas/lead-capture/src/handler.test.ts` covering: rejects missing email, rejects malformed email, accepts phone optional, computes deterministic `contactId` from email (UUIDv5), writes Contact row with `lifecycleStage: lead` + `consent.protege.v` + `createdAt`. Mock DocumentClient.
✓ DONE WHEN: `pnpm --filter @ldrglprx/lead-capture test` exits 0 with this file present and failing (red).

### [P1] IMPL: lead-capture Lambda  [sequential after TEST above]
model: sonnet
New Lambda `lambdas/lead-capture/` (≤100 lines). POST `/api/lead-capture` → validate → UUIDv5 contactId → `PutCommand` with `ConditionExpression: attribute_not_exists(contactId) OR lifecycleStage = :lead` (allow update if already a lead, never downgrade a paid customer). Return `{ contactId }`. Mirror existing `lambdas/stripe-webhook/` structure (package.json + tsconfig + infra/deploy.sh + README).
✓ DONE WHEN: test from P1 passes; `pnpm build` succeeds.

### [P1] Homepage redesign — survey-first hero  [parallel]
model: sonnet
Edit `website/src/pages/index.astro`. Replace current hero with: single primary CTA button "Take the 4M Audit →" (3-field capture form route `/audit`), compelling subhead above + below button (~15 words each, the "begin with the end in mind" voice), then in smaller text "Want to learn more first? Scroll down." All existing sections (4M framework, 8 categories, founder, etc.) stay below — DELETE NOTHING. Insert a single repeating "Take the Audit" CTA strip after every ~3 sections (3 reinjections total). On mobile, hero button is sticky-bottom until scrolled past.
✓ DONE WHEN: `pnpm build` clean; visual review shows hero is dominant above fold and all prior sections still render below.

### [P1] Audit intake route `/audit` — 3-field capture  [parallel]
model: sonnet
New page `website/src/pages/audit.astro`. First step: 3 fields (first name, email, phone optional with carrot "We'll text & email you a copy of your results"). On submit → POST to `/api/lead-capture` → store returned `contactId` in sessionStorage → render survey component. Survey questions reused from existing audit (the 22→8 categories audit, see existing audit page) — DO NOT rewrite questions, just rewire to call scoring module on completion.
✓ DONE WHEN: `pnpm build` clean; manual test: filling 3 fields creates Contact row in local-dev mock, survey advances.

### [P1] Audit results page — top-3 cart CTAs + audit-complete marker  [parallel]
model: sonnet
Append to `audit.astro` (or new `/audit/results.astro`). On survey complete: call `scoreToTop3`, render 3 product cards with primary cart CTAs (`/cart?sku=<sku>-sub&contactId=<id>`), include "All 8 results" expandable below. ALSO fire a POST to `/api/audit-complete` with `{ contactId, scores, top3 }` so the backend can write `auditCompletedAt` and intakeAnswers — this is what enables the nurture sequence.
✓ DONE WHEN: `pnpm build` clean; on dev, completing survey shows 3 SKU cards matching the configured bonus map.

### [P1] audit-complete Lambda  [parallel]
model: sonnet
New Lambda `lambdas/audit-complete/` (≤100 lines). POST `/api/audit-complete` → UpdateCommand on Contact: set `auditCompletedAt`, `intakeAnswers`, `auditTop3`. No new Contact row creation (already exists from lead-capture step). Idempotent: rewriting same `auditCompletedAt` is fine, downstream nurture worker dedups.
✓ DONE WHEN: deploy.sh + package.json + handler exist, `pnpm build` clean.

### [P2] TEST: nurture worker fires only when lifecycle=lead 30min after audit  [sequential after P1 audit-complete]
model: sonnet
Vitest spec at `lambdas/nurture-worker/src/handler.test.ts`: (1) lifecycle `consult-paid` at fire time → no message sent, (2) lifecycle `lead` + `auditCompletedAt > 30min ago` + `nurtureSent != true` → sends email+SMS via mocked Mailgun/SNS, sets `nurtureSent: true`, (3) lifecycle `lead` + already `nurtureSent: true` → noop (dedup).
✓ DONE WHEN: test file exists and fails red.

### [P2] IMPL: nurture-worker Lambda  [sequential after TEST above]
model: sonnet
New Lambda `lambdas/nurture-worker/` (≤100 lines). Triggered by SQS message with `DelaySeconds=1800` enqueued by `audit-complete`. At fire: GetCommand Contact → branch on `lifecycleStage` per test above. Sends nurture email + SMS containing `process.env.INTRO_ZOOM_URL`. Appends Touchpoints row. Set `nurtureSent: true` to prevent duplicate sends if SQS retries.
✓ DONE WHEN: tests from P2 pass, ≤100 LOC.

### [P2] Wire audit-complete → SQS enqueue  [sequential after P2 nurture-worker]
model: sonnet
In `audit-complete` handler, after Contact update, `SendMessageCommand` to a new SQS queue `my4mlife-nurture-queue` with `DelaySeconds: 1800` and body `{ contactId }`.
✓ DONE WHEN: integration test: audit-complete invocation → message visible in queue with delay set.

### [P2] Stripe-webhook: send booking link on consult purchase  [parallel]
model: sonnet
Edit `lambdas/stripe-webhook/src/handler.ts`. After Contact update on `checkout.session.completed` where line items include a consult SKU: invoke (or enqueue) a "consult-confirmation" send — email + SMS containing `process.env.ONBOARDING_BOOKING_URL`. Idempotent via Stripe event id (already in Touchpoints PK).
✓ DONE WHEN: `pnpm build` clean; test: synthetic webhook event triggers a single SES/Mailgun send (mocked).

### [P2] Homepage SEO retention check  [parallel]
model: haiku
Run `pnpm build` and grep `dist/index.html` for the 8 category names, "Mind Muscle Mitigate Motivate", "Begin with the end in mind", and the founder name. Report which (if any) are missing.
✓ DONE WHEN: all 4 phrase groups present in homepage HTML; if any missing, file as a follow-up issue.

### [P2] DynamoDB table provisioning script  [parallel]
model: sonnet
New `infra/provision-contact-tables.sh` script. Creates `Contact`, `Touchpoints`, `Conversations`, `Orders` per `docs/plan/contact-schema-spec.md`. Uses `aws dynamodb create-table` with deletion-protection enabled. Idempotent (skip if exists). Streams enabled on Contact only.
✓ DONE WHEN: script is executable; dry-run flag `--plan` prints table specs without creating.

### [REVIEW] Code review + deploy gate  [sequential — runs last]
model: opus
- [ ] All P1+P2 tests green
- [ ] `pnpm --filter website build` clean, all prior homepage content still present below the fold
- [ ] No Lambda exceeds 100 lines (warn if any does — `wc -l lambdas/*/src/handler.ts`)
- [ ] No direct `@anthropic-ai/sdk` import in any production Lambda (grep)
- [ ] No secrets committed (grep for `sk_live`, `sk_test_`, `whsec_`)
- [ ] HANDOFF.md updated with funnel state
- [ ] Commit + push at each phase boundary per standing order
✓ DONE WHEN: checklist all green, deploy script ready to run pending TJ's blessing.

---

## Dependencies & placeholders

| Needed from TJ | Used by | Block? |
|---|---|---|
| Stripe test keys | stripe-webhook, cart checkout | YES for end-to-end test |
| Mailgun domain + API key | nurture-worker, stripe-webhook outbound | YES for sends |
| Calendly/Cal.com link | stripe-webhook (`ONBOARDING_BOOKING_URL`) | NO — placeholder ok |
| Prerecorded intro Zoom URL | nurture-worker (`INTRO_ZOOM_URL`) | NO — placeholder ok |

## Out of scope

- Real Cal.com API integration (booking link is hardcoded env var until later)
- 10DLC SMS registration (continue with SNS direct + Mailgun for now)
- New survey question content (reuses existing audit questions)
- Tier-restructure on top of the new homepage (membership page already shipped)
