 # My4MLife — Live Session Dashboard

**This file is updated continuously through the work session. Keep it open in a separate IDE window so you don't lose decisions in the chat scroll. I'll add a timestamp at the top of each major change.**

Last updated: 2026-05-08 — Hero photo candidates sourced (25 photos, 5 per category). Browse + pick at the URLs below. **TJ offline; autonomous mode active.**

## Hero photo candidates — browse and pick

5 candidates per category. Open each `1.jpg` through `5.jpg`:
- Leadership: https://www.my4mlife.com/images/hero-candidates/leadership/1.jpg (and 2-5.jpg)
- Active lifestyle: https://www.my4mlife.com/images/hero-candidates/active-lifestyle/1.jpg (and 2-5.jpg)
- Family legacy: https://www.my4mlife.com/images/hero-candidates/family-legacy/1.jpg (and 2-5.jpg)
- Contemplative: https://www.my4mlife.com/images/hero-candidates/contemplative/1.jpg (and 2-5.jpg)
- Protocol/clinical: https://www.my4mlife.com/images/hero-candidates/protocol-clinical/1.jpg (and 2-5.jpg)

Previous: 2026-05-07 — Age brackets stripped from public-facing copy across website + clientportal. Target reframed as "men, self-selecting by intent" (psychographic, not demographic).

---

## Live URLs

- **Marketing site:** https://www.my4mlife.com
- **App / PWA:** https://app.my4mlife.com
- **App with clean-slate wipe:** https://app.my4mlife.com/?reset=1
- **Lead-capture API:** https://v9svm8ds74.execute-api.us-east-2.amazonaws.com (`/api/send-app-link`, `/api/request-otp`)
- **AWS account:** 879696522760, region us-east-2

## Latest commits (most recent first)

| SHA | Description |
|---|---|
| `7da4f70e` | Deep audit: enforce canonical 4M order + final age-bracket sweep |
| `f189ba15` | Strip age brackets — men self-select by intent, not age (locked 2026-05-07) |
| `59c555d2` | Organic influencer + founder-essay strategy plan (docs/plan/) |
| `70c1c8be` | Homepage anticipated-testimonials section — honest forward-framing, brain-health anchored |
| `82765fed` | Continuation handoff runbook for next-in-line agent (TJ-authorized autonomous mode) |
| `6ae1239b` | Affiliate punch-list — 105-row spreadsheet (CSV + markdown explainer) |
| `e42e95ab` | /regenerative-medicine — multi-therapy category framing |
| `e1254b49` | New env sub-pages: sauna + cold-plunge + mineral-bath + navbar update |
| `d58067bd` | Env water/emf/grounding educational deep-dive sections + Phase 1 affiliate SKUs |
| `cb854453` | Env dropdown nav fix + light/air educational sections + Phase 1 affiliate SKUs |
| `cb04dd96` | Compliance scrub Phase 2 — remaining "treat → approach" cleanup |
| `f4d08d5d` | Compliance scrub Phase 1 — Genesis RPA → regenerative medicine; URL rename to /regenerative-medicine |
| `61176b8c` | More dropdown anchor right + max-height (was clipping past viewport) |
| `62cfa318` | Chronic-conditions page + Genesis RPA on pillars + navbar More dropdown + homepage callout |
| `e402e5b1` | Comprehensive clean-slate wipe v6 (15 → 31 keys) |
| `8bd83eb2` | /pillars/{mind,muscle,mitigate,motivate} aggregator pages + fix homepage 4M cycle links |

## Recent decisions locked

