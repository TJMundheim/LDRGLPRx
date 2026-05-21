# Stripe Activation — Step-by-Step

Use this the morning the IRS 147C letter arrives and Stripe finishes verification. Working time: ~30–45 minutes start to finish.

Owner: TJ. AI concierge (Claude) can help interpret screens but you do the clicks.

---

## Pre-flight (do once)

- [ ] Confirm the Stripe account shows **"Verified"** or **"Active"** status after uploading the 147C letter
- [ ] Confirm you can see the Stripe **Dashboard** at https://dashboard.stripe.com — switch to **Test mode** (toggle top right) for the rest of the steps until we're ready to flip live
- [ ] Have this repo open in your editor — you'll be pasting price IDs into `website/src/data/skus.ts`

---

## Step 1 — Create the products + prices in Stripe (Test mode)

Go to **Products → Add product** for each row below. Use the exact names — they show on Stripe Checkout to customers and on receipts.

### Consult SKUs (one-time payments)

| Stripe Product Name | Price | Billing | Internal SKU id |
|---|---|---|---|
| `Comprehensive 4M Consult + Wellness Labs` | **$199.00** | One-time | `consult-comprehensive` |
| `4M Consult (recent labs in hand)` | **$99.00** | One-time | `consult-basic` |
| `Testosterone Consult + Hormone Panel` | **$249.00** | One-time | `consult-hormone` |

### Supplement SKUs (monthly subscriptions)

| Stripe Product Name | Price | Billing | Internal SKU id |
|---|---|---|---|
| `Biome NS Ultra — monthly` | (TBD — see skus.ts for retail) | Monthly recurring | `biome-ns-ultra-sub` |
| `SleepRestore — monthly` | TBD | Monthly recurring | `sleeprestore-sub` |
| `NeuroBridge — monthly` | TBD | Monthly recurring | `neurobridge-sub` |
| `ArmorVita — monthly` | TBD | Monthly recurring | `armorvita-sub` |
| `OmegaCN Prime — monthly` | TBD | Monthly recurring | `omegacn-prime-sub` |
| `MitoVita — monthly` | TBD | Monthly recurring | `mitovita-sub` |

### 90-day starter bundles (one-time)

Same as monthly products but as one-time payments at the 90-day bundle price (final pricing TBD; see `website/src/data/skus.ts` for current retail). Use Stripe Product Name suffix `— 90-day starter`.

**For every Price you create, copy the Stripe Price ID** (looks like `price_1ABC...`) — you'll paste it in Step 2.

---

## Step 2 — Paste Stripe Price IDs into `skus.ts`

Open [`website/src/data/skus.ts`](../website/src/data/skus.ts). Each SKU has a `stripePriceId: null` field. Replace each `null` with the matching `'price_...'` string you got from Stripe.

Example:

```diff
   'consult-comprehensive': {
     id: 'consult-comprehensive',
     name: 'Comprehensive 4M Consult + Wellness Labs',
-    stripePriceId: null,
-    available: false,
+    stripePriceId: 'price_1ABC234...test_id_here',
+    available: true,
     ...
   },
```

Also flip `available: false` → `available: true` for every SKU you've created. The cart Checkout button is gated on `sku.available && sku.stripePriceId` — without both, it stays disabled.

After editing, run:

```bash
cd website && pnpm build
```

The build should still pass. If it doesn't, you broke a string — check for missing commas or quotes.

---

## Step 3 — Configure the Stripe webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** the production URL of the `stripe-webhook` Lambda. If it's deployed behind API Gateway, the URL looks like `https://<api-id>.execute-api.us-east-2.amazonaws.com/stripe-webhook` — get this from the Lambda's infra/deploy output or AWS Console → API Gateway.
3. **Events to listen for:** add these 5:
   - `checkout.session.completed`
   - `charge.refunded`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `charge.dispute.created`
4. **Click Add endpoint.** You'll get a **Signing secret** (`whsec_...`) — copy it.
5. Add the signing secret to the Lambda's env vars:
   ```bash
   aws lambda update-function-configuration \
     --function-name my4mlife-stripe-webhook \
     --region us-east-2 \
     --environment 'Variables={STRIPE_WEBHOOK_SECRET=whsec_...,STRIPE_SECRET_KEY=sk_test_...,CONTACT_TABLE=Contact,ORDERS_TABLE=Orders,TOUCHPOINTS_TABLE=Touchpoints,MAILGUN_DOMAIN=my4mlife.com,MAILGUN_API_KEY=...,MAILGUN_FROM=concierge@my4mlife.com,ONBOARDING_BOOKING_URL=https://calendly.com/your-link}'
   ```
   (Replace placeholders. `STRIPE_SECRET_KEY` lives in Dashboard → Developers → API keys.)

