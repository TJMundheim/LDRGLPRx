# Stripe ↔ AWS Architecture — My4MLife

Source: TJ's architect friend (the same engineer who rebuilt the Connected Mind platform in <1 month using Claude Code, and who scoped today's email-sender / Cognito / Mailgun migration). Locked **2026-05-24** during the Stripe activation push.

This document is the **contract** for how Stripe events become DynamoDB state. Future Claude sessions: read this before touching the payment pipeline. Don't second-guess; if you think a different pattern is better, write a new proposal and get TJ's sign-off — don't silently re-architect.

---

## Five principles

### 1. Stripe Customer Portal — not a custom account UI

For subscription/billing self-service (cancel, update card, see invoices, change plan), we use Stripe's hosted **Customer Portal**. We do **not** build our own account-management screens. The only code we write is a tiny Lambda that calls `stripe.billingPortal.sessions.create({ customer, return_url })` and returns the resulting URL. The user is redirected to Stripe's domain to do everything.

**Why:** zero PCI burden, zero maintenance, every edge case (failed cards, dunning, proration) already handled by Stripe, scales to any number of subscription products without UI work.

### 2. EventBridge — not custom webhook endpoints

Stripe → AWS EventBridge native integration. Stripe fires events directly onto an AWS event bus. We do **not** receive webhooks at an HTTPS endpoint we own. Multiple Lambdas can subscribe to the same event via EventBridge rules — fan-out comes free.

**Why:** no webhook signing-secret management, no SSL termination, no rate-limit risk, native AWS retry semantics, can add new event consumers without changing Stripe configuration.

**Caveat that defines everything else:** EventBridge guarantees **at-least-once delivery, not in-order delivery**. Events can arrive out of order, duplicated, or delayed. Every downstream Lambda must be designed for this.

### 3. Listen + pull — never trust event payloads

When a handler Lambda receives an EventBridge event, it extracts **only the object ID and the event type** from the payload. It then calls Stripe's API directly to retrieve the current canonical state of that object (`stripe.checkout.sessions.retrieve(id, { expand: [...] })`, `stripe.subscriptions.retrieve(id)`, etc.) and writes to DynamoDB based on the fresh pull.

**Why:** Stripe object state can change between event-fire and event-delivery. A `subscription.created` event might arrive after the subscription has already been canceled. Trusting the event payload as data writes stale information. Pulling fresh state means we always converge to the correct answer regardless of delivery order or duplication.

**Side benefit:** every handler becomes **naturally idempotent** — processing the same event twice writes the same data twice (last-writer-wins on `updatedAt`).

### 4. Dead-letter queue + retry — never lose work

Every handler Lambda has an SQS DLQ configured as its on-failure destination. When a Lambda invocation fails (transient Stripe API error, DynamoDB throttle, Lambda timeout, unhandled exception), the event lands in the DLQ instead of being lost. A separate **retry Lambda** drains the DLQ on a schedule, re-pulls fresh state from Stripe, and tries again.

**Components:**
- `my4mlife-stripe-events-dlq` — SQS queue, message retention 14 days
- Each handler Lambda has `DeadLetterConfig.TargetArn` = the DLQ
- `my4mlife-stripe-events-retry` Lambda — triggered by SQS event source mapping on the DLQ, batch size 1, with exponential backoff per message
- CloudWatch alarm on DLQ depth > 0 for > 10 minutes → SNS alert to drtj@my4mlife.com
- Max retries: 5 with exponential backoff (1m, 5m, 30m, 2h, 12h). After 5 failures the message is logged to a "permanent failures" CloudWatch log group and alerted.

### 5. Eventual consistency — no cross-service transactions

We do not enforce strict consistency across Stripe, DynamoDB, and the UI. The system converges to correct state, but not instantly. UI and downstream consumers must tolerate "the answer is settling."

**Concrete rules:**

- **No transactional writes across the 4 tables.** A `checkout.session.completed` handler writes `Contact`, `Orders`, and `Touchpoints` as three independent operations. If one fails, the DLQ + retry recovers just that one. No cross-table atomicity.
- **Every write uses conditional expressions or last-writer-wins with `updatedAt` timestamps.** No read-then-write races. Same event processed twice → identical outcome.
- **UI never assumes state is current.** After Stripe Checkout, the thank-you page says "your purchase is processing — you'll get an email within a minute" rather than "access granted." When the user opens the app immediately after paying, the gate shows "activating your account…" with auto-refresh until the Contact row reflects the purchase.
- **Reads tolerate stale state.** If `hasActiveSubscription` is true but the Contact row was updated 3 seconds ago vs. 30 minutes ago, the UI doesn't care. If the data is wrong, the next event pulls a corrected state.
- **No global locks. No distributed mutexes.** Don't go there.

