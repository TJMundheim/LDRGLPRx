# Plan: Peptide Pull-Up Challenge (replaces the Push Patch Pull-Up Challenge on /pullup)

## Context
TJ 2026-11-15: no more contest. Everyone competes only with themselves. Post a day-one pull-up video → 50% off one peptide order (Push Patch included); post a January "after" video → a second 50% code. A free care coordinator call and a free telemedicine visit come with it, because most people don't know which peptide they need. The old page is already offline (SHOW_PULLUP=false redirects /pullup → /rx/peptides). Nobody had entered (PullUpChallengeEntries count 0 on 2026-11-15), so no migration.

Margins (TJ): fine at 50%, including Push Patch (e.g., Enhanced Glow costs $285 shipped and sells for $650).

## Decisions (TJ approved items 1–6 on 2026-11-15; item 7 amended)
1. **Reward:** each accepted video gets one unique, single-use code: 50% off one peptide order. Max two codes per person (one start, one after). Codes expire 90 days after issue. No cash value; one code per order.
2. **Wording:** "free telemedicine visit", never "approval visit". The provider decides whether a peptide fits; the code applies only to what is prescribed.
3. **Automatic codes:** the entry Lambda creates the Stripe promotion code and returns it. The page shows it on success and the entrant gets it by email from Dr. TJ. This email goes only to the person who entered (it is the product, not outreach). TJ still gets the entry notice, which includes the code.
4. **Windows (server-enforced, America/Chicago):** day-one videos accepted through Tue **Dec 15, 2026 11:59 PM CT**. After videos accepted **Fri Jan 1, 2027 00:00 CT – Thu Jan 7, 2027 11:59 PM CT**. Outside a window → 400 with a plain message.
5. Old entries: none, so no backfill.
6. Score formula, divisions, age/bodyweight, host-vs-challenger, weigh-ins, prizes, winners and taxes are all removed. The score calculator and `website/src/lib/pullup-score.ts` (+ test) are deleted.
7. **Rep standard (amended):** start from a dead hang, pull until your nose is above the bar, lower under control. Any help is fine (band, jump, a spotter, a box), and the help can change between videos: band-assisted on day one and one unassisted rep in January is exactly the kind of progress to show. Improvement can be more reps, less help, or both.

**Billing:** Push Patch is Stripe checkout, so the code works in the "Add promotion code" box. Other peptides are billed by the partner after the script is written, so the coordinator honors the code by hand. The code and its round are in TJ's entry notice and the entries table.

**Stripe:** new coupon `pullup-50` (percent_off 50, duration once, applies_to the Push Patch products, same product lookup as `push-patch-150`). It is created by a new `pullup-coupon` subcommand in infra/scripts/push-patch-promo.mjs, which writes the coupon id to SSM `/my4mlife/pullup/coupon-id`. The Lambda reads `PULLUP_COUPON_ID` (set by deploy.sh from SSM) and `STRIPE_MODE` (live). Code format `PULLUP-XXXXXX` (6 chars, alphabet without 0/O/1/I/L), retried on collision up to 3 times. Metadata `{source:'pullup-challenge', round}`; no PII in Stripe metadata.

**Form fields:** name, email, phone, Instagram post link, which video (day one / January), "I am 18 or older", rules accepted, optional SMS + email opt-ins, honeypot `hp` + timer `t`. No age number, bodyweight or division.

**Kept from the old page:** public Instagram post required (Meta promo rules, plus the Meta release line); the optional Collab invite step; the "your videos may be reposted" line.

## Tasks

### [P1] TEST: entry Lambda behavior  [parallel]
model: sonnet
Rewrite lambdas/pullup-challenge-entry/src/handler.test.ts and add reward.test.ts / email.test.ts (mocks: DynamoDB, Stripe, email-sender invoke, Contact upsert). Assert:
- Validation: new fields (no age/bodyweight/division); `adult` must be true; Instagram https link.
- Windows: use an injected `now`. Start round accepted at Dec 15 23:59 CT and rejected Dec 16 00:00 CT. Final round rejected Dec 31 23:59 CT and accepted Jan 1 00:00 CT through Jan 7 23:59 CT.
- Valid new entry: a Stripe promotionCodes.create with coupon PULLUP_COUPON_ID, max_redemptions 1, expires_at = now + 90 days, code matching /^PULLUP-[A-HJKMNP-Z2-9]{6}$/, and metadata without email or name. A retry follows on a duplicate-code error.
- Valid new entry, continued: response `{ok:true, code}`; the code is saved on the entry row; one entrant email to the entrant containing the code and the /consult?lane=peptides&src=pullup link; one TJ notice with the code.
- Duplicate → 409 with no new code.
- Stripe failure → 200 with `{ok:true}`, no code, and the TJ notice says "issue code by hand".
- Email failure doesn't fail the request.
- Logs contain no email, phone or name.

