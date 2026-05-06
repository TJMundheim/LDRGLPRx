# My4MLife — Continuation Handoff for Next-in-Line Agent

**Last session ended:** 2026-05-05 ~21:25 CDT
**Authority granted:** TJ Mundheim explicitly authorized full autonomous continuation with subagents while offline 2026-05-05. Standing approval to drive toward launch in one day. Use whatever subagents necessary. See authority statement at the bottom of this document.

---

## Read these first (in this order)

1. `docs/SESSION-DASHBOARD.md` — current live state, open questions, TJ-blocked items, recent decisions
2. `docs/HANDOFF.md` — multi-session history (most recent at top)
3. Memory files at `~/.claude/projects/-Users-thomasmundheim-Desktop-Development-LDRGLPRx/memory/` — all locked decisions (brand wordmark, affiliate pricing, membership tiers, tagline, north-star vision, 4M pillars, compliance pre-approvals)

---

## Standing orders (TJ-locked)

These are non-negotiable. Refer to the memory files for sourcing; do not re-litigate them.

- **Auto-commit when waiting** — commit + push at every coherent stopping point; use `wip:` prefix for in-progress, `feat:` / `fix:` / `docs:` for complete work
- **Maintain `docs/HANDOFF.md`** proactively — update it before context runs out; keep most-recent session at top
- **Update `docs/SESSION-DASHBOARD.md`** after every significant change (timestamp the top line)
- **Use subagents aggressively** — dispatch `haiku` for reads/lookups, `sonnet` for coding, `opus` for review/architecture; keep each subagent under 20-30 tool uses so it doesn't time out
- **Brand wordmark `My4MLife`** — single word, exact case, no spaces, no hyphen, no "My 4M Life"
- **4M order**: Mind → Muscle → Mitigate → Motivate (Mind is destination, recursive cycle)
- **Tagline**: "Begin with the end in mind." (triple entendre — intentional)
- **Brand statement**: "lifestyle company giving you the tools and resources to live your best life"
- **Founder credential**: Dr. TJ Mundheim, DC; NBCE-certified since 1994; 30+ years clinical experience
- **NEVER use**: physician, MD, DO, Diplomate, A4M Diplomate, treat / treats / treating (use help / approach / support / has helped)
- **Telemedicine framing**: "contracted licensed telemedicine practice" or "partner regenerative medicine practice" — never name the partner until TJ provides the contract
- **No Genesis RPA name on public website** — use "regenerative medicine solutions" (generic, multi-therapy category); Genesis RPA name is OK in internal docs and memory
- **No member discounts on affiliate products** — discounts apply only to white-label / direct My4MLife products
- **HIPAA architecture**: use AWS Bedrock for AI in production (never `@anthropic-ai/sdk` in prod code); no PHI in SMS bodies; cross-device sync is Phase 2, post-HIPAA P0
- **Nudge, not Toast** — the in-app notification component is called "Nudge" (toast has alcohol connotation; TJ rejected it)
- **Membership tiers**: Protégé (free) → Insider / Insider Plus / Insider Concierge (paid, pricing TBD) → Graduate (earned, 12mo+)
- **Supplement naming**: Biome-AF (gut, was BiomeAxisForge), NeuroBridge, SleepRestore, ArmorVita, NeuroSeal — Rx Protocol (compounded) vs Pharmaceutical-Grade Nutraceuticals (OTC)
- **Compliance is pre-approved** — do not flag regulatory concerns on items TJ has already presented; keep moving

---

## What's currently live and working

### Marketing site — https://www.my4mlife.com

