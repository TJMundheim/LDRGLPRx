# stripe-webhook Lambda

Handles Stripe webhook events. On `checkout.session.completed`:

1. Writes `Orders` row (idempotent via `orderId = session.id` + conditional put).
2. Updates `Contact`: `lifecycleStage=consult-paid`, sets `stripeCustomerId`, flips `hasActiveSubscription` if a subscription was created, sets `hasPurchasedConsult=true` (sticky).
3. Appends `Touchpoints` event (idempotent on Stripe `event.id`).
4. **If a consult SKU is in `session.metadata.skuIds`** (comma-separated, e.g. `comprehensive-consult`): sends a booking-link confirmation via Mailgun (email) + SNS (SMS) using `customer_details.email` / `customer_details.phone`. Idempotent via a sentinel `Touchpoints` row keyed `<ts>#consult-confirmation#<stripeEvent.id>` with `attribute_not_exists(sk)`. Each channel write also creates an `email-out` / `sms-out` Touchpoint.

The frontend MUST pass `contactId` into `checkout.session.create` metadata, and SHOULD pass `skuIds` (comma-separated) so the webhook can detect consult purchases without re-fetching line items.

## Env vars

- `STRIPE_SECRET_KEY` — Stripe restricted key (read sessions only, no charges)
- `STRIPE_WEBHOOK_SECRET` — Stripe `whsec_...` for signature verification
- `CONTACT_TABLE`, `ORDERS_TABLE`, `TOUCHPOINTS_TABLE` — DynamoDB table names
- `MAILGUN_DOMAIN`, `MAILGUN_API_KEY`, `MAILGUN_FROM` — Mailgun outbound email
- `ONBOARDING_BOOKING_URL` — booking link delivered on consult purchase

## Line count

Handler is **115 lines** (slightly over the 100-line global rule). The overage is the consult-confirmation branch: SKU detection + sentinel idempotency put + two channel sends + two Touchpoint writes. Extracting helpers would not meaningfully reduce LOC; splitting into a second lambda would add deploy/IAM surface for a tightly coupled side-effect. Documented and accepted ≤120.

## TODO

- `charge.refunded` → Order status, Touchpoint
- `customer.subscription.deleted` → Contact.hasActiveSubscription=false, lifecycleStage=churned
- `charge.dispute.created` → Contact.lifecycleStage=banned (per chargeback policy)
