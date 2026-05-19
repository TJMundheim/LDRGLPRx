# Contact / Touchpoints / Orders Schema Spec

Locked 2026-05-18 night. This is the wire spec for the lead-capture → Stripe → AI-concierge pipeline. All AppSync resolvers and Lambdas read/write through these tables.

Region: `us-east-2`. Account: `879696522760`. Billing: on-demand. Deletion protection: ON.

---

## Table: `Contact` (golden record)

One row per human ever to touch the platform. Keyed by deterministic `contactId` (UUID v5 of normalized lowercase email, namespace constant) so the same email always maps to the same row across funnels.

| attr | type | notes |
|---|---|---|
| `contactId` | S (PK) | UUIDv5(NAMESPACE, lower(trim(email))) |
| `email` | S | normalized lowercase |
| `emailRaw` | S | as submitted |
| `phone` | S? | E.164, optional |
| `firstName` | S? | |
| `lastName` | S? | |
| `lifecycleStage` | S | `lead` \| `consult-paid` \| `customer` \| `churned` \| `banned` |
| `productInterest` | S? | freeform category, no taxonomy yet |
| `source` | S? | utm_source or `direct` |
| `utm` | M? | full utm bag |
| `consent` | M | `{ proteg​e: { v, at }, hipaaNPP: { v, at }?, phiAuth: { v, at }?, aiComm: { v, at }? }` |
| `cognitoSub` | S? | set if/when user authenticates |
| `stripeCustomerId` | S? | set on first successful Checkout |
| `hasActiveSubscription` | BOOL | derived; updated by webhook |
| `hasPurchasedConsult` | BOOL | lifetime; once true, never false |
| `isGraduate` | BOOL | earned 12mo+ continuous |
| `lastInboundAt` | S? | ISO; updated by inbound-handler |
| `lastContactAt` | S? | ISO; updated whenever we send out |
| `intakeAnswers` | M? | raw discovery form bag |
| `createdAt` | S | ISO |
| `updatedAt` | S | ISO |

**GSIs:**
- `byEmail` — PK `email` (case-normalized) — for lookups when contactId not known
- `byStripeCustomer` — PK `stripeCustomerId` — for webhook lookups
- `byLifecycle` — PK `lifecycleStage`, SK `updatedAt` — for ops dashboards

**Streams:** NEW_AND_OLD_IMAGES → triggers `lead-router` Lambda on INSERT, `lifecycle-router` on MODIFY where `lifecycleStage` changed.

---

## Table: `Touchpoints` (append-only event log)

Every interaction. PK `contactId`, SK `ts#eventType#uuid`.

| attr | type | notes |
|---|---|---|
| `contactId` | S (PK) | |
| `sk` | S (SK) | `<ISO ts>#<eventType>#<shortUuid>` |
| `eventType` | S | `email-out` \| `email-in` \| `sms-out` \| `sms-in` \| `page-view` \| `payment` \| `refund` \| `consult-booked` \| `consult-completed` \| `subscription-created` \| `subscription-cancelled` \| `chargeback` |
| `ts` | S | ISO |
| `payload` | M | event-specific bag |
| `channelMessageId` | S? | SES Message-ID / Stripe event id / SNS msgid — for idempotency |

**GSIs:**
- `byEventType` — PK `eventType`, SK `ts` — for analytics

No streams. Read-mostly.

---

## Table: `Conversations` (threaded AI history)

Threaded message history for the AI concierge. PK `contactId`, SK `ts#direction#shortUuid`.

| attr | type | notes |
|---|---|---|
| `contactId` | S (PK) | |
| `sk` | S (SK) | |
| `direction` | S | `in` \| `out` |
| `channel` | S | `email` \| `sms` |
| `subject` | S? | email only |
| `body` | S | plaintext |
| `bodyHtml` | S? | email only |
| `inReplyTo` | S? | for email threading |
| `messageId` | S | SES/SNS id |
| `claudeModel` | S? | for out: which model drafted |
| `claudePromptTokens` | N? | |
| `claudeCompletionTokens` | N? | |
| `ts` | S | ISO |

No GSIs (always queried by contactId).

---

## Table: `Orders`

One row per Stripe Checkout Session that completes. PK `orderId` (Stripe session id), GSI by contactId.

| attr | type | notes |
|---|---|---|
| `orderId` | S (PK) | Stripe `cs_...` |
| `contactId` | S | |
| `stripeCustomerId` | S | |
| `stripePaymentIntentId` | S? | |
| `stripeSubscriptionId` | S? | if recurring |
| `lineItems` | L | `[{ skuId, qty, unitAmount, discountPct }]` |
| `subtotal` | N | cents |
| `discount` | N | cents |
| `total` | N | cents |
| `currency` | S | `usd` |
| `status` | S | `paid` \| `refunded` \| `partial-refund` \| `chargeback` |
| `paidAt` | S | ISO |
| `refundedAt` | S? | |
| `metadata` | M? | passthrough from Checkout |

**GSIs:**
- `byContact` — PK `contactId`, SK `paidAt` desc

---

## Idempotency

- **Stripe webhook**: write `Orders` and `Touchpoints` keyed by Stripe event id. If item exists, skip.
- **SES inbound**: use SES Message-ID as Touchpoint key suffix. If exists, skip.
- **SNS inbound SMS**: SNS gives a message id — same pattern.

## Deletion / GDPR

`contactId` is derived from email but rows can be tombstoned by setting `lifecycleStage: banned` and clearing PII fields. Never hard-delete — Touchpoints/Orders must survive for accounting.

## Migration from existing 9 tables

Existing tables stay. Contact is new. The 4 Lambdas (`lead-capture`, `lead-router`, `stripe-webhook`, `inbound-handler`) all read/write Contact directly via DocumentClient — no AppSync resolver for v1 to ship fast. AppSync resolver added in P2 once the wire shape is stable.
