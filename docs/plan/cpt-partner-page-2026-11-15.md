# Plan: Heritage Personal Training: co-branded Push Patch page + no-discount $200 partner + 1099 agreement

> **Renamed to Heritage Personal Training 2026-11-16** (was "Colleyville Physical Therapy"/CPT; briefly "Revive Lounge", then corrected): code `HERITAGE`, page `/heritage`, owner Rachelle Limosnero; her title is TBD (TJ asking her). File name kept for history; the body below uses the new names.

## Context
TJ 2026-11-15: Heritage Personal Training (707 Glade Rd, Colleyville; owner Rachelle Limosnero) is the first official affiliate. The client base is high-end, so there is **no client discount**: clients pay full price. The clinic earns a flat **$200 per approved, paid order** (1099). All blends are featured.

Their clients use a co-branded page, **my4mlife.com/heritage**, with the same checkout, physician review and shipping. The existing discount-partner flow ($100/$100, $50/$150) stays exactly as it is for future affiliates; no-discount becomes a per-partner option next to it. Design: architecture review 2026-11-15, summarized here.

## Decisions
- **Partner code `HERITAGE`** (fallback `HERITAGELOUNGE` if taken).
  - Registry stays in Stripe promotion-code metadata: `{partner:'true', business:'Heritage Personal Training', email, commission:'200', clientDiscount:'0', link:'https://www.my4mlife.com/heritage'}`.
  - The code sits on the existing `push-patch-partner-50` coupon with `restrictions.minimum_amount = 99999999`, so it can never be redeemed as a discount. This matters because the live code box is on.
  - Verify in test mode first. Fallback: a dedicated coupon whose applies_to is a never-sold product.
- **Intake:** a partner with clientDiscount '0' returns `{partnerRef}` with no promotionCodeId. The checkout then sets metadata.partnerRef, applies no discounts and shows no code box.
- **Payouts, statements and Connect:**
  - A paid session counts for a partner if its discount is that partner's code (unchanged), OR the partner's clientDiscount is '0' and `metadata.partnerRef === code`.
  - The commission amount comes from metadata.commission.
  - Run payouts after reviews close (declines are refunded).
- **Page:** move the /go/push-patch body into `website/src/components/push-patch/PushPatchLanding.astro` with props `{canonical, partner?}`. `/go/push-patch` becomes a thin wrapper, and its built HTML must be unchanged. `website/src/pages/heritage.astro` renders it:
  - with `partner {ref:'HERITAGE', name:'Heritage Personal Training'}`
  - with a top band "Heritage Personal Training × My4MLife": their name, a note from Rachelle (draft, for her approval), and their location (707 Glade Rd)
  - logo slot: text wordmark until the logo arrives
  - writing `pp-ref` = HERITAGE (90 days) to both storages
  - with /consult links hidden on the partner page (they would lose attribution); the "Text Dr. TJ" SMS stays
  - no promo banner
  - `/heritage` stays unlinked and noindex until TJ approves; flag `HERITAGE_APPROVED` in siteMode.
- **Agreement (PA-2026-11):** entity renamed to **My4MLIFE LLC** in the shared template. New signers get the new version; past signatures keep their stored version and hash. New placeholders:
  - `{{CLIENT_OFFER}}`: "None. Your clients pay full price." when the discount is 0; the 50/100 wording is unchanged
  - `{{OFFER_NOTE}}`
  - `{{PARTNER_LINK}}`

  Independent contractor, W-9 and 1099-NEC terms already exist (§5, §7, §8).
- **Open for TJ** (defaults used until he answers):
  - Refills earn $200 while the agreement is active. That's the current agreement text, kept.
  - Attorney review of the agreement is still recommended before signing; docs/legal/partner-agreement-attorney-notes.md is updated with the no-discount variant.

## Tasks

