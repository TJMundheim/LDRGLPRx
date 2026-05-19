# stripe-webhook Lambda

Handles Stripe webhook events. On `checkout.session.completed`:

1. Writes `Orders` row (idempotent via `orderId = session.id` + conditional put).
2. Updates `Contact`: `lifecycleStage=consult-paid`, sets `stripeCustomerId`, flips `hasActiveSubscription` if a subscription was created, sets `hasPurchasedConsult=true` (sticky).
3. Appends `Touchpoints` event (idempotent on Stripe `event.id`).

The frontend MUST pass `contactId` into `checkout.session.create` metadata. Without it, the webhook returns 400.

## Env vars

- `STRIPE_SECRET_KEY` — Stripe restricted key (read sessions only, no charges)
- `STRIPE_WEBHOOK_SECRET` — Stripe `whsec_...` for signature verification
- `CONTACT_TABLE`, `ORDERS_TABLE`, `TOUCHPOINTS_TABLE` — DynamoDB table names

## TODO

- `charge.refunded` → Order status, Touchpoint
- `customer.subscription.deleted` → Contact.hasActiveSubscription=false, lifecycleStage=churned
- `charge.dispute.created` → Contact.lifecycleStage=banned (per chargeback policy)
