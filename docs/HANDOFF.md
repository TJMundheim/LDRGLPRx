# LDRGLPRx — Handoff

Last updated: 2026-05-03.

---

## Session: May 1–3, 2026 — Phase 2 Marketing Rebuild + App Simplification + SEO/Go-Live Readiness

### Commits this session
```
e2c19f3 docs(legal+brand): consolidated credentialing rules, HIPAA memory fix, private if-asked statement
d30c157 feat(clientportal): adaptive 20-category discovery + auto-populated audit + top-3 priority rule
0856d7c feat(clientportal): rename + promote 'Lack of purpose, goals' to audit position #1
15b82c9 feat(clientportal): dashboard audit summary, remove W1 audit duplicate, add box-breathing how-to
3d38ed0 feat(website): rename LDRGLPRx → My 4M Life + 6 logo concepts at /logos
ea9e8f1 feat(brand): lock My4MLife wordmark + 4M order Mind→Muscle→Mitigate→Motivate
3a96676 feat(website): Round 3 Vitruvian Man logo concepts + consolidate /logos page
004473e feat(website): Concept 17 refinement — 4 Vitruvian + golden-ratio variants
90bf326 feat(website): da Vinci faithful Vitruvian Man — Variant 5 logo concept
90bf326 feat(website): Phase 2A — mega-menu navbar + Concept 13 logo integration
ccda463 feat(website): Phase 2B — 20 solution stub pages
75d2aed feat(website): Phase 2C — homepage rewrite, cohort tiers, footer cleanup
ee7af77 feat(clientportal): welcome-back skip path for returning intake users
cca03e6 fix(clientportal): Stage 1 restores saved basics + consent state on mount; auto-advance if complete
b4d76b9 fix(clientportal): consent state survives revisits and minor doc whitespace changes
91255c5 fix(clientportal): dashboard auto-populates from intake audit + strip stale 14-factor references
b391d83 feat(clientportal): simplified 3-stage intake — basics + 20 Likert + auto-audit, clean slate
00588354 fix(clientportal): Stage 1 consent UI clarity + Continue gate
d09016e fix(clientportal): Stage 1 Continue activates — coerce numeric inputs to string before .trim()
13340082 fix(clientportal): dashboard name + remove DOB + brighten week 1 audit text + verify top-3 tie-breaker
3516e96 wip: rename cohort references in clientportal lib files
52c253b wip: rename cohort references across all website pages
624956 feat: complete Cohort → Protégé/Insider/Graduate rename + My4MLife App naming
443d10b feat(website): rewrite about page with authentic My4MLife founder narrative
2510a83 feat(website): rewrite 6 solution pages with 'Eliminate the Insulting Behavior' framing
5eda47b feat(website): add environmental hub sub-pages — light, air, water, EMF, grounding
91fad47 feat(website): IA shift — flat top nav with assessment CTA + environmental dropdown
e4783b5 feat(website): public /assessment audit page with 20 Likert + lead capture
48a0e17 feat: unified comprehensive 4M consult CTA across website + app
d302f17 feat: Vit D→Nutritional Supplements + Q7/Q20 polish + brand statement integration + environmental product roadmap doc
f2c578c docs(products): add Incandescent Heritage line — rough-service exempt incandescent bulbs
4efec20 feat(website): SEO nav labels — Gut Health/Leaky Gut, Testosterone Therapy, GLP-1 Weight Loss, Brain Optimization, Peptides
ebd4faf feat(website): /solutions/peptides — peptide therapy hub
8a12fe9 docs(qa): new-visitor walkthrough audit findings
2f28bd6 wip: SEO update gut and hormones pages
0fb37a0 wip: SEO update weight and cognitive pages
5b41a09 feat(website): /consult landing page (placeholder booking)
1690dd4 feat(website): /membership page (Protégé→Graduate tiers) + /4m-cohort redirect
2eb73c2 docs(qa): new-Protégé app walkthrough audit findings
5e8522 feat(website): wire footer + homepage + membership email-capture forms
d33cc4b fix(clientportal): walkthrough fixes — sign-out wired, /cart removed, /70→/200, BiomeAxisForge naming, mobile sticky-header offset
f9fff5a fix(clientportal): TS errors — Sidebar import paths + W4 audit type narrowing
0554735 fix(website): final 404 + SEO sweep — broken links, meta tags, canonical URLs
```

