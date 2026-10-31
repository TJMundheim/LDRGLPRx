# Plan: Push Patch partner program for IV bars, med spas and facial spas (2026-10-31)

## Context
TJ approved an affiliate channel. IV bars, med spas and cosmetic/facial spas promote the Push Patch to their existing clients and earn **$100 per paid, approved order**; each partner chooses at sign-up whether their clients get **$50 or $100 off** (TJ 2026-10-31). Margin check: we keep ~$102 (Glutathione, $100 off) to ~$260 (Metabolic) per order after cost, $35 shipping, Stripe fees and commission. Partners handle no product and need no provider relationship. Checkout, physician review and auto-ship run through our platform. Attribution uses one Stripe promotion code per partner, on a new $50 or $100 coupon (the same pattern as JUJITSU/KYLAM). Partners are approved by TJ before a code is issued. A declined order is refunded, so no commission is owed on it. Monthly payouts are made by hand to start (ACH + W-9 → 1099). Main only, no worktrees.

## Tasks

### [P1] TEST: partner code is auto-applied from ?ref=  [parallel]
model: sonnet
In lambdas/_shared/push-patch-checkout/src/session-params.test.ts:
- Input `promotionCodeId` set → params include `discounts: [{ promotion_code: id }]` and **omit** `allow_promotion_codes` (Stripe rejects both together).
- Input absent → unchanged from today (flag behavior intact).
- `client_reference_id`/metadata carries `partnerRef` when given.
✓ DONE WHEN: the new tests fail for the right reason, and the existing tests still pass

### [P1] IMPL: ref → promotion code → session  [sequential after TEST above]
model: sonnet
Implement in session-params.ts. In push-patch-intake (pre-intake), accept optional `ref`, uppercase it, look it up in Stripe (`promotionCodes.list({code, active:true})`), and pass its id. An unknown or inactive ref is ignored silently. In website/src/pages/go/push-patch.astro, read `?ref=` and keep it in sessionStorage; this tab only, try/catch, no cookies. Send it with the pre-intake request. Don't run the website build (the orchestrator builds).
✓ DONE WHEN: `pnpm --filter @my4mlife/push-patch-checkout test` and `pnpm --filter @ldrglprx/push-patch-intake test` exit 0

### [P1] Partner coupon + code + payout statement script  [parallel]
model: sonnet
Extend infra/scripts/push-patch-promo.mjs (dry run by default, `--apply` to write):
- `partner-coupon` creates or finds TWO coupons: $50 off (metadata.key `push-patch-partner-50`) and $100 off (`push-patch-partner-100`), both Push Patch products only, duration once.
- `partner <CODE> --name "<Business>" --email <e> --client-discount 50|100 [--commission 100]` creates a promotion code on the matching coupon, with metadata partner=true, business, email, commission, clientDiscount.
- `payouts [--since] [--until]` lists paid sessions per partner code. Exclude refunded charges. Columns: business, orders, gross, commission owed.

Never print secrets.
✓ DONE WHEN: `node infra/scripts/push-patch-promo.mjs partner-coupon --mode test` and `payouts --mode test` exit 0 (dry run)

### [P1] /partners page + application flow  [parallel]
model: sonnet
Create website/src/pages/partners.astro by mirroring CoachingPage.astro's form → email-sender (`formId` pattern, relay to drtj@, personalized confirmation, Contact capture via captureFormContact).
- **Form id:** `partner-application`.
- **Fields:** client discount preference ($50 or $100 off for their clients; they earn $100 either way), business name, type (IV bar, med spa, facial spa, salon, gym, other), city/state, contact name, email, phone, website, approximate monthly clients, whether they offer peptides/NAD now.
- **Page copy:** "Earn $100 per order. No inventory. No provider needed." Then how it works, FAQ, and the 988 line not needed.
- **Copy rules:** no "Genesis"; physicians never named; no tagline (Push Patch surface).
- **email-sender:** follow existing tests TDD-style, add a confirmation template, keep modules < 100 lines.
✓ DONE WHEN: `pnpm --filter <email-sender pkg> test` exits 0, and partners.astro exists

### [P1] Partner kit + DFW target list  [parallel]
model: opus
Write docs/launch/partners/:
- `partner-kit.md`: a one-pager, a 30-second staff script, an IV-bar angle ("keep the drip; the patch is for the days between"), a facial-spa angle (Glow/Radiance), FAQ, and payout terms.
- `counter-card.html`: a printable 4×6 card with a QR placeholder for `https://my4mlife.com/go/push-patch?ref={CODE}`, plus its PDF.
- `dfw-targets-2026-10-31.csv`: public business info only (name, type, city, website, public phone, peptides/NAD offered y/n, notes). Use IV bars, med spas and facial spas in Dallas–Fort Worth, Fort Worth/Benbrook first. Aim for at least 60.
✓ DONE WHEN: all three files exist and the CSV has ≥60 rows

### [REVIEW]  [sequential — runs last]
model: opus
- [ ] Tests green; flag-off checkout byte-identical when no ref; no secrets
- [ ] Copy rules held
- [ ] Deploy order:
  1. script `partner-coupon --apply` (live)
  2. push-patch-intake
  3. email-sender
  4. website
- [ ] Live check: a ?ref=TEST code shows −$50 at Stripe checkout (then deactivate TEST)
- [ ] Commit + HANDOFF + memory
✓ DONE WHEN: all items checked and pushed to origin/main