---

## Architecture diagram (in words)

```
Customer → my4mlife.com cart → create-checkout-session Lambda → Stripe Checkout URL
   (we redirect customer to Stripe's domain to enter card details)
                                  ↓
Customer pays on checkout.stripe.com
                                  ↓
Stripe → native EventBridge integration → custom event bus my4mlife-stripe-events
                                  ↓
        ┌─────────────────────────┼─────────────────────────┐
        ↓                         ↓                         ↓
EventBridge rule:          EventBridge rule:          EventBridge rule:
checkout.session.*         subscription.*             charge.refunded /
                                                      dispute.created
        ↓                         ↓                         ↓
order-handler             subscription-handler        refund-handler
Lambda                    Lambda                      Lambda
        ↓                         ↓                         ↓
   (each pulls fresh state from Stripe API, then writes)
        ↓                         ↓                         ↓
        └──→ Contact / Orders / Touchpoints (DynamoDB) ←────┘

On Lambda failure → my4mlife-stripe-events-dlq (SQS)
                                  ↓
                    retry Lambda (drains DLQ, re-pulls Stripe, re-writes)
                                  ↓
                    CloudWatch alarm if DLQ depth > 0 for > 10 min
```

---

## Components — what to build, what already exists

| Component | Status | Notes |
|---|---|---|
| 4 DynamoDB tables | ✅ Live | `Contact`, `Orders`, `Touchpoints`, `Conversations` provisioned 2026-05-24 |
| `create-checkout-session` Lambda | ✅ Live | Reused as-is. Hosted Checkout pattern is independent of EventBridge. |
| Stripe webhook HTTPS endpoint Lambda | ❌ **Retire** | `my4mlife-stripe-webhook` deployed 2026-05-24 — kill it. The Stripe destination created in dashboard ("my4mlife stripe webhook (test)") also needs deletion. |
| EventBridge custom bus `my4mlife-stripe-events` | 🔲 To build | |
| Stripe → EventBridge integration | 🔲 To build | Stripe Dashboard → Workbench → Event destinations → Amazon EventBridge. Stripe assigns the bus ARN to send to; we accept the partner event source. |
| `order-handler` Lambda | 🔲 To build | Subscribes to `checkout.session.completed`. Pulls session, writes Contact/Orders/Touchpoints. |
| `subscription-handler` Lambda | 🔲 To build | Subscribes to `customer.subscription.created/updated/deleted`. Pulls subscription, updates Contact.hasActiveSubscription. |
| `refund-dispute-handler` Lambda | 🔲 To build | Subscribes to `charge.refunded`, `charge.dispute.created`. Pulls charge, updates Order status. Chargeback → Contact.lifecycleStage = 'banned' per policy. |
| `customer-portal-session` Lambda | 🔲 To build | Returns Stripe billing portal URL on demand. Used by the in-app "Manage subscription" button. |
| `my4mlife-stripe-events-dlq` SQS queue | 🔲 To build | Message retention 14 days, attached to all handler Lambdas via `DeadLetterConfig`. |
| `my4mlife-stripe-events-retry` Lambda | 🔲 To build | SQS event source mapping on the DLQ. Exponential backoff 1m→5m→30m→2h→12h, max 5 retries. |
| CloudWatch alarm on DLQ depth | 🔲 To build | DLQ depth > 0 for > 10 min → SNS topic → email drtj@my4mlife.com. |

---

## Implementation order (when we resume)

1. **Retire** the existing webhook Lambda + Stripe webhook destination. Clean slate.
2. **Create EventBridge custom bus** + Stripe partner event source.
3. **Build `order-handler`** first (the most important Lambda — every paid customer flows through this).
4. **Build the DLQ + retry pair** next, before adding more handlers — every handler we add must already have DLQ wired.
5. **Add `subscription-handler`** and `refund-dispute-handler`.
6. **Add `customer-portal-session`** Lambda + wire a "Manage subscription" button into the clientportal app.
7. **Add CloudWatch alarm** on DLQ depth.
8. **End-to-end test** with the Stripe test card.

Skip step 8 until the rest is solid. Then a single $5 Fast Start purchase exercises the whole pipeline.

---

## Cleanup pass — artifacts to remove before the new build

When the next session begins the refactor, **do the cleanup pass first** so the new architecture isn't built on top of half-removed legacy. Nothing on this list is in use yet (no real customer has hit any of it), so deletion is safe.

### AWS resources to delete

