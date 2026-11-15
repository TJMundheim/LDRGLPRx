# Plan: Push Patch refills + auto-ship (Phase 1, for Paul Mundheim's live test)

## Context
TJ 2026-11-15, top priority: approved Push Patch patients reorder without redoing screening or the health form. Auto-ship every 6 weeks is the default; one box is the alternative. First live test: Paul Mundheim (first order 2026-10-16, Enhanced Glow $650, legacy flow), full live charge, ship now.

Design: architecture review 2026-11-15, summarized here. Key fact: no Push Patch checkout ever saved a customer or card, so Paul enters his card once on the reorder link.

## Decisions (TJ 2026-11-15)
- **Refill authorization: 1 year.** Default 8 refills after the first box, `expiresAt` = grant + 12 months. The physician may set a different number.
- **Auto-ship is the default** on the reorder page. "Just one box" is the alternative.
- **Same price** as one-time (Enhanced Glow $650 every 6 weeks). No auto-ship discount, per the no-advertised-discounts rule.
- **Paul:** charge and ship now; next charge 6 weeks later.
- **Change check (Phase 1):** the reorder page asks "Any changes to your health or medications since your last order?" (required).
  - "No" goes to checkout.
  - "Yes" sends no checkout; the patient sees "a care coordinator will contact you", and TJ gets an email to route it to the provider.
  - The pre-renewal reminder email is Phase 2.
- **Partner attribution carries to refills:** `refillAuth.partnerRef` comes from the original session `metadata.partnerRef`, or the partner promotion code. Refills get no client discount. Payout counting of invoices is Phase 2; no partner client is on auto-ship yet.
- **Payments:** Stripe Billing subscriptions, with recurring prices per SKU (`interval: week`, `interval_count: 6`, lookup_key `<sku>-6w`). The subscription ends via `cancel_at_period_end` when the next renewal would fall on/after `refillAuth.expiresAt`, when the last slot is used, or when a paid invoice cannot ship (review 2026-11-15: a future `cancel_at` makes Stripe prorate the period containing it, so the last box would be charged a partial amount).
- **Fulfillment:** within authorization there is no new physician review. Each paid invoice:
  1. claims a slot (conditional update)
  2. creates a child encounter `encounter#pp-rf-<invoiceId>` (state script-written, `refillOf`, `refillNumber`)
  3. sends the Genesis order form with the parent's ship-to
  4. emails the patient ("your next box is on its way", with the manage/cancel route = reply to support for Phase 1)
  5. sends TJ a one-line notice

  With no slot left, the child encounter goes to sent-to-provider and nothing ships.
- **Granting refills (Phase 1):** an admin CLI, not the clientportal UI:
  - `infra/scripts/push-patch-refill.mjs grant --contact <id> --encounter <encId> --refills 8 --authorized-by "<name>" [--mode live] [--apply]`. It is allowed only on push-patch script-written encounters with no refund.
  - `... link --contact --encounter` prints a signed reorder URL (14-day expiry). Nothing is emailed automatically.

## Shared contract (all tasks code to this)
`lambdas/_shared/push-patch-decision-core/src/refill-auth.ts`
```ts
export interface RefillAuth { refillsAuthorized: number; refillsUsed: number; sku: string; intervalWeeks: 6;
  expiresAt: string; authorizedBy: string; signedByProviderId?: string; authorizedAt: string; partnerRef?: string;
  mode: 'auto' | 'on-demand'; subscriptionId?: string; status: 'active' | 'paused' | 'exhausted' | 'cancelled' }
export function buildRefillAuth(i: { refills: number; sku: string; authorizedBy: string; signedByProviderId?: string;
  partnerRef?: string; now: Date }): RefillAuth                       // pure; expiresAt = now + 12 months
export async function grantRefills(contactId: string, encounterId: string, auth: RefillAuth): Promise<void>
export async function getRefillAuth(contactId: string, encounterId: string): Promise<{ auth: RefillAuth; encounter: any } | null>
export async function claimRefillSlot(contactId: string, encounterId: string, now: Date):
  Promise<{ ok: true; refillNumber: number; auth: RefillAuth } | { ok: false; reason: 'exhausted' | 'expired' | 'inactive' }>
export async function setRefillAuthFields(contactId: string, encounterId: string, f: Partial<RefillAuth>): Promise<void>
```
Signed link (`lambdas/push-patch-refill/src/sig.ts`, pattern `lambdas/push-patch-ship-admin/src/sig.ts`):
- HMAC over `contactId|encounterId|exp`
- key in SSM `/my4mlife/push-patch/refill-hmac-key` (SecureString, created by deploy.sh if missing)
- shared with `infra/scripts/push-patch-refill.mjs`, which reads the same key

Checkout and subscription metadata:
`{ kind:'push-patch-refill', contactId, encounterId, skuIds, partnerRef?, changeAnswer:'no', mode:'auto'|'one' }`

