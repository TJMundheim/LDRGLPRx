# Plan: Push Patch promotion codes ($150 off, per-group/affiliate tracking)

## Context
TJ (2026-10-22): promotion codes are allowed on Push Patch checkout. The first promo is **$150 off any Push Patch order**, and the end of October is the likely deadline for social marketing. There will be one code per group, affiliate or individual, so every order can be attributed. Stripe handles the discount: one Coupon ($150, Push Patch products only) and many Promotion Codes (the words TJ hands out), each with its own expiry or limits. **The checkbox-style code box stays OFF (flag) until TJ supplies the code names. Nothing is advertised on site pages.** Memory: project_promo_codes.

Facts:
- Push Patch sessions are built in `lambdas/_shared/push-patch-checkout/src/session-params.ts`, used by push-patch-intake pre-intake. The env flag pattern is already used there (`STRIPE_PROMO_CONSENT`).
- Paid sessions flow through `lambdas/_shared/order-handler-core` (process-event.ts → Orders insert + upsertContact; push-patch-order.ts → finalize + marker).
- Decline → refund uses @my4mlife/encounter-refund.
- The Stripe key is in Secrets Manager `all-stripe-keys` (`stripe-live-secret`, `stripe-test-secret`). Push Patch prices are `lambdas/_shared/push-patch-checkout/src/push-patch-prices.json` (lookup_key = skuId). Pattern script: `infra/scripts/stripe-push-patch-prices.mjs`.

## Tasks

### [P1] TEST+IMPL: code box on Push Patch checkout (flagged)  [parallel]
model: sonnet
In session-params, add `allow_promotion_codes: true` only when `process.env.STRIPE_PROMO_CODES === 'on'`, and leave everything else unchanged. Tests come first in session-params.test.ts: flag off → key absent; flag on → true; consent_collection is unaffected. In `lambdas/push-patch-intake/infra/deploy.sh`, add `"STRIPE_PROMO_CODES":"off"` to the env JSON.
✓ DONE WHEN: `pnpm --filter @my4mlife/push-patch-checkout test` and `pnpm --filter @ldrglprx/push-patch-intake test` exit 0

### [P1] TEST+IMPL: record the code on every paid order  [parallel]
model: sonnet
In order-handler-core, a paid checkout.session.completed with `session.discounts[0].promotion_code` resolves the code text: retrieve the promotion code via the Stripe client already used there, and on failure fall back to the id. Then it:
- stores `promoCode` and `discountUSD` (= `total_details.amount_discount`/100) on the Orders item;
- adds the Contact tag `promo:<CODE>` (uppercase) through the existing upsertContact call (tags);
- puts `promoCode` in push-patch-order's encounter/marker data if a natural field exists, and includes "Promo code: CODE (−$150)" in TJ's internal new-order email if one exists. Find it and report which email that is.

Without a discount, nothing changes. Verify, and report, that the decline refund uses the amount actually paid (the discounted total), not the list price. If it doesn't, fix it with a test. Tests first. Modules < 100 lines.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` exits 0 (plus encounter-refund tests if touched)

### [P1] Promo admin scripts  [parallel]
model: sonnet
`infra/scripts/push-patch-promo.mjs` mirrors stripe-push-patch-prices.mjs: `--mode live|test`, and a dry run by default with `--apply` to write.
- `coupon`: create or find the coupon with metadata.key `push-patch-150`, amount_off 15000 USD, duration once, name "Push Patch $150 off", applies_to = the Push Patch product ids looked up from prices by lookup_key from push-patch-prices.json. Idempotent.
- `code <WORD> [--expires YYYY-MM-DD] [--max N] [--first-order] [--note "who it's for"]`: creates a promotion code on that coupon. Expiry is 23:59:59 America/Chicago on that date; the note is stored in metadata.note. Uppercase it, refuse duplicates, and print the result.
- `list`: prints every code on the coupon with active, expires, max, times_redeemed and note.
- `report [--since YYYY-MM-DD]`: lists paid checkout sessions that used each code, with order count, gross and discount totals per code (for affiliate payouts). Prints a table; no CSV is committed.

Never print secrets.
✓ DONE WHEN: `node infra/scripts/push-patch-promo.mjs coupon --mode test` (dry run) exits 0 and prints the planned coupon, and `node infra/scripts/push-patch-promo.mjs list --mode test` exits 0

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] Touched packages' tests green; modules < 100 lines; no dead imports; no secrets
- [ ] With flag off and no discount, checkout and the order path are byte-for-byte unchanged
- [ ] The refund equals the amount paid; promoCode is captured with a Stripe retrieve failure tolerated
- [ ] The scripts default to dry run; the coupon is restricted to Push Patch products
- [ ] Commit message + HANDOFF deploy order: script `coupon --apply` (live) → order-handler + stripe-events-retry → push-patch-intake with STRIPE_PROMO_CODES=on once TJ's codes exist (`code … --apply`)
✓ DONE WHEN: all checklist items checked and the commit is pushed to origin/main