| Decision | Date | Where it lives |
|---|---|---|
| **Genesis RPA → "regenerative medicine solutions" (generic, multi-therapy)** | 2026-05-05 | Public website only; internal docs/memory keep specific product name |
| **No "treat" verb in marketing copy** | 2026-05-05 | Replaced with "help / has helped / approach" |
| **No member-tier discounts on affiliate products** | 2026-05-05 | Memory: `feedback_affiliate_pricing_policy.md` |
| **Schema clean-slate v6** | 2026-05-05 | App auto-wipes 31 localStorage keys; Cognito tokens preserved |
| **Brand wordmark `My4MLife` (single word, exact case)** | 2026-04-30 | Memory: `feedback_brand_wordmark.md` |
| **4M order: Mind → Muscle → Mitigate → Motivate** | 2026-04-30 | Mind is destination, recursive cycle |
| **Tagline: "Begin with the end in mind." (triple entendre)** | 2026-04-30 | Memory: `project_tagline.md` |
| **Brand statement: "lifestyle company giving you tools to live your best life"** | 2026-05-01 | Homepage hero + meta description |
| **"Eliminate the insulting behavior" recurring brand phrase** | 2026-05-01 | Memory + solution-page structure |
| **5-tier membership: Protégé → Insider/Plus/Concierge → Graduate** | 2026-05-01 | Memory: `project_membership_tiers.md` |
| **Pharmaceutical-grade Nutraceuticals (OTC) vs Rx Protocol (pharmacy)** | 2026-05-03 | Two-tier supplement framework |
| **Biome-AF (was BiomeAxisForge)** | 2026-05-03 | Site-wide rename |
| **Public website terminology: "regenerative medicine solutions"** | 2026-05-05 | Multiple regenerative therapies offered, not just Genesis RPA |

---

## TJ's open questions to Claude (queued — these fixes are pending)

1. **Environmental dropdown items don't navigate?** When TJ clicks Air, EMF, etc. from the dropdown, "nothing else populates." Need to diagnose:
   - Is the click handler broken (JS issue)?
   - Or do the pages navigate but feel empty because they're product-grid-heavy with "Notify Me When Available" pills?
   - Does TJ want educational content depth on these pages BEFORE products are available?

2. **Cold therapy / sauna options** — temperature-environment products (sauna, cold plunge, mineral bath) are documented in `docs/products/temperature-environment-roadmap.md` but not yet on the live site. Need to add to environmental section with high/low economic tiers per TJ's directive.

3. **Phase 1 affiliate SKUs into env queue** — TJ flagged 7 Phase 1 launch-ready SKUs to surface NOW on environmental pages:
   - 4M Night-Light Pack — gateway $24 (white-label)
   - 4M Blackout Dots — gateway $12 (white-label)
   - 4M Bedroom Air Purifier (Air Doctor 2000 affiliate) — $249 affiliate
   - 4M Counter-Top Water Filter (AquaTru affiliate) — $179 affiliate
   - 4M Grounding Sleep Mat (Earthing.com affiliate) — $129 affiliate
   - 4M EMF Meter (TriField TF2 affiliate) — $179 affiliate
   - 4M Filter Replacement Subscription — recurring (wraps around purifier + water filter)

4. **Regenerative medicine reframe — multi-therapy category** — Genesis RPA is one regenerative therapy; new genetic therapies have been released. The /regenerative-medicine page should reflect this is a CATEGORY of solutions, not a single product. May need additional per-therapy detail eventually.

5. **Comprehensive consolidated report in a different window** — THIS DOCUMENT. Updated continuously so TJ can reference without losing chat history.

---

## TJ-blocked items (action required from TJ)

| Item | Notes |
|---|---|
| **AWS BAA accept** | Console → Artifact → Agreements → AWS BAA → Accept (5 min) |
| **SES production access request** | Console → SES → Account dashboard → "Request production access" |
| **Bedrock model access in us-east-1** | Console → Bedrock → Model access → Claude Sonnet/Haiku |
| **Stripe test-mode keys** | Stripe Dashboard → API keys |
| **Connected Mind URL** | Drop into `Stage3Mind.svelte:12` (NOTE: Stage 3 is now Audit Review post-simplification — link instead lives on `/solutions/cognitive`) |
| **Insider tier pricing** | Three sub-tier prices |
| **Telemedicine partner contract + name** | Currently "[Telemedicine Partner — to be named]" everywhere |
| **Affiliate partnerships** | TJ owning — Aero-Tech (Heritage incandescent), AquaTru, Air Doctor, Joovv, Earthing.com, Shieldex, etc. |
| **NeuroSeal vs Biome-AF clarification** | Same BPC-157+L-Glutamine+Aloe formulation; canonical name? |
| **NAD product details + iontophoresis patch line** | Awaiting full supplement list |
| **Founder photo** | Currently "TJ" initials placeholder |

---

## What's live RIGHT NOW