- Homepage with RequestApp email-capture form (real Lambda + SES integration)
- 4 pillar overview pages: `/pillars/mind`, `/pillars/muscle`, `/pillars/mitigate`, `/pillars/motivate`
- 6 solution pages with Two Paths CTA: gut, hormones, weight, sleep, cognitive, peptides
- 5 environmental sub-pages (light, air, water, EMF, grounding) — product cards with "Notify Me When Available"; Heritage Incandescent flagship on light page
- 3 temperature-environment sub-pages: `/solutions/environment/sauna`, `/solutions/environment/cold-plunge`, `/solutions/environment/mineral-bath`
- `/solutions/chronic-conditions` aggregator
- `/regenerative-medicine` — multi-therapy category (peptides, protein-array, cell-derived, gene-therapy framing)
- `/membership` — full 5-tier comparison table + 12-question FAQ; pricing placeholder "finalizing"
- `/consult` — placeholder booking page (all CTAs route here)
- `/assessment` — public 20-Likert audit with email capture (real form)
- `/solutions/substance-use` — free resources + LDN Rx pathway
- 6 long-form "Eliminate the Insulting Behavior" blog posts
- All 14 More-dropdown solution pages
- Canonical URLs, sitemap.xml, robots.txt clean

### App PWA — https://app.my4mlife.com

- 3-stage simplified intake: Basics + consent → 20-Likert audit → audit review
- Passwordless email-OTP sign-in (auto-creates Cognito user on first OTP request)
- Schema v6 clean-slate wipe on launch — 31 localStorage keys covered; Cognito tokens preserved
- `?reset=1` permanent dev-test URL for QA (wipes all 31 keys)
- 5 Nudge trigger conditions wired (welcome-back, intake-celebration, week milestones, free-tier-upgrade, substance-use LDN)
- Optional phone field in Stage 1 (SMS opt-in, non-gating)
- Sign-out wired in sidebar
- Mobile sticky-header offset; 44px+ touch targets; accessible form labels
- Workbook tracker stubs for Weeks 2–4 (renderer functional; educational depth is thin — high-value next work)

### Infrastructure

- Cognito user pool: `us-east-2_kIpKnr17R` (passwordless CUSTOM_AUTH)
- DynamoDB `Users` table
- Lambda + API Gateway: `POST /api/send-app-link`, `POST /api/request-otp`
- SES domain verified: `my4mlife.com` (sandbox — production access pending TJ action)
- CloudFront: `E3J19LI34BC2VR` (site), `E2RJ7NRPD4MN2X` (app)
- User creation script: `infra/clientportal/create-user.sh` (you can create Cognito users manually)
- Deploy scripts: `apps/clientportal/deploy.sh` (app), `website/deploy.sh` (site) — run both after dual-touching source

---

## What's deferred — TJ-blocked (do not attempt)

These require TJ's personal action in the AWS console, Stripe, or with a third party. Do not try to work around them:

| Item | What's needed |
|---|---|
| AWS BAA | Console → Artifact → Agreements → AWS BAA → Accept |
| SES production access | Console → SES → Account dashboard → "Request production access" |
| Bedrock model access | Console → Bedrock → Model access → Claude Sonnet / Haiku in us-east-1 |
| Stripe test-mode keys | Stripe Dashboard → API keys → drop into app env |
| Insider tier pricing | Three sub-tier price points (TJ deciding) |
| Telemedicine partner contract + name | Placeholder "[Telemedicine Partner — to be named]" used everywhere |
| Affiliate partnerships | TJ personally owning: Aero-Tech, AquaTru, Air Doctor, Joovv, Earthing.com, Shieldex |
| Affiliate product links | All affiliate hrefs are `#` placeholders — ready for one-pass swap when TJ provides URLs |
| Connected Mind URL | Drops into `/solutions/cognitive` CTA |
| Founder photo | Currently "TJ" initials avatar placeholder |
| NeuroSeal vs Biome-AF clarification | Same BPC-157 + L-Glutamine + Aloe formulation — canonical name TBD |
| NAD product details + iontophoresis patch line | Full supplement list awaiting TJ |

---

## High-value next work (priority order)

Pick these up in sequence. Each is scoped for a focused subagent dispatch.