## Tasks

### [P1] TEST+IMPL: refill-auth core + Genesis/email reuse  [parallel]
model: sonnet
- Build `refill-auth.ts` per the contract, TDD (DynamoDB mocked).
- Confirm the existing `sendGenesisOrder`/`stampGenesisSent` and patient-email helpers can take a refill (invoice id, parent shipTo). Add a `sendRefillShipped` email and a `refillNotice` (TJ) email in emails.ts.
- `decide()` must not break; add a `refillOf` guard only if needed.

✓ DONE WHEN: push-patch-decision-core tests pass.

### [P1] TEST+IMPL: recurring prices script  [parallel]
model: sonnet
- `infra/scripts/stripe-push-patch-prices.mjs`: add recurring 6-week prices per SKU (lookup `<sku>-6w`), dry run by default.
- Write ids to a `refill` key in push-patch-prices.json (`refill: {test:{}, live:{}}`); pushPatchEntry stays unaffected.
- Add a helper `refillPriceId(sku, mode)` in `lambdas/_shared/push-patch-checkout`.

✓ DONE WHEN: script tests and push-patch-checkout tests pass, and a test-mode dry run prints the prices.

### [P2] TEST+IMPL: push-patch-refill lambda + grant/link CLI  [after P1 core]
model: sonnet
- New `lambdas/push-patch-refill` (pattern: push-patch-ship-admin for sig + pages, push-patch-intake for deploy).
- GET `?c&e&exp&sig`: verify, load auth, then render the page: blend, price, a required radio "Auto-ship every 6 weeks (recommended)" / "Just one box", and the required change question.
- POST:
  - "No": Checkout `mode:'subscription'` (auto, with `subscription_data.metadata`) or `mode:'payment'` with `customer_creation:'always'` (one box), price from the refill catalog, `customer_email` from Contact, then 303.
  - "Yes": confirmation page + TJ email; no checkout.
- deploy.sh, API route, throttle line; handler < 100 lines.
- CLI `infra/scripts/push-patch-refill.mjs` with grant/link (dry run by default; grant uses grantRefills logic; derive partnerRef from the original session).

✓ DONE WHEN: tests, typecheck and build pass.

### [P2] TEST+IMPL: invoice routing + refill fulfillment  [after P1 core]
model: sonnet
- `order-handler-core`: route `invoice.paid` / `invoice.payment_failed` to a new `push-patch-refill.ts` (guard: kind refill, `amount_paid > 0`).
- On `invoice.paid`:
  - write the Orders row (orderId = invoice id, partnerCode), add to LTV
  - claim a slot, create the child encounter, `sendGenesisOrder` with the parent shipTo, `stampGenesisSent`, patient + TJ emails
  - first invoice: store `subscriptionId`; any invoice whose period ends on/after `expiresAt`: `cancel_at_period_end` (not `cancel_at`, see Decisions)
- One-box refill (`checkout.session.completed` with kind refill, mode payment): the same fulfill path.
- Subscription-mode `checkout.session.completed` with kind refill: upsert Contact (stripeCustomerId); skip the Orders row and fulfillment, since the invoice does that.
- `payment_failed`: email the patient the `hosted_invoice_url`, plus a TJ notice.
- Update `stripe-events-retry` resolveCore and `infra/deploy-stripe-rules.sh` (+ event destination list).
- Idempotent on replay.

✓ DONE WHEN: order-handler-core, order-handler and stripe-events-retry tests pass.

### [REVIEW]  [last]
model: opus
- [ ] Green tests and builds
- [ ] Idempotency, so no double ship on webhook retry
- [ ] No PHI in URLs or logs
- [ ] Signed-link two-step (GET does no action)
- [ ] One-time flow unchanged
- [ ] Deploy order written
- [ ] Commit message

✓ DONE WHEN: checklist green.

## After review (orchestrator)
1. Test-mode end-to-end with a Stripe test clock: grant → link → subscription → invoice → refill fulfilled; advance 6 weeks → refill 2; exhaust → no ship.
2. Live deploy in this order:
   1. prices `--mode live --apply`
   2. order-handler + stripe-events-retry
   3. Stripe rules / event destination
   4. push-patch-refill
   5. api-throttling
3. TJ grants Paul's refills: 8, authorized by TJ / signing provider.
4. Send Paul the link, only on TJ's "send".
5. Paul pays → verify the Orders row, the child encounter, the Genesis email (cc TJ), Paul's email and `cancel_at`.

## Phase 2 (later)
- Provider-page refill select and clientportal Grant / Send-link buttons
- Pre-renewal change-check email with pause
- "Manage auto-ship" signed link (Stripe portal + pause/skip)
- Payout counting of refill invoices for partners
- "Already a patient? Reorder" entry on the Push Patch page
