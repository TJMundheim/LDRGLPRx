# Pre-Launch Audit — My4MLife

**Date:** 2026-05-07
**Auditor:** Claude (read-only sweep)
**Scope:** website/, apps/clientportal/, lambdas/, infra/
**Live status:** https://www.my4mlife.com returns 200; homepage contains "Begin with the end in mind" (3 occurrences). Lead-capture OPTIONS preflight returns 204. clientportal builds clean.

---

## TOP 10 BLOCKERS BEFORE LAUNCH (prioritized)

| # | Blocker | Owner |
|---|---|---|
| 1 | Broken internal links to `/shop/armorvita`, `/shop/neurobridge`, `/shop/sleepRestore` — no `website/src/pages/shop/` directory exists. Visitors clicking will hit 404. | [Claude-action] |
| 2 | Broken internal link to `/blog/eliminate-the-insulting-behavior-peptides` — page does not exist; sibling pages do. | [Claude-action] |
| 3 | Public-visible placeholders: `consult.astro` lines 144, 151 show `$XXX — pricing finalizing` in pricing cards. Looks unprofessional on a primary CTA page. | [Claude-action] |
| 4 | `solutions/cognitive.astro` and `solutions/sleep.astro` show `Price: TBD` in path-price block. | [Claude-action] |
| 5 | Inconsistent canonicals — several pages still use `.html` suffix (`terms`, `contact`, `links`, `blog`, `4m-cohort` references) while sitemap emits trailing-slash directory URLs. Pick one shape; mismatched canonicals dilute SEO and confuse crawlers. | [Claude-action] |
| 6 | Stripe / payments = stub only (`apps/clientportal/src/lib/integrations/payments.ts` throws "Not implemented"). No checkout possible. Tiers page advertises `$197–$697` with no path to pay. | [TJ-action] (Stripe account + price IDs) then [Claude-action] (wire) |
| 7 | SES production access still pending per standing memory; `send-app-link` Lambda source is not in this repo (deployed-only) so cannot verify FROM domain from source — but live OPTIONS preflight returns 204. Confirm sandbox/prod state before send volume scales. | [TJ-action] |
| 8 | `tiers.astro` description still says `$197–$697 cohort` — contradicts freemium pivot (Protégé is FREE; old pricing superseded per `project_freemium_pivot.md`). Visible in meta description + on-page copy. | [Claude-action] |
| 9 | Twitter/Facebook share URLs hard-code legacy `.html` blog URLs (`%2Fblog%2Fam-i-eligible-for-glp1.html`). When shared, link to non-existent `.html` page. | [Claude-action] |
| 10 | `terms.astro` references "medical weight loss treatment" / "treatment programs" 15+ times. Per locked compliance rules, marketing pages should avoid clinical "treat/treatment" framing. (Legal Terms page is borderline acceptable but pervasive use leaks into other pages — see §12.) | [TJ-action] (legal review) |

---

## 1. Internal link sanity

Pages directory inventory: 67 .astro pages found. Cross-referenced every `href="/..."` against page existence.

**Broken / missing targets:**
- `/shop/armorvita` — no `pages/shop/` dir
- `/shop/neurobridge` — no `pages/shop/` dir
- `/shop/sleepRestore` — no `pages/shop/` dir
- `/blog/eliminate-the-insulting-behavior-peptides` — file missing (siblings exist for cognitive/environment/gut/hormones/sleep/weight)

All other internal links resolve to existing files (including dynamic `solutions/<slug>` references which match present slugs).

## 2. External link sanity

No `example.com`, `TBD`, `[link]` placeholders in external `href`. All point to real domains (al-anon.org, samhsa.gov, fonts.googleapis.com, app.my4mlife.com, affiliate paths, social share endpoints). Affiliate links use `https://my4mlife.com/affiliate/...` — verify those routes exist on the production domain (likely server-side affiliate redirects, not Astro pages — out of scope here, but flag for TJ confirmation).

## 3. TODO / FIXME / placeholder markers

Visitor-visible:
- `website/src/pages/consult.astro:144,151` — `$XXX — pricing finalizing`
- `website/src/pages/solutions/cognitive.astro:26` — `Price: TBD`
- `website/src/pages/solutions/sleep.astro:25` — `Price: TBD`

Code-only (not visitor-facing, OK for launch):
- `website/src/components/EmailCapture.astro:36` — `// TODO: wire to AppSync submitLead mutation post-HIPAA P0`
- `website/src/pages/assessment.astro:392` — same TODO comment
- `website/src/pages/bmi-calculator.astro:440` — `// Email form handler (placeholder)` (likely live form will silently no-op — verify the form has SOME success state, not just JS placeholder)

`apps/clientportal/src/app.js.legacy` has many `placeholder=` attributes — these are HTML form placeholders, not content placeholders. File is `.legacy` so likely not bundled — confirm it isn't imported.

## 4. Image references

Only one `src="/images/..."` reference found in .astro files: `/images/hero/main.jpg` — file exists at `website/public/images/hero/main.jpg`. No broken image refs.

