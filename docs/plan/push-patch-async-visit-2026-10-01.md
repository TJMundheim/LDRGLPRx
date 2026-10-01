# Plan: Push Patch — post-purchase async visit (intake → physician one-tap → welcome + ship, or refund)

## Context
TJ and the medical director want the briefest async visit for every Push Patch buyer. The buyer still pays with one tap. The thank-you page then becomes a 2-minute intake: DOB, sex, phone, medications, allergies, conditions, the five IFU screening questions and telehealth consent. The intake goes as a clinical packet to the provider inbox (SSM `/my4mlife/provider/email`, the same one used for Bryan) with one-tap **Approve** / **Decline** links. Approve sends the patient a welcome email from a my4mlife.com address and the order to Genesis for direct shipping. Decline issues an automatic full refund. The promise is a result within an hour during business hours (9 a.m.–5 p.m. Central). Customer copy always says "our network's licensed physicians" and never names a group or physician.

**Reuse:**
- `patient-record-intake` (PatientRecords shape)
- `export-clinical-packet` (packet HTML + presigned link)
- `provider-handoff` (provider email, SSM inbox)
- `approval-queue/src/sign.ts` (HMAC links)
- `email-sender` (Mailgun)
- `@my4mlife/stripe-client` (refund)
- `order-handler-core/push-patch-notify.ts`, which currently emails the order at payment and now moves to after approval

**Genesis order address:** still pending from TJ. Until it arrives, approved orders go to `PUSH_PATCH_FULFILLMENT_EMAIL` (drtj@my4mlife.com).

**Repo rules:** main only, no worktrees, pnpm, esbuild, every lambda module under 100 lines, deploy only via scripts, Bedrock only. There is no PR (repo rule): REVIEW ends with a push to `main`.

## Tasks

### [P1-A] TEST: push-patch intake lambda  [parallel]
model: sonnet
Create `lambdas/push-patch-intake/` (copy the package/tsconfig/vitest setup from `patient-record-intake`). Write `src/handler.test.ts` for POST `/api/push-patch-intake` with body `{ sessionId, dob, sex, phone, medications, allergies, conditions, screening: { seizures, pacemaker, metalImplantNearSite, pregnant, woundAtSite } (booleans), consentName }`. Assert:
- 400 on a missing field;
- 402 when the Stripe session is not `paid` or its `metadata.skuIds` is not `push-patch-*`;
- on success it upserts a PatientRecord (demographics from the Stripe session plus the body) and an Encounter `{ lane: 'push-patch', sku, sessionId, paymentIntentId, state: 'sent-to-provider' }`;
- it stores consent `consent-telehealth-push-patch-v1` with name and timestamp;
- it invokes `export-clinical-packet`, then sends ONE provider email whose HTML contains the packet link and two signed links (`/api/push-patch-decision?t=…` approve and decline);
- a second submit for the same session returns 200 `{ alreadySubmitted: true }` and sends no second email;
- any screening "yes" is highlighted in the provider email subject ("[Screening flag]").
✓ DONE WHEN: `cd lambdas/push-patch-intake && pnpm test` runs and the new tests fail (red).

### [P1-B] TEST: push-patch decision lambda  [parallel]
model: sonnet
Create `lambdas/push-patch-decision/` and write tests for GET `/api/push-patch-decision?t=<token>` (HMAC token over `encounterId.action`, same scheme as `approval-queue/src/sign.ts`, secret from SSM `push-patch-decision-hmac-key`). Assert:
- an invalid token returns 403 HTML;
- **approve** sets the encounter to `approved` and sends the patient a welcome email (from the info alias; subject "Welcome — your Push Patch is approved") and an order email to `PUSH_PATCH_FULFILLMENT_EMAIL` with blend, ship-to, patient name, phone and DOB; it returns a confirmation HTML page;
- **decline** calls `stripe.refunds.create({ payment_intent })`, sets `declined`, and emails the patient "not cleared, full refund issued", with no order email;
- any second click returns an "already decided: <state>" page and has no side effects.
✓ DONE WHEN: `cd lambdas/push-patch-decision && pnpm test` runs and the new tests fail (red).

### [P1-C] Email + intake copy for TJ approval  [parallel]
model: sonnet
Write `docs/launch/push-patch/async-visit-copy.md` with:
- intake page header and helper text, a 2-minute promise;
- the five screening questions worded from the IFU list;
- a telehealth consent paragraph, adapted from `website/src/pages/consent.astro` to async review by "our network's licensed physicians";
- the welcome email: what happens next, shipping direct from our pharmacy partner, how to apply, the support contact, one link to `/go/push-patch` for the instructions section;
- the decline/refund email;
- the "intake not finished" reminder email;
- the after-hours note: "Submitted outside 9 a.m.–5 p.m. Central? You'll hear from us within the first hour of the next business day."