### 1. Diagnose and fix environmental dropdown navigation (URGENT — open user complaint)

TJ reported that clicking Air / EMF / Grounding from the nav dropdown "doesn't populate anything." Likely causes:
- Pages exist but feel empty because product cards are all "Notify Me When Available" with no educational depth
- Or a JS anchor/href issue in the dropdown

Action: Read `website/src/components/Navbar.astro` (or equivalent), check href targets, then check the individual sub-page content depth. If navigation works but pages feel empty, add a minimum 400-word educational "Why This Matters" intro section to each of the 5 env sub-pages (light, air, water, EMF, grounding) — pull from the roadmap docs under `docs/products/environmental-product-roadmap.md`.

### 2. Phase 1 affiliate SKUs into environmental sub-pages (revenue-ready)

7 launch-ready SKUs documented in `docs/SESSION-DASHBOARD.md` under open question #3. They need product cards on the relevant env sub-pages with `href="#"` placeholder links (ready for real-link swap). White-label SKUs (Night-Light Pack, Blackout Dots) should have "Add to Cart" CTAs pointing to `/membership`; affiliate SKUs should have "Shop Now" CTAs with placeholder `href="#"` and a `data-affiliate="true"` attribute for easy find-replace later.

### 3. Blog: Cold plunge DIY guide (organic traffic + affiliate revenue)

TJ's Texas horse-trough DIY cold plunge build is documented in `docs/products/temperature-environment-roadmap.md` Section 5. This is a natural long-form SEO post ("How to build a cold plunge for under $400"). It drives traffic and creates affiliate revenue on the components (stock tank, chiller, thermometer). Write as a proper blog post in `website/src/pages/blog/` following the structure of the existing ETI posts. Aim for 1,200+ words. Include product links as `href="#"` placeholders.

### 4. Strengthen the 6 ETI blog posts with embedded product cross-links

The existing "Eliminate the Insulting Behavior" series posts are solid but standalone. Each post should have 2–3 inline product card embeds or callout boxes linking to the relevant solution page and /consult. Find the posts in `website/src/pages/blog/` and add contextual cross-links without making them feel salesy.

### 5. App: Week 2/3/4 content depth

The workbook renderer (`apps/clientportal/src/lib/renderer.ts`) is functional but the educational content per week is thin. Each week should have a short intro paragraph, 2–3 learning points, and a daily action item card. Reference `docs/plan/` for the 4M monthly progression doc. Dispatch a sonnet subagent to enrich the weekly content objects.

### 6. App: Account / Profile page

Currently the sidebar only has a sign-out button. A minimal `/account` route should show: email, member since date (from localStorage), tier (Protégé), and a link to upgrade (/membership). No backend required for MVP — pull from localStorage. Keep it under 80 lines of Svelte.

### 7. `/protocols` or `/library` page on the website

Aggregates "what to actually do" content into one scannable library — links to all pillar pages, solution pages, blog posts, and assessment. This is a navigation accelerator for returning visitors who want to dive deep without scrolling the homepage again. One Astro page, mostly links and short descriptions, no new content needed.

### 8. Press / Media kit page

`/press` page with: founder bio paragraph, Dr. TJ Mundheim credential block, brand assets section (logo lockup description + "contact for files"), and core brand narrative. Useful for future affiliate and media outreach. ~300 words of copy, standard Astro page.

### 9. Weekly progress charts in the app dashboard

Visualize audit score improvements over time. Audit scores are already stored in localStorage per week. A simple sparkline or bar chart (no external chart library — use inline SVG) showing Week 1 vs Week 2 vs Week 3 vs Week 4 score per pillar would be a strong engagement hook. Scope: one new Svelte component, under 60 lines.

### 10. Newsletter / opt-in email infrastructure (non-HIPAA, buildable now)

