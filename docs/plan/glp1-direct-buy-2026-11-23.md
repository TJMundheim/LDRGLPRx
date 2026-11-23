# Plan: GLP-1 direct-buy, a copy of the Push Patch flow

## Context
TJ (2026-11-23): sell GLP-1 directly from its own page /go/glp-1, copying the live Push Patch flow: safety pre-screen → short health form + typed signature → Stripe Checkout → physician Approve/Decline. Three products, all $375 for one month at any dose: GLP-1 (Sema, semaglutide), GLP-2 (Tirzep, tirzepatide), GLP-3 (Reta, retatrutide), with an auto-ship option every 4 weeks (28 days). No pharmacy yet: on approval nothing is sent to a pharmacy; TJ gets an "[ACTION NEEDED] Place pharmacy order" email with the dose the physician picked. No partner or promo codes on GLP-1. Decline = admin refund, same as Push Patch.

Approach (architect review): extend the shared Push Patch code with a lane registry (`push-patch` default, `glp1` new) instead of cloning lambdas. Push Patch behaviour must not change: every existing test passes unmodified. GLP-1 stays dark until its Stripe price IDs exist. Refills/auto-ship reuse the existing manual-fulfillment lane (`RX_PRODUCTS`, `fulfillment:'manual'`, built for Gut-Brain Rx).

### Contracts (fixed here so phases can run in parallel)
- SKUs: `glp1-sema`, `glp1-tirzep`, `glp1-reta`. Display: "GLP-1 · Sema (semaglutide)", "GLP-2 · Tirzep (tirzepatide)", "GLP-3 · Reta (retatrutide)".
- Lane id `glp1`; encounter id prefix `g1-`; consent key `consent-telehealth-glp1-v1`; record field `screeningAnswers.glp1`; screening version `glp1-screen-v1`.
- Pre-pay endpoint: existing `POST /api/push-patch-pre-intake` with body field `lane: 'glp1'` (absent = `push-patch`). GLP-1 body: `{ lane, skuId, autoShip: boolean, screening: { version, answers }, health: Glp1Health, signature: { typedName }, contact: { firstName, lastName, email, phone }, t? }` → `{ url }` (Stripe Checkout).
- `Glp1Health`: `dob`, `sex` ('female'|'male'), `heightFt`, `heightIn`, `weightLb`, `goalWeightLb?`, `conditions: string[]`, `safetyHistory: string[]`, `priorGlp1: 'never'|'current'|'past'`, `priorGlp1Drug?`, `priorGlp1Dose?`, `interactingMeds: string[]`, `otherMeds` ('none' or text), `allergies` ('none' or text).
- Knockouts (block before paying, same mechanism as Push Patch): pancreatitis ever; personal or family medullary thyroid cancer or MEN2; pregnant, breastfeeding or trying; type 1 diabetes; under 18; gastroparesis; active eating disorder.
- Dose lists for the physician picker (weekly): Sema 0.25 / 0.5 / 1 / 1.7 / 2.4 mg; Tirzep 2.5 / 5 / 7.5 / 10 / 12.5 / 15 mg; Reta 2 / 4 / 8 / 12 mg; plus "Other (type it)".
- Customer copy: approvals by "our network's licensed physicians" (never a name); brand "My4MLife"; no discounts shown.

## Tasks

### [P1] TEST+IMPL: lane registry in the shared checkout package  [parallel]
model: sonnet
In `lambdas/_shared/push-patch-checkout`: add a lane registry (`push-patch` default, `glp1`) holding SKUs, product names, price-file loader (`glp1-prices.json`, same shape as the Push Patch prices file; missing file or price → GLP-1 entry null → caller returns 503), success/cancel URLs (`/go/glp-1/thank-you`, `/go/glp-1`), and screening version + knockout ids for `glp1`. Make the session builder lane-aware: no `wear` for glp1, `lane` in metadata, `autoShip` honoured via the 28-day recurring price, and partner/promo lookup skipped for glp1 (`allow_promotion_codes` off). Make the $2 test price accept GLP-1 SKUs. Write the new tests first in the existing test files.
✓ DONE WHEN: the package's test command exits 0 with existing Push Patch tests unmodified and new glp1 tests present