---

### Brand + IA decisions locked (May 1)

- **Wordmark:** `My4MLife` — single word, exact casing, no spaces
- **4M order locked:** Mind → Muscle → Mitigate → Motivate (this is the correct weekly sequence; prior docs had it wrong)
- **Tagline locked:** "Begin with the end in mind." — triple entendre (purposeful living / reverse-engineering health / medical directives)
- **Brand statement:** "lifestyle company giving you the best chance of having the best mind possible until your last day of life"
- **Brand phrase:** "Eliminate the Insulting Behavior" — frames every solution page
- **Logo locked:** Concept 13 — Vitruvian Man silhouette with 4 cardinal M markers. Lives at `/logos/concept-13/`. Multiple variants committed under `website/public/logos/`.
- **Membership tier rename** (Cohort → new system): Protégé / Insider / Insider Plus / Insider Concierge / Graduate. All references to "Cohort" stripped from app and website.
- **Top nav restructured (May 2):** From 4M-grouped mega-menu to flat solution-focused nav with high-intent SEO labels (Gut Health/Leaky Gut, Testosterone Therapy, GLP-1 Weight Loss, Brain Optimization, Peptides). Environmental Factors dropdown retained.
- **"Essential Manage" brand residue** stripped from 5 pages (`tiers.astro`, `4m-cohort.astro`, `genesis-rpa.astro`, `protocols.astro`, `biomeaxisforge.astro`). Titles, JSON-LD org names, and body copy all updated.

---

### Marketing site — Phase 2 build (May 1–2)

**New pages:**
- `website/src/pages/solutions/` — 20 solution stub pages, all routable from nav and sitemap
- `website/src/pages/solutions/environment/` — 5 sub-pages: `light.astro`, `air.astro`, `water.astro`, `emf.astro`, `grounding.astro`
- `website/src/pages/membership.astro` — Protégé→Graduate breakdown; `/4m-cohort` now redirects here
- `website/src/pages/consult.astro` — placeholder booking landing; primary paid-conversion CTA destination sitewide
- `website/src/pages/assessment.astro` — public 20-Likert audit with email capture; leads to app or consult
- `website/src/pages/solutions/peptides.astro` — peptide therapy hub (nootropic + GH + recovery)
- `website/src/pages/solutions/nutritional-supplements.astro` — broadened from `/vitamin-d`

**Rewrites:**
- Homepage rebuilt: hero with brand statement, 4M cycle visual, top-priorities grid, membership tiers, founder section
- About page completely rewritten — Medvi-template residue removed, authentic My4MLife founder narrative
- 6 primary solution pages rewritten around "Eliminate the Insulting Behavior" 4-section structure (Problem / Insulting Behaviors / Eliminate / Solution Path)

**Email capture** wired (localStorage + stub POST) on: footer, homepage, membership page, consult page.

---

### App simplification (Apr 30 → May 1)

- **Intake collapsed from 6 stages to 3:**
  1. Basics + Consents (`Stage1Basics.svelte`)
  2. 20-Likert Self-Assessment (`Stage2Likert.svelte`)
  3. Audit Review (`Stage4Audit.svelte`)
- Connected Mind stage removed (content moved to `/solutions/cognitive` marketing page)
- Goals stage merged into intake flow
- Discovery questionnaire flattened to 20 single Likert questions — one per audit category, anchored 0–10
- Audit auto-populates from Stage 2 answers; user reviews and confirms at Stage 3
- `intake-schema-v3` clean-slate sentinel added to `IntakeModule.svelte` — wipes legacy multi-stage localStorage keys on first load after `2026-05-01`
- Welcome-back skip path added: returning users who have completed intake skip directly to dashboard