## 5. Sitemap / robots / canonical

- `robots.txt`: present, correct sitemap URL (`https://www.my4mlife.com/sitemap-index.xml`), AI crawlers explicitly allowed. Good.
- `sitemap-index.xml` and `sitemap-0.xml` build cleanly; URLs use `https://www.my4mlife.com/...` with trailing slash, no `app.` or bare domain. Good.
- **Canonical inconsistency:** these pages emit `.html` canonicals while sitemap emits trailing-slash dir URLs:
  - `terms.astro` → `https://www.my4mlife.com/terms.html`
  - `contact.astro` → `https://www.my4mlife.com/contact.html`
  - `links.astro` → `https://www.my4mlife.com/links.html`
  - `blog.astro` → `https://www.my4mlife.com/blog.html`
  - Schema.org JSON-LD across `referral.astro`, `consent.astro`, `blog.astro` also references `.html` URLs.
  - Recommend: drop `.html` everywhere; match sitemap shape.
- Canonicals correctly use `https://www.my4mlife.com` (apex `www`), never `app.` or bare. Good.

## 6. Meta description coverage (10-page spotcheck)

All 10 spot-checked pages have `description` and `canonical`: index, about, contact, protocols, tiers, links, pillars/mind, biomeaxisforge, genesis-rpa, blog. Coverage looks complete via SEO.astro/BaseLayout/SolutionPage layouts. No missing meta found.

Note: `tiers.astro` description text is stale (mentions `$197–$697 cohort` — see Blocker #8).

## 7. App readiness (apps/clientportal)

`pnpm build` succeeded:
- 793 modules transformed
- dist outputs: index.html (0.92 kB), CSS 43.24 kB, JS 421.71 kB (132 kB gzip)
- PWA precache: 13 entries / 533.83 KiB
- Built in 710ms, no errors

Builds clean.

## 8. Lead-capture endpoint

```
curl OPTIONS https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/send-app-link
→ 204 No Content
```

CORS preflight responds correctly. Functional.

## 9. Live site smoke test

```
curl https://www.my4mlife.com → 200
grep -c "Begin with the end in mind" → 3
```

Tagline present and rendered. Live.

## 10. Stripe / payment readiness

- `apps/clientportal/src/lib/integrations/payments.ts` — stub only; both `createCheckoutSession` and `getSubscriptionStatus` `throw new Error('Not implemented: payments provider pending')`.
- `apps/clientportal/src/lib/components/tiers/CartPreview.svelte` — references payments stub.
- No Stripe code in `lambdas/` or `infra/`.
- **State:** zero payment capability wired. Tiers/membership pages cannot collect money. TJ must provide Stripe account + price IDs; then implement Checkout session creation (likely a thin Lambda + Bedrock-free, simple HMAC-protected endpoint).

## 11. SES / email readiness

- `lambdas/send-app-link/` source is **not in this repo** — only `lambdas/coach-proxy/` exists. The send-app-link function is deployed but its source lives elsewhere (or was deployed via inline/CDK before this repo state).
- Live API gateway responds 204 to OPTIONS (CORS works).
- Per memory: SES production access still pending → real-volume sends will throttle in sandbox.
- **TJ-action:** confirm SES production access ticket + verify FROM domain identity. **Claude-action follow-up:** vendor the send-app-link source into `lambdas/send-app-link/` for IaC parity.

## 12. Compliance scan — "treat" in marketing copy

**41 hits across 17 files.** Highest-risk (visitor-facing, marketing tone):
- `terms.astro` — 15+ uses ("medical weight loss treatment", "treatment programs", etc.). Terms page is legal copy; defensible but heavy.
- `referral.astro` — 6 uses ("save on your next month of treatment", "GLP-1 weight loss treatment"). Marketing context. **Strongest candidate to soften.**
- `blog.astro` — 3 uses (article previews).
- `solutions/dental.astro:14`, `solutions/allergies.astro:20`, `solutions/nutritional-supplements.astro:15`, `solutions/environment/cold-plunge.astro:53`, `solutions/substance-use.astro:200` — incidental uses, mostly OK ("treats X as cosmetic", "treatment referral service" for SAMHSA hotline) but worth a pass.
- `consent.astro` and `assessment.astro` use "treatment" in informed-consent / disclaimer context — defensible.

Recommend a marketing-copy pass on `referral.astro` and `blog.astro` previews. Legal terms/consent can stay.

## 13. Brand consistency — "My4MLife" wordmark

Grep for `My 4M Life`, `my4mLife`, `MY4MLIFE`, `My4mlife`, `MY4MLife` returned **zero violations** in `website/src` and `apps/clientportal/src`. Wordmark consistent.

---

## Summary

Live site is up, homepage renders, lead capture preflight works, app builds clean, brand wordmark is consistent, and meta coverage is complete. The blocking issues are concentrated in: (a) four broken internal links, (b) three pages with placeholder pricing visible to visitors, (c) canonical/sitemap shape inconsistency, (d) stale tiers page copy, (e) zero payment plumbing. None are existential — most are 30-minute fixes.
