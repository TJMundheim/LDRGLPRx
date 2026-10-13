# Plan: Shared Contact upsert — one customer list for every funnel

## Context
Every place someone gives us an email must land on the ONE marketing list (DynamoDB `Contact`), additively and with no health data (standing rule feedback_capture_every_contact; audit docs/plan/contact-audit-2026-10-07.md). Today purchases write stub rows with no email, consult/Push Patch/app-link/Cognito write nothing, protege-signup clobbers good data, and audit-complete stores screening answers on Contact. TJ decisions 2026-10-13: (a) move intakeAnswers/audit scores off Contact (Users keeps them); (b) new assessment takers start as `lead` so nurture runs.

Helper contract (`@my4mlife/contact-upsert`, lambdas/_shared/contact-upsert):
`upsertContact(ddb, {email, firstName?, lastName?, phone?, source, tags?, skus?, amountUSD?, stripeCustomerId?, stage?, marketingConsent?: {status:'opted_in'|'opted_out', source}, event?: {type, at?}}, {table?, now?})`
- contactId = deriveContactId(email). Identity (email, firstName, lastName, phone, createdAt, firstSeenAt, firstSource, stripeCustomerId) = `if_not_exists` only. Placeholder phones (`+10000000000`, all-zero, <10 digits) ignored.
- ADD: `sources` (SS), `tags` (SS), `skusPurchased` (SS), `lifetimeValueUSD` (N, only when amountUSD > 0). SET `lastEvent` {type, at, source}, `updatedAt`.
- `marketingConsent` SET only when passed (explicit choice).
- Stage: first write sets `lifecycleStage` if_not_exists (default `lead`); then a second conditional UpdateItem promotes by rank lead < protege < customer, never demotes, never touches `banned` (ConditionalCheckFailed swallowed).
- Rejects (throws) any key in a PHI denylist (intakeAnswers, answers, conditions, medications, allergies, dob, sex, auditTop3, screening*).
Event history stays in Touchpoints; no unbounded list on Contact.

## Tasks

### [P1] TEST: contact-upsert builds additive, PHI-free updates  [parallel]
model: sonnet
Create package lambdas/_shared/contact-upsert (package.json name `@my4mlife/contact-upsert`, type module, main src/index.ts, deps `@my4mlife/contact-id: workspace:*`, `@aws-sdk/lib-dynamodb`; devDeps vitest, typescript — mirror lambdas/_shared/contact-id + order-handler-core). Write src/upsert.test.ts with a mocked `ddb.send` asserting the contract in docs/plan/contact-upsert-2026-10-13.md "Helper contract": key = deriveContactId(lowercased email); identity fields only via if_not_exists; placeholder phone omitted; sources/tags/skus via ADD; LTV ADD only when amountUSD>0; marketingConsent absent unless passed; promote call has ConditionExpression excluding `banned` and higher ranks and a ConditionalCheckFailedException is swallowed; PHI keys throw; missing/invalid email throws. Tests must fail (no impl yet).
✓ DONE WHEN: `pnpm --filter @my4mlife/contact-upsert test` runs and every new test fails only because the implementation is missing

### [P1] TEST: order-handler ignores non-completed checkout events  [parallel]
model: sonnet
In lambdas/_shared/order-handler-core/src/process-event.test.ts add tests: an event whose detail-type/type is `checkout.session.expired` (and any `checkout.session.*` other than `completed` / `async_payment_succeeded`) returns a skipped result and makes ZERO ddb/email calls (no Orders row, no LTV). Existing completed-path tests stay green.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` shows the new tests failing and all pre-existing tests passing

### [P1] Inventory bundling + IAM for Contact writers  [parallel]
model: haiku
Read-only. For each target — lambdas/order-handler (+ stripe-events-retry), subscription-handler, patient-record-intake, push-patch-intake, lead-capture, protege-signup, audit-complete, infra/clientportal/cdk/lambdas/auth/post-confirmation.ts, infra/clientportal/cdk/lambdas/lead-capture/send-app-link.ts — record: how it is bundled (esbuild in infra/deploy.sh vs CDK NodejsFunction), whether it can resolve a `workspace:*` package, whether its IAM role already allows `dynamodb:UpdateItem` on table `Contact` (grep infra scripts/CDK), and its CONTACT_TABLE env. Append the table as "## Appendix A — wiring inventory" to docs/plan/contact-upsert-2026-10-13.md.
✓ DONE WHEN: Appendix A exists with one row per target and all four columns filled

### [P2] IMPL: contact-upsert helper  [sequential after P1 TEST helper]
model: sonnet
Implement src/index.ts (exports upsertContact, isPlaceholderPhone, PHI_KEYS) to pass P1 tests. Split into modules < 100 lines each (e.g. build-update.ts, promote.ts, index.ts). No PHI fields, no console logging of emails beyond a hashed/redacted form.
✓ DONE WHEN: `pnpm --filter @my4mlife/contact-upsert test` exits 0 and `pnpm --filter @my4mlife/contact-upsert exec tsc --noEmit` exits 0

### [P2] IMPL: order-handler event-type guard  [sequential after P1 TEST guard]
model: sonnet
In process-event.ts return early (skipped, logged) for checkout.session.* types other than completed/async_payment_succeeded, before any write.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` exits 0

