# LDRGLPRx — Handoff

Last updated: 2026-04-19 (late evening + overnight autonomous push).

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
