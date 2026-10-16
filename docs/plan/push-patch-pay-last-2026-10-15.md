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

## Appendix A — design

### Decisions
1. **Pending storage: an item in `PatientRecords`.** The table is already encrypted, backed up and tagged PHI.
   - Key: `{contactId, sk:"pending-intake#<intakeId>"}`. The item holds the form, signedAt, ip, userAgent and `ttl` (+30 d).
   - TTL is off today and no other item uses `ttl`, so the infra script turns it on.
   - Code treats `ttl<now` as missing, because TTL deletes late.
   - The admin resolvers ignore this prefix.
2. **Pre-intake: a new route, `POST /api/push-patch-pre-intake`, on push-patch-intake.** That Lambda already has the PHI and Stripe permissions. Building the Stripe session moves to a shared package, so create-checkout-session stays PHI-free.
3. **Finalize: order-handler-core makes a synchronous invoke.** A failure throws, so the existing Stripe retry chain covers it (stripe-events-retry, then permanent-failures).
   - Why not the alternatives: an async invoke would give up after 2 tries, and calling shared code directly would hand PHI permissions to the order Lambdas.
   - **Exactly one packet:** the existing conditional put of encounter `pp-<sessionId>` means a replay returns `already`. A failed hand-off rolls back and throws.
   - On success the pending item is deleted.
4. **IDs and ship-to.**
   - `metadata.contactId` is derived from the form email, and `customer_email` is prefilled.
   - Ship-to is Stripe's shipping details, which checkout already requires. If there are none, the order goes down the legacy path.
5. **Unchanged:** approve, decline and refund. The consent time and IP are taken at signing.
6. **Legacy:** an order with no `intakeId`, or with a missing or expired pending item, keeps today's marker, emails, reminders and form.
7. **Thank-you:** GET `?session_id=` returns one of three statuses.
   - `complete`: the encounter exists.
   - `processing`: a pending item is live. The page polls every 3 s for up to 60 s.
   - `needs-form`: anything else.

### Build tasks
Groups run in order. Tasks within a group run in parallel and share no files.

**Group 1**
- **T1 — shared checkout package.**
  - Create `lambdas/_shared/push-patch-checkout`.
  - Move `push-patch.ts`, the prices JSON, `screening.ts` and `test-price.ts`, with their tests, into it.
  - Add `session-params.ts`.
  - Point the create-checkout-session handler at it, and update the `OUT` path in `stripe-push-patch-prices.mjs`.
  - *Tests:* existing tests stay green; `customer_email`/`receipt_email` are set; metadata carries `contactId`, `intakeId` and `screen_*`; phone collection is off when a phone is given.
- **T2 — infra.**
  - `infra/dynamodb/patient-records/deploy.sh`: enable TTL on `ttl`, idempotently.
  - `infra/api-throttling.sh`: add `POST /api/push-patch-pre-intake|2|5`.
  - *Tests:* `bash -n`.
- **T3 — order-handler-core.**
  - `src/push-patch-order.ts` replaces block 4c.
  - With an `intakeId`: finalize, then write the marker with `intakeSubmittedAt` (this stops the reminders). If the result is `missing`, fall back to legacy.
  - Send the receipt only when the marker is newly written.
  - `order-received-email.ts` takes `kind:"receipt"|"finish-form"`.
  - *Tests:* legacy unchanged; finalized order gets marker + receipt; a replay sends no second email; a finalize failure rejects with no marker; the receipt has no link and no PHI.
- **T4 — order-handler and stripe-events-retry `deploy.sh`.**
  - Grant invoke on `my4mlife-push-patch-intake`.
  - Set `--timeout 90` (order-handler has no timeout set today, so it runs at the 3 s default).
  - Set `PUSH_PATCH_INTAKE_FN`.
  - *Tests:* `bash -n`.

**Group 2 (after T1)**
- **T5 — push-patch-intake.**
  - `validate.ts`: add `validateHealth` and `validatePreIntake` (+ email, names, skuId, screening, testToken).
  - New files: `pending.ts`, `submit.ts` (shared by the legacy POST and finalize), `finalize.ts`, `status.ts`.
  - `record.ts` takes name and email directly.
  - `handler.ts` becomes a router.
  - *Tests:* existing tests stay green. Finalize: the happy path; a replay gives one packet and one provider email; an expired item returns `missing`; a failure rolls back; the pending item is deleted; consent `at` = signedAt. Status: three states, plus 402.