✓ DONE WHEN: tests exist and fail only on missing or old implementation.

### [P1] TEST: page static checks  [parallel]
model: sonnet
Rewrite website/tests/pullup-challenge.test.ts for the new page. Assert:
- h1 "Peptide Pull-Up Challenge"; no "Push Patch Pull-Up"; no "division", "multiplier" or "prize" in the copy.
- The rep-standard text allows assistance that can change between videos.
- "50% off", "free care coordinator call" and "free telemedicine visit" appear; "approval visit" does not.
- Deadlines Dec 15, 2026 and Jan 1–7, 2027 appear.
- Form has no age, bodyweight or division inputs, and has `adult` and `hp`.
- The Collab step is still present; no `pu-calc` section.
- `pullup-score.ts` is not imported.

✓ DONE WHEN: test fails only on the not-yet-rewritten page.

### [P2] IMPL: `pullup-coupon` subcommand  [sequential after the YEAREND deactivate change]
model: sonnet
In infra/scripts/push-patch-promo.mjs, add `pullup-coupon [--mode] [--apply]`. It creates or finds coupon metadata.key `pullup-50` (name "Pull-Up Challenge 50% off", percent_off 50, duration once, applies_to the Push Patch products) and, with --apply, writes its id to SSM `/my4mlife/pullup/coupon-id-<mode>`. Dry run by default; tests in the script's existing test pattern.
✓ DONE WHEN: script tests pass and the dry run in test mode prints "would create".

### [P2] IMPL: entry Lambda + deploy.sh  [sequential after P1 Lambda TEST]
model: sonnet
- Implement the new validate.ts (windows module included), reward.ts (Stripe via @ldrglprx/stripe-client or the existing shared client), email.ts (entrant email from Dr. TJ: code, how to use it for Push Patch vs other peptides, the free coordinator call link, the January reminder, the tagline) and the notify.ts update. handler.ts stays < 100 lines.
- deploy.sh: env PULLUP_COUPON_ID from SSM, STRIPE_MODE=live; IAM adds secretsmanager:GetSecretValue on all-stripe-keys and ssm:GetParameter is not needed at runtime.
- Do not deploy.

✓ DONE WHEN: `pnpm --filter @ldrglprx/pullup-challenge-entry test`, typecheck and build exit 0 (check the package name).

### [P2] IMPL: page rewrite  [sequential after P1 page TEST]
model: sonnet
- Rewrite website/src/pages/pullup.astro per the Decisions: hero, short version, how to enter (Instagram steps + optional Collab), rep standard, what you get, the two windows, fine print (code terms, prescription decided by the provider, no cash value, Meta release, reposting).
- The form posts the new fields; on success it shows the returned code with a copy button, plus "Check your email".
- Delete the calculator section, website/src/lib/pullup-score.ts and its test.
- Update the privacy.astro pull-up sentence if it mentions age or bodyweight.
- Leave SHOW_PULLUP=false, so the page builds but stays redirected; preview with a PUBLIC_SHOW_PULLUP=1 override, added to siteMode in the same style as the other flags.

✓ DONE WHEN: `pnpm --filter ldrglprx-website test` and `build` exit 0.

### [REVIEW]  [sequential — runs last]
model: opus
- [ ] Tests, typecheck and build green (website + Lambda + script)
- [ ] No dead code (calculator gone); handler < 100 lines
- [ ] No PII in logs, Stripe metadata or PostHog
- [ ] Code abuse surface checked (windows, duplicates, single-use, expiry, throttle still applied to the route)
- [ ] Copy matches the Decisions (wording rule 2, rule 7 amendment), gender-neutral, "Dr. TJ" only
- [ ] Commit message written (main only)

✓ DONE WHEN: checklist green and fixes applied.

## After review (orchestrator)
1. Browser-check the preview build (desktop + 375px).
2. Show TJ the page and the entrant email.
3. On TJ's OK, in order:
   1. `push-patch-promo.mjs pullup-coupon --mode live --apply`
   2. Lambda deploy.sh
   3. Smoke test with no send: 400 validation, honeypot 200
   4. Flip SHOW_PULLUP=true
   5. website/deploy.sh
4. TJ can do a real end-to-end run by entering himself.
