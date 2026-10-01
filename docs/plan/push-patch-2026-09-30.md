# Plan: Genesis Push Patch — direct-buy landing page + one-click checkout

## Context
TJ is launching a paid-traffic campaign for the Genesis Push Patch: 7 blends, 6 patches per set (one a week, six weeks), $650 with NAD+ and $550 without. A visitor lands on `/go/push-patch`, picks a blend and a wear time (12-hour or 14-hour), and pays through Stripe Checkout with no coordinator call and no telemedicine visit. This is the one exception to `COORDINATOR_MODE`. We ship from our own stock first and switch to Genesis drop-ship later, so the fulfillment email recipient is one config value.

**Decisions locked (TJ, 2026-09-30):** all 7 blends; BPC-157 may be named on this page (never tied to Biome NS Rx); the buyer picks 12h or 14h at the same price; URL `/go/push-patch`.
**Decisions made in this plan:** one Stripe Product + Price per blend, so the blend name shows on the receipt, created by an idempotent script in both live and test mode. The wear time is a validated checkout field stored in Stripe metadata, not 14 separate SKUs. The patch stays out of the front-door chat for now (the corpus already excludes `/go/*`). Only the chat's BPC-157 block is narrowed.
**Repo rule override:** there are no PRs. The project allows `main` only, so "PR opened" in REVIEW means "committed and pushed to `origin/main`".

## Blend catalog (single source of truth)
| skuId | Display name | Formula | Price |
|---|---|---|---|
| push-patch-nad-ghk | NAD+ Restore | NAD+ 1300 mg / GHK-Cu 5 mg | $650 |
| push-patch-bpc-nad-ghk | Repair | BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg | $650 |
| push-patch-kpv-nad-ghk | Calm Gut | KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg | $650 |
| push-patch-nad-motsc-ghk | Metabolic | NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg | $650 |
| push-patch-enhanced-glow | Enhanced Glow | NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg | $650 |
| push-patch-wolverine | Wolverine | NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg | $650 |
| push-patch-glutathione-ghk | Glutathione Radiance | Glutathione 500 mg / GHK-Cu 5 mg | $550 |

"Enhanced Glow" and "Wolverine" are Genesis's names. The other five display names are placeholders for TJ to approve in P1-E.

## Tasks

### [P1-A] Blend catalog data module  [parallel]
model: haiku
Create `website/src/data/pushPatch.ts` exporting `PUSH_PATCH_BLENDS` from the table above. Each blend has these fields: `skuId`, `name`, `formula` (string), `ingredients` (string[]), `priceUsd` (number), `hasNad` (boolean), `patches: 6`, `weeks: 6`. Also export `WEAR_OPTIONS = [{ id: '12h', label: '12-hour (active)' }, { id: '14h', label: '14-hour (sensitive skin)' }]`. Write no copy beyond names and formulas.
✓ DONE WHEN: `cd website && pnpm exec tsc --noEmit src/data/pushPatch.ts` exits 0 and the file exports exactly 7 blends.

### [P1-B] Stripe products/prices script  [parallel]
model: sonnet
Create `infra/scripts/stripe-push-patch-prices.mjs`. It reads keys from Secrets Manager `all-stripe-keys` (us-east-2, same shape the `@my4mlife/stripe-client` package uses). For each mode (`test`, `live`) and each of the 7 skuIds, it finds or creates a Product (metadata `skuId`) and a one-time USD Price with `lookup_key = skuId`. It is idempotent: it never creates duplicates and never archives anything. It writes `lambdas/create-checkout-session/src/push-patch-prices.json` as `{ test: { skuId: priceId }, live: { ... } }`. Flags: `--dry-run` (the default; prints the planned actions and writes nothing) and `--apply`. Blend names, formulas and prices come from a copy of the P1-A table embedded in the script.
✓ DONE WHEN: `node infra/scripts/stripe-push-patch-prices.mjs --dry-run` exits 0 and prints 14 planned product/price lines (7 blends × 2 modes).

### [P1-C] TEST: checkout accepts push-patch SKUs with a wear time  [parallel]
model: sonnet
In `lambdas/create-checkout-session/src/handler.test.ts`, add cases using the existing Stripe mock. Assert that:
- `{ skuId: 'push-patch-wolverine', wear: '12h' }` creates a session with `mode: 'payment'`, US shipping collection, the price from `push-patch-prices.json` for the resolved mode, and metadata containing `skuIds: 'push-patch-wolverine'` and `wear: '12h'`;
- the cancel URL is `https://www.my4mlife.com/go/push-patch`;
- a missing or invalid `wear` (for example `'24h'`) returns 400;
- `wear` is ignored for non-patch SKUs.
Use a fixture `push-patch-prices.json` with fake IDs.
✓ DONE WHEN: `cd lambdas/create-checkout-session && pnpm test` runs and the new cases fail (red) before P2-A.

