# Plan: Partner tracking, agreement e-sign, and tax-compliant payouts (2026-10-31)

## Context
The Push Patch partner program is live (docs/plan/push-patch-partner-program-2026-10-31.md). TJ wants three things:
1. Referrals tracked accurately.
2. A simple partner agreement each partner signs electronically, so they trust they'll be paid.
3. Tax paperwork so we can pay them legally.

Partners sign a **W-9**; we issue the **1099-NEC**. The federal reporting threshold is $2,000/yr for payments made in 2026 and later (it was $600). Verify before year-end.

Recommended path: **Stripe Connect (Express)**. The partner completes the W-9 and bank details on Stripe's hosted onboarding. We pay commissions as Stripe transfers, and Stripe e-files and delivers the 1099s. We never store a tax ID. **TJ must enable Connect in the Stripe dashboard** before the live Connect steps run; everything else ships now.

Signing reuses the owned e-sign pattern of lambdas/consent-sign: a Function URL renders a versioned document, takes a typed-name signature, and writes an audit record.

## Tasks

### [P1] Partner agreement v1 (plain English, 2 pages)  [parallel]
model: opus
Write docs/legal/My_4M_Life_Partner_Agreement.md. Version `PA-2026-10`. Cover:
- the parties and the program;
- commission: per the partner's chosen offer, per approved, paid, unrefunded order, with a 30-day clawback for refunds and chargebacks;
- payment: monthly, by the 15th, for the prior month, via Stripe;
- tracking: link and code; Stripe records are authoritative; a monthly statement; a 60-day dispute window;
- conduct: approved materials only; no medical claims or advice; no handling of client health information; no spam; comply with law; no inducements;
- independent contractor status;
- taxes: W-9 via Stripe; 1099-NEC;
- term and termination: 30 days' notice; earned commissions are paid;
- confidentiality, non-exclusivity, limitation of liability, Texas law;
- e-signature consent.
Add a short "Notes for attorney review" file (separate, not shown to partners). Match the tone of the other docs in docs/legal.
✓ DONE WHEN: both files exist, and the agreement states its version and every section above

### [P1] e-sign: partner-sign Function URL  [parallel]
model: sonnet
Mirror lambdas/consent-sign. Create lambdas/partner-sign:
- GET `?t=<HMAC token for code+email>` renders the agreement, bundled from docs/legal/My_4M_Life_Partner_Agreement.md at build. Add a placeholder if absent; don't author it.
- The form takes legal name, title, business, typed signature and an "I agree to sign electronically" checkbox.
- POST writes to a new DynamoDB table `PartnerAgreements`: pk = code. Store version, doc SHA-256, name, title, business, email, signedAt, IP, user-agent.
- It emails the signed copy (HTML) to the partner and to drtj@ via email-sender.
- The page then shows "Next: set up payouts" (the Connect link if present, else "we'll email your payout setup link").
- Also a script `partner-sign-link <CODE>` that prints the link.
Write tests first. Modules < 100 lines. Add a deploy script, following consent-sign.
✓ DONE WHEN: the package tests exit 0 and the deploy script exists

### [P1] Tracking hardening + statements + Connect script  [parallel]
model: sonnet
1. **Attribution window.** In push-patch.astro, persist `?ref=` in localStorage for 90 days, last-touch, with try/catch, and fall back to sessionStorage. The client-facing code also works without the link.
2. **Customer-level attribution.** In order-handler-core, when the paid session's promotion code has metadata.partner=true, set Contact `partnerCode` (first partner wins, so future refills attribute) and Orders `partnerCode` and `partnerCommissionUSD`. Write tests first.
3. **Script extensions** (dry run by default):
   - `statements --month YYYY-MM`: one email per partner listing orders (date, blend, order id suffix, commission) and the total. It previews by default; `--send` sends via email-sender from drtj.
   - `connect-onboard <CODE>`: creates an Express account, stores the account id in the promo-code metadata, and prints the onboarding link.
   - `payouts --pay --month`: Stripe transfer per partner with an idempotency key `<code>-<month>`.
   Refuse all Connect calls with a clear message if Connect isn't enabled.
✓ DONE WHEN: order-handler-core and script tests exit 0, and the dry runs exit 0

### [REVIEW]  [sequential — runs last]
model: opus
- [ ] The agreement matches the program terms ($100/$100 or $50/$150; refunds earn nothing)
- [ ] No tax IDs are stored by us anywhere
- [ ] e-sign record is complete
- [ ] Tests green; modules < 100 lines
- [ ] Deploy order: partner-sign → order-handler (+ stripe-events-retry) → website
- [ ] HANDOFF + memory updated; commit to main
✓ DONE WHEN: all items checked and pushed
