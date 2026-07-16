# Corporate Wellness Vertical — DRAFT for TJ review (2026-07-15)

**Status: DRAFT. Nothing built. No brand, URL, or pricing final.**
Companion to [ambassador-program-draft.md](ambassador-program-draft.md) and
[captains-table-draft.md](captains-table-draft.md). TJ-locked inputs tagged **[TJ]**.

Origin: TJ's pre-My4MLife direction, revived 2026-07-15 after reviewing
CoreHealth (corehealth.global). Earlier Claude analysis of the $30M/3yr goal
recommended corporate wellness as a significant revenue pillar **[TJ]**.

---

## 1. Strategy — flank CoreHealth, don't rival it

CoreHealth (est. 2004) is an **engagement** platform: HRAs, challenges,
incentives, wearable integrations, 26 languages, ISO 27001, white-label tiers
(NOW / Checkpoint / Pro), sold via demo to enterprises and wellness vendors.
Rebuilding that feature wall head-on = multi-year, multi-million, wrong fight.

**Our wedge — the inverted model [TJ]:** skin a corporate wellness presentation
over My4MLife's existing clinical engine:

> assessment → clinical protocol → telehealth + products → measurable score improvement

Engagement platforms gamify steps and outsource outcomes. We change biology and
capture the commerce. The platform fee is the door; product/Rx margin is the
business — the same conversion-first architecture the consumer side already runs.

## 2. The two-layer revenue model [TJ]

1. **Employer pays a small PEPM** (per-employee-per-month, ~$2–5 proposed) for
   platform access — the predictable SaaS layer. 50K covered lives × $3 = $1.8M/yr.
2. **Employees buy outcomes** at below-market "employee benefit" pricing —
   supplements (Biome NS etc.), sleep/weight/cognitive protocols, telehealth
   consults — via the existing Stripe cart. Employer isn't billed for these.

Structurally identical to the consumer freemium: the employer plays the role
the free assessment plays today (paid door, monetized journey).

## 3. What already exists (~60–70% of an MVP)

- 20-question MindSpan assessment engine (2026-07-14): scoring, bands, top-3,
  on-screen + email results — question set is already near-universal
- MindSpan Score = the outcome metric an HR dashboard can watch move
- 12-week program app: adherence engine, weekly vitals, Moves, cohort mechanics
- Stripe LIVE commerce + order handler + digital fulfillment + guide automation
- Telehealth funnel (5 rx categories) + EMR-lite + async visit model
- Email/SMS infra, Cognito auth, PostHog analytics, AI-concierge architecture
- Content library: book, workbook, fast-start guides, solution pages
- Serverless AWS — tenant-taggable without re-architecture
- Enterprise design mockups already delivered (docs/design/enterprise-design-directions.html)

## 4. The gap list (in order of weight)

1. **Multi-tenancy** — employer orgs; employer code at signup; tenant tag on
   Contact/Users; **HR dashboard = aggregate + anonymized only** (participation,
   risk-band distribution — NEVER individual scores; that's the trust line and
   the ADA/GINA line).
2. **New brand + URL + de-gendered presentation** — the men-only HARD commit is
   a My4MLife *brand* rule; this is a separate brand for everyone **[TJ]**.
   Needs: neutral assessment variant (#18 sexual-function gets a neutral
   counterpart), own copy voice, own photography direction.
3. **B2B billing** — PEPM invoicing per employer (Stripe), seat/roster
   management, eligibility-file import.
4. **Engagement table stakes** — team challenges, points/recognition. Demo-ware
   HR buyers expect, not outcome drivers. Phase 2.
5. **Enterprise tail** — SSO/SAML, wearable integrations, SOC 2, per-employer
   DPAs. Enterprise deals die without these; SMB pilots don't ask. Phase 3.

## 5. Phased workload

- **Phase 1 — pilot-able skin (weeks at current velocity):** new domain +
  Astro site reusing the component library; neutral assessment variant;
  employer-code signup w/ tenant tagging; minimal HR aggregate dashboard;
  employee store at benefit pricing; manual PEPM invoicing. Sell + run 1–3
  small employers.
- **Phase 2 (after pilot revenue):** challenges/leaderboards, roster import,
  automated PEPM billing, richer reporting, SSO.
- **Phase 3 (real enterprise at the table):** wearables, SOC 2, broker/TPA/PEO
  channel — the front door for the sequestered insurance/PEO vertical
  (project_insurance_peo_vertical, raised 2026-05-02).

## 6. Distribution — the structural advantage

Corporate wellness is **sold, not bought** (demos, pilots, HR champions,
renewal cycles). The build is weeks; the pipeline is the work. Existing edges:
- **MD Specialty Group seminar circuit** — every lunch-seminar host and
  physician/clinic network contact is a small-employer prospect; the Pop Quiz
  handout IS the corporate HRA demo, already branded for a partner.
- White-label precedent already proven (seminar = My4MLife material under MD
  Specialty Group's name).
- Ambassador/Graduate alumni as workplace champions — the man whose company
  adopts the platform because his own transformation was visible.

## 7. Open decisions for TJ

1. Brand + URL (separate naming exercise; nothing proposed yet).
2. PEPM price point and minimum seats.
3. Pilot target: MD Specialty Group network first, or an independent SMB?
4. How much of the 4M/voyage identity carries over vs. a clean-sheet voice.
5. Whether employee benefit pricing conflicts with the "all discounts killed
   pre-launch" rule on the consumer side (separate brand likely exempts it —
   confirm intent).
6. Sequencing vs. ambassador program and Captain's Table — all three are
   drafted; which gets built first when TJ is ready.
