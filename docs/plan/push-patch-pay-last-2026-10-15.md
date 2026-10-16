# Plan: Push Patch — pay last

## Context
TJ 2026-10-15: no step after payment. The 2-minute health questions + the one typed signature (telehealth consent + NPP/Authorization) move BEFORE Stripe, so paying finishes the order and the physician review starts automatically. Pending (unpaid) intakes hold PHI and auto-expire after 30 days; legacy paid-without-intake sessions keep today's post-payment form + reminders until drained. The physician review itself is unchanged (it is the moat).

Flow: /go/push-patch pick blend → safety check v2 (unchanged) → health form (name, email, phone, DOB, sex, meds, allergies, conditions, consent text, privacy checkbox, typed legal name) → POST pre-intake → pending intake stored + Contact upsert (email/name/real phone only, source `push-patch-form`, stage lead) + Stripe Checkout session created (customer_email prefilled, metadata intakeId + screen_*) → Stripe → checkout.session.completed → finalize (PatientRecord + encounter + consents + Stripe ship-to + physician packet + provider email; pending marked consumed) → thank-you = "Order complete — a licensed physician in our network is reviewing it" + receipt email (no action asked).

## Tasks

### [P1] Design appendix  [parallel]
model: opus
Read lambdas/create-checkout-session (SKU_CATALOG, safety-check metadata, push-patch-prices.json), lambdas/push-patch-intake (validate, record, upsert, consent, provider-email, handler), lambdas/_shared/order-handler-core (PUSH_PATCH_PENDING marker + order-received email), lambdas/push-patch-reminder, lambdas/_shared/push-patch-decision-core, website/src/pages/go/push-patch/index.astro + thank-you.astro, infra/api-throttling.sh. Design: (1) pending-intake storage — new DynamoDB table via an infra script vs a TTL'd item type in an existing table; key, TTL attribute, encryption, who can read; (2) the pre-intake endpoint (new lambda vs new route on push-patch-intake vs create-checkout-session), validation reuse, Stripe session creation reuse, throttling; (3) finalize trigger + idempotency (order-handler-core invoking push-patch-intake finalize; replay/retry safe; what if pending expired/missing → fall back to legacy thank-you form + reminders); (4) ship-to from Stripe shipping_details; (5) refund/decline paths unchanged? (6) legacy sessions; (7) receipt-email copy change; (8) thank-you page states (finalized / still processing / legacy needs form); (9) exact task list with file-level changes + tests. Append as "## Appendix A — design".
✓ DONE WHEN: Appendix A exists with file-level changes, test lists and copy for every changed customer-facing text

### [P2+] Build tasks  [sequential after P1]
model: sonnet
The orchestrator expands Appendix A's task list into TEST→IMPL pairs, dispatched in parallel where files don't overlap. Each pair's DONE WHEN = the package test command exits 0.
✓ DONE WHEN: every Appendix A task's test command exits 0 and `pnpm --filter ldrglprx-website build` exits 0

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] All touched packages' tests green; website builds; `pnpm install --frozen-lockfile` passes
- [ ] Paying is the last buyer action for new orders; legacy sessions still complete
- [ ] Pending PHI expires (TTL verified in infra script); never written to Contact beyond email/name/phone
- [ ] Finalize is idempotent across Stripe replays + stripe-events-retry; physician gets exactly one packet
- [ ] No secrets; modules < 100 lines; no dead code; commit with summary + test plan pushed to main
✓ DONE WHEN: all checklist items checked and commits are on origin/main

## Deploy (after REVIEW + TJ sees the new screens)
Order from Appendix A; website last.
