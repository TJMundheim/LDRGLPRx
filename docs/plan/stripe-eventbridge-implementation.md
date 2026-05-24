# Plan: Stripe ↔ EventBridge Pipeline Implementation (v2 — post red-team)

## Context

Implement the Stripe → EventBridge → DynamoDB pipeline per the locked contract in [stripe-eventbridge-architecture.md](stripe-eventbridge-architecture.md). Five principles (Customer Portal, EventBridge, listen+pull, DLQ+retry, eventual consistency) are non-negotiable. This v2 incorporates red-team fixes (correct partner-bus topology, EventBridge Scheduler for retry backoff, rule-target DLQs, mode-from-`livemode`, irreversible-action guards, request-body mode hardening, idempotent deploys, `_shared` handler cores).

## Conventions

- All Lambdas: TypeScript, esbuild-bundled, < 100 lines, deploy via `lambdas/<name>/infra/deploy.sh`. Every deploy script is **idempotent** (describe → update OR delete+create), never create-only.
- **Handler cores live in `lambdas/_shared/<name>-core/`** as pure functions `processEvent({id, type, livemode}) → Promise<void>`. Lambda entrypoints are thin wrappers. Retry Lambda imports cores from `_shared/`, never from sibling Lambda packages.
- All Stripe-aware Lambdas use `getStripeClient({ livemode, modeOverride? })`. Mode resolution order: `modeOverride` → `event.livemode ? 'live' : 'test'` → server-side trusted source → `STRIPE_MODE` env → `'test'`. **Never trust `mode` from request body.**
- Stripe SDK config pins `apiVersion` to a frozen string (decided in P1.10).
- All handlers: extract `{id, type, livemode}` only from EventBridge payload, then `stripe.<resource>.retrieve(id)` for canonical state. Idempotent writes (conditional expr or last-writer-wins on `updatedAt`). Touchpoints rows keyed by Stripe event ID with `attribute_not_exists` guard.
- **DLQ wiring lives on EventBridge rule targets** (`Target.DeadLetterConfig`), NOT on Lambda `DeadLetterConfig`. Lambda async DLQ is legacy and only fires for `lambda.invoke` async paths.
- Tests: `vitest`, run via `pnpm --filter <pkg> test <file>`.
- Region: `us-east-2`.

---

## Tasks

### P1 — Cleanup Pass (Step 1 + secrets migration)

All P1 tasks run in parallel except where noted. P1 gate = the 7-command verification checklist (P1.V) exits green. **No P2 task may start until P1.V is green.**