Rules: never name a physician or group; never "treat/cure"; no emoji; no Amazon links; the identity/dignity tagline in the email footers. Mark lines for TJ with `[TJ CONFIRM]`.
✓ DONE WHEN: the file exists and `grep -ci "MD Specialty\|men and women" docs/launch/push-patch/async-visit-copy.md` prints 0.

### [P1-D] TEST: order-handler stops emailing the order at payment  [parallel]
model: sonnet
In `lambdas/_shared/order-handler-core/src/process-event.test.ts`, change the push-patch expectations. On `checkout.session.completed` for a `push-patch-*` SKU, **no** fulfillment email is sent. Instead a `PUSH_PATCH_PENDING#<sessionId>` Touchpoints row is written with `intakeDue` (now + 30 min).
✓ DONE WHEN: the push-patch cases fail (red) against current code.

### [P2-A] IMPL: push-patch-intake  [sequential after P1-A]
model: sonnet
Implement it to pass P1-A with modules `handler.ts`, `validate.ts`, `record.ts`, `provider-email.ts` and `sign.ts` (copied from approval-queue), each under 100 lines. Write `infra/deploy.sh` (role: DynamoDB PatientRecords/Touchpoints, invoke `export-clinical-packet` + `email-sender`, SSM read for the provider email + HMAC key, the Stripe secret). The route is POST + OPTIONS `/api/push-patch-intake`, with a throttle in `infra/api-throttling.sh`. The script creates the HMAC SSM key only if it is missing.
✓ DONE WHEN: `pnpm test && pnpm build` exits 0.

### [P2-B] IMPL: push-patch-decision  [sequential after P1-B]
model: sonnet
Implement it to pass P1-B with modules `handler.ts`, `decide.ts`, `emails.ts`, `pages.ts` and `sign.ts`. The order email reuses the blend catalog from `order-handler-core/push-patch-notify.ts` (export it rather than copy it). Write `infra/deploy.sh` with GET `/api/push-patch-decision` and `PUSH_PATCH_FULFILLMENT_EMAIL` in the env.
✓ DONE WHEN: `pnpm test && pnpm build` exits 0.

### [P2-C] IMPL: order-handler pending marker + reminder sweep  [sequential after P1-D]
model: sonnet
Make P1-D pass. Add `lambdas/push-patch-reminder/`: an EventBridge schedule every 15 minutes that finds pending markers past `intakeDue` with no encounter and sends the reminder email from the P1-C copy. It sends at most 2 reminders (30 min, then 24 h) and never sends PHI. Deploy via its own script.
✓ DONE WHEN: all three packages pass `pnpm test` and build.

### [P2-D] IMPL: thank-you page becomes the intake form  [sequential after P1-C]
model: sonnet
`website/src/pages/go/push-patch/thank-you.astro` reads `session_id`. It shows "Payment received", then the 2-minute form (P1-C copy), and POSTs to `/api/push-patch-intake`. Success shows "Submitted. A physician in our network will review it within an hour during business hours (9 a.m.–5 p.m. Central). Your welcome email follows." 402/400 errors show inline. Keep the standalone styling. Phone and DOB use native inputs. Must fit 375px.

Also update `/go/push-patch`:
- near the Buy buttons, the line "After checkout: a 2-minute health questionnaire, physician review within an hour during business hours, then your kit ships direct.";
- replace "All sales are final." with "Not cleared? Full refund. Final once shipped." in the page and FAQ.

PostHog event `lp_patch_intake_submitted`.
✓ DONE WHEN: `cd website && pnpm build` exits 0 and the built thank-you page contains the form and "9 a.m.–5 p.m. Central".

### [P3-A] Deploy + end-to-end check  [sequential after P2-*] [no-delegate: live deploys + TJ test]
model: haiku
Deploy in this order: push-patch-intake, push-patch-decision, push-patch-reminder, order-handler + stripe-events-retry, website. TJ then makes one real purchase. He completes the intake, sees the provider email arrive at the provider inbox, taps Approve, and receives the welcome email; the order email reaches drtj@my4mlife.com. A second test taps Decline, and the refund appears in Stripe.
✓ DONE WHEN: TJ confirms both paths worked.

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] Tests green and builds pass in every touched package; each module is under 100 lines
- [ ] No PHI in logs, URLs or SMS; tokens are HMAC with timing-safe compare; the decision endpoint is idempotent
- [ ] No secrets committed
- [ ] Copy: "our network's licensed physicians" only; no group or physician name on customer surfaces
- [ ] HANDOFF updated; commit pushed to `main`
✓ DONE WHEN: all checklist items are checked and the commit is pushed to `origin/main`.