---

### App walkthrough fixes (May 2–3)

These were surfaced in `docs/QA-app-walkthrough.md` (33 issues catalogued). Critical fixes shipped:

- **Sign-out wired into Sidebar** — was completely unreachable; `Profile.svelte` was not imported or rendered anywhere. Fixed.
- **W4 audit comparison key mismatch fixed** — `renderer.ts:1400` was reading `W.factorScores[String(f.n)]` (legacy numeric keys `'00'`–`'13'`) but `Stage4Audit.submit()` writes slug keys (`'gut-microbiome'`, etc.). Fixed with type narrowing.
- **`/cart` dead links removed** — `renderer.ts:195` and `App.svelte:276` were emitting `<a href="/cart">` with no matching route. Links removed.
- **Stale copy fixed:**
  - "15-Factor Audit" → "20-Category Audit" (`weeks.ts:56,58`)
  - `/70` → `/200` in W4 comparison metric label (`renderer.ts:1296`)
- **"Doctor TJ Special"** → **"BiomeAxisForge"** naming consistency (`renderer.ts:1047`)
- **Mobile sticky-header overlap** — Stage 2 sticky header now uses `top: <progress-shell-height>` offset instead of `top: 0`, preventing overlap with IntakeModule progress bar

**Remaining open issues (not yet fixed):** See `docs/QA-app-walkthrough.md` — 30 issues remain across functional, content, UX, mobile, and accessibility categories. Key pending items:
- W2/W3 factor dropdowns still pull from legacy `factors.ts` (14-item list) rather than 20-category AUDIT_CATEGORIES
- Scale inconsistency: W2/W3 re-score inputs use 1–5 but intake stores 0–10
- No "intake complete" celebration screen before dashboard
- Height field has no ft/in conversion helper
- `renderGutAssessment()` is dead code (~120 lines in App.svelte + 80 in renderer.ts)

---

### SEO + go-live readiness (May 2–3)

- **Nav labels** updated to high-intent keywords: Gut Health/Leaky Gut, Testosterone Therapy, GLP-1 Weight Loss, Brain Optimization, Peptides
- **Solution page meta** — titles, H1s, meta descriptions updated for primary and secondary keywords per page
- **Canonical URLs** standardized to `https://www.my4mlife.com/` (www); prior builds used non-www
- **Sitemap** regenerated with www URLs; `robots.txt` sitemap directive corrected
- **Internal 404s eliminated:** broken footer links (`/live-coaching`, `/resources`, `/press`), blog Related Posts links (missing `/blog/` prefix), blog breadcrumb `href="/index"`, `/downloads/morning-protocol`

