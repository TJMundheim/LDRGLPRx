# My4MLife — Pre-Launch Handoff

**Date:** 2026-06-14
**Audience:** External reviewer evaluating launch-readiness
**Owner:** Dr. TJ Mundheim (`drtj@my4mlife.com`)
**Status:** Soft-launch ready except for the Stripe price wiring on 3 of 5 Rx pathways. ~5 hours of TJ-driven work + 2 hours of code-driven work remaining before public marketing trigger.

---

## 1. What the system does (one paragraph)

My4MLife is a dual-funnel telehealth + cohort platform built around the **4M Framework** (Mind, Muscle, Mitigate, Motivate). Visitors enter via one of two lanes: (a) the **Cohort lane** — take a free 5-minute 4M Assessment, become a Protégé, receive the book + workbook + app + weekly Zoom access — or (b) the **Direct-buy Rx lane** — pick a category (GLP-1, Testosterone/ED, Leaky Gut, Regenerative, Peptides), complete a multi-step health questionnaire, save a payment method via Stripe SetupIntent, get matched with a network telemedicine physician who reviews asynchronously and writes the prescription. Care coordinator (TJ) is the manual workflow operator at launch; automation routes the patient → script → subscription pipeline in Phase 2.

---

## 2. Architecture summary

### Public-facing
- **Marketing site:** Astro static site at `my4mlife.com` (origin: AWS S3 + CloudFront)
- **App / Protégé portal:** Svelte 5 PWA at `app.my4mlife.com` (S3 + CloudFront)
- **API:** AWS API Gateway HTTP API at `v9svm8ds74.execute-api.us-east-2.amazonaws.com`

### Backend
- **Lambdas** (all in `us-east-2`):
  - `my4mlife-audit-complete` — assessment submission → Cognito user + UserProfile seed + welcome email with book/workbook/app links
  - `my4mlife-create-checkout-session` — Stripe one-time + subscription checkout
  - `my4mlife-create-setup-intent` — Stripe SetupIntent for card-on-file capture (questionnaire step 5)
  - `my4mlife-email-sender` — central SES sender (invoked by other Lambdas)
  - `my4mlife-protege-signup` — legacy direct Protégé signup (still wired, no longer linked from any user-facing page)
  - `my4mlife-daily-digest` — 6am daily summary to `drtj@my4mlife.com`
  - `my4mlife-approval-queue` — autonomous AI action approvals routed to TJ
  - `my4mlife-inbound-handler` — AI concierge (source updated for new pricing; NOT YET DEPLOYED — see Section 4)
- **DynamoDB tables:**
  - `Contact` — leads + Protégés keyed on UUIDv5 of email
  - `Users` — UserProfile keyed on Cognito `sub`
  - `Adherence` — daily check-in log
  - `WeeklyOutcome` — outcome tracking
- **Cognito:** User pool `us-east-2_kIpKnr17R`. Custom OTP auth (passwordless 6-digit code via email). `Admins` group has exactly one member: `drtj@my4mlife.com`.
- **S3 buckets:**
  - `my4mlife-digital-fulfillment` — public-read on book + workbook only (lead-magnet distribution)
  - `website-my4mlifecom` — marketing site static hosting
  - App bucket for `app.my4mlife.com`

### External integrations
- **Stripe** (live mode) — products + subscriptions + SetupIntent. Webhook routing via EventBridge (see `docs/plan/stripe-eventbridge-architecture.md`)
- **Google Workspace** — domain email (`info@`, `support@`, `drtj@` all routed via `smtp.google.com` MX record)
- **AWS Bedrock** — Claude models for AI concierge (HIPAA-compliant — see memory `project_hipaa_architecture.md`)

---

## 3. What is LIVE and verified end-to-end