### Marketing site
- Homepage "What we're building toward" anticipated-outcomes section (5 transparently-labeled cards: founder perspective x2, composite pattern, 90-day goal, Q3 2026 placeholder — no fabricated testimonials)
- 4 pillar overview pages: `/pillars/mind`, `/pillars/muscle`, `/pillars/mitigate`, `/pillars/motivate`
- 6 top-line solution pages with Two Paths CTA (gut, hormones, weight, sleep, cognitive, peptides)
- **8 environmental sub-pages** (light, air, water, EMF, grounding, sauna, cold-plunge, mineral-bath) with product cards + educational deep-dive sections + Phase 1 affiliate SKUs marked "Available — Affiliate" (others "Notify Me When Available")
- Heritage Incandescent flagship section on `/solutions/environment/light`
- `/solutions/chronic-conditions` aggregator page
- `/regenerative-medicine` (was /genesis-rpa) — multi-therapy category framing
- `/membership` with full Insider tier comparison + 12-FAQ
- `/consult` placeholder booking page
- `/assessment` public 20-Likert audit with email capture
- `/solutions/substance-use` with free supportive resources + LDN Rx pathway
- 6 long-form "Eliminate the Insulting Behavior" blog posts
- `RequestApp` email-capture form on homepage hero (real Lambda + SES integration)
- All 14 More-dropdown solution pages
- All canonicals on www; sitemap + robots.txt clean

### App (PWA)
- 3-stage simplified intake (Basics + 1-checkbox consent → 20-Likert audit → audit review)
- Auto-signup on first OTP request (creates Cognito user if not exists)
- Schema-v6 clean-slate wipe (31 keys covered)
- `?reset=1` permanent dev-test URL
- 5 Nudge triggers (welcome-back, intake-celebration, week milestones, free-tier-upgrade, substance-use LDN)
- Sign-out wired in sidebar
- Optional phone field in Stage 1 (SMS opt-in)
- Mobile sticky-header offset; touch targets 44px+; form labels accessible

### Infrastructure
- Cognito user pool: us-east-2_kIpKnr17R (passwordless email-OTP CUSTOM_AUTH)
- DynamoDB Users table
- Lambda + API Gateway: `/api/send-app-link`, `/api/request-otp`
- SES verified domain: my4mlife.com (sandbox; production access pending)
- CloudFront distributions: E3J19LI34BC2VR (site), E2RJ7NRPD4MN2X (app)

---

## Documents you can review at any time

| Doc | Purpose |
|---|---|
| `docs/HANDOFF.md` | Multi-session handoff history (most recent at top) |
| `docs/SESSION-DASHBOARD.md` | THIS DOC — current live state |
| `docs/products/supplement-catalog.md` | 6-brochure structured supplement catalog |
| `docs/products/environmental-product-roadmap.md` | ~40 env SKUs + Heritage Incandescent line |
| `docs/products/temperature-environment-roadmap.md` | Sauna + cold plunge + mineral bath, 21 SKUs, TJ's Texas DIY build |
| `docs/plan/ai-concierge-engagement-strategy.md` | 4-phase notification system planning |
| `docs/plan/lead-capture-stripe-ai-concierge.md` | Original lead-funnel build plan |
| `docs/legal/attorney-brief.md` | What attorney needs to produce |
| `docs/legal/private/if-asked-statement.md` | Back-pocket statement re: license history |
| `docs/QA-walkthrough.md` | Site QA findings (35 items) |
| `docs/QA-app-walkthrough.md` | App QA findings (33 items) |

---

## Right now I'm working on

1. ✅ Just shipped: compliance scrub (Genesis RPA → regenerative medicine; "treat → help"; URL rename to `/regenerative-medicine`); More-dropdown clip fix
2. ✅ Just shipped: chronic conditions + pillars + navbar updates
3. 🔄 In progress (next dispatches): env dropdown navigation diagnosis, Phase 1 SKUs into env sub-pages, cold therapy/sauna section on environmental, regenerative-medicine multi-therapy reframe
4. 📝 Just created: this dashboard

---

## How to use this dashboard

- Keep it open as a separate IDE tab
- I update it after every significant change
- Look here first for "what's live / what's blocked / what's queued" instead of scrolling chat
- The TJ-blocked items are your authoritative checklist
- The "Open questions to Claude" section is what I'm actively working through

---
