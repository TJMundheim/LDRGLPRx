# Plan: Push Patch shipping emails (while-you-wait + on its way)

## Context
Patients hear nothing between the "approved" welcome email and the box arriving 5–7 days later. The welcome email already promises "a shipping confirmation email with tracking", and nothing sends one. Novo's tracking replies (subject like "FW: TRACKING - Ronda Christian", UPS `1Z…` number in the body) land in Google Workspace, where no code reads them. TJ chose on 2026-11-12: an automatic sweep, plus two emails (while-you-wait at +2 days, and on-its-way with tracking). Unclear matches go to TJ with a one-click send. Project rules apply: commit on `main` only, no PR, Lambdas under 100 lines and esbuild, deploy only through scripts, and nothing goes live before TJ approves the copy.

Facts this plan relies on:
- **Orders.** Each order is an encounter item in DynamoDB `PatientRecords`, with `contactId` + `sk = encounter#pp-<sessionId>`, `state = script-written` once approved, and `decidedAt`.
- **Patient details.** Name and email are in `demographics` on the `sk='record'` item.
- **Email sender.** `my4mlife-email-sender` takes `{kind:'info', from:'support'|'drtj', …}`.
- **Inbound mail.** SES inbound is live in us-east-2. Rule set `my4mlife-inbound`, rule `concierge-inbox` catches all of `inbox.my4mlife.com`.

## Tasks

### [P1] TEST: shipping email composers  [parallel]
model: sonnet
Tests for `composeWhileYouWait` and `composeOnItsWay` in `lambdas/_shared/push-patch-decision-core/src/shipping-emails.ts`.
- Both: greet by first name, name the blend, have an html and a text part, and carry the existing transactional footer.
- On-its-way: includes the UPS tracking link `https://www.ups.com/track?tracknum=<n>`.
- Neither contains outcome promises, Amazon links, or the word "Genesis".
✓ DONE WHEN: the tests exist and fail only for the missing module.

### [P1] IMPL: shipping email composers  [sequential after TEST above]
model: sonnet
Warm, upbeat copy in Dr. TJ's voice, modeled on the welcome email in `emails.ts`, with the safety lines that email already carries. Draft copy for TJ goes in `docs/launch/push-patch/shipping-emails-draft-2026-11-12.md`.
✓ DONE WHEN: the composer tests pass.

### [P1] TEST: Novo tracking parser  [parallel]
model: sonnet
`lambdas/push-patch-tracking/src/parse.ts`: from a raw MIME email, extract the patient name from the subject (`TRACKING - First Last`, with or without `FW:`/`RE:`), the UPS number (`1Z` + 16 chars) or FedEx number, and confirm the sender chain includes `novobioalliance.com` or `regenerativekits.com`. Use Ronda Christian's real message shape as a fixture, with no real patient data in the fixture.
✓ DONE WHEN: the tests exist and fail only for the missing module.

### [P1] IMPL: parser  [sequential after TEST above]
model: sonnet
✓ DONE WHEN: `pnpm test` in `lambdas/push-patch-tracking` passes.

### [P1] Routing setup: SES rule script and TJ's Google step  [parallel]
model: sonnet
Write an infra script, not run, that adds rule `push-patch-tracking` for `tracking@inbox.my4mlife.com`. It goes before `concierge-inbox`, saves to S3, invokes the new Lambda, then stops, so the concierge never sees these emails. Also write the click-by-click Google Admin doc: copy mail from `orders@novobioalliance.com` to `tracking@inbox.my4mlife.com`.
✓ DONE WHEN: the script passes `bash -n` and the doc exists in `docs/ops/`.

### [P2] TEST+IMPL: tracking Lambda handler  [sequential after P1]
model: sonnet
- **Find the order.** Load the S3 object and parse it. Find encounters with `state=script-written` and no `trackingNumber` whose `demographics` first and last name match.
- **Exactly one match.** Conditionally set `trackingNumber`, `carrier` and `shippedAt`, then send on-its-way from `support`.
- **No match or several.** Email TJ (`drtj`) the parsed details and a signed one-click link per candidate.
- **Duplicate tracking email.** It is a no-op.
✓ DONE WHEN: handler tests pass and the handler is under 100 lines.

### [P2] TEST+IMPL: one-click ship admin  [sequential after P1]
model: sonnet
New `lambdas/push-patch-ship-admin`: an HMAC-signed link that stamps tracking and sends on-its-way. Reuse the signing pattern from `push-patch-decide-admin`.
✓ DONE WHEN: tests pass; a bad or expired signature returns 403.

### [P2] TEST+IMPL: while-you-wait pass  [sequential after P1]
model: sonnet
In `lambdas/push-patch-reminder`, select encounters with `state=script-written`, `decidedAt` at least 48h ago, no `trackingNumber` and no `waitEmailSentAt`, excluding test orders. Send the email, then stamp `waitEmailSentAt`.
✓ DONE WHEN: tests pass and the reminder handler stays under 100 lines.

### [P3] TJ approves copy  [no-delegate: needs TJ]
✓ DONE WHEN: TJ says the copy is approved.

### [P4] Deploy  [sequential after P3]
Deploy through each Lambda's `infra/deploy.sh` and the SES script. TJ does the Google step. Test with a non-patient test email.
✓ DONE WHEN: a test tracking email produces exactly one TJ-review email or patient email, as expected.

### [REVIEW]  [sequential — runs last]
model: opus
- [ ] Tests green
- [ ] Each Lambda under 100 lines
- [ ] No secrets committed
- [ ] No PHI in logs
- [ ] Committed and pushed to `main`
✓ DONE WHEN: all checked and pushed.