### [P3] TEST+IMPL: purchases write a full Contact row  [sequential after P2]
model: sonnet
TEST first in order-handler-core: a completed session (incl. a Push Patch skuId) calls upsertContact with email, name (customer_details.name split), phone if real, source `purchase:<skuId>`, skus [skuId], amountUSD (new order only), stripeCustomerId, stage `customer`. Then IMPL: replace the hand-rolled Contact UpdateCommand with upsertContact; keep hasUsedFirstPurchaseDiscount; remove the placeholder `+10000000000` passed to protege-signup for app-access (send no phone instead).
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` exits 0

### [P3] TEST+IMPL: subscriptions write email + stage  [sequential after P2]
model: sonnet
subscription-handler-core: test then wire upsertContact (email, source `subscription`, stripeCustomerId, stage `customer`) alongside its existing subscription fields.
✓ DONE WHEN: `pnpm --filter @my4mlife/subscription-handler-core test` exits 0

### [P3] TEST+IMPL: consult + Push Patch intake capture email/name only  [sequential after P2]
model: sonnet
patient-record-intake and push-patch-intake: test then call upsertContact with ONLY email, firstName/lastName, real phone, source (`consult-intake:<lane>` / `push-patch-intake`), tags [lane]. Assert no demographics/answers reach the call. Failure to upsert must not fail the intake (log + continue).
✓ DONE WHEN: `pnpm --filter patient-record-intake test` and `pnpm --filter push-patch-intake test` both exit 0

### [P3] TEST+IMPL: lead-capture uses helper + real consent  [sequential after P2]
model: sonnet
lead-capture: test then replace its UpdateExpression with upsertContact (source from request, stage `lead`, marketingConsent opted_in with source). newsletterSource must no longer be overwritten.
✓ DONE WHEN: `pnpm --filter lead-capture test` exits 0

### [P3] TEST+IMPL: protege-signup stops clobbering  [sequential after P2]
model: sonnet
protege-signup: test that an existing Contact's firstName/phone/consent survive a second signup; IMPL via upsertContact (stage `protege`, source `protege-signup`); keep its consent record in its existing map shape but only if_not_exists.
✓ DONE WHEN: `pnpm --filter protege-signup test` exits 0

### [P3] TEST+IMPL: audit-complete → lead, no answers on Contact  [sequential after P2]
model: sonnet
audit-complete: test that the Contact write contains no intakeAnswers/auditTop3/scores, stage defaults to `lead` (not protege), source from `?src=` (default `assessment`), tags = top-3 category slugs only (no scores). Users table keeps the answers (verify existing write or add it there). IMPL via upsertContact. Confirm nurture-worker picks `lead` rows (its existing test).
✓ DONE WHEN: `pnpm --filter audit-complete test` and `pnpm --filter nurture-worker test` both exit 0

### [P3] TEST+IMPL: Cognito sign-up + app-link requests captured  [sequential after P2]
model: sonnet
post-confirmation.ts and send-app-link.ts (clientportal CDK): per Appendix A, either import the helper (if CDK bundling resolves workspace pkgs) or inline-call a tiny wrapper. Sources `app-signup` / `app-link-request`; no PHI. Add tests beside the existing CDK lambda tests.
✓ DONE WHEN: the clientportal CDK lambda test command recorded in Appendix A exits 0

### [P3] Real newsletter + BMI forms  [sequential after P2]
model: sonnet
website: replace the fake `handleNewsletter` handlers (~10 blog pages) and bmi-calculator `submitEmail` with a POST to /api/lead-capture (source `blog-newsletter:<slug>` / `bmi-calculator`), showing success only on 2xx and an error message otherwise. Prefer one shared script/component over per-page copies.
✓ DONE WHEN: `grep -rn "handleNewsletter\|submitEmail" website/src` shows every remaining handler calling `/api/lead-capture` and `pnpm --filter website build` exits 0

### [P4] IAM + env for new writers  [sequential after P3, needs Appendix A]
model: haiku
Add `dynamodb:UpdateItem` on Contact (and CONTACT_TABLE env) to each deploy script / CDK role in Appendix A that lacks it. Config only.
✓ DONE WHEN: every Appendix A row shows UpdateItem granted in the diff

### [P4] Move existing intakeAnswers off Contact (dry run)  [parallel with IAM]
model: sonnet
infra/scripts/contact-move-phi.mjs: scan Contact; for rows with intakeAnswers/auditTop3, copy to the Users row if Users lacks them, then REMOVE from Contact. Default `--dry-run` prints counts only (no emails printed); `--apply` requires TJ's OK. Never deletes a row.
✓ DONE WHEN: `node infra/scripts/contact-move-phi.mjs --dry-run` exits 0 and prints counts

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] `pnpm -r --filter "./lambdas/**" test` green for every touched package
- [ ] tsc/lint clean for touched packages; new modules < 100 lines
- [ ] No PHI can reach Contact (helper denylist + call sites); no emails logged in clear
- [ ] Additive only: no SET of identity/consent without if_not_exists or explicit consent
- [ ] No unused imports or dead code (incl. order-handler-core/src/push-patch-notify.ts if unused)
- [ ] No secrets or env values committed
- [ ] Commit message written with summary + test plan, pushed to main (project rule: no PRs/branches)
✓ DONE WHEN: all checklist items checked and the commit is on origin/main

## After review (orchestrator, with TJ informed)
Deploy each changed lambda via its own infra/deploy.sh (order-handler + stripe-events-retry together), clientportal via its CDK deploy script, website via website/deploy.sh; smoke-test one write per entry point with a test address, then run contact-move-phi `--apply` only after TJ says yes.