| Capability | Status | Verification |
|---|---|---|
| Cohort funnel (assessment → email → book/workbook/app) | ✅ Live | TJ verified 2026-06-11 |
| Book v5 download URL (clean, no version leak, never expires) | ✅ Live | Bucket policy + direct URL |
| Workbook download URL (same) | ✅ Live | Same |
| App sign-in via OTP (passwordless) | ✅ Live | TJ verified 2026-06-14 |
| Admin tabs (Protégés + Events) — Queue tab removed | ✅ Live | TJ verified 2026-06-14 |
| Full Month 1 access in app (no week-gating) | ✅ Live | For UX testing |
| Direct-buy Rx — GLP-1 questionnaire | ✅ Live | TJ verified 2026-06-13 |
| Direct-buy Rx — Peptides questionnaire | 🟡 Page live, Stripe price IDs PLACEHOLDER | Built 2026-06-14 |
| Direct-buy Rx — Leaky Gut questionnaire | 🟡 Page live, Stripe price ID PLACEHOLDER | Built 2026-06-14 |
| Direct-buy Rx — Testosterone/ED questionnaire | 🟡 Page live, Stripe subscription price PLACEHOLDER | Built 2026-06-14 |
| Direct-buy Rx — Regenerative intake | ✅ Live | No Stripe needed |
| `/consult` care-coordinator notification | ✅ Live | TJ verified 2026-06-11 |
| Stripe receipts on workbook purchase | ✅ Live | TJ verified 2026-06-10 |
| Daily digest counts new Protégés | ✅ Live | Bug fixed + Randall backfilled 2026-06-11 |
| Cognito admin access for TJ | ✅ Live | Added 2026-06-14 |
| Privacy: `drtj@my4mlife.com` not publicly exposed | ✅ Verified | Sweep complete 2026-06-14 |
| Inbound-handler Lambda (AI concierge) deployed | 🟡 Deployed, dormant | Active 2026-06-14; SES trigger not yet wired |

---

## 4. PRE-LAUNCH BLOCKERS (must complete before public marketing)

### 🔴 P0 — Cannot launch without

#### 1. Create 5 Stripe products + wire their price IDs (TJ + Claude, ~30 min total)
TJ creates in Stripe dashboard (live mode, recurring monthly):
- Peptide Program — Tier 1 (Foundation) — **$199/month**
- Peptide Program — Tier 2 (Stack) — **$249/month**
- Peptide Program — Tier 3 (Advanced) — **$299/month**
- Biome NS Rx (Leaky Gut) — **$199/month**
- Testosterone Maintenance — **$129/month**

Then sends 5 `price_…` IDs. Claude runs search-replace on the 5 `PLACEHOLDER_*` strings in the questionnaire files (locations in Section 8), rebuilds, deploys. Without this, Peptides / Leaky Gut / Testosterone questionnaires error on step 5.

#### 2. KDP book cover wrap upload + first print order (TJ)
- Upload v5 PDF (`docs/book/Begin-with-the-End-in-Mind-v5.pdf`) to Amazon KDP as draft
- Get KDP-generated cover trim template (depends on final page count + paper choice)
- Send template to Claude → renders full wraparound PDF (front + spine + back)
- Approve KDP print proof
- Order first marketing-event print run

#### 3. End-to-end live test of every Rx questionnaire (TJ)
- Run the 4 new questionnaires (Peptides / Leaky Gut / Testosterone / Regenerative) on production using `drtj@my4mlife.com`
- Use real Stripe test card (`4242 4242 4242 4242`) on step 5 of the three SetupIntent ones — confirm card saves without charging
- Confirm each fires a care-coordinator notification email
- Verify formatting of the review-summary cards (step 6)
- Estimated 20 minutes

#### 4. Inbound-handler Lambda first deploy (Claude) — ✅ DONE 2026-06-14
- `lambdas/inbound-handler/src/system-prompt.ts` was updated to remove old discount-tier copy and reflect locked pricing
- ✅ `infra/deploy.sh` upgraded from a zip-only stub to a full idempotent IaC deploy (IAM role + create/update function + env vars), matching the `audit-complete`/`create-setup-intent` pattern
- ✅ Deployed: `my4mlife-inbound-handler` is **Active** (nodejs20.x, 512MB, 30s, role `my4mlife-inbound-handler-role`). Empty-event sanity invoke returns 200.
- ⚠️ **Function is deployed but DORMANT — no trigger wired.** It's an SES receipt handler, but there's no active SES receipt rule set and the domain MX points to Google Workspace. Standing up SES inbound receiving (receipt rule set + S3 inbound bucket + MX decision) is a separate deliberate step — moved to P2 "automated routing." The concierge will not respond to inbound email until that pipeline exists.