The opt-in mechanism (email capture form on blog posts + solution pages) can be built now — it's not HIPAA-sensitive. Wire the existing `EmailCapture.astro` component to the `send-app-link` Lambda (or add a new `/api/subscribe` route to the Lambda stack). Store subscriber emails in a separate DynamoDB table (`Subscribers`). The actual send cadence is post-BAA, but the collection infrastructure is unblocked.

---

## Continuation playbook

If you're picking up mid-session, do these steps before touching any code:

1. `git log --oneline -10` — see what landed recently
2. `git status --short` — look for dirty state or uncommitted work from a timed-out previous subagent
3. Read `docs/SESSION-DASHBOARD.md` — authoritative current state
4. If you see `wip:` commits in git log, a subagent likely timed out mid-task — find what it was doing and finish it before starting new work
5. Run both deploy scripts after any dual-touch (website + app): `apps/clientportal/deploy.sh` and `website/deploy.sh`; wait for CloudFront invalidation "Completed" before testing

---

## Common pitfalls — read before dispatching subagents

- **Subagent timeouts** — anything over ~40 tool uses or 5+ minutes of idle API time has crashed in this project. Mitigation: split every task into subagents under 20–30 tool uses. Never send a subagent to "build the whole X" — break it into "build the component" + "wire it into the page" dispatches.
- **Dual-deploy** — changes touching both `website/` and `apps/clientportal/` require running BOTH deploy scripts. Forgetting one leaves production half-updated.
- **CloudFront invalidation timing** — the deploy scripts trigger invalidations; allow 30–60 seconds before testing live URLs. A stale cache will look like your deploy failed.
- **`?reset=1` for app testing** — wipes all 31 localStorage keys. Use this before every QA pass on the app, otherwise stale schema state from a prior run masks bugs.
- **CDK build artifacts** — if you see `.js` or `.d.ts` files appearing in `git status` under `infra/`, they're CDK compile outputs. Either gitignore them or commit them — they're harmless but noisy.
- **SES sandbox** — outbound SES only works to verified recipient addresses in sandbox mode. If an email test fails, verify the recipient in SES Console. Do not request production access — that's TJ's action item.
- **Affiliate links are all `#` placeholders** — do not invent real affiliate URLs. Leave `href="#"` and add `data-affiliate="vendor-name"` attributes so TJ can grep-and-replace when he gets the real links.
- **No PHI in Lambda logs or SMS bodies** — never log email addresses, audit scores, or health data in CloudWatch. OTP codes are OK to log at DEBUG level only.

---

## Live URLs and infrastructure reference

| Resource | Value |
|---|---|
| Marketing site | https://www.my4mlife.com |
| App PWA | https://app.my4mlife.com |
| App clean-slate wipe | https://app.my4mlife.com/?reset=1 |
| Lead capture API base | https://v9svm8ds74.execute-api.us-east-2.amazonaws.com |
| Cognito user pool | us-east-2_kIpKnr17R |
| CloudFront (site) | E3J19LI34BC2VR |
| CloudFront (app) | E2RJ7NRPD4MN2X |
| AWS account | 879696522760, region us-east-2 |
| Manual user creation | `infra/clientportal/create-user.sh` |

---

## Authority statement

> TJ Mundheim, founder, granted continuation authority on 2026-05-05 to any agent that arrives mid-session. The grant covers: deployment of source code changes, content authoring, infrastructure changes within the existing CDK stack patterns, dispatching subagents, committing and pushing to git, manual SES sends to verified recipients, manual Cognito user creation via `infra/clientportal/create-user.sh`. The grant does NOT cover: requesting SES production access on behalf of TJ, signing the AWS BAA, contacting affiliate partners, calling telemedicine providers, or any action that creates legal or contractual obligations for TJ or My4MLife.

When in doubt: drive toward launch readiness. The bar is "soft launch" — site and app fully functional, content depth across all 4 pillars, free Protégé sign-up working end-to-end, all consult CTAs routing to `/consult`, affiliate links staged as `href="#"` placeholders ready for real-link swap.
