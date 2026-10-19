# Plan: Promo consent, abandoned-cart nudge, form capture, Contact backfill (queue 3 rest + 4)

## Context
Queue steps 3 and 4 (docs/HANDOFF.md). Push Patch buyers already land on Contact, but nobody is asked for promotional-email consent, people who sign the pre-intake form and then leave Stripe are never followed up, the Captain's Table and contact forms write nothing to Contact, and everyone from before 2026-10-15 is missing from the list. All writes go through `@my4mlife/contact-upsert` (additive, no PHI). The abandoned-cart email ships **disabled** until TJ approves the copy. The backfill is **dry-run by default** and runs `--apply` only on TJ's OK.

Facts (research 2026-10-19):
- Push Patch sessions are built in `lambdas/_shared/push-patch-checkout/src/session-params.ts`. `upsertContact` runs in `order-handler-core/src/process-event.ts:175` without consent.
- Pending intake rows live in PatientRecords (`sk = pending-intake#<id>`, `signedAt`, email, firstName, skuId; ttl 30d). Paid sessions write Touchpoints `PUSH_PATCH_PENDING#<sessionId>` under the same contactId.
- push-patch-reminder already sweeps both tables every 15 min.
- email-sender `form` kind (public `/api/contact-form`) stores nothing.
- Secrets: Stripe = Secrets Manager `all-stripe-keys` (`stripe-live-secret`). Cognito pool = `us-east-2_kIpKnr17R`.

## Tasks

### [P1] TEST: Push Patch sessions ask for promo consent  [parallel]
model: sonnet
In `lambdas/_shared/push-patch-checkout/src/session-params.test.ts` (create or extend), assert that `buildPushPatchSessionParams(...)` returns `consent_collection: { promotions: 'auto' }`. Assert also that no other param changes: snapshot the existing keys.
✓ DONE WHEN: `pnpm --filter @my4mlife/push-patch-checkout test` fails only on the new assertion

### [P1] TEST: order-handler maps Stripe promo consent to Contact  [parallel]
model: sonnet
In `lambdas/_shared/order-handler-core/src/process-event.test.ts`, add cases for a paid `checkout.session.completed`:
- `session.consent.promotions = 'opt_in'` → the upsertContact UpdateCommand carries marketingConsent `{status:'opted_in', source:'stripe-checkout'}`.
- `'opt_out'` → `opted_out`.
- Absent or null consent → no `marketingConsent` key at all.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` fails only on the three new cases

### [P1] TEST: abandoned Push Patch intake sweep  [parallel]
model: sonnet
Create `lambdas/push-patch-reminder/src/abandoned.test.ts` with a mocked ddb + lambda client for `sweepAbandoned(deps, now)`. Assert:
- It scans PatientRecords for `sk` begins_with `pending-intake#` and `signedAt` between now−7d and now−60min.
- It skips rows with `abandonedNudgeAt`.
- It skips a row when Touchpoints has any `PUSH_PATCH_PENDING#` under that contactId (the person paid).
- It claims with a conditional SET `abandonedNudgeAt`. A ConditionalCheckFailed skips the row.
- It sends one email-sender invoke `{kind:'info', from:'support'}`. The subject is "Your Push Patch is waiting", the body has the first name, and the link is `https://my4mlife.com/go/push-patch?sku=<skuId>&utm_source=email&utm_medium=lifecycle&utm_campaign=push-patch-abandoned`. There is no tagline and no health data.
- It releases the claim when the send fails.
- The handler skips the sweep unless `ABANDONED_CART_ENABLED === 'true'`.
✓ DONE WHEN: `pnpm --filter @ldrglprx/push-patch-reminder test` fails only on abandoned.test.ts

### [P1] TEST: public forms write Contact  [parallel]
model: sonnet
In `lambdas/email-sender/src/` add `form-contact.test.ts` for `captureFormContact(ddb, form)`:
- formId in the allowlist `coaching-application`, `contact`, `referral`, `request-app-homepage`, with a valid email → one upsertContact call: `source: 'form:<formId>'`, stage `lead`, first/last name if present, tag `captains-table` for coaching. No other form fields are passed.
- Other formIds or an invalid email → no call.
- A ddb error is swallowed, so the form email still sends.
✓ DONE WHEN: `pnpm --filter @ldrglprx/email-sender test` fails only on the new file