#### 5. `info@my4mlife.com` Google Workspace forwarding (TJ)
- Currently MX-routed to Google, but it's unclear where `info@` lands inside Google Workspace
- Configure forwarding to `drtj@my4mlife.com` so lead replies actually reach TJ
- 5 minutes inside `admin.google.com`

---

### 🟡 P1 — Should complete before launch, but tolerable to defer 1 week

#### 6. DocuSign envelope content for Stage 2 HIPAA gate (TJ)
- Per locked plan (see memory `reference_legal_docs_location.md`), when a care coordinator confirms a consult time, an automated DocuSign envelope sends NPP + Patient Authorization for the patient to sign before the consult is locked
- MVP for launch = care coordinator manually sends the DocuSign envelope from a personal account using a pre-built template
- Phase 2 = DocuSign API automation from the questionnaire submission webhook
- Legal docs already drafted in `docs/legal/` — content is ready, just needs DocuSign template creation

#### 7. Friends-and-family E2E test cycle (TJ)
- TJ has friends queued for UX testing
- They walk all 4 weeks of the app (full Month 1 is unlocked for them)
- Goal: collect UX feedback before public marketing
- 1-week window

#### 8. Endorsement outreach kickoff (TJ)
- Tony Robbins warm lead via TJ's MD partner — start the intro chain this week
- Tier 1 cold outreach (Attia / Hyman / Huberman / Amen) sent in parallel
- Letter template at `docs/book/draft/_outreach-endorsement-letters.md`
- Endorsements add to back-cover v2 reprint post-launch (current v1 print ships with 3 placeholder slots removed)

#### 9. Headshot confirmation for back cover (TJ)
- Current placeholder uses `website/public/images/founder/founder-tj.jpg`
- Confirm or supply preferred photo for the back-cover mockup at `docs/book/cover/back-cover-mockup-v1.html`

---

### 🟢 P2 — Post-launch hardening (do during the first 30 days)