### [P1] TEST+IMPL: GLP-1 Stripe prices in the price scripts  [parallel]
model: sonnet
In `infra/scripts/rx-refill-prices-lib.mjs` (and its test) add the three GLP-1 products: a one-time $375 price and a recurring $375 price every 28 days (interval day × 28), lookup keys from the SKU ids, and write `glp1-prices.json` where the checkout package reads it. Tests first. Run only `--dry-run` against Stripe TEST mode; do not run `--apply` on live (that happens at deploy, on TJ's OK).
✓ DONE WHEN: the scripts' test command exits 0 and a test-mode dry run lists exactly 3 products and 6 prices

### [P1] TEST+IMPL: decision core handles GLP-1 with a dose and no pharmacy send  [parallel]
model: sonnet
In `lambdas/_shared/push-patch-decision-core`: add GLP-1 entries to `RX_PRODUCTS` (`intervalDays: 28`, `fulfillment: 'manual'`). Change `decide()` to an allow-list of lanes with a new `fulfill.ts`: `push-patch` unchanged (Genesis PDF); `glp1` → refill auth (8 refills, 28 days), welcome email (GLP-1 copy, no shipping promise beyond "we'll email when it ships"), an "[ACTION NEEDED] Place pharmacy order" email to TJ (patient name, product, dose, shipping address, auto-ship yes/no), and stamp `genesisOrderSentAt` so refunds block after ordering. `decide()` accepts an optional `dose` (required for glp1 approve). GLP-1 decline email copy. Tests first.
✓ DONE WHEN: the package's test command exits 0 with Push Patch decide tests unmodified and glp1 approve/decline tests present

### [P2] TEST+IMPL: intake lambda accepts the GLP-1 pre-pay form  [sequential after P1]
model: sonnet
In `lambdas/push-patch-intake`: route `lane: 'glp1'` in pre-intake to a new `validate-glp1.ts` (the `Glp1Health` contract, knockouts via the shared screening, typed-signature rule same as Push Patch) and the lane-aware session builder. On finalize/submit for glp1: encounter `g1-<sessionId>`, `lane: 'glp1'`, `screeningAnswers.glp1`, consent `consent-telehealth-glp1-v1`, provider email subject "GLP-1 review: <name> · <product>" with BMI, all answers and the denied knockouts. Make `paidSession` lane-aware. Keep `handler.ts` under 100 lines. Tests first in the existing test files.
✓ DONE WHEN: the lambda's test command exits 0 with existing tests unmodified

### [P2] TEST+IMPL: webhook routes GLP-1 orders  [sequential after P1]
model: sonnet
In `lambdas/_shared/order-handler-core`: route `glp1-` SKUs in the Push Patch block to the same intake finalize call, with product-aware receipt / finish-form email copy, and make sure GLP-1 refill payments go through the existing manual-refill path (`rx-rf-` encounters, state `pharmacy-order-pending`). Tests first in `process-event.test.ts` / `push-patch-order.test.ts`.
✓ DONE WHEN: the package's test command exits 0 with existing tests unmodified

### [P2] TEST+IMPL: physician dose picker on Approve  [sequential after P1]
model: sonnet
In `lambdas/push-patch-decision` (email-link pages) and `lambdas/push-patch-decide-admin`: for `glp1` encounters, the Approve page shows a dose dropdown (lists from the contracts, plus "Other (type it)") and passes `dose` to `decide()`; Approve without a dose is refused with a clear message. Push Patch pages unchanged. Tests first (`handler.picker.test.ts`, decide-admin `handler.test.ts`).
✓ DONE WHEN: both lambdas' test commands exit 0 with existing tests unmodified

### [P2] TEST+IMPL: refunds and reminders accept GLP-1  [sequential after P1]
model: sonnet
Allow lane `glp1` in `encounter-refund` and make `push-patch-reminder/src/refund-store.ts` scan `encounter#g1-` too; product-aware wording in `push-patch-reminder/src/email.ts` (refill reminders say "every 4 weeks" for GLP-1). Tests first in `refund.test.ts` and the reminder `handler.test.ts`.
✓ DONE WHEN: both lambdas' test commands exit 0 with existing tests unmodified

### [P2] TEST+IMPL: /go/glp-1 page, pre-screen, health form, thank-you  [sequential after P1]
model: sonnet
In `website/`: `src/data/glp1.ts` (3 products, $375, "1 month, any dose", auto-ship every 4 weeks toggle), fill `SCREENING.glp1` in `src/data/screening.ts` (ids identical to the lambda's), a GLP-1 landing component modelled on `components/push-patch/PushPatchLanding.astro` (one buy button per product → safety modal → GLP-1 health form, 11 items, checkboxes/selects first → typed signature → POST the contract → redirect to Stripe), `/go/glp-1` and `/go/glp-1/thank-you` pages, noindex until launch, no `?ref` handling. Tests first in `src/data/screening.test.ts`. Do not change the homepage link yet.
✓ DONE WHEN: `pnpm -C website test` and `pnpm -C website build` exit 0

### [REVIEW] Code review  [sequential — runs last]
model: opus
- [ ] Tests green in every touched package; `pnpm -C website build` exits 0
- [ ] Push Patch behaviour unchanged (existing tests unmodified; diff of Push Patch copy empty)
- [ ] Lambda handlers under 100 lines; no dead imports
- [ ] No secrets, live keys or patient data committed
- [ ] Deploy list written (shared packages → which lambdas redeploy, in order; Stripe `--apply` live; homepage button → /go/glp-1)
✓ DONE WHEN: all checklist items checked and the summary is written into docs/HANDOFF.md (main-branch repo: no PR; commit to main)

## After review (orchestrator, on TJ's OK)
1. Browser walk-through of /go/glp-1 locally (no real charge).
2. Deploy via each lambda's `infra/deploy.sh`, Stripe `--apply` live, website deploy, point the homepage GLP-1 button at /go/glp-1.
3. One $2 test order end to end (test-token script), approve with a dose, confirm TJ's order email, admin refund.