### [P1] TEST: backfill mappers + merge  [parallel]
model: sonnet
Create package `lambdas/_shared/contact-backfill` (`@my4mlife/contact-backfill`, mirror contact-upsert's package.json; dep `@my4mlife/contact-upsert`). Write `src/map.test.ts` for pure functions:
- `fromStripeCustomer(c)` → `{email, firstName, lastName, stripeCustomerId, source:'backfill:stripe', stage:'customer' only if c.hasPaid}`.
- `fromCognitoUser(u)` → email, given_name, family_name, `source:'backfill:cognito'`.
- `fromPatientRecord(item)` → demographics email/first/last only, `source:'backfill:patient-record'`. It must NOT pass phone/dob/sex.
- `dedupe(list)` → one input per (lowercased email, source). Each source is upserted separately, so `sources` accumulates naturally in the helper.
- Rows without a valid email are dropped. Test emails (`+contactsmoke`, `+captainstest`, `example.com`) are counted as `skippedTest`, not dropped silently.
✓ DONE WHEN: `pnpm --filter @my4mlife/contact-backfill test` fails only on missing implementations

### [P2] IMPL: promo consent on Push Patch sessions  [sequential after P1 session-params test]
model: haiku
Add `consent_collection: { promotions: 'auto' }` to `buildPushPatchSessionParams` in `lambdas/_shared/push-patch-checkout/src/session-params.ts`. No other changes.
✓ DONE WHEN: `pnpm --filter @my4mlife/push-patch-checkout test` exits 0

### [P2] IMPL: map session.consent.promotions in order-handler-core  [sequential after P1 order-handler test]
model: sonnet
In `process-event.ts` (keep the file under its current size, and extract a tiny `consent.ts` if needed), read `session.consent?.promotions` and pass `marketingConsent` to upsertContact as the tests specify. Change nothing else.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` exits 0

### [P2] IMPL: abandoned sweep (disabled by default)  [sequential after P1 abandoned test]
model: sonnet
Add `src/abandoned.ts` and `src/abandoned-email.ts` (each < 100 lines) and wire them into `src/handler.ts` behind `ABANDONED_CART_ENABLED`. In `infra/deploy.sh`:
- Add env `ABANDONED_CART_ENABLED=false`.
- Add `dynamodb:Query` on Touchpoints to the IAM policy.
Write the copy to `docs/launch/push-patch/abandoned-cart-copy.md` for TJ. Follow these rules: the name is "Push Patch", no tagline, and physicians are "our network's licensed physicians".
✓ DONE WHEN: `pnpm --filter @ldrglprx/push-patch-reminder test` exits 0 and `grep ABANDONED_CART_ENABLED=false lambdas/push-patch-reminder/infra/deploy.sh` matches

### [P2] IMPL: captureFormContact in email-sender  [sequential after P1 form test]
model: sonnet
Implement `src/form-contact.ts` (< 100 lines) and call it in the `form` branch of `handler.ts` before the send, without awaiting failures into the response. Add the `@my4mlife/contact-upsert` workspace dep. In `infra/deploy.sh`, add IAM `dynamodb:UpdateItem` on table `Contact` and env `CONTACT_TABLE=Contact`.
✓ DONE WHEN: `pnpm --filter @ldrglprx/email-sender test` exits 0

### [P2] IMPL: backfill mappers + CLI  [sequential after P1 backfill test]
model: sonnet
Implement `src/map.ts` to pass the tests. Add `src/cli.ts` (< 100 lines) with these sources:
- Stripe live: list all customers + paid charges (`has_more` paging). The key comes from Secrets Manager `all-stripe-keys` → `stripe-live-secret`.
- Cognito: ListUsers paging on `us-east-2_kIpKnr17R`.
- PatientRecords: Scan `sk = record`, projecting `contactId`, `demographics.email`, `demographics.firstName`, `demographics.lastName` only.

Behavior:
- `--dry-run` is the default. Both flags together → exit 2.
- Dry run: GetItem Contact per contactId and print counts only: per source, new vs existing, skippedTest, invalid. No emails go to stdout.
- `--report <path outside repo>` writes a CSV of planned new rows.
- `--apply` calls upsertContact (no amountUSD, so LTV is never double-counted).
- Add the script `"backfill": "esbuild src/cli.ts --bundle --platform=node --format=esm --outfile=dist/cli.mjs && node dist/cli.mjs"` and gitignore `dist/`.
✓ DONE WHEN: `pnpm --filter @my4mlife/contact-backfill test` exits 0 and `pnpm --filter @my4mlife/contact-backfill backfill -- --dry-run` prints the count table and exits 0

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] Type checks / lint pass in every touched package
- [ ] All touched packages' tests green
- [ ] No unused imports or dead code
- [ ] No secrets, emails or CSVs committed (`git diff --stat`, grep for `@` in new non-test files)
- [ ] Every new lambda module < 100 lines; nothing in Contact beyond email/name/phone/source/consent
- [ ] Commit message (in place of a PR — main-only repo) with summary + test plan; deploy order listed for HANDOFF: push-patch-checkout consumers (push-patch-intake) → order-handler + stripe-events-retry → email-sender → push-patch-reminder (flag false)
✓ DONE WHEN: all checklist items checked and the commit is pushed to origin/main