#### 10. Questionnaire Phase 2 hardening
- **ID verification upload** (driver's license + selfie) — currently deferred to care-coordinator email request
- **Automated physician routing** — currently care coordinator manually forwards each submission
- **Auto-create Stripe Subscription on physician approval** — currently care coordinator manually creates the subscription in Stripe dashboard after the consult

#### 11. Stripe webhook automation
- See `docs/plan/stripe-eventbridge-architecture.md`
- Subscription lifecycle events → Contact table updates → automated drip campaigns

#### 12. SMS phone-number approval (TJ + Twilio)
- SMS-based OTP fallback for app sign-in
- SMS nudge campaign for high-scoring assessment categories (today email-only)
- Needs Twilio phone number registration + A2P 10DLC campaign approval

#### 13. Bedrock daily token quota raise (TJ)
- Default Bedrock quota will throttle the AI concierge at scale
- Request quota increase via AWS Support before marketing volume hits

#### 14. Zoom S2S credentials (TJ)
- For automated Zoom session creation + recording-URL posting
- Currently care coordinator manually creates + pastes URLs into EventsAdmin tab

#### 15. Privacy / HIPAA disclosure pages
- `/privacy` exists (256 lines)
- Legal docs in `docs/legal/` — NPP, BAA, AI Communication Consent, Patient Authorization
- Currently the only public-facing consent is the AI-comms checkbox on the assessment (Stage 1 of locked 3-stage gating plan)
- Stage 2 (DocuSign at consult-scheduling) handled by Section 6 above

---

## 5. KNOWN ISSUES / non-blockers worth tracking

- **Group consult scaling model** is documented for future scaling (see memory `project_group_consult_scaling_model.md`) but not built — fine for launch with 1:1 physician consults via the network partner
- **Item #11b: Assessment retake re-seeds app correctly** — flagged 2026-06-01, likely resolved by audit-complete UserProfile-seeding work on 2026-06-09 but never re-tested
- **CRITICAL Stripe E2E #1/#2/#3** — three test walkthroughs against the Stripe sandbox were drafted but never executed end-to-end; partially superseded by GLP-1 live verification
- **TJ book read-through** — TJ said he'd do a full read of v5 PDF before final print; not yet logged as complete

---

## 6. WHO does WHAT next (24-hour view)

| Owner | Action | Estimate |
|---|---|---|
| TJ | Create 5 Stripe products, send 5 price IDs | 15 min |
| TJ | Configure `info@my4mlife.com` → `drtj@my4mlife.com` forwarder in Google Workspace | 5 min |
| TJ | Upload v5 PDF to KDP, get cover template | 30 min |
| TJ | Run E2E test on 4 new Rx questionnaires | 20 min |
| Claude | Search-replace placeholder price IDs once TJ sends them | 5 min |
| Claude | Render full KDP wraparound cover once TJ sends template | 15 min |
| Claude | Deploy `my4mlife-inbound-handler` Lambda | 10 min |

**Sum:** ~100 min of human + ~30 min of code work to clear all P0 blockers.

---

## 7. CREDENTIAL + ACCESS INVENTORY

| System | Where credentials live | Who has access |
|---|---|---|
| AWS root account | TJ (personal vault) | TJ only |
| AWS Console (admin IAM) | TJ | TJ |
| Stripe live + test | Stripe dashboard, also in `all-stripe-keys` Secret Manager | TJ |
| Cognito Admins group | Single member: `drtj@my4mlife.com` | TJ |
| Google Workspace admin | `admin.google.com` | TJ |
| GitHub repo | `git@github.com:TJMundheim/LDRGLPRx.git` | TJ |
| Domain (Route 53) | Hosted zone `Z045463539AAKM7D8P48V` | TJ |

**No shared credentials, no contractor access, no team admin handoff documented.**

---

## 8. FULL PROJECT STRUCTURE — file paths

Root: `/Users/thomasmundheim/Desktop/Development/LDRGLPRx/` (note: `LDRGLPRx` is the legacy repo name; brand is `My4MLife`)

### Marketing site (Astro)
```
website/
├── astro.config.mjs
├── deploy.sh                              ← CloudFront invalidation + S3 sync
├── package.json
├── public/
│   └── images/founder/founder-tj.jpg     ← current headshot for back cover
└── src/
    ├── components/
    │   ├── Navbar.astro                   ← top nav with 5 Rx pills
    │   ├── FoundationStackPair.astro
    │   ├── OtcRxTopOptions.astro
    │   ├── RxConsultCTA.astro
    │   └── InterimPickCard.astro
    ├── data/
    │   ├── audit-questions.ts             ← 10 assessment questions
    │   ├── audit-solutions.ts             ← assessment → Rx mapping
    │   └── skus.ts                        ← Stripe SKU registry
    ├── layouts/
    │   ├── BaseLayout.astro
    │   └── SolutionPage.astro
    └── pages/
        ├── index.astro                     ← homepage
        ├── assessment.astro                ← THE single funnel entry
        ├── consult.astro                   ← care-coordinator intake form
        ├── thank-you.astro                 ← post-purchase confirmation (branches on sku)
        ├── privacy.astro
        ├── about.astro
        ├── cart.astro
        ├── solutions/                      ← long-form cohort-funnel pages (one per category)
        └── rx/                             ← DIRECT-BUY RX FUNNEL
            ├── weight-loss.astro           ← GLP-1 hook
            ├── weight-loss/
            │   └── questionnaire.astro    ← GLP-1 6-step questionnaire ✅ wired
            ├── peptides.astro
            ├── peptides/
            │   └── questionnaire.astro    ← Peptides 6-step ⚠️ Stripe placeholders
            ├── leaky-gut.astro
            ├── leaky-gut/
            │   └── questionnaire.astro    ← Leaky Gut 6-step ⚠️ Stripe placeholder
            ├── testosterone-ed.astro
            ├── testosterone-ed/
            │   └── questionnaire.astro    ← Testo/ED 6-step (men-only) ⚠️ Stripe placeholder
            ├── regenerative-medicine.astro
            └── regenerative-medicine/
                └── questionnaire.astro    ← Regenerative 4-step ✅ no Stripe needed
```

### App / Protégé portal (Svelte 5 PWA)
```
apps/clientportal/
├── deploy.sh                              ← S3 sync + invalidation for app.my4mlife.com
├── package.json
└── src/
    ├── App.svelte                          ← entry
    ├── app.css                             ← global theme (#F4F6F2 cream, #1A2E1E text)
    └── lib/
        ├── auth/
        │   ├── cognito.ts                  ← OTP sign-in flow
        │   └── store.svelte.js             ← currentUser + groups
        ├── components/
        │   ├── auth/EmailEntry.svelte      ← sign-in form (single-funnel-aware)
        │   ├── admin/
        │   │   ├── AdminDashboard.svelte   ← tab router (Protégés + Events only)
        │   │   ├── ProtegesPanel.svelte    ← member list
        │   │   ├── EventsAdmin.svelte      ← Zoom recording URL paste
        │   │   ├── Forbidden403.svelte
        │   │   ├── PatientOverview.svelte
        │   │   └── QueueList.svelte        ← rendered but tab hidden
        │   ├── intake/                     ← assessment Likert + capture
        │   ├── outcomes/                   ← weekly check-ins
        │   └── program/                    ← monthly progression rail
        ├── content/
        │   ├── monthProgression.ts         ← month-by-month protocol
        │   ├── outcomeQuestions.ts
        │   ├── pillars.ts
        │   └── products.ts                 ← OTC + Rx catalog
        ├── data/
        │   ├── adminQueue.ts               ← SEED_QUEUE no longer rendered
        │   └── catalog.ts
        └── renderer.ts                     ← 2000-line Month-1 dashboard renderer (w1Dim disabled for full access)
```

### Lambdas (each is its own pnpm package, esbuild-bundled)
```
lambdas/
├── _shared/stripe-client/                  ← workspace package, fetches keys from Secrets Manager
├── audit-complete/
│   ├── src/handler.ts                      ← THE assessment-submission handler (Contact + Users + email)
│   └── infra/deploy.sh
├── create-checkout-session/
│   └── src/handler.ts                      ← Stripe one-time + subscription checkout
├── create-setup-intent/
│   └── src/handler.ts                      ← new — card-on-file capture for questionnaires
├── email-sender/                           ← central SES sender (invoked by other Lambdas)
├── inbound-handler/
│   └── src/system-prompt.ts                ← AI concierge — UPDATED, NOT YET DEPLOYED
├── protege-signup/                         ← legacy, unlinked from public pages
├── daily-digest/                           ← 6am Protégé/agent-run summary
├── approval-queue/                         ← AI-action approval routing to TJ
├── coach-proxy/
└── customer-portal-session/
```

### Book + workbook source
```
docs/book/
├── Begin-with-the-End-in-Mind-v5.pdf       ← LATEST PRINT-READY PDF
├── render.py                               ← markdown → HTML → PDF
├── corpus-manifest.md
├── cover/
│   ├── cover-v3c.png                       ← front cover, locked
│   └── back-cover-mockup-v1.html           ← back cover design
└── draft/
    ├── _MASTER.md                          ← assembled manuscript
    ├── _MASTER.html                        ← rendered intermediary
    ├── _00-front-matter.md
    ├── _00a-dedication.md                  ← Tom + Julia Mundheim
    ├── _00b-preface-from-the-author.md     ← TJ's personal note
    ├── _99-back-matter.md
    ├── _back-cover-copy.md                 ← copy for back cover
    ├── _outreach-endorsement-letters.md    ← Robbins/Attia/Hyman outreach
    ├── _voice-brief.md
    ├── 01-the-fear.md through 17-your-next-step.md
    ├── A1-A4 appendices (assessment / stack / eliminate / glossary)
    └── V0-V5 Part V action guide

docs/cohort-workbook/
├── Cohort-Workbook-Month-1-v2.pdf          ← LATEST workbook PDF
├── render.py
└── draft/
    └── (mirror structure of book draft)
```

### Legal + planning
```
docs/legal/
├── My_4M_Life_Notice_of_Privacy_Practices.md (+ .docx)
├── My_4M_Life_AI_Communication_Consent.md (+ .docx)  ← already wired on assessment
├── My_4M_Life_Business_Associate_Agreement.md (+ .docx)
├── My_4M_Life_Patient_Authorization.md (+ .docx)
└── attorney-brief.md

docs/plan/
├── stripe-eventbridge-architecture.md
└── stripe-eventbridge-implementation.md

docs/
├── HANDOFF.md                              ← chronological session log
├── PRE_LAUNCH_HANDOFF.md                   ← THIS DOCUMENT
└── CLAUDE.md                               ← project-level instructions for Claude
```

### Infrastructure-as-code
```
infra/
├── dynamodb/deploy.sh
├── sns/deploy.sh                           ← alarm topic, drtj@my4mlife.com subscriber
├── sqs/deploy.sh                           ← nurture queue
├── cloudwatch/deploy.sh
├── eventbridge/deploy-stripe-rules.sh
└── clientportal/
    └── deploy.sh                           ← Cognito custom-auth + S3 + CloudFront
```

### Auto-memory (Claude session continuity)
```
~/.claude/projects/-Users-thomasmundheim-Desktop-Development-LDRGLPRx/memory/
├── MEMORY.md                                ← INDEX (~30 entries)
├── user_*.md                                ← TJ profile
├── project_*.md                             ← shipping decisions + locked rules
├── feedback_*.md                            ← TJ's preferences for collaboration
└── reference_*.md                           ← external system locations
```

---

## 9. PLACEHOLDER STRINGS — exact search-replace work for Claude once Stripe prices land

| File | Placeholder | Will become |
|---|---|---|
| `website/src/pages/rx/peptides/questionnaire.astro` | `PLACEHOLDER_PEPTIDES_TIER1_PRICE_ID` | $199/mo recurring price ID |
| `website/src/pages/rx/peptides/questionnaire.astro` | `PLACEHOLDER_PEPTIDES_TIER2_PRICE_ID` | $249/mo recurring price ID |
| `website/src/pages/rx/peptides/questionnaire.astro` | `PLACEHOLDER_PEPTIDES_TIER3_PRICE_ID` | $299/mo recurring price ID |
| `website/src/pages/rx/leaky-gut/questionnaire.astro` | `PLACEHOLDER_LEAKY_GUT_PRICE_ID` | $199/mo recurring price ID |
| `website/src/pages/rx/testosterone-ed/questionnaire.astro` | `PLACEHOLDER_TESTOSTERONE_SUBSCRIPTION_PRICE_ID` | $129/mo recurring price ID |

After replace: `cd website && pnpm build && ./deploy.sh` → Cloudfront invalidation completes in ~2 min.

---

## 10. CONTACT POINT for handoff continuation

- **Primary contact:** Dr. TJ Mundheim — `drtj@my4mlife.com` (executive private, do not surface publicly)
- **Public support:** `support@my4mlife.com`
- **Public info:** `info@my4mlife.com`
- **Domain:** my4mlife.com (Route 53 hosted zone `Z045463539AAKM7D8P48V`)
- **Production URL:** https://my4mlife.com
- **App URL:** https://app.my4mlife.com
- **API base URL:** https://v9svm8ds74.execute-api.us-east-2.amazonaws.com

End of handoff document.