- **T6 — `pre-intake.ts`.**
  - Steps: validate → screening (403) → price (503) → put pending (500) → best-effort Contact upsert (`push-patch-form`, `lead`; email, name, real phone) → Stripe → `{url}`.
  - `deploy.sh`: add the route + permission, `dynamodb:GetItem`, and the test-token SSM read.
  - *Tests:* a 400 for each field; 403; Stripe failure → 500; `ttl` ≈ +30 d; no PHI in the Contact upsert.

**Group 3 (after T6)**
- **T7 — website.**
  - `components/push-patch/HealthForm.astro`: the thank-you fields moved verbatim, shared by both pages.
  - `scripts/push-patch-health.ts`: validation.
  - `go/push-patch.astro`: a second dialog panel.
  - Thank-you page: the three states.
  - *Test:* the build exits 0.

### Deploy order
1. TTL
2. push-patch-intake
3. Throttling
4. create-checkout-session
5. order-handler and stripe-events-retry
6. Website

Then run one end-to-end test at $2.

### Customer-facing text (verbatim)
**Landing page (`push-patch.astro`)**
- Line 272:
  > Before checkout: a 30-second safety check and a 2-minute health form. After you pay, one of our network's licensed physicians reviews your order within an hour during business hours, then your kit ships direct. Prepared within 1–3 business days, then ground delivery in 3–5 business days.
- Line 338:
  > Prepared within 1–3 business days, then ground delivery in 3–5 business days. You enter your shipping address at checkout.
- Safety-check button: "Continue to checkout" → "Continue".

**Health panel**
- Heading: "Your health questions"
- Intro:
  > About 2 minutes. After you pay, one of our network's licensed physicians reviews your answers within an hour during business hours, 9 a.m. to 5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.
- New fields: "First name", "Last name", and "Email", with the help text "Your receipt and the physician's decision are sent here."
- Then, all verbatim from the thank-you form:
  - the privacy line
  - date of birth through conditions
  - the "Telehealth consent" paragraph and its links
  - the privacy checkbox
  - the signature field

  "Shipping" and "Safety check completed before checkout." are dropped.
- Buttons: "Continue to payment" (while busy: "Opening secure checkout…") and "Back to safety check".
- Errors:
  - 400: "Please complete every field and answer every question."
  - 403: the existing stop panel.
  - 503: "This blend isn't available yet."
  - Other: "We could not open checkout. Please try again in a moment."
  - Network: "We could not open checkout. Please check your connection and try again."
  - New field error: "Enter a valid email address."

**Thank-you page, `complete` state**
- h1: "Order complete."
- Body:
  > A licensed physician in our network is reviewing it now, usually within an hour during business hours (9 a.m.–5 p.m. Central). Nothing else is needed from you.
- Then:
  - "If you are not cleared, your payment is refunded in full within 10 business days."
  - "If cleared, your patches are prepared within 1–3 business days, then ground delivery in 3–5 business days."
  - "Check your inbox, and your spam folder, for a message from My4MLife."
  - The existing after-hours line.

**Thank-you page, `processing` state**
- h1: "Payment received."
- "Finishing your order. This takes a few seconds."
- After 60 s: "Your order is in and we are finishing it now. We will email you shortly; nothing else is needed from you."

The other thank-you states are unchanged.

**Receipt email (new flow only)**
- Subject: "Your Push Patch order is in"
- Body:
  > Hi {firstName or "there"},
  >
  > Thank you for your order. A licensed physician in our network is reviewing it now, usually within an hour during business hours, 9 a.m.–5 p.m. Central.
  >
  > If you are not cleared, your payment is refunded in full within 10 business days.
  >
  > If cleared, your patches are prepared within 1–3 business days, then ground delivery in 3–5 business days.
  >
  > Questions? Reply here.
  >
  > The My4MLife team
- Footer: same as the current email.

Mirror all of this copy in `docs/launch/push-patch/async-visit-copy.md`.