**Remaining open issues (not yet fixed):** See `docs/QA-walkthrough.md` — 35 issues catalogued. Key pending items:
- Site still needs a redeploy to push all source changes live (stale CloudFront cache)
- OG images: SVG is used sitewide (Facebook/LinkedIn don't render SVGs); `/images/og-image.jpg` referenced by `/4m-cohort` returns 404
- Blog section is 100% GLP-1/weight-loss posts — mismatched to brain-healthspan brand
- `/links` page returns 200 but has no visible content
- Social footer icons all `href="#"`
- `apple-touch-icon` is SVG — iOS requires PNG

---

### Documents created this session

| Path | Description |
|---|---|
| `docs/products/environmental-product-roadmap.md` | Internal roadmap — ~40 SKUs across Light/Air/Water/EMF/Grounding. Phase 1 quick-launch shortlist (7 SKUs). Revenue model (affiliate → white-label). Heritage Incandescent line. Drafted 2026-05-01. |
| `docs/QA-walkthrough.md` | 35 site issues across 55 pages — critical, functional, content, SEO, visual, polish |
| `docs/QA-app-walkthrough.md` | 33 app issues — critical, functional, content, UX, mobile, accessibility |
| `docs/legal/attorney-brief.md` | 6 HIPAA documents requested from counsel; includes platform description, role analysis, document specs |
| `docs/plan/lead-capture-stripe-ai-concierge.md` | Full atomic plan: public lead funnel → Stripe Checkout → AI Concierge (Bedrock). Includes DDB schema, Lambda plan, compliance prerequisites. |

---

### Decisions locked to memory

- Brand: wordmark, tagline, 4M order, logo, tier system, brand statement, solution-page framing phrase
- HIPAA architecture: Bedrock not Anthropic-direct; AWS BAA covers all Claude calls in production
- Insurance/PEO vertical: exists, sequestered to Phase 2–3
- Environmental: major revenue category; affiliate-first for Phase 1; white-label gateway SKUs at Phase 2
- Source vet shortlist: Aero-Tech, Newcandescent, Satco (incandescent); Air Doctor, IQAir, Coway (air); AquaTru, Berkey, Waterdrop (water); Joovv, Mito Red, PlatinumLED (red light); Shieldex, Yshield, TriField (EMF); Earthing.com, Hooga (grounding)

---

### TJ-blocked items (as of 2026-05-03)

- **AWS BAA** — Console → Artifact → Agreements → AWS BAA → Accept
- **Bedrock model access** — us-east-1 console → Bedrock → Model access → request Claude Sonnet + Haiku
- **Attorney** — forward `docs/legal/attorney-brief.md`; still missing docs 4 (Marketing-Use Authorization) and 6 (Workforce HIPAA Policy) from that brief
- **Stripe keys** — test-mode first, then live; needed to unblock `integrations/payments.ts`
- **Connected Mind URL** — needed to link from app and solution page
- **Insider tier pricing** — not yet set
- **Telemedicine partner** — vendor not yet contracted or named
- **Environmental product sourcing** — contact Aero-Tech, Newcandescent, AquaTru, Air Doctor, Joovv, Earthing.com, Shieldex for affiliate/white-label terms
- **Founder photo** — currently "TJ" initials placeholder on About page and app
- **Blog content** — 3 Medvi-template posts (`/blog/am-i-eligible-for-glp1`, `/blog/semaglutide-vs-tirzepatide`, `/blog/what-to-expect-first-month-glp1`) pending rewrite or replacement with brain-healthspan content
- **TJ's line-by-line review notes** — awaited

---

### Live URLs (as of session end)

- Marketing site: `https://www.my4mlife.com` — CloudFront `E3J19LI34BC2VR`
- App / PWA: `https://app.my4mlife.com` — CloudFront `E2RJ7NRPD4MN2X`
- AWS account: `879696522760`, region `us-east-2` (Bedrock cross-region to `us-east-1`)

---

### Pick-up checklist for next session

1. Read this file + memory index.
2. **Deploy the website** — source is ahead of live by ~30 commits; run `website/deploy.sh` to push latest build.
3. Work through `docs/QA-walkthrough.md` (site) and `docs/QA-app-walkthrough.md` (app) — address critical and functional issues first.
4. Unblock P0 items in `docs/plan/lead-capture-stripe-ai-concierge.md` (requires TJ: BAA, Bedrock access, Stripe keys, attorney docs).
5. Once P0 done: execute P1 of the lead-funnel plan.
6. Replace W2/W3 factor dropdowns with AUDIT_CATEGORIES source (`renderer.ts:428–436`).
7. Fix W2/W3 score-input scale inconsistency (1–5 vs 0–10 stored).
8. OG image — produce a 1200×630 PNG and replace SVG references sitewide.

---

## Prior session: 2026-04-19 (late evening + overnight autonomous push)

## Repo layout
```
LDRGLPRx/
  website/           Astro marketing site (static output)
  website_legacy/    Pre-Astro HTML (reference; safe to delete)
  apps/clientportal/ Svelte 5 + Vite + TS (4M workbook + Discovery flow + tier/pricing)
  docs/              HANDOFF.md, intake_questionnaire.md, 4m_deck_extract.txt, plan/
```
- Git remote: `github.com/TJMundheim/LDRGLPRx`, branch `main`
- Package manager: **pnpm**. Node 24 via pnpm.
- Compliance NOTE: user's legal team has pre-approved all products, Rx, claims, marketing language discussed in the current thread — do NOT add compliance caveats beyond MedicalDisclaimer component. Exception: always flag HIPAA issues.

## Strategic north star (memory-backed, summarized)
- Goal: AI-operated telehealth + pharmacy commerce business in brain-healthspan. Medvi-scale revenue target.
- Every workflow should be agent-runnable (intake, triage, coach, marketing, support, compliance) — human clinician signs Rx decisions.
- **BiomeAxisForge** is the hero flagship (gut → brain); **Genesis RPA** is the marquee regenerative upsell; **GLP-1 / hormone / peptide / nootropic** tracks stack underneath.
- Target audience for the 4M cohort product: men 35-60. Platform itself is broader.
- 4M = **Mitigate · Muscle · Mind · Motivate** — four weekly pillars of Month 1. Months 2-4 add build/intensify/integrate.

## Product architecture (as built in this session)

### Two pricing layers coexist:
1. **Cohort tiers (Month-1 entry)** — one-time: $197 Foundation / $497 Clinical / $697 Full Optimization + $67/mo ongoing. Source: `4M_Sales_Presentation_PRESENTER.pptx`.
2. **Long-term membership tiers** — $0 Discovery / $99/mo Foundation ($499 onboarding) / $299/mo Optimization / $799/mo Longevity / $1,499/mo Concierge. For post-cohort graduation and standalone product funnels.

### Proprietary Rx formulas (compounded via MD Specialty Group):
- **BiomeAxisForge** — Wk 1 gut-brain (BPC-157 + L-Glutamine + Aloe) · $249/cycle retail
- **SleepRestore** — Wk 1 deep sleep (Mg bisglycinate + Glycine + KSM-66 + L-Theanine + Apigenin + Zinc) · $149/cycle
- **ArmorVita** — Wk 2 fat-soluble defense (D3+K2+Boron+Astaxanthin+Vit A) · $89/cycle
- **NeuroBridge** — Wk 3 methylated B-complex (B12 methylcobalamin + 5-MTHF + P-5-P) · $99/cycle

### Genesis RPA (regenerative):
- Routes: intra-articular, IV, nebulizer, intrathecal, intranasal
- Nationwide mobile provider partner
- COGS ~$5K (vial $2,500 + provider $500 + overhead); retail $9,500 single / $27,500 3-pack protocol
- Helps with: joint injuries, post-concussion, MCI/cognitive decline, long-COVID, chronic inflammation
- Source: genesisregenerative.com (marketing freedom — not under FDA scrutiny like other stem-cell products)

## Client portal — `apps/clientportal/` — current state

### New in this session (all typechecked + built clean):

**Data + content layer**
- `src/lib/data/catalog.ts` — Product, LabPanel, MembershipTier, PricingModel, TierAvailability types
- `src/lib/data/intake.ts` — IntakeSection, IntakeQuestion union, TriggerRule, IntakeAnswer, IntakeResult, TierRec
- `src/lib/content/products.ts` — 25 products (BiomeAxisForge, Genesis RPA, SleepRestore, ArmorVita, NeuroBridge, GLP-1 sema+tirz, ED, TRT, HRT, Enclomiphene, Ketamine, Semax, Selank, Cerebrolysin, DSIP, Epitalon, Methylene Blue, 3 sleep Rx, 4 branded stacks, PBM device, CGM)
- `src/lib/content/labs.ts` — 10 lab panels (Foundation, Cognitive, Gut+Brain, Genomic Blueprint, Hormone, Brain Biomarkers, Sleep Study, Mycotoxin, Heavy Metals, Cardiovascular)
- `src/lib/content/tiers.ts` — 5 membership tiers + 4 cohort tiers; `cohortTiers` / `membershipTiers` filtered exports
- `src/lib/content/intakeQuestions.ts` — 87 questions across 12 sections; every question maps to product/lab triggers
- `src/lib/content/pillars.ts` — 4 pillars (Mitigate/Muscle/Mind/Motivate) with deck-sourced taglines
- `src/lib/content/monthProgression.ts` — M1-M4 + Maintenance; Month 1 includes Genesis RPA bonus module at end of Week 4

**Intake engine**
- `src/lib/intake/router.ts` — pure `evaluateIntake()` walks answers, fires triggers, dedupes, computes recommended tier + domain priorities + clinicianFlags. BiomeAxisForge default-on rule.
- `src/lib/intake/report.ts` — `buildIntakeReport()` returns structured output for UI (headline, summary, priorityCards, products, labs, tier, suggestedCart)

**AI coach (scaffolded, stubbed)**
- `src/lib/integrations/coach.ts` — CoachContext, CoachMessage, CoachReply types; `sendCheckIn / generateWeeklyReport / respondToMessage / generateIntakeReport` all throw "Not implemented" with TODO to wire `@anthropic-ai/sdk`. Model selection: Opus 4.7 for concierge, Sonnet 4.6 otherwise.
- `src/lib/coach/prompts.ts` — SYSTEM_PROMPT_BASE, MONTH_PROMPTS per 1/2/3/4/maintenance, WEEKLY_CHECKIN_TEMPLATE, INTAKE_REPORT_TEMPLATE, ESCALATION_RULES
- `src/lib/coach/scheduler.ts` — `nextCheckInTime()` — tier-aware cadence

**Discovery flow UI (Tier 0 entry)**
- `src/lib/components/discovery/DiscoveryFlow.svelte` — state machine: welcome → intake → report → checkout
- `WelcomeScreen.svelte` — opening hook + AvatarPlaceholder + CTA
- `AvatarPlaceholder.svelte` — placeholder for HeyGen/Synthesia video; accepts `videoUrl?` prop
- `IntakeForm.svelte` — renders 87-question intake with progress bar, sex-aware section skipping, save-as-you-go
- `IntakeReport.svelte` — AI-generated summary, priority cards, recommended tier, products, labs, clinicianFlags banner, pre-loaded cart
- `CheckoutStub.svelte` — cart display + disabled Stripe button + mailto booking

**Tier / pricing UI**
- `src/lib/components/tiers/TierCard.svelte` — unified card for cohort + membership tiers
- `PricingPage.svelte` — hero + cohort section + membership section + comparison table + CTA to Discovery quiz
- `TierComparisonTable.svelte` — feature matrix × 5 membership tiers
- `CohortBanner.svelte` — sticky "Next cohort starts [DATE]" banner (dates hardcoded — TODO)
- `CartPreview.svelte` — sticky right-side cart

**Program (4M pillars)**
- `src/lib/components/program/PillarBanner.svelte` — displays pillar numeral/name/tagline from deck
- `src/lib/components/program/MonthProgressRail.svelte` — M1→M2→M3→M4→Maintenance rail

**App wiring**
- `App.svelte` has `currentView` options: existing workbook views + `'discovery'` + `'pricing'`
- `Sidebar.svelte` includes "✦ Discovery Intake" and "Pricing & Tiers" entries
- `?view=discovery` query param supported for deep links

### Build/typecheck status
- `pnpm -C apps/clientportal check` — 0 errors, a few Svelte a11y warnings (pre-existing + some new benign ones)
- `pnpm -C apps/clientportal build` — passes, ~230KB JS / ~40KB CSS gzipped

### Added in overnight autonomous push

**Outcome capture UI**
- `src/lib/data/schema.ts` — extended `Workbook` with `weeklyOutcomes?: WeeklyOutcome[]`
- `src/lib/content/outcomeQuestions.ts` — maps protocol slugs to which outcome domains to ask about
- `src/lib/components/outcomes/OutcomeCheckIn.svelte` — weekly slider form
- `src/lib/components/outcomes/OutcomeTrendChart.svelte` — SVG line chart, no deps
- `src/lib/components/outcomes/OutcomePanel.svelte` — container w/ due-check-in indicator

**Coach/admin view**
- `src/lib/integrations/auth.ts` — added `role?: 'patient' | 'clinician' | 'admin'` (dev stub = admin)
- `src/lib/data/adminQueue.ts` — QueueItem types + `getPendingQueue()` + `resolveQueueItem()` (5 seed items, localStorage-backed)
- `src/lib/components/admin/AdminDashboard.svelte` — urgency + patient + intake stat cards
- `src/lib/components/admin/QueueList.svelte` — approve/edit/defer/escalate workflow
- `src/lib/components/admin/PatientOverview.svelte` — de-identified patient detail
- Admin nav entry hides for non-admin/clinician roles

**Anthropic coach proxy Lambda**
- `lambdas/coach-proxy/src/handler.ts` — 68-line handler, API Gateway event, calls Anthropic SDK
- `lambdas/coach-proxy/package.json` + `tsconfig.json` + `README.md`
- `lambdas/coach-proxy/infra/deploy.sh` — esbuild + zip + commented AWS CLI
- `apps/clientportal/src/lib/integrations/coach.ts` — rewired to POST to proxy via `VITE_COACH_PROXY_URL`; falls back to clinician-escalation on error; tier-based model selection (opus for concierge, sonnet otherwise)

**Website deploy skeleton**
- `website/deploy.sh` — `pnpm build` + S3 sync + CloudFront invalidation. Exits 1 with friendly error until `DOMAIN` / `BUCKET` / `DISTRIBUTION_ID` are filled in.

**Tests**
- `apps/clientportal/package.json` — added vitest devDep + `test` script
- `src/lib/intake/router.test.ts` — 10 tests covering BiomeAxisForge default-on, meniscus → Genesis RPA, post-concussion clinician flag, BMI → GLP-1, APOE memory → biomarkers, tier escalation, SI screener → concierge
- `src/lib/intake/report.test.ts` — 3 tests covering tier flow, cart totals, clinician flags
- All 13 tests pass

### Still pending on portal
- **Integration wiring** (all stubs):
  - `integrations/auth.ts` → Supabase (recommended) or alternative
  - `integrations/payments.ts` → Stripe (need account, price IDs, webhook secret)
  - `integrations/telemed.ts` → vendor TBD (Healthie / Spruce / iframe)
  - `integrations/coach.ts` → deploy the Lambda (already built) and set `VITE_COACH_PROXY_URL`
- **AI avatar video** — user to provide deck rendered through HeyGen/Synthesia; drop URL into AvatarPlaceholder
- **Pharmacy partner API** — MD Specialty Group for Rx fulfillment (BiomeAxisForge, SleepRestore, ArmorVita, NeuroBridge, peptides)
- **Mobile provider API** — Genesis RPA scheduling + administration tracking
- **Lab vendor** — Rupa Health or Evexia for direct-to-consumer lab ordering
- **Legacy Week 2/3/4 content** — still in `src/app.js.legacy`, not yet ported to typed content modules (overnight attempt timed out; punt to next session)
- **Cohort dates** — hardcoded placeholder `[DATE]` strings; needs CMS/config
- **Product photography / illustrations** — none yet; placeholders throughout
- Re-test scheduling (auto lab re-order cadence) — not built
- Full patient list + search for admin view (currently mock)
- IaC (CloudFormation/CDK/Terraform) in `infra/` to deploy the Lambda + API Gateway

## Marketing site — `website/` — current state

### New pages this session (Astro static; `pnpm -C website build` passes, 19 pages total):
- `src/pages/4m-cohort.astro` — full sales deck translated slide-by-slide. Hero, symptom check, ED-as-vascular-canary, reframe, 15 factors, science quotes, 4 pillars, labs, 4 proprietary formulas, before/after, 3-tier pricing ($197/$497/$697), 3-step onboarding, closing. MedicalBusiness + FAQPage JSON-LD.
- `src/pages/biomeaxisforge.astro` — standalone funnel, 4-beat narrative, mechanism cards, advantages, evidence stats, conditions, dosing, pricing, Foundation upsell. Drug + MedicalWebPage JSON-LD.
- `src/pages/genesis-rpa.astro` — 5 routes, 3-column indications, differentiators, pricing ($9,500/$27,500/Longevity discount). MedicalProcedure JSON-LD.
- `src/pages/tiers.astro` — cohort + membership split + comparison table. Service + Offer JSON-LD.
- `src/pages/protocols.astro` — overview of protocol families with links to detailed pages or Discovery quiz.
- `src/components/Navbar.astro` — added "4M Cohort", "Protocols", "Tiers" links.

### Still pending on website
- Booking system URL — all CTAs currently mailto:drtj@essentialmanage.com (needs Cal.com / Calendly / booking vendor)
- Client portal URL — `https://app.ldrglprx.com` is placeholder until domain + deploy
- Cohort start/enrollment dates — `[DATE]` placeholders on 4m-cohort page
- Product photography + video — placeholders
- Deploy script (`deploy.sh`) for S3+CloudFront+ACM — still unwritten (blocked on domain registration)
- Canonical domain `ldrglprx.com` — not yet registered (user still deciding product name)
- `website_legacy/` — safe to delete when confident

## Docs
- `docs/HANDOFF.md` — THIS FILE
- `docs/intake_questionnaire.md` — 12-section intake content spec (source for intakeQuestions.ts)
- `docs/4m_deck_extract.txt` — full slide-by-slide extract of the sales presentation (source of marketing voice)

## User preferences (durable)
- Terse responses, no emojis
- pnpm, not npm/yarn
- Confirm scope before big refactors (except now — user granted autonomy to build everything we discussed)
- Don't over-engineer; no premature abstractions
- Compliance pre-approved on anything presented; don't flag again
- HIPAA always flag
- Marketing site via `deploy.sh`, not manual CLI

## Recent git commits (pre-session)
```
90e6be6 Port client portal to Svelte 5 + TS, stub integrations, update handoff
a6ed59e Expose handler functions on window so inline onclick attrs resolve
386f7c6 Trim project CLAUDE.md — global rules moved to ~/.claude/CLAUDE.md
40ee252 Port static site to Astro with shared components and layouts
717ac44 Migrate to Vite PWA (clientportal), Astro (website), add project rules
```

## Pick-up checklist for next session

1. Read this file.
2. Read memory index: `~/.claude/projects/-Users-thomasmundheim-Desktop-Development-LDRGLPRx/memory/MEMORY.md`
3. Run: `pnpm -C apps/clientportal dev` + `pnpm -C website dev` and smoke-test the new pages.
4. Priority next items (likely, in order):
   - Deliverables from user: Stripe account, telemed vendor choice, Supabase project, domain name, HeyGen/Synthesia avatar render
   - Wire `integrations/payments.ts` to Stripe
   - Wire `integrations/auth.ts` to Supabase; swap `LocalStorageAdapter` for `SupabaseAdapter`
   - Wire `integrations/coach.ts` to Anthropic SDK via server proxy (Lambda under `lambdas/`)
   - Wire `integrations/telemed.ts` to chosen vendor
   - Render AI avatar video, drop URL into `AvatarPlaceholder`
   - Port Week 2/3/4 legacy content from `src/app.js.legacy` → typed `content/` modules
   - Build coach/admin view (TJ sees all patient state + AI agent queue)
   - Write `deploy.sh` once domain registered

## Future Work

- Week 4 audit redo: re-present the 20-category Discovery Questionnaire (same anchors + follows as intake) so users can compare scores apples-to-apples vs. baseline. Render delta per category. Reuses `discovery.ts` + `audit.ts` infrastructure already in place.