### [P1-D] TEST: order-handler sends the push-patch fulfillment email  [parallel]
model: sonnet
In `lambdas/_shared/order-handler-core/src/process-event.test.ts`, add cases for a `checkout.session.completed` event with `metadata.skuIds = 'push-patch-kpv-nad-ghk'` and `metadata.wear = '14h'`. Assert that:
- one email goes to `process.env.PUSH_PATCH_FULFILLMENT_EMAIL`, falling back to `drtj@my4mlife.com` when unset;
- its body contains the blend name and formula, "14-hour", the ship-to address and the order id;
- a replayed event does not send a second email (Touchpoints marker);
- an email-send failure does not throw;
- no Biome NS Ultra email is sent for patch SKUs.
✓ DONE WHEN: `cd lambdas/_shared/order-handler-core && pnpm test` runs and the new cases fail (red) before P2-B.

### [P1-E] Landing-page copy + Artlist prompts  [parallel]
model: sonnet
Write `docs/launch/push-patch/lp-copy.md` for TJ's review. It covers the hero, the "How it works" section (iontophoresis, needle-free, 12 or 14 hours, one patch a week for six weeks), a one-sentence benefit per blend using "may help/may support" only, what's in the box, a short FAQ (6–8 items: shipping, wear, skin, what's included, refunds per /refund-policy, questions → /consult), and 3 Artlist image prompts in plain prose. Follow these rules: Dr. TJ is a Doctor of Chiropractic and never a physician; no "treat/cure"; never "men and women"; no age ranges; no emoji; include the tagline "Don't lose your identity and your dignity while you still have a choice."; never mention Biome NS Rx; BPC-157 is named only inside its own blend's formula. Source the claims only from the two Genesis PDFs, which are summarised in `~/.claude/projects/-Users-thomasmundheim-Development-LDRGLPRx/memory/project_push_patch.md`.
✓ DONE WHEN: `docs/launch/push-patch/lp-copy.md` exists and `grep -ciE "men and women|physician dr|cure|treats" docs/launch/push-patch/lp-copy.md` prints 0.

### [P1-F] TEST: chat guard allows standalone BPC-157  [parallel]
model: sonnet
In `lambdas/front-door-chat/src/handler.test.ts`, add guard cases:
- "BPC-157 is one of the peptides studied for tissue repair." is not blocked;
- "Biome NS Rx contains BPC-157." is blocked with `blockedBy: 'rx-formula'`;
- "The Gut-Brain Rx uses BPC-157 and glutamine." is blocked;
- glutamine or aloe named together with Biome NS Rx or the Gut-Brain Rx is still blocked.
Keep every existing guard test.
✓ DONE WHEN: `cd lambdas/front-door-chat && pnpm test` runs and only the new "not blocked" case fails (red) before P2-C.

### [P2-A] IMPL: push-patch SKUs in checkout  [sequential after P1-B, P1-C]
model: sonnet
Add `lambdas/create-checkout-session/src/push-patch.ts` (under 60 lines). It imports `push-patch-prices.json` and exports `isPushPatchSku(skuId)`, `pushPatchEntry(skuId, mode)` (returns `{ priceId, mode: 'payment', shipping: true, successUrl: 'https://www.my4mlife.com/thank-you', cancelUrl: 'https://www.my4mlife.com/go/push-patch' }`), and `parseWear(x): '12h' | '14h' | null`. In `handler.ts`, resolve patch SKUs through this module using `resolvedMode`: require a valid `wear` (400 otherwise) and add `wear` to metadata. Keep the handler change minimal and don't move existing code. Confirm the build bundles the JSON (esbuild handles JSON natively).
✓ DONE WHEN: `cd lambdas/create-checkout-session && pnpm test && pnpm build` exits 0.

### [P2-B] IMPL: push-patch fulfillment email  [sequential after P1-D]
model: sonnet
Add `lambdas/_shared/order-handler-core/src/push-patch-notify.ts` (under 80 lines). It exports `notifyPushPatchOrder(session, deps)`, which builds an HTML email (blend name and formula from an embedded copy of the catalog, wear label, ship-to via the existing `esc()` pattern, order id and amount) sent to `process.env.PUSH_PATCH_FULFILLMENT_EMAIL ?? 'drtj@my4mlife.com'`. In `process-event.ts`, call it inside `deliverOnce('PUSH_PATCH_NOTIFY#…')` when `skuId.startsWith('push-patch-')`, in the same try/catch style as the Biome notification (lines ~251–275). Add `PUSH_PATCH_FULFILLMENT_EMAIL=drtj@my4mlife.com` to the env block of `lambdas/order-handler/infra/deploy.sh` and of any other deploy script that bundles order-handler-core (check `stripe-events-retry`).
✓ DONE WHEN: `cd lambdas/_shared/order-handler-core && pnpm test` exits 0.

### [P2-C] IMPL: narrow the chat's BPC-157 block  [sequential after P1-F]
model: sonnet
In `lambdas/front-door-chat/src/guard.ts`, replace the two blanket `rx-formula` patterns. Block `bpc[\s-]?157|l-?glutamine|aloe vera` only when the same reply also matches `biome ns rx|gut-brain rx`. Keep the label `'rx-formula'`. Leave `rules.ts` unchanged: it already says never to name the Gut-Brain Rx ingredients.
✓ DONE WHEN: `cd lambdas/front-door-chat && pnpm test` exits 0.

### [P2-D] IMPL: `/go/push-patch` landing page  [sequential after P1-A, P1-E]
model: sonnet
Create `website/src/pages/go/push-patch.astro` from `go/gut-repair.astro` (BaseLayout `hideChrome`). It uses the P1-E copy and renders `PUSH_PATCH_BLENDS` as selectable cards: a radio group showing name, formula and price. It also has a wear radio (`WEAR_OPTIONS`, default `12h`) and one button, "Order — $650" (the label updates with the selection), which POSTs `{ skuId, wear }` to `${PUBLIC_LEAD_CAPTURE_API_URL}/api/checkout-session` and redirects to the returned `url`. Show a loading state and an inline error on failure. The page ignores `COORDINATOR_MODE`. Fire PostHog events `lp_patch_view`, `lp_patch_select` (props skuId, wear) and `lp_patch_checkout`. Use Artlist placeholder images from `/images/scenes/` until TJ supplies them. Show the tagline. No emoji. Layout must work at 375px.
✓ DONE WHEN: `cd website && pnpm build` exits 0 and `dist/go/push-patch/index.html` contains all 7 skuIds and the tagline.

### [P2-E] Run the Stripe script live  [sequential after P1-B] [no-delegate: writes to TJ's live Stripe account; the orchestrator runs it and shows TJ the dry-run first]
model: haiku
Run `--dry-run`, show TJ the 14 lines, then run `--apply` and commit the generated `push-patch-prices.json`.
✓ DONE WHEN: `push-patch-prices.json` has 7 `price_` IDs under both `test` and `live`.

### [P3-A] Deploy everything  [sequential after P2-*] [no-delegate: live deploys; must first confirm the Ultra-sweep session has finished its website deploy]
model: haiku
Deploy in this order with the deploy scripts only: `create-checkout-session`, `order-handler` (plus `stripe-events-retry` if it bundles the core), `front-door-chat`, `website`. Then smoke-test: `curl -X POST …/api/checkout-session -d '{"skuId":"push-patch-wolverine","wear":"12h"}'` returns a `checkout.stripe.com` URL (open it only to confirm it shows "Wolverine — $650"; don't pay), and `…"wear":"24h"` returns 400. Screenshot `/go/push-patch` at desktop and 375px. Re-run the chat golden set; it must still be 44/44.
✓ DONE WHEN: both curl checks match and the golden run prints `44/44 passed.`

### [P3-B] TJ end-to-end purchase  [sequential after P3-A] [no-delegate: a real card payment only TJ can make]
model: haiku
TJ buys one set on his own card (or the admin demo route in test mode with Stripe's test card), then confirms the fulfillment email arrived with the blend, wear time and address. Refund it in Stripe if it was live.
✓ DONE WHEN: TJ confirms the fulfillment email arrived with the correct blend, wear time and address.

### [P3-C] Handoff + memory  [sequential after P3-A]
model: haiku
Add a dated block to `docs/HANDOFF.md`: what's live, the fulfillment-email switch (`PUSH_PATCH_FULFILLMENT_EMAIL` in the order-handler deploy script → Genesis address when drop-ship starts), and open items (Artlist photos, TJ's copy review). Update `memory/project_push_patch.md` to "live". Commit and push.
✓ DONE WHEN: `git log origin/main -1` shows the handoff commit.

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] Type-check / build passes in `create-checkout-session`, `order-handler-core`, `front-door-chat`, `website`
- [ ] All tests green in the three lambdas; chat golden 44/44
- [ ] No unused imports or dead code; every new lambda module is under 100 lines
- [ ] No secrets or Stripe keys committed (the price IDs JSON is fine)
- [ ] Copy rules hold on `/go/push-patch`: no "physician" for Dr. TJ, no "cure"/"treat", no "men and women", no age range, tagline present, Biome NS Rx never mentioned
- [ ] Commit message written with summary + test plan (repo rule: no PR, push to `main`)
✓ DONE WHEN: all checklist items checked and the commit is pushed to `origin/main`.