---

## Step 4 — Test the end-to-end flow in Test mode

Use Stripe's test card: **4242 4242 4242 4242**, any future expiry, any 3-digit CVC, any ZIP.

1. Hit https://my4mlife.com/audit, take the assessment, end up on results
2. Click "Book consult + labs — $199" on any non-T row
3. Cart page loads → Continue to Checkout
4. Stripe Checkout opens — pay with the test card
5. Should redirect back to a success page
6. Check:
   - **Stripe Dashboard → Payments** — payment shows as succeeded
   - **DynamoDB Orders table** — new row with the `orderId = cs_test_...`
   - **DynamoDB Contact table** — that row's `lifecycleStage = 'consult-paid'`, `hasPurchasedConsult = true`
   - **drtj@my4mlife.com inbox** — booking-link email arrived from `concierge@my4mlife.com`
   - **DynamoDB Touchpoints table** — `payment`, `consult-confirmation`, `email-out` rows for that contactId

If any step fails:
- Webhook didn't fire → check Stripe Dashboard → Developers → Webhooks → recent attempts (Stripe shows the failed payload + response)
- Order/Contact/Touchpoint missing → check the Lambda's CloudWatch logs
- Email didn't send → check the `ONBOARDING_BOOKING_URL` env var is set + Mailgun creds are valid

---

## Step 5 — Provision the production DynamoDB tables (if not already)

If `Contact`, `Touchpoints`, `Conversations`, `Orders` tables don't yet exist in DynamoDB (us-east-2):

```bash
bash infra/provision-contact-tables.sh --plan   # preview only
bash infra/provision-contact-tables.sh           # actually create
```

The script is idempotent — safe to run if some tables already exist (it'll skip those).

---

## Step 6 — Flip to Live mode

Only after Step 4 end-to-end test succeeds:

1. Stripe Dashboard → toggle top right from **Test** to **Live**
2. Recreate the same products + prices in Live mode (Stripe doesn't auto-copy)
3. Copy the **live** Price IDs (start with `price_1...` no `test_` prefix)
4. In `skus.ts`, swap the test price IDs for live price IDs
5. Recreate the webhook endpoint in Live mode → get a new `whsec_...` signing secret → update Lambda env var
6. Update `STRIPE_SECRET_KEY` in Lambda env to the live key (`sk_live_...`)
7. Run a single small live transaction with your own card to confirm end-to-end on real money
8. Refund yourself from the Stripe Dashboard immediately
9. **Done. You're live.**

---

## Common gotchas

- **Webhook signature failures:** the signing secret is per-endpoint *and* per-mode. Test mode and Live mode have different secrets.
- **Subscriptions vs. one-time:** consults are one-time, supplements are recurring. Don't accidentally create the consult as a recurring price — Stripe will charge $199/month forever.
- **Currency:** confirm USD on every price. International switches happen by accident sometimes.
- **Tax:** Stripe Tax is off by default. Toggle later if needed — out of scope for activation.
- **Customer Portal:** Stripe's Customer Portal (where members manage their own subscriptions) needs to be enabled separately: Settings → Customer portal → Activate. Worth doing right after activation so members can self-serve cancellations.

---

## What this unlocks

Once Stripe is live and a real payment goes through:

1. Cart → Stripe Checkout → payment → Order created → Contact promoted → booking-link email sent. Full conversion loop closed.
2. Assessment → no-purchase → 15-minute nurture email fires automatically (stage 1). Stages 2 + 3 still need EventBridge Scheduler integration (see `lambdas/nurture-worker/README.md`).
3. Inbound replies to `concierge@my4mlife.com` get handled by the AI concierge with the full system prompt + brand voice.
4. AI concierge has full product + pricing context for any member question.

---

## When you hit something this doc didn't cover

Open a chat with Claude in this repo. Tell it which step you're on and what error you saw. Paste the error message verbatim. Most Stripe issues are 90% solvable from the error text alone.