### [P1] TEST: checkout + intake no-discount partner  [parallel]
model: sonnet
- `lambdas/_shared/push-patch-checkout/src/session-params.test.ts`: partnerRef with no promotionCodeId gives no `discounts`, no `allow_promotion_codes` even with STRIPE_PROMO_CODES on, and metadata.partnerRef set. Existing cases are unchanged.
- `lambdas/push-patch-intake/src/pre-intake.test.ts` (partner-ref block): a HERITAGE code with metadata clientDiscount '0' resolves to `{partnerRef:'HERITAGE'}` with no promotionCodeId.

✓ DONE WHEN: new tests fail only on the missing behavior.

### [P1] TEST: payouts for no-discount partners  [parallel]
model: sonnet
- `infra/scripts/push-patch-partner.test.mjs`: metadata-only HERITAGE sessions count at $200 each; a discount partner is NOT credited by metadata alone; refunded sessions are excluded; `partnerCodeParams()` validates (0 requires --commission; includes the minimum_amount restriction; 50/100 params are unchanged).
- `push-patch-partner-month.test.mjs`: monthRows and the transfer total for HERITAGE.

✓ DONE WHEN: new tests fail only on the missing behavior.

### [P1] TEST: agreement render  [parallel]
model: sonnet
`lambdas/partner-sign/src/agreement.test.ts` + `handler.test.ts`:
- 0-discount renders "full price", with no "$0" and the partner link.
- 50/100 wording is identical apart from the entity rename and the version PA-2026-11.
- "My4MLIFE LLC" appears and "My 4M Life" does not.

✓ DONE WHEN: new tests fail only on the missing behavior.

### [P1] TEST: /heritage page  [parallel]
model: sonnet
New `website/tests/heritage-landing.test.ts` (source checks):
- heritage.astro renders PushPatchLanding with partner ref HERITAGE.
- The component writes `pp-ref` for a partner.
- The band contains "Heritage Personal Training" and "Rachelle".
- /consult links are conditional on there being no partner.
- noindex while HERITAGE_APPROVED is false.
- `push-patch-no-yearend.test.ts` points at the component.

✓ DONE WHEN: the new tests fail only on the missing page/component.

### [P2] IMPL: checkout + intake  [after P1 checkout TEST]
model: sonnet
Implement in partner-ref.ts and session-params.ts.
✓ DONE WHEN: push-patch-checkout, push-patch-intake and order-handler-core tests pass.

### [P2] IMPL: payout scripts + `partner --client-discount 0 --commission N`  [after P1 payouts TEST]
model: sonnet
✓ DONE WHEN: `node --test infra/scripts/*.test.mjs` passes and the dry run `partner HERITAGE --name "Heritage Personal Training" --email x@example.com --client-discount 0 --commission 200 --mode test` prints the params.

### [P2] IMPL: agreement PA-2026-11 + partner-sign vars  [after P1 agreement TEST]
model: sonnet
✓ DONE WHEN: partner-sign tests, typecheck and build pass; the attorney notes are updated.

### [P2] IMPL: PushPatchLanding refactor + /heritage page  [after P1 page TEST]
model: sonnet
✓ DONE WHEN:
- website test + build pass
- `dist/go/push-patch/index.html` is identical to the pre-refactor build, apart from asset hashes
- `dist/heritage/index.html` exists, with noindex

### [REVIEW]  [last]
model: opus
- [ ] Green tests and builds
- [ ] Discount partners unchanged
- [ ] HERITAGE code cannot be redeemed
- [ ] Attribution survives the checkout path
- [ ] No PII in logs
- [ ] Copy rules: "Dr. TJ" only, tagline, no "coming soon"
- [ ] Commit message

✓ DONE WHEN: checklist green.

## After review (orchestrator)
1. Browser-check /heritage and /go/push-patch on desktop and mobile.
2. Show TJ the page and the agreement.
3. On his OK:
   1. Create HERITAGE in test mode and verify the code is unredeemable.
   2. Create HERITAGE in live mode.
   3. Deploy: push-patch-intake and create-checkout-session (bundles session-params), then partner-sign, then the website with HERITAGE_APPROVED.
   4. Send Rachelle the signing link through `partner-sign-link.mjs`, only on TJ's "send".