#### [P1.1] Delete Lambda function `my4mlife-stripe-webhook`  [parallel]
model: haiku  [no-delegate: requires TJ's AWS credentials in interactive shell]
Run `aws lambda delete-function --function-name my4mlife-stripe-webhook --region us-east-2`.
✓ DONE WHEN: `aws lambda get-function --function-name my4mlife-stripe-webhook --region us-east-2` exits non-zero with `ResourceNotFoundException`.

#### [P1.2] Delete IAM role `my4mlife-stripe-webhook-role` + inline policies  [parallel]
model: haiku  [no-delegate: AWS auth held by TJ]
Delete inline policies `ddb-rw`, `sns-publish`, `secrets-read` first, then delete role.
✓ DONE WHEN: `aws iam get-role --role-name my4mlife-stripe-webhook-role` exits non-zero.

#### [P1.3] Delete HTTP API route + integration for `POST /api/stripe-webhook` on `v9svm8ds74`  [parallel]
model: haiku  [no-delegate: AWS auth held by TJ]
✓ DONE WHEN: `aws apigatewayv2 get-routes --api-id v9svm8ds74 --region us-east-2 | jq -r '.Items[].RouteKey'` does not include `POST /api/stripe-webhook`.

#### [P1.4] Delete Stripe Dashboard event destination "my4mlife stripe webhook (test)"  [parallel]
model: haiku  [no-delegate: Stripe Dashboard held by TJ]
✓ DONE WHEN: Stripe Dashboard → Event destinations shows zero destinations.

#### [P1.6] Remove `lambdas/stripe-webhook/` from repo  [parallel]
model: haiku
Delete directory; commit.
✓ DONE WHEN: `test ! -d lambdas/stripe-webhook` exits 0.

#### [P1.7] Retire or rewrite `docs/STRIPE-ACTIVATION.md`  [parallel]
model: haiku
Replace body with one-line pointer to architecture spec, or delete.
✓ DONE WHEN: `grep -l 'stripe-webhook' docs/STRIPE-ACTIVATION.md` returns no live setup instructions.

#### [P1.8] Create `stripe-keys` secret in Secrets Manager (us-east-2)  [parallel]
model: haiku  [no-delegate: TJ types live + test key values; secrets never enter chat]
Shape: `{ "live": { "secret_key": "...", "webhook_secret": null }, "test": { "secret_key": "...", "webhook_secret": null } }`. `webhook_secret` is `null` (EventBridge integration eliminates signing-secret need). Use placeholder for test key — to be replaced by rotated value in P1.5b.
✓ DONE WHEN: `aws secretsmanager describe-secret --secret-id stripe-keys --region us-east-2` returns a valid ARN AND `aws secretsmanager get-secret-value --secret-id stripe-keys | jq '.SecretString | fromjson | keys'` returns `["live","test"]`.

#### [P1.9] TEST: stripe-client lib mode-resolution order  [sequential after P1.8]
model: sonnet
Create `lambdas/_shared/stripe-client/src/get-stripe-client.test.ts` asserting resolution order: (a) explicit `modeOverride` wins; (b) else `event.livemode === true` → live; (c) else `event.livemode === false` → test; (d) else `STRIPE_MODE` env; (e) else default `test`; (f) per-warm-container Secrets Manager cache (second call hits no AWS); (g) returns a `Stripe` instance with pinned `apiVersion`. Mock `@aws-sdk/client-secrets-manager`.
✓ DONE WHEN: `pnpm --filter @my4mlife/stripe-client test get-stripe-client.test.ts` exits 0 (RED — impl pending).

#### [P1.10] IMPL: stripe-client lib  [sequential after P1.9]
model: sonnet
Implement `lambdas/_shared/stripe-client/src/index.ts`. Export `getStripeClient({ livemode?, modeOverride? })`. Module-level cache for secret value. Pin `apiVersion` to `'2024-12-18.acacia'` (or current Stripe SDK default — record the chosen value in a code comment).
✓ DONE WHEN: `pnpm --filter @my4mlife/stripe-client test` exits 0 AND `wc -l lambdas/_shared/stripe-client/src/index.ts` < 80.

#### [P1.11] Harden + migrate `create-checkout-session` Lambda  [sequential after P1.10]
model: sonnet
Replace `process.env.STRIPE_SECRET_KEY` with `getStripeClient({ modeOverride })`. **`mode` is NOT accepted from request body.** Source of demo-mode:
- Default route `/api/create-checkout-session` → live (modeOverride omitted, falls through to STRIPE_MODE).
- Auth-gated admin route `/api/admin/demo-checkout-session` → forces `modeOverride='test'`. Auth = signed JWT or basic auth secret stored in Secrets Manager (TJ-only credential).
Sets `Contact.isDemo = (resolvedMode === 'test')`. Update deploy script IAM: `secretsmanager:GetSecretValue` ARN-scoped to `stripe-keys`.
✓ DONE WHEN: tests pass AND `curl -X POST <api>/api/create-checkout-session -d '{"mode":"test", ...}'` does NOT produce a test-mode session (body `mode` ignored) AND `aws lambda get-function-configuration --function-name my4mlife-create-checkout-session | jq '.Environment.Variables | keys'` does not contain `STRIPE_SECRET_KEY`.

#### [P1.5b] Rotate exposed test secret key + update secret  [sequential after P1.11]
model: haiku  [no-delegate: Stripe Dashboard + secret value held by TJ]
Stripe Dashboard → Roll the test secret key `sk_test_51TYqk4...`. Immediately `aws secretsmanager put-secret-value` updating `test.secret_key` to the new value. Sequenced AFTER P1.11 to avoid breaking the migrated Lambda during the rotation window.
✓ DONE WHEN: Stripe Dashboard shows old key marked rolled with today's date AND `aws secretsmanager get-secret-value --secret-id stripe-keys | jq -r '.SecretString | fromjson | .test.secret_key'` starts with `sk_test_` and is NOT the leaked prefix `sk_test_51TYqk4`.

#### [P1.12] Scope `create-checkout-session-role` IAM to minimum  [sequential after P1.11]
model: haiku
Role must have: (a) `dynamodb:PutItem`+`UpdateItem` on `Contact` table ARN ONLY (needed for `isDemo` write); (b) `secretsmanager:GetSecretValue` on `stripe-keys` ARN ONLY; (c) basic Lambda logs. Remove any broader DDB or other grants.
✓ DONE WHEN: `aws iam get-role-policy ... | jq '.PolicyDocument.Statement[].Resource'` shows no `"*"` for DDB/Secrets and Contact-only DDB resource.

#### [P1.V] Verification gate — 7-command checklist + stripe-client smoke  [sequential after P1.1–P1.12, P1.5b]
model: haiku
Run all 7 spec checks (scoped grep below) AND re-run `pnpm --filter @my4mlife/stripe-client test`. Any failure → fix and re-run.
✓ DONE WHEN: all 8 commands return expected output:
1. `aws lambda list-functions --region us-east-2 | jq -r '.Functions[].FunctionName' | grep stripe-webhook` returns empty.
2. `aws iam list-roles | jq -r '.Roles[].RoleName' | grep stripe-webhook` returns empty.
3. `aws apigatewayv2 get-routes --api-id v9svm8ds74 | jq -r '.Items[].RouteKey'` does not include `POST /api/stripe-webhook`.
4. Stripe Dashboard → Event destinations shows 0 destinations.
5. `grep -r 'stripe-webhook' lambdas/ docs/ --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive` returns no live references.
6. `aws lambda get-function-configuration --function-name my4mlife-create-checkout-session | jq '.Environment.Variables | keys'` shows no `STRIPE_SECRET_KEY`.
7. `aws secretsmanager describe-secret --secret-id stripe-keys` returns a valid secret.
8. `pnpm --filter @my4mlife/stripe-client test` exits 0.

---

### P2 — EventBridge: partner bus + cross-account permission (Step 2) [sequential after P1.V]

Spec correction: Stripe's native integration creates its own **partner event bus** named `aws.partner/stripe.com/<account>/<source-id>`. Rules attach directly to that bus. We do NOT create a separate `my4mlife-stripe-events` custom bus.

#### [P2.1] Create Stripe → EventBridge partner event source  [parallel]
model: haiku  [no-delegate: Stripe Dashboard + AWS partner-source acceptance held by TJ]
Stripe Dashboard → Workbench → Event destinations → Amazon EventBridge → AWS account + region us-east-2. In AWS console: EventBridge → Partner event sources → accept the pending source. Capture the generated bus name.
✓ DONE WHEN: `aws events list-event-buses --region us-east-2 | jq -r '.EventBuses[].Name' | grep '^aws.partner/stripe.com'` returns a bus name AND `aws events list-partner-event-sources --name-prefix aws.partner/stripe.com | jq '.PartnerEventSources[].State'` returns `ACTIVE`.

#### [P2.2] Record partner bus ARN as deploy-script constant  [sequential after P2.1]
model: haiku
Write the partner bus ARN into `infra/eventbridge/bus-arn.txt` (single-line, gitignored if it leaks anything sensitive — confirm it's just an ARN). All handler deploy scripts source this file when creating rules.
✓ DONE WHEN: `cat infra/eventbridge/bus-arn.txt` returns an ARN matching `^arn:aws:events:us-east-2:.*:event-bus/aws.partner/stripe.com/.*$`.

#### [P2.3] Confirm partner bus resource policy allows Stripe `PutEvents`  [sequential after P2.1]
model: haiku
Stripe partner sources auto-grant `PutEvents` from the Stripe partner principal — but verify the bus's resource policy explicitly references the partner source ARN. If missing, add via `aws events put-permission`.
✓ DONE WHEN: `aws events describe-event-bus --name <partner-bus> | jq '.Policy'` is non-null AND contains the Stripe partner principal.

---

### P3 — (folded into P1.V — no separate phase)

---

### P4 — order-handler Lambda (Step 3) [sequential after P2]

#### [P4.1] TEST: order-handler core processes checkout.session.completed  [parallel]
model: sonnet
Create `lambdas/_shared/order-handler-core/src/process-event.test.ts`. Assertions:
(a) input is `{id, type, livemode}` only — payload not trusted beyond this;
(b) calls `stripe.checkout.sessions.retrieve(id, { expand: ['line_items','customer'] })` with client built via `getStripeClient({ livemode })`;
(c) writes 3 rows: Contact upsert (last-writer-wins on `updatedAt`), Orders insert (PutItem with conditional `attribute_not_exists(orderId)` keyed by session ID), Touchpoints insert (keyed by **Stripe event ID** with `attribute_not_exists` — duplicate event = no duplicate row);
(d) processing same event twice → identical DDB state (one Touchpoints row, idempotent Contact/Order writes);
(e) demo session (`livemode=false`) → Touchpoints `mode:'test'`;
(f) Contact write respects existing `isDemo` flag (no overwrite live → demo).
Mock Stripe SDK + DDB.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test process-event.test.ts` exits 0 (RED).

#### [P4.2] IMPL: order-handler core  [sequential after P4.1]
model: sonnet
Implement `lambdas/_shared/order-handler-core/src/process-event.ts` exporting `processEvent({id, type, livemode})`. Three independent writes — no `TransactWriteItems`. < 100 lines.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` exits 0 AND `wc -l lambdas/_shared/order-handler-core/src/process-event.ts` < 100.

#### [P4.3] IMPL: order-handler Lambda thin wrapper  [sequential after P4.2]
model: sonnet
`lambdas/order-handler/src/handler.ts` (< 30 lines): EventBridge entry, extract `{id, type, livemode}` from `event.detail`, call `processEvent` from `@my4mlife/order-handler-core`, throw on failure (rule target → DLQ).
✓ DONE WHEN: file < 30 lines AND `pnpm --filter @my4mlife/order-handler build` exits 0.

#### [P4.4] Deploy order-handler + EventBridge rule with target DLQ  [sequential after P4.3, P5.1]
model: sonnet
**Depends on P5.1 because the rule target needs the DLQ ARN at create time.** `lambdas/order-handler/infra/deploy.sh` (idempotent): esbuild bundle; create/update Lambda (IAM: DDB write on Contact+Orders+Touchpoints ARN-scoped, secretsmanager:GetSecretValue on stripe-keys); set `STRIPE_MODE=test` env; create/update EventBridge rule on partner bus matching `detail-type ∈ {checkout.session.completed}`; target = Lambda WITH `DeadLetterConfig.Arn = <DLQ ARN>` and `RetryPolicy.MaximumRetryAttempts=2`.
✓ DONE WHEN: `aws events list-targets-by-rule --rule order-handler-checkout-completed --event-bus-name <partner-bus> | jq '.Targets[0].DeadLetterConfig.Arn'` equals DLQ ARN.

---

### P5 — DLQ + retry pair (Step 4) [partially parallel with P4]

P5.1 must complete before P4.4 (rule target needs DLQ ARN). P5.2–P5.5 run after P5.1.

#### [P5.1] Create SQS DLQ + permanent-failures queue  [parallel — must complete before P4.4]
model: haiku
`infra/sqs/deploy.sh` (idempotent): create `my4mlife-stripe-events-dlq` (MessageRetentionPeriod=1209600 / 14d) AND `my4mlife-stripe-events-permanent-failures` (MessageRetentionPeriod=1209600). The permanent-failures queue is the terminal sink for messages exceeding 5 retries (poison-message containment).
✓ DONE WHEN: both `aws sqs get-queue-url --queue-name my4mlife-stripe-events-dlq` and `aws sqs get-queue-url --queue-name my4mlife-stripe-events-permanent-failures` return URLs.

#### [P5.2] TEST: retry orchestrator schedules backoff via EventBridge Scheduler  [parallel after P5.1]
model: sonnet
SQS event-source-mapping cannot implement the 1m→5m→30m→2h→12h ladder (visibility timeout is the wrong primitive). Instead: SQS ESM drains DLQ → retry Lambda creates a one-shot **EventBridge Scheduler** entry (`aws-sdk/client-scheduler`) at `now + delay` that re-invokes the appropriate handler core. Attempt counter lives in scheduler-payload + DDB `RetryState` table (keyed by Stripe event ID).
Create `lambdas/stripe-events-retry/src/handler.test.ts` asserting:
(a) reads SQS msg, parses `{id, type, livemode, attemptCount}`;
(b) re-pulls Stripe state via `getStripeClient({livemode})`;
(c) re-invokes correct core (`order-handler-core`, `subscription-handler-core`, `refund-dispute-handler-core`) by `type`;
(d) on success: DeleteMessage from DLQ, clear `RetryState`;
(e) on failure with `attemptCount < 5`: create Scheduler entry at `now + ladder[attemptCount]` (1m/5m/30m/2h/12h), increment `RetryState`, DeleteMessage from DLQ;
(f) on failure with `attemptCount >= 5`: SendMessage to permanent-failures queue, write CloudWatch log line, DeleteMessage from DLQ — **NEVER re-throw** (no poison loop).
✓ DONE WHEN: `pnpm --filter @my4mlife/stripe-events-retry test handler.test.ts` exits 0 (RED).

#### [P5.3] IMPL: retry Lambda  [sequential after P5.2]
model: sonnet
Implement `lambdas/stripe-events-retry/src/handler.ts` (< 100 lines). Import cores from `@my4mlife/order-handler-core`, `@my4mlife/subscription-handler-core`, `@my4mlife/refund-dispute-handler-core` (NOT from sibling Lambda packages). Dispatch table by `type` prefix. Backoff ladder constant exported for test.
✓ DONE WHEN: `pnpm --filter @my4mlife/stripe-events-retry test` exits 0 AND `wc -l lambdas/stripe-events-retry/src/handler.ts` < 100.

#### [P5.4] Deploy retry Lambda + SQS ESM + Scheduler IAM  [sequential after P5.3]
model: sonnet
`lambdas/stripe-events-retry/infra/deploy.sh` (idempotent): esbuild bundle; Lambda IAM = `sqs:ReceiveMessage/DeleteMessage` on DLQ, `sqs:SendMessage` on permanent-failures queue, `scheduler:CreateSchedule/DeleteSchedule` (scoped to a `stripe-retry-*` name prefix), `secretsmanager:GetSecretValue` on stripe-keys, `dynamodb:*` on `RetryState` table only, plus DDB write grants for the 3 data tables (since core re-runs write); SQS ESM batch size 1.
✓ DONE WHEN: `aws lambda list-event-source-mappings --function-name my4mlife-stripe-events-retry | jq '.EventSourceMappings[].State'` == `"Enabled"`.

#### [P5.5] Provision `RetryState` DynamoDB table  [parallel after P5.1]
model: haiku
`infra/dynamodb/deploy.sh` add: table `RetryState`, PK=`stripeEventId` (string), attributes `attemptCount` (number), `lastError` (string), `nextScheduledAt` (ISO). On-demand billing.
✓ DONE WHEN: `aws dynamodb describe-table --table-name RetryState | jq -r '.Table.TableStatus'` == `"ACTIVE"`.

---

### P6 — subscription-handler + refund-dispute-handler (Step 5) [sequential after P5]

#### [P6.1] TEST: subscription-handler-core  [parallel]
model: sonnet
`lambdas/_shared/subscription-handler-core/src/process-event.test.ts`:
(a) handles `customer.subscription.created|updated|deleted`;
(b) listen+pull;
(c) sets `Contact.hasActiveSubscription = (subscription.status === 'active' || 'trialing')`;
(d) idempotent (same event twice = same state);
(e) honors `livemode` for mode selection.
✓ DONE WHEN: `pnpm --filter @my4mlife/subscription-handler-core test process-event.test.ts` exits 0 (RED).

#### [P6.2] IMPL: subscription-handler-core  [sequential after P6.1]
model: sonnet
< 100 lines. Pure function, no Lambda concerns.
✓ DONE WHEN: tests green AND `wc -l` < 100.

#### [P6.3] Deploy subscription-handler Lambda  [sequential after P6.2, P5.1]
model: sonnet
Thin wrapper Lambda (< 30 lines) + `infra/deploy.sh` (idempotent). Rule on partner bus matching `customer.subscription.*`. Target DLQ wired (`Target.DeadLetterConfig.Arn`). IAM scoped to Contact table + stripe-keys.
✓ DONE WHEN: `aws events list-targets-by-rule --rule subscription-handler-all --event-bus-name <partner-bus> | jq '.Targets[0].DeadLetterConfig.Arn'` equals DLQ ARN.

#### [P6.4] TEST: refund-dispute-handler-core (chargeback ban guards)  [parallel]
model: sonnet
`lambdas/_shared/refund-dispute-handler-core/src/process-event.test.ts`:
(a) handles `charge.refunded` + `charge.dispute.created` + `charge.dispute.updated` + `charge.dispute.closed`;
(b) listen+pull — re-retrieves dispute, branches on `dispute.status`;
(c) `charge.refunded` → Order.status = 'refunded'; idempotent;
(d) **dispute ban guard**: `Contact.lifecycleStage='banned'` ONLY when `dispute.status === 'lost'` (never on `created`/`under_review`/`won`); ban write is idempotent — already-banned contact is no-op; ban is NEVER reversed by this handler (won dispute does not un-ban — manual review);
(e) honors livemode.
✓ DONE WHEN: `pnpm --filter @my4mlife/refund-dispute-handler-core test process-event.test.ts` exits 0 (RED).

#### [P6.5] IMPL: refund-dispute-handler-core  [sequential after P6.4]
model: sonnet
< 100 lines. Encode ban-guard rule explicitly.
✓ DONE WHEN: tests green AND `wc -l` < 100.

#### [P6.6] Deploy refund-dispute-handler Lambda  [sequential after P6.5, P5.1]
model: sonnet
Thin wrapper + idempotent deploy script. Rule on partner bus matching `charge.refunded` + `charge.dispute.*`. Target DLQ wired.
✓ DONE WHEN: rule visible AND `aws events list-targets-by-rule ... | jq '.Targets[0].DeadLetterConfig.Arn'` equals DLQ ARN.

---

### P7 — customer-portal-session Lambda + clientportal button (Step 6) [sequential after P6]

#### [P7.1] TEST: customer-portal-session  [parallel]
model: sonnet
`lambdas/customer-portal-session/src/handler.test.ts`:
(a) reads `customerId` from auth-gated request (caller identity verified — not raw body);
(b) `mode` is NEVER taken from request body; derived from Contact.isDemo lookup (DDB read);
(c) calls `stripe.billingPortal.sessions.create({customer, return_url})`;
(d) returns `{url}`; 400 on missing customerId; 403 on caller not matching customerId.
✓ DONE WHEN: `pnpm --filter @my4mlife/customer-portal-session test handler.test.ts` exits 0 (RED).

#### [P7.2] IMPL + deploy: customer-portal-session  [sequential after P7.1]
model: sonnet
Handler < 80 lines. Deploy script (idempotent): IAM = `secretsmanager:GetSecretValue` on stripe-keys + `dynamodb:GetItem` on Contact (for isDemo lookup). HTTP API route `POST /api/customer-portal-session` on `v9svm8ds74` with Cognito JWT authorizer.
✓ DONE WHEN: `curl -X POST <api>/api/customer-portal-session -H "Authorization: Bearer <jwt>" -d '{"customerId":"cus_..."}'` returns 200 with `{url}` AND unauthenticated call returns 401.

#### [P7.3] Add "Manage subscription" button to clientportal  [parallel after P7.2]
model: sonnet
`apps/clientportal/`: button POSTs to `/api/customer-portal-session` with current user's `stripeCustomerId` + auth header, redirects to returned URL. < 50 lines.
✓ DONE WHEN: `pnpm --filter clientportal build` exits 0 AND button renders in dev.

---

### P8 — CloudWatch alarms + SNS (Step 7) [sequential after P5]

#### [P8.1] Create SNS topic `my4mlife-stripe-alerts` + email subscription  [parallel]
model: haiku  [no-delegate: TJ confirms email subscription click]
`infra/sns/deploy.sh` (idempotent): create topic, subscribe drtj@my4mlife.com.
✓ DONE WHEN: `aws sns list-subscriptions-by-topic --topic-arn <arn> | jq '.Subscriptions[].SubscriptionArn'` shows a non-`PendingConfirmation` ARN.

#### [P8.2] CloudWatch alarm: **permanent-failures queue depth > 0**  [sequential after P8.1, P5.1]
model: haiku
Alarm on `AWS/SQS` metric `ApproximateNumberOfMessagesVisible`, dimension QueueName=`my4mlife-stripe-events-permanent-failures`, threshold > 0, period 60s, 1 datapoint, action = SNS topic. **Permanent-failures queue (not DLQ) is the alarm source — DLQ is expected to have brief non-zero depth during normal retry cycling; permanent-failures means human intervention needed.**
✓ DONE WHEN: `aws cloudwatch describe-alarms --alarm-names my4mlife-stripe-permanent-failures-depth | jq -r '.MetricAlarms[0].StateValue'` returns `OK` or `INSUFFICIENT_DATA`.

#### [P8.3] CloudWatch alarm: DLQ depth > 0 for 30 min (warning, not paging)  [parallel after P8.2]
model: haiku
Secondary alarm: DLQ ApproximateNumberOfMessagesVisible > 0 evaluated over 30 datapoints at 60s. Indicates retry system is slow but not stuck. Same SNS topic, lower severity in subject.
✓ DONE WHEN: alarm exists with 30-datapoint evaluation period.

---

### P9 — End-to-end Stripe test-card walkthroughs (Step 8) [sequential after P7, P8]

#### [P9.1] E2E #1: one-time $5 Fast Start purchase (exercises order-handler)  [no-delegate: TJ click-through]
model: opus
Purchase via Fast Start cart with Stripe test card `4242 4242 4242 4242`, `STRIPE_MODE=test` (or admin demo route). Verify in order: (a) Checkout session created; (b) `checkout.session.completed` arrives on partner bus (CloudTrail / EventBridge metrics); (c) order-handler writes Contact + Orders + Touchpoints (DDB read); (d) DLQ depth stays 0; (e) permanent-failures queue depth stays 0; (f) `customer-portal-session` returns a working URL.
✓ DONE WHEN: all 6 verifications recorded in `## E2E Log` section of this plan file.

#### [P9.2] E2E #2: subscription create → update → cancel (exercises subscription-handler)  [no-delegate: TJ click-through]
model: opus
Use a recurring SKU (or create a temporary $1/mo test product). Verify: (a) `subscription.created` → `Contact.hasActiveSubscription=true`; (b) update price → `subscription.updated` arrives, state still consistent; (c) cancel via Customer Portal → `subscription.deleted` → `hasActiveSubscription=false`.
✓ DONE WHEN: all 3 transitions recorded in `## E2E Log`.

#### [P9.3] E2E #3: forced failure exercises DLQ + retry + permanent-failures  [no-delegate: TJ runs]
model: opus
Temporarily deploy order-handler with a forced `throw new Error('chaos test')` on a specific marker `client_reference_id`. Trigger one checkout with that marker. Verify: (a) event lands in DLQ; (b) retry Lambda picks up, creates Scheduler entry; (c) after backoff, retries fire; (d) after 5 failures, message lands in permanent-failures queue; (e) CloudWatch alarm P8.2 fires; (f) SNS email arrives. Revert chaos throw and redeploy. Drain permanent-failures queue manually.
✓ DONE WHEN: all 6 verifications recorded in `## E2E Log` AND chaos throw reverted (`git diff lambdas/order-handler/` clean).

---

### [REVIEW] Code Review  [sequential — runs last]
model: opus

- [ ] `pnpm -r tsc --noEmit` passes
- [ ] `pnpm -r lint` passes
- [ ] All vitest suites green (`pnpm -r test`)
- [ ] No unused imports / dead code in the diff
- [ ] No secrets committed (`git log -p` since branch base shows no `sk_`, `whsec_`, AWS keys)
- [ ] Every Lambda handler file `< 100` lines; thin wrappers `< 30` lines (`wc -l lambdas/*/src/handler.ts`)
- [ ] Every Lambda has `infra/deploy.sh`; every deploy script is **idempotent** (re-running is safe, no duplicate rules / orphaned versions)
- [ ] Every Lambda esbuild-bundled
- [ ] No Lambda reads Stripe keys from env vars — all use `getStripeClient()`
- [ ] Mode resolution order honored: `modeOverride > event.livemode > server-trusted > STRIPE_MODE > 'test'`. **`mode` is never sourced from request body** in any Lambda
- [ ] Stripe SDK `apiVersion` pinned in `getStripeClient()`
- [ ] `Contact.isDemo` set by `create-checkout-session`, read by handlers + `customer-portal-session`
- [ ] Each handler IAM role scoped to minimum (specific table + secret ARNs; no `*`)
- [ ] **DLQ wired on EventBridge rule targets** (`Target.DeadLetterConfig`), not Lambda `DeadLetterConfig`
- [ ] Permanent-failures queue exists and is the alarm source (not raw DLQ depth)
- [ ] Retry Lambda imports cores from `_shared/`, NOT from sibling Lambda packages
- [ ] Retry Lambda uses EventBridge Scheduler for backoff ladder (1m/5m/30m/2h/12h), not SQS visibility timeout
- [ ] After 5 retries, retry Lambda DeleteMessages from DLQ and SendMessages to permanent-failures (no re-throw, no poison loop)
- [ ] Listen+pull verified — every handler extracts `{id, type, livemode}` only and re-retrieves canonical state
- [ ] Touchpoints rows keyed by Stripe event ID with `attribute_not_exists` (idempotent)
- [ ] Dispute ban guard: ban only on `dispute.status === 'lost'`, never reversed by handler
- [ ] No `TransactWriteItems` across the 4 tables
- [ ] No `@anthropic-ai/sdk` imports anywhere
- [ ] Forced-failure E2E (P9.3) confirmed DLQ + retry + permanent-failures + alarm + SNS all fire correctly
- [ ] Spec doc compliance — every "🔲 To build" row in [stripe-eventbridge-architecture.md](stripe-eventbridge-architecture.md) has a deployed artifact; "❌ Retire" row gone
- [ ] PR description written: summary + test plan + spec link

✓ DONE WHEN: every checkbox ticked AND PR opened against `main`.

---

## Wall-clock estimate (3–5 parallel subagents per phase)

| Phase | Work | Wall-clock |
|---|---|---|
| P1 | Cleanup + secrets migration (P1.1–P1.4, P1.6–P1.8 parallel; P1.9–P1.12, P1.5b sequential; V gate) — gated by TJ AWS/Stripe console steps | 60–90 min |
| P2 | Partner source acceptance + bus permission — Stripe→AWS partner-source binding can require waiting on AWS partner activation | 30–90 min |
| P4 | order-handler core (TEST/IMPL) + wrapper + deploy (P4.4 blocked on P5.1) | 35–50 min |
| P5 | DLQ + permanent-failures + RetryState table + retry Lambda (TEST/IMPL/deploy) | 45–65 min |
| P6 | subscription + refund-dispute cores + wrappers + deploys in parallel | 35–50 min |
| P7 | customer-portal-session + clientportal button | 25–35 min |
| P8 | SNS (email confirm) + 2 CloudWatch alarms | 15–25 min |
| P9 | 3 E2E walkthroughs (one-time, subscription, forced-failure chaos test) | 45–75 min |
| REVIEW | opus checklist + PR | 20–30 min |
| **Total** | | **~5.0–8.5 hours wall-clock** |

Bottlenecks are the `[no-delegate]` steps — TJ-driven AWS console, Stripe Dashboard, SNS email confirm, and three live E2E click-throughs. Pure-code phases (P4–P7) parallelize well and land near the low end. The P2 estimate widened (was 15–25 min) because AWS partner-source activation latency is unpredictable. P9 widened because v2 added the forced-failure chaos test (P9.3) which requires a deploy → trigger → wait-for-backoff-ladder → revert cycle.

---

## E2E Log

_(populated during P9)_