- [ ] **Lambda function:** `my4mlife-stripe-webhook` (created 2026-05-24)
- [ ] **IAM role:** `my4mlife-stripe-webhook-role` (and its inline policies: `ddb-rw`, `sns-publish`, `secrets-read`)
- [ ] **HTTP API route:** `POST /api/stripe-webhook` on `v9svm8ds74`
- [ ] **HTTP API integration:** the AWS_PROXY integration that targets the above Lambda
- [ ] **Lambda permission:** `apigw-stripe-webhook` statement on the webhook Lambda (auto-cleaned with the Lambda)
- [ ] **CloudWatch log group:** `/aws/lambda/my4mlife-stripe-webhook` (optional — keep for forensics if desired)

### Stripe Dashboard items to delete

- [ ] **Event destination** named `my4mlife stripe webhook (test)` in Stripe Dashboard → Developers → Event destinations. URL: `https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/stripe-webhook`.
- [ ] **Rotate the test secret keys** that were exposed during today's session:
  - Stripe Dashboard → Developers → API keys → "Roll" the test secret key (`sk_test_51TYqk4...`)
  - The signing secret `whsec_H9sIS9...` is auto-invalidated when the destination is deleted, so it's covered by the previous bullet
- These were typed into chat in plain text earlier today; rotating closes that exposure cleanly.

### Code + repo artifacts to remove

- [ ] **Lambda code:** `lambdas/stripe-webhook/` directory in the repo (handler, package.json, tsconfig, deploy.sh, dist, node_modules)
- [ ] **Tests:** `lambdas/stripe-webhook/src/handler.test.ts` (the 3 vitest tests for the retired webhook handler)
- [ ] **Doc reference:** the webhook setup section in `docs/STRIPE-ACTIVATION.md` is now stale. Either delete that whole doc (replaced by this spec for the post-Stripe-activation pipeline) or rewrite it to point at this spec.

### Secrets — move from Lambda env vars to AWS Secrets Manager

This is the second debt I created today. The `create-checkout-session` Lambda has its Stripe secret key directly in `process.env` — same anti-pattern your friend's `email-sender` deliberately avoids (it reads from `mailgun-api-key` in Secrets Manager at runtime). Fix on cleanup:

- [ ] Create secret `stripe-keys-test` in AWS Secrets Manager (us-east-2). Shape:
  ```json
  { "secret_key": "sk_test_...", "webhook_secret": "whsec_..." }
  ```
- [ ] (Later, when going live) Create `stripe-keys-live` with the live equivalents.
- [ ] Update **every Stripe-aware Lambda** (`create-checkout-session` + the new EventBridge handlers + customer-portal-session) to read from Secrets Manager at runtime, with the same in-memory caching pattern as `lambdas/email-sender/src/handler.ts`.
- [ ] Update each Lambda's IAM role to grant `secretsmanager:GetSecretValue` on the secret ARN.
- [ ] After the Lambdas are reading from Secrets Manager, **scrub the Stripe keys from existing Lambda env-var configs** via `aws lambda update-function-configuration --environment ...` (the only acceptable use of an ad-hoc CLI call here — actually clearing the value).
- [ ] Going forward: **every deploy script reads secrets from Secrets Manager, never from chat input.** If a Lambda needs a new secret, the deploy script's IAM section grants the read and the Lambda code does the runtime fetch.

### IAM cleanup

- [ ] After removing the webhook Lambda, also delete its inline policies on the role before deleting the role (AWS requires this order).
- [ ] Audit the `create-checkout-session-role` to confirm it has only the minimum IAM needed (it shouldn't have DynamoDB write — that Lambda just calls Stripe and returns a URL).

### Verification checklist after cleanup

- [ ] `aws lambda list-functions --region us-east-2` shows no `stripe-webhook` function
- [ ] `aws iam list-roles | grep stripe-webhook` returns nothing
- [ ] `aws apigatewayv2 get-routes --api-id v9svm8ds74 | jq '.Items[].RouteKey'` does not include `POST /api/stripe-webhook`
- [ ] Stripe Dashboard → Event destinations shows zero destinations (will be re-created via EventBridge integration instead)
- [ ] `grep -r 'stripe-webhook' lambdas/ docs/` returns no live references (only mentions in archive/historical notes are OK)
- [ ] `aws lambda get-function-configuration --function-name my4mlife-create-checkout-session | jq '.Environment.Variables | keys'` shows NO `STRIPE_SECRET_KEY` key
- [ ] `aws secretsmanager describe-secret --secret-id stripe-keys-test` returns a valid secret

Only when every box is checked should the new EventBridge build begin.

---

## What this doc is not

Not a code spec. Not Lambda-level pseudocode. Not a Lambda boundary contract. Those get written when the implementer (Claude or human) is actually ready to cut code, ideally checked back with TJ's friend if any boundary feels uncertain. This document is the **set of constraints any implementation must honor.**
