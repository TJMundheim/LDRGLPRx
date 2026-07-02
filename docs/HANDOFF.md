# ===================================================================
# COMPLETE PROJECT HANDOFF — My4MLife (repo: LDRGLPRx)
# Last updated: 2026-06-30 · self-contained current-state snapshot
# (Dated changelog of prior sessions follows this block.)
# ===================================================================

## 0. Orientation
**My4MLife** is an AI-operated telehealth + commerce + lifestyle company. Mission (TJ verbatim): help men optimize for "the best mind possible until your last day of life" — cognitive longevity through the final years. Brand wordmark **My4MLife** (exact casing). Tagline **"Begin with the end in mind."** The framework is the **4 Ms — Mind, Muscle, Mitigate, Motivate** (Mind is the destination; you run the work Mitigate→Muscle→Motivate→arrive at Mind). Repo dir name `LDRGLPRx` is legacy; the brand is My4MLife.

Business model = **freemium**: the assessment makes you a **Protégé** (free: app, book, workbook, weekly Zooms, cohort). Monetize via **member-priced products** (Amazon-affiliate OTC bridge now; white-label later) and **direct-buy Rx** (GLP-1, testosterone/ED, leaky-gut, peptides, regenerative). Operator = Dr. TJ Mundheim, solo, non-technical, AI-first ops.

## 1. Repo, access, conventions
- **Path:** `/Users/thomasmundheim/Desktop/Development/LDRGLPRx`
- **Remote:** `git@github.com:TJMundheim/LDRGLPRx.git`
- **Git rule:** single branch **`main`**, no feature branches, no worktrees. Commit + push directly to main.
- **Package manager:** `pnpm` only. Apps = Vite; websites = Astro; lambdas = esbuild, thin (<100 lines, single responsibility).
- **Deploys:** always via a `deploy.sh` script (IaC) — never manual console. Scripts live in `infra/` or alongside the resource.
- **AWS:** region **us-east-2**, account **879696522760**.

## 2. Layout
```
website/        Astro marketing site → my4mlife.com  (deploy: website/deploy.sh)
apps/clientportal/  Svelte 5 (runes) + Vite PWA → app.my4mlife.com (deploy: apps/clientportal/deploy.sh)
lambdas/        23 AWS Lambdas (esbuild) + lambdas/_shared/* packages, each with infra/deploy.sh
infra/clientportal/cdk/   AppSync GraphQL API + DynamoDB data-stack + auth (CDK; `npx cdk deploy ApiStack`)
infra/{dynamodb,sns,sqs,cloudwatch}/   other IaC deploy scripts
docs/           book, cohort-workbook, products, legal, HANDOFF.md, planning
```
Run locally: `pnpm -C apps/clientportal dev` (app), `pnpm -C website dev` (site).

## 3. Architecture / infrastructure
- **Marketing site:** Astro static → S3 + CloudFront (my4mlife.com). Forms POST to HTTP API `/api/*`.
- **App (clientportal):** Svelte 5 PWA → S3 + CloudFront (app.my4mlife.com). Talks to **AppSync GraphQL** (`clientportal-api`, id `v2cm3ggkafh7rhrujk4fkqe6gm`) via typed wrappers in `apps/clientportal/src/lib/api/operations.ts`.
- **Auth:** Cognito user pool **us-east-2_kIpKnr17R**, passwordless **email-OTP** custom-auth. Admin gate = Cognito **Admins** group. Admin user: **drtj@my4mlife.com** (already in Admins). NOTE: drtj@essentialmanage.com is the CLI email, NOT an app account.
- **HTTP API** (lambda REST routes `/api/*`): id **v9svm8ds74**.
- **DynamoDB tables:** Users, Contact, Events, EventRSVPs, Adherence, PatientRecords, DiscoveryResponses, IntakeForms, Outcomes, Programs, WeeklyContent, AdminQueue, AppConfig, TierCatalog, Touchpoints.
- **Payments:** Stripe. Keys in Secrets Manager `all-stripe-keys` (via `@my4mlife/stripe-client`). **All payment lambdas are in LIVE mode** (charge real cards). Modes: create-setup-intent (card capture) = live, create-checkout-session = live, charge-on-approval = live, order-handler resolves mode per-event.
- **Email:** Mailgun via `email-sender` lambda; recipients in Secrets Manager `form-recipients`.
- **HIPAA:** all PHI-bearing AI calls go through **AWS Bedrock** (never @anthropic-ai/sdk in prod lambdas — AWS BAA covers it). No PHI in SMS. Consent timestamps stored.
- **Digital fulfillment:** S3 `my4mlife-digital-fulfillment`. Keys the welcome email links to: `begin-with-the-end-in-mind.pdf` (book) + `cohort-workbook-month1.pdf` (workbook). **STANDING RULE: re-upload these on every book/workbook change** — currently serve book v14 + workbook v3.

## 4. The two funnels
**A. Assessment → Protégé (free).** `/assessment` (website) → `audit-complete` lambda: derives contactId, ensures Cognito user + seeds UserProfile, stores consent, and emails a welcome (top-3 results + book PDF link + workbook PDF link + app link). Member then uses the app (TodayView daily protocol, weekly Zooms, cohort).

**B. Direct-buy Rx.** `/rx/{weight-loss,testosterone-ed,leaky-gut,regenerative-medicine,peptides}` → multi-step `questionnaire.astro`: demographics/history/screening → **NPP + Patient Authorization consent** (required checkboxes, versioned) → **Stripe card capture** (SetupIntent, card SAVED not charged, Stripe customer created) → submit. Submit does two things: (1) emails TJ via `/api/contact-form`→email-sender; (2) persists a structured **PatientRecord** via `/api/patient-record-intake`. Coordinator then reviews in the app's **Patients** tab and, after the telemedicine doctor's OK, hits **Approve & charge** (charges the saved card, real money) and **Export clinical packet** to send to the provider.

## 5. The EMR / AI back-office (built + LIVE this cycle)
- **PatientRecords** DynamoDB table (PK contactId + SK: `record` / `encounter#<id>` / `audit#<iso>#<seq>`; KMS-encrypted; PITR). Shared logic: `@my4mlife/patient-record` (types + state machine + key helpers).
- **Encounter state machine:** `new → coordinator-reviewed → sent-to-provider → script-written → fulfilled|declined`; `declined → new` reopen allowed; fulfilled terminal. `visitType` = async default, audio-visual forced for testosterone-ed.
- **Lambdas:** `patient-record-intake` (persist), `charge-on-approval` (AppSync `chargeEncounterAdmin`, Admins-gated: ensures Stripe customer, charges one-time PaymentIntent or monthly Subscription off-session, writes Touchpoint, encounter→fulfilled), `export-clinical-packet` (AppSync `exportClinicalPacketAdmin` + partner shared-secret path; assembles packet w/ BMI, meds, consents; HTML summary to S3 + 7-day signed URL; card = boolean only).
- **Admin UI:** `apps/clientportal/src/lib/components/admin/PatientsAdmin.svelte` — list, detail, advance state, **Approve & charge** (amount $, one-time vs subscription, per-category prefill), **Reopen**, **Export clinical packet**.
- **Model:** async (store-and-forward) telemedicine is default; testosterone is the only audio-visual visit; care coordinator is live now, AI expected to take over triage later (confidence-gated).
- **Consult pricing:** soft-launch = free consult on 4 of 5 /rx pages; testosterone/ED $249.

## 6. Publishing (DONE this cycle)
- **Book "Begin with the End in Mind" — v14**, 6×9, 258pp. Source of truth = `docs/book/draft/_MASTER.md` (render: `python3 docs/book/render.py` → `_MASTER.html` → headless Chrome `--print-to-pdf`). De-branded (no product/affiliate/hardware names, no "RPA" → "regenerative therapies"; points to my4mlife.com), ends on the CTA, front-matter accuracy-verified, 3 QR codes (→my4mlife.com, segno).
- **KDP assets (all 6×9):** interior = v14 PDF (both bindings). Hardcover wrap `docs/book/cover/full-cover-hardcover-6x9.pdf` (14.369×10.417in, spine 0.795). Paperback wrap `full-cover-paperback-6x9.pdf` (12.831×9.25in, spine 0.581). Kindle: `docs/book/Begin-with-the-End-in-Mind-ebook.docx` (heading-styled for nav) + front cover `docs/book/cover/ebook-cover.jpg` (1600×2560). Upload files also copied to TJ's Desktop.
- **Workbook v3** (`docs/cohort-workbook/`, same pipeline, de-branded).

## 7. THIS-WEEK PRIORITIES (real non-friendly customer traffic is now flowing)
Order = **see it → prove it → don't let anything fall through → then build.**
1. **Turn on analytics.** PostHog is a placeholder key (`phc_PLACEHOLDER_REPLACE_BEFORE_LAUNCH` in `website/src/layouts/BaseLayout.astro`) → ZERO funnel data captured. Get the real project key, wire site + app, deploy. Gives page-URL funnels + session replay immediately. Optional next: ~8 custom events on the assessment + /rx questionnaires for precise in-form drop-off. (App is not instrumented at all yet.)
2. **One real card end-to-end, then refund.** Payments are live but only tested in Stripe TEST mode. TJ runs one real /rx card: capture → record in Patients tab → Approve & charge → packet export → refund. De-risks real money + PHI.
3. **Tighten the coordinator loop.** /rx submissions email TJ (works). Write a one-page coordinator runbook; optionally wire the EMR's own new-lead ping (the `coordinator-notify` invoke in patient-record-intake is currently a no-op — email-sender doesn't handle that kind).
4. **Failure visibility.** Daily glance at Stripe + Patients tab for stuck encounters; confirm OTP/welcome emails land (Mailgun); surface off-session card declines.
5. **Then** new features (AI-coordinator triage, dashboards, insurance/PEO vertical).

## 8. Known gaps / loose threads
- **PostHog placeholder** (see #7.1) — biggest live-ops gap.
- **EMR `coordinator-notify`** invoke is a no-op (email-sender lacks that kind); /rx form-email covers lead notification for now.
- **Hardcover 6×9 wrap** built to computed dims (14.369×10.417); verify against KDP's 6×9 hardcover calculator/previewer before final submit.
- **Cover PDFs** render 0.008in over on width (Chrome rounding) — within KDP tolerance; snap exact if KDP flags.
- **clientportal pre-existing test failures** (~7): client.test.ts, triggers.test.ts, AuthGate.test.ts — environmental Svelte5/happy-dom, not feature bugs. See memory.
- **App is not instrumented** and (per TJ) needs an enterprise-level visual pass — see §10 Fable brief.

## 9. Operational cheat-sheet
- **Admin login:** app.my4mlife.com, email-OTP as **drtj@my4mlife.com** → Admin → Patients/Proteges/Events.
- **Deploys:** site `bash website/deploy.sh`; app `bash apps/clientportal/deploy.sh`; AppSync `cd infra/clientportal/cdk && pnpm build && npx cdk deploy ApiStack --require-approval never`; a lambda `bash lambdas/<name>/infra/deploy.sh`.
- **Stripe mode:** set in each payment lambda's deploy.sh `STRIPE_MODE`; all currently `live`.
- **Fulfillment refresh:** `aws s3 cp <pdf> s3://my4mlife-digital-fulfillment/{begin-with-the-end-in-mind.pdf|cohort-workbook-month1.pdf} --region us-east-2 --content-type application/pdf`.
- **Secrets Manager:** all-stripe-keys, form-recipients, export-clinical-packet-key.
- **Memory system:** durable facts in `~/.claude/projects/-Users-thomasmundheim-Desktop-Development-LDRGLPRx/memory/` (index = MEMORY.md). Read it for locked brand/product/architecture decisions.

## 10. FOR FABLE — app enterprise-level design review + mockups
TJ's ask: **review the app and produce mockup demos of ways to make it look more enterprise-level / premium.**
- **What/where:** `apps/clientportal` — Svelte 5 (runes) + Vite PWA, TypeScript. Live at **app.my4mlife.com** (log in with email-OTP to see it), or run `pnpm -C apps/clientportal dev`.
- **Two surfaces to elevate:**
  1. **Member (Protégé) app** — `TodayView.svelte` is the hub (eating-window, MorningTracker, SupplementCard, TrainingLog, ScoreButtons, WeekBanner, UpcomingZooms), plus Sidebar, SettingsView, tiers, discovery(assessment), outcomes, nudges.
  2. **Admin / care-coordinator dashboard** — `src/lib/components/admin/` (AdminDashboard tabs: Protégés / Events / **Patients**; PatientsAdmin = the clinical back-office: review, state machine, Approve & charge, Export packet). This one especially should read like a real clinical/enterprise SaaS (data-dense, trustworthy — it moves real money + PHI).
- **Deliverable:** exploratory **mockups/demos** (HTML/CSS comps or Artifacts are ideal — no need to touch the live Svelte first) showing 2–3 directions for a more premium, enterprise feel. Then a recommended direction + how it'd map onto the existing components.
- **Brand constraints (keep):** wordmark **My4MLife**; palette navy **#0a1f44** + gold **#d4af5a**; type Playfair Display (display) + Inter (UI); tagline "Begin with the end in mind." Audience = successful men ~50–65; tone = premium, clinical-credible, not "wellness-cute."
- **Good context to read first:** this handoff §5 (EMR) and the memory files on brand positioning, photography direction, and information architecture.

# ===================================================================
# CHANGELOG (prior sessions, newest first)
# ===================================================================

# 2026-06-28 — Book is print-ready (v14)

`docs/book/Begin-with-the-End-in-Mind-v14.pdf` + `docs/book/cover/back-cover-v2.png` are KDP-ready (drop the "-v14" on upload). Source of truth = `docs/book/draft/_MASTER.md`, rendered via `render.py` → `_MASTER.html` → headless Chrome PDF. This session's book work (all committed + pushed):
- De-branded the book + workbook (no product/affiliate/hardware brand names, no "RPA" — point to my4mlife.com; app keeps live names). See memory project_protocol_debrand_print_artifacts.
- Protein 30g → 30–40g; fasted-morning-training + fasted-walking eating philosophy; optional 4–5pm cutoff. Parkinson's added to regenerative indications.
- Ended the book on the CTA: cut Part V (workbook) + Appendices A–C (kept Glossary); Chapter 18 "Your Next Step" + a final CTA page are the close.
- Front-matter accuracy pass: fixed the parts overview (Mitigate 4–9 / Muscle 10–12 / Motivate 13–14 / Mind 15–16) and 5 stale in-text chapter cross-refs. No printed TOC/page-number refs exist, so reflow is safe.
- Removed the blank "Loop Closes" divider page.
- QR codes (→ my4mlife.com, segno, navy) on: Ch 18 "The One Step," the final signature page, and the back cover (placeholder → real, ~0.8"). All three test-scanned OK by TJ.

OPEN DECISION: all 3 QRs point to the homepage (TJ's spec). Could repoint to /assessment (one less click) — 2-min change. KDP upload (cover wrap + ISBN) remains a manual TJ step.

---

# 2026-06-27 — EMR payment layer (charge-on-approval, TEST mode) + Rx HIPAA consent + decline-reopen + book v9

Big session. All committed + pushed to `main`; all deployed.

## Shipped + deployed
- **Charge-on-approval (manual, coordinator-triggered) — verified live in Stripe TEST mode.** When a script is approved, the coordinator hits "Approve & charge" in the app's Patients tab (amount in $, one-time vs monthly subscription, per-category prefill). `charge-on-approval` Lambda (AppSync `chargeEncounterAdmin`, Admins-gated) ensures a Stripe Customer, charges off-session (PaymentIntent or Subscription), writes an idempotent Touchpoint, advances the encounter → `fulfilled`. Stripe error → `{ok:false}`, no state change. Only `script-written` encounters can be charged (no double-charge). Subscription ($129) + one-time ($399) both succeeded in test; guard refused a non-approved encounter. Commit 89f75dff.
  - **NOW LIVE (2026-06-27):** flipped `charge-on-approval` to `STRIPE_MODE=live` to match the already-live card capture (`create-setup-intent`) — they were mismatched (capture live, charger test). All payment Lambdas are live + consistent. **Approve & charge now bills real cards.** (Earlier subscription/one-time test charges were test-mode — no real money.) Caveat: TJ's own patient record has a real live card on file; don't approve+charge it unless intended.
- **Stripe Customer created at intake** (`create-setup-intent` + the 5 `/rx` questionnaires store `stripeCustomerId`) so saved cards are reliably chargeable later.
- **Decline-reopen:** an accidentally-declined encounter can now be reopened (`declined → new`) via a "Reopen" button. `fulfilled` stays terminal. (Fixed your stuck record earlier this session.)
- **Rx HIPAA consent at intake:** all 5 `/rx` questionnaires now capture NPP + Patient Authorization (versioned, required, stored on the PatientRecord). Commit b343a3ad.
- **Book v9:** the blank "Opening" page now carries the Stone Soup parable (4M-synergy framing). `docs/book/Begin-with-the-End-in-Mind-v9.pdf`. Commit 03e5fd39.

## Still MANUAL / your action
- **KDP publishing is not automatable by me.** v9 PDF is built + committed, but uploading to Amazon KDP (cover wrap + ISBN) is a manual step in your KDP account. The KDP cover wrap is still pending (front + back designed; spine/wrap needs the KDP template from a draft upload).
- **Flip charge to live** when ready (one-line deploy edit above).
- Admin sign-in: **drtj@my4mlife.com** (already in Cognito Admins).

---

# 2026-06-26 (session 2) — Ultralight EMR MVP BUILT, deployed, live-verified

Built the ultralight EMR end-to-end via `/plan` + delegated subagents. Commit `5a234417`, pushed to `main`. All deployed to AWS (us-east-2) and verified live.

## Shipped
- **`PatientRecords` DynamoDB table** (PK `contactId` + SK `sk`; KMS SSE; PITR; tag `phi=true`). SK scheme: `record` / `encounter#<id>` / `audit#<iso>#<seq>`. Deploy: `infra/dynamodb/patient-records/deploy.sh`.
- **`@my4mlife/patient-record`** shared module (`lambdas/_shared/patient-record/`): types + encounter state machine `canTransition` (new→coordinator-reviewed→sent-to-provider→script-written→fulfilled; any non-terminal→declined; terminals locked) + `forcedVisitType` (testosterone-ed=audio-visual, else async) + consent constants.
- **`patient-record-intake` Lambda** → `POST /api/patient-record-intake`. Persists demographics/history/screening/consents; keys every item by `contactId`; card-on-file = Stripe ids only (raw number/cvc/exp stripped). Best-effort coordinator email.
- **AppSync admin API** (Admins-gated JS resolvers; APPSYNC_JS-valid — note: no `for`/`++`, use `.map/.forEach`): `listPatientRecordsAdmin`, `getPatientRecordAdmin`, `updateEncounterStateAdmin` (atomic transition enforcement via ConditionExpression). New `PatientRecordsDS` datasource wired in api-stack + data-stack `fromTableName`.
- **clientportal admin "Patients" tab** (`PatientsAdmin.svelte`): list records, expand detail, advance encounter through legal next-states only.
- **`export-clinical-packet` Lambda** → `POST /api/export-clinical-packet`. Packet (BMI/meds/allergies/consents/visitType) + 7-day signed HTML summary to `my4mlife-digital-fulfillment/clinical-packets/`. Auth = `x-packet-key` shared secret from Secrets Manager `export-clinical-packet-key` (fail-closed). cardOnFile = boolean only.
- **6 frontend pages** (5 `/rx/*/questionnaire` + `/consult`) now also POST a structured record (best-effort; never blocks email/UX). website + clientportal redeployed.
- **Runbook: `docs/EMR_MVP_VERIFICATION.md`** — 6-step live walkthrough for TJ.

## Verified live (real AWS, then cleaned up)
Intake → 3 items written keyed by contactId; raw card stripped; glp1→async, testosterone-ed→audio-visual. Packet → 401 without key, 200 with key, BMI computed, summaryUrl returns HTTP 200 HTML, zero card-id leakage. Opus review caught + fixed 2 real runtime bugs pre-ship (wrong mutation arg shape; packet URL was PUT not GET). 75 unit tests green.

## Post-build hardening (same session, after first live test)
- **Fixed Patients-tab load error** (`GraphQLerrors … SubSelectionRequired … audit`): the client requested `audit` as a scalar but schema has `audit: [AuditEntryAdmin!]!`. Now requests `audit { at action detail actor }`. Redeployed. Commit `c0350db0`.
- **Added a GraphQL schema-validation guard** (`apps/clientportal/src/lib/api/operations.schema-validation.test.ts`): captures the actual query string each EMR wrapper sends and validates it against the real schema SDL via graphql-js. Catches the "document vs schema" bug class (subselection, wrong arg shapes) that mocked-client tests miss — both EMR bugs we hit would have been caught. Added `graphql` devDep.
- **Fixed `AdminDashboard.test.ts`** (was counted as "pre-existing flaky"): it mocked the wrong module path (`auth/store.js` vs real `auth/store.svelte.js`) + a loose matcher. Now 3/3 green and genuinely covers the admin gate in front of the Patients tab. Remaining pre-existing clientportal failures: now **7** (client.test.ts 4, triggers.test.ts 2, AuthGate.test.ts 1) — still environmental, see memory.
- **Verified all admin resolver logic via `aws appsync evaluate-code`** (real APPSYNC_JS runtime, realistic data): getPatientRecordAdmin assembles record+encounters+audit; updateEncounterStateAdmin builds the atomic `#state IN(...)` condition for legal transitions, errors on unknown target state, blocks non-admins, and `declined` accepts all 4 non-terminal from-states.
- **Seeded ONE demo record** so the Patients tab shows data immediately: `DEMO Patient (safe to delete)` / demo-patient@my4mlife.com, contactId `eb552865-a68f-5520-9b95-fe48d0d25612`, encounter state `new`, visitType `async`. **Delete when done:**
  ```bash
  CID=eb552865-a68f-5520-9b95-fe48d0d25612
  for SK in $(aws dynamodb query --table-name PatientRecords --region us-east-2 --key-condition-expression "contactId = :c" --expression-attribute-values "{\":c\":{\"S\":\"$CID\"}}" --query 'Items[].sk.S' --output text); do
    aws dynamodb delete-item --table-name PatientRecords --region us-east-2 --key "{\"contactId\":{\"S\":\"$CID\"},\"sk\":{\"S\":\"$SK\"}}"; done
  ```

## TJ action items / open follow-ups
1. **Become admin:** sign in at app.my4mlife.com with **drtj@my4mlife.com** — that account already exists AND is already in the Cognito `Admins` group, so the Patients tab renders immediately (email-OTP login, no password). (The earlier note about drtj@essentialmanage.com was wrong — that address has no Cognito user.)
2. **Chargeable card-on-file:** `create-setup-intent` does NOT create a Stripe customer yet, so the saved paymentMethodId isn't chargeable post-approval. Add customer creation when wiring the actual charge.
3. **Provider delivery** is pull-by-key (shared secret); real partner-API push is later.
4. **8 pre-existing clientportal unit-test failures** are environmental (Svelte5/happy-dom), unrelated — see memory `clientportal_pre_existing_flaky_tests`.
5. Carry-over from session 1 still open: PostHog `phc_` key; walk all 5 Rx funnels E2E with a real card; commit/clean the loose book-cover artifacts.

---

# 2026-06-26 (session 1) — Marketing-ready; consent stored; first real lead; NEXT = ultralight EMR

## Shipped this session (all committed to `main` + deployed)
- **Email consult recommendation reprioritized** (audit-complete): neurocognitive (already-diagnosed > 0) → Regenerative; else weight/gut (higher of the two, or a combined consult if tied); testosterone only as a last resort when all three are zero. On-screen top-3 aligned (regen #1 at any score > 0; the +2 gut/weight bonus only applies when raw score > 0).
- **BMI calculator removed** from the assessment weight question; label "Weight (BMI)" → "Weight".
- **Assessment count settled on 10** sitewide + in the app; **deleted the dead multi-stage intake flow** (`apps/clientportal/src/lib/components/intake/*` + orphan data modules). The app gets its assessment from the public 10-question funnel via the profile.
- **Consent now PERSISTED** (was browser-gate only): assessment captures both checkboxes (exact text + version + timestamp) → audit-complete writes Contact (`consent`/`consentedAt`/`aiCommsConsent`/`protegeConsent`) + UserProfile. Verified live end-to-end.
- **Welcome email shows the book's front + back covers** (email-optimized ~70KB thumbnails at `/images/book/cover-{front,back}-email.png`).
- **Book v8** live on S3 fulfillment (revised Stephen Covey opening); homepage shows the new title-forward front + back covers.
- **Fixed `/solutions/peptides` 404** — a stray `peptides 2/` Finder-duplicate folder on S3 had shadowed the real page; redeploy uploaded the real page and `--delete` cleaned the dupes.

## First real lead — 2026-06-25, Laurie Chamberlain · thebrewmeisters@msn.com · +1 972-816-4698
- 3:08pm CT: completed the assessment (gut top priority) → welcome email **delivered**. 3:10pm CT: submitted the `/consult` care-coordinator form → "Consult intake — gut issues" lead email to TJ **+ auto-confirmation to her** ("a coordinator will email within 24h"). Both **delivered** (confirmed in Mailgun events).
- She did **NOT** enter a card and there is **NO** health history — the `/consult` form collects neither (only the structured `/rx/leaky-gut/questionnaire` does, and it emails only *after* card capture). Her only stored record is the assessment Contact. A draft coordinator reply was written (in the session transcript).

## NEXT SESSION — build the ultralight EMR (open with `/plan`)
See memory: `project_emr_ultralight` + `project_async_telemedicine_model`. Gist:
- **Persist intake/history to a queryable PatientRecord** (DynamoDB, encrypted, AWS BAA) instead of email-only. Admin review page in the clientportal admin dashboard + an "export clinical packet" (PDF/secure summary) for the telemedicine provider. Encounter **state machine**. This is **step 1 of `docs/AI_BACK_OFFICE_ACTION_PLAN.md`**.
- **Async (store-and-forward) review is the default** for all conditions; **testosterone is the only audio-visual exception**. Add a `visitType` field.
- **HIPAA gate**: capture NPP acknowledgment + Patient Authorization (docs in `docs/legal/`) before "send to provider", timestamped/versioned — reuse the consent-storage pattern just shipped.
- **Card-on-file required before the encounter** (our cost, absorbed into the member's first-month purchase).
- Care coordinator = TJ today; **design so AI takes it over** (inbound-handler / ops-agent, confidence-gated).

---

# 2026-05-31 — One-path Protégé flow is fully working

End-to-end signup → app dashboard with carried-forward assessment data is live and tested.

## The journey (debugging chain that landed us here)

1. **Phone E.164 normalization** — Protégé signups weren't landing in Contact because the form sent unformatted phone numbers; Lambda rejected with 400.
2. **Assessment results email missing** — added audit-complete → email-sender path.
3. **Assessment retake in app** — `Contact` and `Users` (UserProfile) are separate DDB tables; app couldn't see audit data. Extended UserProfile schema with `auditTop3` / `auditCompletedAt` / `intakeAnswers` and made protege-signup seed those from Contact.
4. **Duplicate signup form on /protege-signup** — replaced with `window.location.replace('/welcome-protege')` to make back-button safe.
5. **PWA service worker stale** — added `skipWaiting`/`clientsClaim` + controllerchange auto-reload.
6. **Welcome email pointed to non-existent /set-password** — rewrote to link to app root with honest email-OTP copy.
7. **One-path refactor** — removed Sign In from homepage, added phone-required + Protégé consent to assessment, built `/become-protege` page that POSTs signup behind the scenes + redirects to app with `?new=1&email=…`.
8. **Double sign-in code** — /become-protege pre-triggered OTP causing two codes; moved auto-trigger to EmailEntry onMount with `?new=1`.
9. **Intake gate stuck** — disabled the gate entirely per locked 2026-05-25 spec (signed-in = Protégé = full access).
10. **Renderer reading wrong localStorage key** — `audit-v1` vs `intake-audit-scores-v1`; hydration now writes both.
11. **AppSync client envelope confusion** — App.svelte was reading `profileResult.data.getMyProfile`; client already strips the `data` wrapper. Fixed to read `profileResult.getMyProfile`.
12. **AWSJSON double-encoded over the wire** — added `parseAwsJson()` that parses once and re-parses if the result is still a string.

## Working today

- Assessment carries name/email/phone/consent + answers + top3 to /become-protege.
- /become-protege auto-creates Protégé in Cognito + Contact + Users, redirects to app.
- App auth screen auto-sends OTP, skips firstName field for fresh signups.
- App dashboard hydrates `audit-v1` + workbook.factorScores + workbook.priorities from UserProfile on sign-in.
- Top-3 priorities show on dashboard + Week 1; sidebar fully unlocked.

## TJ blockers still pending (carryover; pre-existing)

- Stripe E2E #1/#2/#3 walkthroughs
- Bedrock daily token quota increase (optional)
- Zoom S2S credentials into `zoom-ops-creds` secret
- Phone number for SMS approval queue v2 (email approvals already working)

## 2026-05-31 (late) — Cross-device sync confirmed working

After fixing the workbookJson double-decode (commit dba622e7), TJ tested
Mac → iPhone signed-in cross-device flow with drtj@essentialmanage.com.
Phone dashboard populated with all Mac state: name, start date, top-3
priorities, Week 1 motivation answer. End-to-end Protégé flow is
production-ready for inner-circle UX testing.

The double-encoding pattern (parseAwsJson) now wraps all three AWSJSON
fields: auditTop3, intakeAnswers, workbookJson. Any future AWSJSON
field added to UserProfile should use the same defensive parse.

## 2026-06-01 — Pricing/tier scrub + Week 1 spec locked

### Done today
- **Pricing/tier UI removed** from website + app (31 files, 2173 lines deleted). Protégé is the only tier visible; /membership /tiers /4m-cohort redirect to /assessment; AdminDashboard, Sidebar, nudges all scrubbed. Backend `TierId` field on UserProfile retained (operational only). See commit `7a312ad4`.
- **OTP reload-after-success** fix shipped (`8c6fa960`) — dashboard now populates on first paint instead of needing a manual reload.
- **App installable on iPhone via Add to Home Screen** — TJ confirmed working.
- **Week 1 spec written and locked** at `docs/plan/week-1-spec.md` (commits `66b3f6e8` + `19f97311`).
  - Single track, baby steps, clinical-compliance tone.
  - 6 actions across 4 pillars (mix of daily + 2×/week).
  - Anchored on Biome NS Ultra (universal) + 9-to-6 eating window + protein-first breakfast + strength + fasted sunlight walks + weekly Zoom.
  - BPC-157 included in Week 1 as Rx framed via the consult bundle alongside GLP-1.
  - Affiliates: ButcherBox + Thrive Market + Amazon links on protein-breakfast tile.
  - Bonus toggle in profile for self-selecting high achievers.
  - End-of-week scoreboard (Sun → next Wed Zoom) with adherence stats.
  - Behavior-triggered Week 2 unlock via honor-system Zoom-attest tap (no Zoom S2S dependency for unlock loop).
  - Week 1 Zoom opens with ~10-12 min on what late-stage cognitive loss actually looks like — fear from truth, not framing.

### Approved to build (TJ confirmed 2026-06-01 evening)
Build queue:
1. Adherence DDB table + recordAdherence AppSync mutation
2. UserProfile schema additions: `eatingWindowStart`, `eatingWindowEnd`, `weeklyZoomAttestedAt`, `bonusTargetsEnabled`, `glpStatus`
3. Today view component (replaces current Week 1 page) — daily tiles + this-week tiles + affiliate-placeholder links
4. End-of-week scoreboard mode (Sun → next Wed)
5. Eating window picker at signup
6. Profile / Settings with bonus toggle
7. AdminDashboard recording-URL paste page (Option a — manual for v1)
8. Week 1 fear-emphasis footer copy on dashboard
9. Replace legacy Week 1 renderer.ts content with Today view
10. End-to-end testing on Mac + iPhone

### Carryover TJ blockers (unchanged)
- Stripe E2E #1/#2/#3 walkthroughs
- Bedrock daily token quota increase (optional)
- Zoom S2S credentials into `zoom-ops-creds` secret (no longer blocking the Week 2 unlock; still needed for future Zoom auto-scheduling + recording webhook)
- 3 affiliate program signups: ButcherBox, Thrive Market, Amazon Associates (~45 min total, drops codes into `website/src/lib/affiliates.ts`)
- Phone number for SMS approval v2 (email approvals already working)

## 2026-06-01 (late) — Week 1 v1 shipped end-to-end

**Approved build queue (Steps 1-10): 9 of 10 done; Step 10 = TJ test.**

Live in prod:
- `Adherence` DDB table + `recordAdherence` / `listMyAdherence` AppSync ops.
- UserProfile schema: `eatingWindowStart/End`, `weeklyZoomAttestedAt/EventId`, `bonusTargetsEnabled`, `glpStatus`, `weekUnlocked`. Auto-flows through `upsertMyProfile`.
- `TodayView.svelte` (~430 lines) — daily mode for weekdays + scoreboard mode Sunday eve / post-Zoom. Replaces the legacy renderer Week 1 content. Single-tap tiles, no emoji, calm clinical tone. Affiliate-link expander on the protein-breakfast tile.
- `EatingWindowModal` first-sign-in overlay + `SettingsView` reachable from sidebar (Settings, Sign Out, eating window, bonus toggle).
- AdminDashboard third tab "Events" with `listEventsAdmin` + `updateEventRecordingUrl` for posting recording URLs.
- `affiliates.ts` (website + clientportal) — single-source codes file (PLACEHOLDERS until TJ signs up).

Known small fidelity gaps:
- Streak in scoreboard only spans the current week; will show fresh streak each Monday until we extend the Adherence fetch range.
- `Event.recordingUrl` is read defensively from `as any` in TodayView; will properly type once generated.ts is regenerated against the latest schema (cosmetic; runtime works).

TJ action items (none block app usage):
1. Add `drtj@essentialmanage.com` to the `Admins` Cognito group so the EventsAdmin tab renders for you (`aws cognito-idp admin-add-user-to-group --user-pool-id us-east-2_kIpKnr17R --username drtj@essentialmanage.com --group-name Admins`).
2. Sign up for ButcherBox Partner / Thrive Market Affiliates / Amazon Associates (~15 min each). Drop the codes into `website/src/lib/affiliates.ts` AND `apps/clientportal/src/lib/affiliates.ts`.
3. Test the full Week 1 flow end-to-end on Mac + iPhone: sign in → eating window modal pops → pick a window → land on TodayView → tap a tile → confirm it persists across reload.

Carryover blockers unchanged: Stripe E2E walkthroughs, Bedrock quota, Zoom S2S, SMS phone.

---

## 2026-06-01 (late evening) — Red/Green pre-launch audit punch list

Spawned red-team + green-team subagents across auth, Stripe pipeline, assessment scoring, and sitewide copy/brand. Green team confirmed the foundations (Cognito CUSTOM_AUTH triad, thin Lambdas, EventBridge partner-source wiring, dual-mode secret, retry ladder, welcome-email benefits block, terms.astro §6.6 discount lock) are solid. Red team found 23 substantive issues; 8 are launch-critical.

### 🔴 CRITICAL — fix before any live Stripe traffic

1. **Contact PK inconsistency.** protege-signup + audit-complete key Contact by `contactId` (UUIDv5 of email). Stripe handlers key by `email` or `cus_xxx`. Every purchase creates an orphan Contact instead of updating the Protégé.
   - Files: `lambdas/_shared/order-handler-core/src/process-event.ts:37`, `lambdas/_shared/subscription-handler-core/src/process-event.ts:21,28`, `lambdas/_shared/refund-dispute-handler-core/src/process-event.ts:74`, vs. `lambdas/protege-signup/src/handler.ts:182`, `lambdas/audit-complete/src/handler.ts:87`.
   - Fix: add `contactId` to checkout-session metadata (already in `lambdas/create-checkout-session` line 100), resolve `contactId = metadata.contactId ?? uuidv5(email, NAMESPACE)` in each handler, key DDB by `{contactId}`.

2. **refund-dispute uses event-id as charge/dispute-id.** `stripe.charges.retrieve(e.id)` and `stripe.disputes.retrieve(e.id)` — but `e.id` is `evt_...`. 100% of refunds/chargebacks 404. Lifetime-ban rule non-functional.
   - File: `lambdas/_shared/refund-dispute-handler-core/src/process-event.ts:46,61`.
   - Fix: read the object id from `detail.data.object.id` of the EventBridge payload, or `const ev = await stripe.events.retrieve(e.id); const obj = ev.data.object`.

3. **SQS DLQ missing resource policy** granting `events.amazonaws.com sqs:SendMessage`. Failed events silently dropped, DLQ empty, alarms never fire.
   - File: `infra/sqs/deploy.sh` (no Policy set), `infra/eventbridge/deploy-stripe-rules.sh:50` (target points at DLQ).
   - Fix: add `aws sqs set-queue-attributes` step with Policy allowing EventBridge with `SourceArn` condition on rule ARNs.

4. **Retry Lambda uses `rate()` not `at()`.** `ScheduleExpression: rate(${delaySec} seconds)` is recurring. EndDate is `now + delay + 60s` but schedule can fire twice in the window.
   - File: `lambdas/stripe-events-retry/src/handler.ts:60`.
   - Fix: use `at(${fireAt})` one-shot; remove EndDate.

5. **Subscription Touchpoints idempotency check is inverted.** `ConditionExpression: attribute_not_exists(stripeEventId)` checks the row being written — which always has that attr. Every write throws ConditionalCheckFailed; the catch at line 72 swallows it as success. Net: zero subscription touchpoints ever written.
   - File: `lambdas/_shared/subscription-handler-core/src/process-event.ts:60-69`.
   - Fix: use `attribute_not_exists(sk)` instead.

6. **Order handler's `lifetimeValueUSD +=` runs on every retry.** Touchpoints insert is idempotent; Contact +amount UpdateExpression is not. EventBridge retries can fire 1–6× per purchase → LTV inflated.
   - File: `lambdas/_shared/order-handler-core/src/process-event.ts:42`.
   - Fix: move the +amount inside the Orders insert success branch (conditional on `attribute_not_exists` of the order id).

7. **`auditTop3WithIds` ignores the diagnosis-override rule.** Used by Week 2 MITIGATE picker. Plain raw+bonus sort, no `already-diagnosed >= 3 → forced #1` logic.
   - File: `apps/clientportal/src/lib/renderer.ts:1056-1066`.
   - Fix: refactor `selectTop3` (~line 522) to return id+score and reuse inside `auditTop3WithIds`.

8. **Duplicate OTP root cause identified.** On SES `LimitExceededException`/`NotAuthorized`, `request-otp` returns `{status:'queued'}` with NO session. Frontend `cognito.ts:43-46` throws "Code queued but no session returned". User clicks retry → Cognito sends another code. This is the months-long bug.
   - Files: `infra/clientportal/cdk/lambdas/auth/request-otp.ts:103-105`, `apps/clientportal/src/lib/auth/cognito.ts:43-47`.
   - Fix: on LimitExceededException return the auth.Session if available; on NotAuthorized return a 4xx with clear message; never return 200 without a session when UI expects one.

### 🟠 HIGH — this week

9. **Discount inconsistency** — audit-complete email says 15% first-order, signup/welcome/terms say 25%. (`lambdas/audit-complete/src/handler.ts:44` vs others). Pick one, sweep.
10. **25%-bundle discount documented in memory but missing from membership.astro/tiers.astro and welcome email.**
11. **Two scoring formulas live** — `audit.astro:167` has `{gut:2, sleep:2, weight:2, ed:1, hormones:1}` while `assessment.astro` + `survey-scoring.ts` use only `{gut:2, weight:2}`. Different entry points produce different top-3.
12. **EmailEntry `requestInFlight` never resets in finally** — `apps/clientportal/src/lib/components/auth/EmailEntry.svelte:35-58`. Success path keeps flag stuck true; parent re-mount = permanently dead button.
13. **request-otp omits `given_name`** on Cognito create — "Welcome, undefined" across app.
14. **CORS `*` on signup/audit Lambdas** — `lambdas/audit-complete/src/handler.ts:18`, `lambdas/protege-signup/src/handler.ts:21`. Allowlist instead.
15. **Order handler accepts empty email** — `lambdas/_shared/order-handler-core/src/process-event.ts:24-29`. All anonymous purchases collapse into one corrupt Contact.
16. **Stale $197/$497/$697 on `/solutions/financial-stress`** (`website/src/pages/solutions/financial-stress.astro:33`).
17. **CloudWatch alarms missing `treat-missing-data`** — `infra/cloudwatch/deploy.sh:11-23,29-42`. Add `notBreaching` (or `breaching` for primary).
18. **EmailEntry allows brand-new signups in-app** — bypasses website's AI-consent capture. Change to "Sign In" only, redirect unknowns to website.
19. **EventBridge rule lists non-existent `charge.dispute.closed`** — `infra/eventbridge/deploy-stripe-rules.sh:71`. Inert but misleading.

### 🟡 MEDIUM — before public launch

20. `audit-handoff` ingests `#audit=` with no validation — workbook gating bypass via crafted link. `apps/clientportal/src/lib/auth/audit-handoff.ts:37-39`.
21. `audit.astro:225` uses plain `btoa()` — breaks for non-ASCII first names (José, André). `assessment.astro` uses UTF-safe variant; align.
22. SNS alarm email mismatch — plan says `drtj@my4mlife.com`, env says `drtj@essentialmanage.com`. `docs/plan/stripe-eventbridge-implementation.md:267`.
23. selectTop3 still has subtle tie-break-position divergence — `survey-scoring.ts` has no priorityTier tiebreak; `assessment.astro` folds bonus into total. Align all three to `score desc → bonus desc → priorityTier desc → id asc`.

### Recommended fix order
**Today**: #8 (OTP) → #1 (Contact PK) → #2 (refund-dispute) → #5,#6 (sub idempotency, LTV double-count) → #3,#4 (DLQ policy, scheduler). Redeploy. Clean E2E with drtj@essentialmanage.com.
**This week**: #9-19. **Before public launch**: #20-23.

### Working in this session when handoff written
Starting on #8 (OTP duplicate-code root cause fix).

---

## 2026-06-01 (later) — CRITICAL #8 shipped; #1,#2,#5,#6 coded (tests + deploy pending)

### Shipped & deployed
**#8 OTP duplicate-code root cause** — three-layer fix:
- `infra/clientportal/cdk/lambdas/auth/request-otp.ts` — returns 429 `rate_limited` on Cognito LimitExceeded (was returning 200 `queued` with no session, which forced the frontend to error and users to retry → second InitiateAuth → second OTP). 401 on NotAuthorized, 502 on other failures.
- `apps/clientportal/src/lib/auth/cognito.ts` — new typed `RateLimitError`; no more "no session returned" generic throw.
- `apps/clientportal/src/lib/components/auth/EmailEntry.svelte` — 90s sessionStorage cooldown caches the issued session alongside timestamp. Any remount within the window reuses the cached session via `onsuccess` instead of calling InitiateAuth again — neutralizes SW reload, back/forward, hydration race. Also reset `requestInFlight` in `finally` (closes item #12 too).

Deployed via CDK + clientportal PWA (invalidation `IDAIS9CX51X1TUSUC6Q5LYD6CW`).

### Coded but NOT yet deployed (tests failing — they need new mocks)
**#1 Contact PK unification + #2 refund-dispute object IDs + #5 sub touchpoint idempotency + #6 order LTV double-count** — all four fixes touch the three Stripe core handlers in one batch.

- New shared package `lambdas/_shared/contact-id/` with `deriveContactId(email)` and `resolveContactId({metadataContactId, email})`. NAMESPACE matches protege-signup + audit-complete (`f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0`).
- `lambdas/_shared/order-handler-core/src/process-event.ts`:
  - Now does `stripe.events.retrieve(e.id)` first → extracts `data.object.id` → then retrieves checkout session by that id (previously called sessions.retrieve with the event id).
  - Resolves `contactId` via `resolveContactId({metadataContactId: session.metadata.contactId, email})` and keys Contact PK by `{contactId}` instead of `{email}`.
  - Throws (→ DLQ) instead of accepting empty email — kills the `{email:''}` corrupt-row failure mode (item #15 too).
  - Orders insert moved BEFORE Contact update; LTV `+=amount` only runs when `isNewOrder = true` (i.e. when the ConditionalCheckFailedException did NOT fire) — fixes #6.
- `lambdas/_shared/subscription-handler-core/src/process-event.ts`:
  - Same `stripe.events.retrieve()` pattern.
  - Resolves contactId via metadata, falls back to retrieving customer for email + deriving — no more `cus_xxx` as PK (item #1 fallback bug).
  - Reads `current_period_end` from `sub.items.data[0]` first, then top-level — kills the apiVersion-drift null-Date bug (item #12 in original red-team list).
  - Touchpoint idempotency: `attribute_not_exists(sk)` instead of `attribute_not_exists(stripeEventId)` — fixes #5.
- `lambdas/_shared/refund-dispute-handler-core/src/process-event.ts`:
  - Same `stripe.events.retrieve()` pattern — fixes #2 (was passing event id to `stripe.charges.retrieve` and `stripe.disputes.retrieve`, every call 404'd).
  - Resolves contactId via charge.metadata.contactId / charge.metadata.contactEmail / billing_details.email / receipt_email.
  - `writeTouchpoint` moved to END of both branches (refund + dispute-lost) so a touchpoint never marks success when the ban/refund write failed.

### What broke that needs picking up
The three core handler test files mock `stripe.checkout.sessions.retrieve` (or `subscriptions.retrieve`, `charges.retrieve`, `disputes.retrieve`) directly. They do NOT mock `stripe.events.retrieve`. After the change, every test fails with `Cannot read properties of undefined (reading 'retrieve')`.

Next-session work:
1. Update `lambdas/_shared/order-handler-core/src/process-event.test.ts` — add `events.retrieve` mock that returns `{ data: { object: { id: 'cs_test_123' } } }` for each test.
2. Same for `subscription-handler-core` (returns `{ data: { object: { id: 'sub_test_123' } } }`).
3. Same for `refund-dispute-handler-core` (returns the relevant charge or dispute id depending on event.type).
4. Add tests for: contactId resolution from metadata vs email derivation; LTV only-incremented-on-new-order; PK is `contactId` not `email`.
5. Add a test in `subscription-handler-core` that verifies the `attribute_not_exists(sk)` condition (write twice, verify second write swallowed cleanly).
6. Once green, deploy via `lambdas/order-handler/deploy.sh` and the analogous deploy scripts (or whatever bundler the wrapper Lambdas use).

### Still pending from CRITICAL batch
- **#7 `auditTop3WithIds` diagnosis override** — `apps/clientportal/src/lib/renderer.ts:1056`. Refactor `selectTop3` (line 522) to return id+score and reuse inside `auditTop3WithIds`. APP-side, not Stripe-blocking.

### 2026-06-02 — CRITICAL Stripe batch SHIPPED
- ✅ #1/#2/#5/#6 — three Stripe core handlers updated with `stripe.events.retrieve()` first, `resolveContactId` from new `@my4mlife/contact-id` shared pkg, idempotent LTV gated on `isNewOrder`, sub touchpoint `attribute_not_exists(sk)`, refund-dispute writes touchpoint AFTER refund/ban writes. All test mocks updated (8+7+16 = 31 tests green). Deployed via `lambdas/{order,subscription,refund-dispute}-handler/infra/deploy.sh`.
- ✅ #3 — SQS DLQ resource policy applied via `infra/sqs/deploy.sh`. Allows `events.amazonaws.com sqs:SendMessage` scoped to `arn:aws:events:us-east-2:879696522760:rule/aws.partner/stripe.com/*`. Verified via `aws sqs get-queue-attributes`.
- ✅ #4 — `lambdas/stripe-events-retry/src/handler.ts` switched from `rate(N seconds)` to `at(<UTC>)` one-shot with `ActionAfterCompletion: 'DELETE'`. Dropped the 60s EndDate window. 7 tests green. Deployed.

## 2026-06-02 — HIGH batch + cache-bug fixes shipped while TJ in meetings

All low-risk, all tests green where applicable, all deployed.

### CRITICAL closeout
- ✅ **#7 `auditTop3WithIds` diagnosis override** — `apps/clientportal/src/lib/renderer.ts:1056`. Now honors the locked override rule (already-diagnosed ≥3 → forced #1, slots 2-3 picked from others). Week 2 MITIGATE picker now consistent with the rest of the system.

### HIGH batch
- ✅ **#9 Discount sweep** — `lambdas/audit-complete/src/handler.ts:44` updated from "15% off your first order" to the full canonical block: "25% off your first purchase + autoship, and 15% off ongoing reorders".
- ✅ **#11 Scoring formula unify** — `website/src/pages/audit.astro:167` BONUS_MAP replaced with the canonical `{gut:2, gut-microbiome:2, weight:2, weight-body-fat:2}` (was `{gut:2, sleep:2, weight:2, ed:1, hormones:1}`). /audit and /assessment now produce identical top-3 from the same scores.
- ✅ **#13 `given_name` on Cognito create** — `infra/clientportal/cdk/lambdas/auth/request-otp.ts:60-65` adds `{Name:'given_name', Value:firstName}` when present. Kills "Welcome, undefined".
- ✅ **#14 CORS allowlist** — `lambdas/audit-complete/src/handler.ts` and `lambdas/protege-signup/src/handler.ts` both replaced `Access-Control-Allow-Origin: *` with a typed `corsHeaders(origin)` helper that allowlists `my4mlife.com`, `www.my4mlife.com`, `app.my4mlife.com`, `localhost:4321`, `localhost:5173`, with `Vary: Origin` for cache safety. Falls back to `https://my4mlife.com` for unknown/missing origin. Audit-complete test updated. 13 + 10 tests green.
- ✅ **#16 Stale $197/$497/$697 on `/solutions/financial-stress`** — replaced "Tiered Access Model" copy with current free-Protégé + 25/25/15 block.
- ✅ **#17 CloudWatch missing-data treatment** — both alarms now `--treat-missing-data notBreaching` so a fully-stopped pipeline (no metrics published) doesn't masquerade as healthy. Redeployed.
- ✅ **#19 `charge.dispute.closed` (non-existent event)** — replaced in EventBridge rule with the actual lifecycle events `charge.dispute.funds_withdrawn` and `charge.dispute.funds_reinstated`. Redeployed (6 rules wired).
- ✅ **#21 UTF-safe btoa in `audit.astro`** — `btoa(unescape(encodeURIComponent(...)))` for non-ASCII names. Matches the assessment.astro pattern.
- 📝 **#22 SNS alarm email** — `infra/sns/deploy.sh` updated from `drtj@my4mlife.com` to `drtj@essentialmanage.com`. **NOT re-run** (would require email-confirm of a new subscription); existing live subscription still works. Will re-run on next infra refresh.

### Test 2 cache bug — FIXED end-to-end
Two converging causes addressed:
1. **`signOut()` now clears per-user localStorage** — `apps/clientportal/src/lib/auth/cognito.ts` `signOut()` removes `audit-v1`, `intake-audit-scores-v1`, `intake-complete-v1`, `basics-v1`, `workbook-v1`, plus a forward-compat sweep of any `workbook-*` keys.
2. **audit-complete ↔ protege-signup race eliminated** — `website/src/pages/become-protege.astro` now decodes the `top3` + `answers` URL params (b64-encoded by assessment.astro) and passes them directly into the protege-signup body as `auditTop3` / `intakeAnswers` / `auditCompletedAt`. `lambdas/protege-signup/src/handler.ts` prefers body-supplied audit data over Contact lookup, and `seedUserProfile` accepts an `overwriteAudit` flag — on body-supplied data the if_not_exists guard is removed so a retake actually overwrites the prior assessment in UserProfile. 13 tests green.

### Still on the list
- **#10 25%-bundle copy on membership/tiers pages** — defer to TJ (those pages may have been deleted in pricing scrub; need confirmation before re-adding).
- **#18 EmailEntry "Sign In only"** — UX call, defer to TJ.
- **CRITICAL Stripe sandbox E2E** — TJ to drive.
- **Test 3 rate-limit verification** — shelved before public launch.

---

## 2026-06-02/03 — Stripe E2E #1+#2 + LIVE digital-product launch

### E2E #1 (cold-visitor test-mode checkout) — PASS, two real bugs caught

Via direct-Lambda invocation of `create-checkout-session` (website buttons not yet wired). TJ paid $9.99 test, then $0.50 test against a brand-new test product. Caught two production-critical bugs:

1. **`order-handler` IAM missing `secretsmanager:GetSecretValue` on the real ARN.** Policy was `arn:...:secret:all-stripe-keys` (no random suffix) but actual ARN is `:all-stripe-keys-9gfQHV`. Every Stripe event crashed at `getStripeClient` with AccessDenied. Patched live policy + updated `lambdas/order-handler/infra/deploy.sh` to use `:all-stripe-keys-*` wildcard.

2. **`order-handler-core` + `refund-dispute-handler-core` wrote Touchpoints with wrong PK schema.** Both used `stripeEventId` as primary key, but Touchpoints table has composite `contactId + sk`. ValidationException ("Missing the key sk in the item") on every write — Contact + Orders writes succeeded first, Touchpoints failed silently, audit trail was empty. Rewrote both to use the same `{contactId, sk: 'stripe#<evt>'}` pattern as `subscription-handler-core`. refund-dispute now resolves contactId at the top of each branch so both refund + dispute touchpoints get written. 8 + 16 tests green.

After fixes: Contact / Orders / Touchpoints all clean, idempotency verified — LTV stayed at $0.50, no duplicate writes on EventBridge retry.

### E2E #2 (full website-flow test-mode purchase) — PASS

Built the website-side wiring:
- Added `/products/cohort-workbook.astro` and a green-box "Order Now" button on `/solutions/gut.astro` that POSTs to `/api/create-checkout-session` and redirects to Stripe.
- Created `/thank-you` Astro page so post-checkout doesn't 404.
- Verified $0.50 cold-visitor flow end-to-end: gut page button → Stripe Checkout → webhook → order-handler → DDB all clean.

Note: Stripe Link auto-populated TJ's email + card during checkout despite incognito + cache clear. **Not us** — OS keychain autofill plus cross-merchant Stripe Link recognition. Documented but no code change. TJ's standing instruction: leave Stripe Link enabled.

### E2E #3 (LIVE $2.50 digital-product purchase + email delivery) — PASS

Built the digital fulfillment infrastructure. **Reusable for every future digital product** (workbooks, recorded Zooms, lab interpretations, etc.); adding a new product is one SKU map entry + one S3 upload + one Stripe price (~15-30 min).

**Infrastructure shipped:**
- **Stripe LIVE products** (created via API):
  - "Cohort Workbook (Digital PDF)" — `prod_UdKLrLQSxcWjHr` / `price_1Te3ggBSbDAyoIVykVOLJtCX` — $2.50 one-time
  - "Biome NS Ultra (sandbox placeholder)" — `prod_UdKLu3CFl5vIzO` / `price_1Te3ghBSbDAyoIVyD9FYngyp` — $0.50 one-time (gut page button)
- **S3 bucket** `my4mlife-digital-fulfillment` — private (full public-access block), versioned, in us-east-2. Contains `cohort-workbook-v1.pdf` (placeholder = `~/Downloads/4M_Month1_Workbook_COMPLETE.pdf`, 240KB, locked in by TJ as the early-stage stand-in until the real workbook is finalized).
- **`order-handler-core` extension** — new `DIGITAL_PRODUCTS` SKU→asset map. After Touchpoints write, if SKU matches a digital product AND it's the first run of this event (touchpoint create succeeded, not blocked by idempotency guard), signs a 7-day S3 URL via `s3-request-presigner` and invokes `email-sender` (async, `InvocationType: Event`) with the download link in the body. On failure, throws so EventBridge retries — idempotency above guarantees no duplicate Contact/Orders/Touchpoints writes, and the touchpoint-first-run gate prevents duplicate emails on retry.
- **IAM perms added to `my4mlife-order-handler-role`:** `s3:GetObject` on `arn:aws:s3:::my4mlife-digital-fulfillment/*`, `lambda:InvokeFunction` on the email-sender ARN. Deploy script updated so future deploys preserve these.
- **`/products/cohort-workbook.astro`** — product landing page with the green-box buy button, hits live Stripe.
- **`create-checkout-session` flipped to `STRIPE_MODE=live`.** Both the gut button ($0.50 Biome NS placeholder) and the cohort-workbook page ($2.50) now create LIVE Stripe Checkout Sessions. Any visitor clicking will incur a real charge.
- **3 new vitest cases** for digital fulfillment (cohort SKU invokes email-sender; non-digital SKU does not invoke; retry idempotency = no duplicate email). 11/11 core tests green.

**TJ verified end-to-end live:** went to /products/cohort-workbook on real my4mlife.com, paid $2.50 with a real card, received the workbook PDF download link by email, opened it. **Pipeline is live and working.**

### /thank-you cleanup (post-purchase UX)

TJ caught a UX issue during the live test: after paying, the thank-you page offered "Open the My4MLife App →" which led him to the app's sign-in. He used a different email there, the app auto-created an empty Protégé account with no assessment data — confusing dead-end.

Fix (Option B per TJ): removed "Open the My4MLife App" entirely. Removed misleading copy about "Protégé welcome email" (no such email goes to non-Protégé buyers). Replaced with a soft assessment CTA framed as discovery, not onboarding: "Curious what else My4MLife offers? Take our free 5-minute 4M assessment →". Deployed.

### What's locked & live going into Stripe production

- Live Stripe charges enabled on two visible buttons:
  - `/solutions/gut` — Biome NS Ultra sandbox $0.50
  - `/products/cohort-workbook` — Cohort Workbook PDF $2.50
- Stripe partner-bus EventBridge rules wired for both live + test buses (6 rules).
- order-handler, subscription-handler, refund-dispute-handler all on the corrected contactId pipeline.
- DLQ has correct EventBridge resource policy.
- Retry Lambda is one-shot `at()` with `ActionAfterCompletion: DELETE`.
- CloudWatch alarms: permanent-failures depth (PRIMARY, treat-missing notBreaching) + DLQ depth (SECONDARY, 30-min sustain). Pages SNS topic `my4mlife-stripe-alerts`.

### Active member spec — locked terms (2026-05-25, unchanged)

Protégé = free signup (name + email + phone + AI/Protégé consent). Discounts: **25% off first purchase, 25% off autoship, 15% off ongoing one-time reorders.** Non-Protégés pay full retail. Chargeback = lifetime ban. App + weekly Zooms free for all Protégés.

### TJ blockers carryover (none of these block more dev work; mostly account creation)

1. `drtj@essentialmanage.com` → Cognito `Admins` group (one CLI call): `aws cognito-idp admin-add-user-to-group --user-pool-id us-east-2_kIpKnr17R --username drtj@essentialmanage.com --group-name Admins`.
2. Affiliate signups for ButcherBox / Thrive Market / Amazon Associates. Drop codes into `website/src/lib/affiliates.ts` and `apps/clientportal/src/lib/affiliates.ts`.
3. Bedrock daily token quota increase (optional).
4. Zoom S2S credentials → `zoom-ops-creds` secret (no longer blocking Week 2 unlock; needed for future Zoom auto-scheduling).
5. Phone number for SMS approval queue v2 (email approvals already working).

### Friends-and-family testing plan TJ described

TJ plans to test live $2.50 cohort-workbook purchases with friends and family. **Pipeline is ready for this — no more work required from him to enable it.** Just send them the URL: `https://my4mlife.com/products/cohort-workbook`.

### Physical fulfillment (Biome NS Ultra direct-ship from manufacturer) — NOT YET BUILT

Discussed at length 2026-06-02. We have ZERO physical-fulfillment infrastructure today:
- Shipping address not captured at checkout (Stripe's `shipping_address_collection` not enabled)
- No SKU-based fulfillment routing for physical
- No manufacturer push (email / portal / API)
- No tracking inbound endpoint
- No customer shipping-notification email
- No Fulfillment table

**Before this can be scoped**, TJ needs to ask the Biome NS manufacturer:
1. How do they want to receive orders? (email / portal / API / ShipStation / ShipHero?)
2. How do they push tracking back? (email / web form / webhook?)
3. Carriers + typical ship time?
4. Returns/replacements policy?
5. GMP/cGMP compliance documentation + insurance?
6. Pick + pack fee structure?

Three integration patterns from lightest to heaviest:
1. **Email-based** (~2-3 hours to build) — fine for <10 orders/day, brittle if missed
2. **Shared portal/spreadsheet** (~4-6 hours) — Google Sheet / Airtable, polled daily
3. **Real API integration** (~1-2 days) — requires their tech maturity; most small manufacturers don't have an API but use ShipStation etc. which is integrable

Recommendation: start with #1 once their answers are in, upgrade to #2 or #3 when volume justifies.

### Active session todo state at handoff

All in-progress items are completed. Remaining items are TJ-action / awaiting-input only (affiliate signups, Cognito group add, friends-and-family $2.50 testing, manufacturer integration scoping). Bedrock/Zoom/SMS still pending TJ.

### Verified live (post-deploy of #8)
- ✅ **Test 1 (golden-path OTP):** TJ wiped + signed up fresh as drtj@essentialmanage.com. Exactly one OTP delivered. Sign-in succeeded.
- ✅ **Test 2 (refresh mid-flow):** Refreshed on the OTP entry screen pre-code. Cached session was reused (no second InitiateAuth), no second code arrived. Months-long duplicate-OTP bug is dead on both paths.
- ⏸ **Test 3 (rate-limit error path):** Shelved per TJ 2026-06-02 — revisit before public launch. Steps documented in conversation; tl;dr is rapid resend across fresh incognito windows until Cognito's per-user rate limit trips, then verify friendly error text + no extra codes.

### New bug surfaced during Test 2 (separate from OTP) — needs fixing
**Symptom:** When TJ retook the assessment with different answers (Test 2), the email & website results showed Test 2 values correctly, but the app dashboard hydrated with Test 1's cached values.

Two likely converging causes:
1. **App localStorage not cleared on sign-out.** `audit-v1` retains the prior session's scores; on next sign-in the app reads localStorage first and shows that.
2. **Race between `audit-complete` and `protege-signup` Contact writes.** assessment.astro POSTs `audit-complete` fire-and-forget, then redirects to /become-protege which POSTs `protege-signup`. If signup wins the race, UserProfile gets seeded from whatever was in Contact *before* Test 2's write landed.

Fixes to consider:
- `apps/clientportal/src/lib/auth/cognito.ts` `signOut()` — also clear `audit-v1`, `intake-audit-scores-v1`, `workbook-*`, `basics-v1`.
- assessment.astro — `await fetch(audit-complete)` (not fire-and-forget) before navigating to /become-protege.
- protege-signup — pass the freshly-submitted scores in the request body and seed UserProfile from those, not from Contact.

Add to HIGH batch as item #11b "Assessment retake re-seeds app correctly" — TJ to confirm priority based on how often real users will retake.


# 2026-06-08 — Amazon affiliate launch + OTC bridge + gut template propagation + assessment-only Protégé + canary consistency

Nine days of shipped work since the 2026-05-31 entry. Organized thematically rather than commit-by-commit. Key commit hashes inline.

## (a) Cohort Workbook v2 + 3 live-purchase paths
- `486ddd95` — Programs dropdown went live with 3 real Stripe-backed purchase paths: **Book $79.99 / App $69.99 / Workbook $2.50**.
- `da1b64e7` — Cohort Workbook v2 — full Month-1 rebuild reflecting the locked brand voice + current 4M protocol.
- `4cf5db29` — Cohort workbook bundled into the free Protégé welcome package (no longer a separate purchase for Protégés).

## (b) Amazon Associates go-live + environmental coverage expansion
- `b52498ea` — Amazon Associates tag `my4lifeamz-20` live across the site.
- `4092ea92` — First 6 affiliate buttons across 4 environmental pages.
- `88b76823` — +21 more environmental products wired.
- `d0c34463` — Expanded to all 8 environmental categories (light/air/water/EMF/grounding/sauna/cold-plunge/mineral-bath). 27+ affiliate buttons live.

## (c) 16-category OTC supplement bridge
- `e7109951` — Interim Amazon affiliate OTC bridge launched across 16 categories while 4M-branded products are in-formula. Practitioner-grade only: Thorne, Pure Encapsulations (Pattern-verified), RiseWell, Momentous.
- New components: `InterimPickCard.astro` (single affiliate card with optional "Verify Sold by: Pattern" callout), `RxConsultCTA.astro` (single-banner Rx consult block), `OtcRxTopOptions.astro` (clean two-card OTC + Rx top section).
- New solution pages: `/solutions/muscle`, `/solutions/nervous-system`, `/solutions/alcohol`.
- Rx-only pathways (Testosterone, ED, GLP-1, Peptides, Regenerative) route directly to consult — no OTC card.

## (d) /consult rebuilt as real care-coordinator intake
- `6a2e5e59` — Old /consult was a dead-end ("Get Notified When Open"). Rebuilt as a real intake form (name/email/phone/category/best-time/note) submitting to the existing `/api/contact-form` Lambda with `formId: 'consult-intake'`. Category prefills from `?category=` query param.
- RxConsultCTA voice locked: **"Schedule a consult with one of our care coordinators and they'll connect you with a physician in our network."** (Removed "Dr. TJ personally places" and "while we onboard full telemedicine" wording — both made us look small / not-ready.)

## (e) Gut template → propagated to 15 categories
- `d585de77` — Gut page simplified to clean 2-card top + new RxConsultCTA brand voice. TJ approved as template.
- `6e8f5fac` — Template propagated to 15 categories; **Alcohol** added as #10 in Top Categories. Lower-page CTAs (MiniTwoPaths, survey-retake prompts) stripped sitewide — rule: no decision-load in mid-funnel pages, no survey-retake nudges on Rx pathways.
- Navbar Top Categories reordered to match assessment hierarchy first (Gut, Sleep, Weight, Nutrition, ED, Brain, Testosterone, Regenerative, Alcohol), then non-assessment categories below.

## (f) Hormones page → testosterone-led SEO
- `ae0c1988` — Renamed page positioning: title now **"Low Testosterone — TRT & Testosterone Therapy for Men"**. Male targeting + SEO. FoundationStackPair / TwoPathsCTA stripped — RxConsultCTA only.

## (g) Assessment-only path to Protégé — sitewide sweep
- `ae0c1988` — All direct `/become-protege` routes removed. The **only** path to Protégé is now through the assessment.
- `SolutionPage.astro` Step 3 of "Take the Solution Path" replaced — direct app-access link gone, replaced with Protégé-benefits card routing to `/assessment`.
- `FoundationStackPair.astro` — `/become-protege` swapped for `/assessment`.
- 8 environment pages — footer CTAs repointed from `app.my4mlife.com` to `/assessment`.

## (h) ED canary metaphor — consistency pass
- `a1671539` — Body copy fixed: was using "ED is the smoke / four fires" mid-page. Replaced with extended canary + coal-miner analogy consistent with the book and hero copy.
- `bbfb5469` — Assessment Q5 categoryNote tweaked: added **"like the canary in the coal mine"** explicit aside, since the assessment is many readers' first exposure and not everyone will recognize the bare metaphor.

## Book — file locations (for next session)
- **Latest PDF: [docs/book/Begin-with-the-End-in-Mind-v3.pdf](book/Begin-with-the-End-in-Mind-v3.pdf)** (Jun 5). v1 + v2 archived in same dir.
- Source markdown chapters: [docs/book/draft/](book/draft/)
- Renderer: [docs/book/render.py](book/render.py)
- Covers: [docs/book/cover/](book/cover/)
- Cohort Workbook v2: [docs/cohort-workbook/Cohort-Workbook-Month-1-v2.pdf](../docs/cohort-workbook/Cohort-Workbook-Month-1-v2.pdf)

## Memory persisted this cycle
- `project_meal_plan_email_workflow.md` — Wed email → Sat delivery → Sun Zoom → cook → repeat. Email/SMS first, app secondary.
- `project_otc_supplement_bridge.md` — 16-category locked shortlist + authorized-seller rules.
- `project_solution_page_template.md` — locked template: OtcRxTopOptions or RxConsultCTA at top, no lower-page CTAs.
- `project_alcohol_category.md` — `/solutions/alcohol`; OTC = Thorne NAC; Rx = LDN via care coordinator.

## Still pending / carry-over
- Stripe E2E walkthroughs #1 / #2 / #3.
- Bedrock daily token quota raise.
- Zoom S2S credentials.
- SMS phone-number approval.
- ButcherBox + Thrive affiliate codes — wire same pattern into `affiliates.ts` when codes drop.
- Assessment Q10 (Excessive alcohol) `solutionSlug` to be repointed from `substance-use` → `alcohol` next time assessment data is touched.
- Pre-launch blockers: TJ book read-through, Biome NS fulfillment decision, privacy/HIPAA disclosure pages, friends-and-family E2E test cycle.
- Item #11b — assessment retake re-seeds app correctly (from previous section).


# 2026-06-09 / 2026-06-10 — Pre-launch lockdown: discounts killed, coming-soon killed, assessment-as-Protégé, book v4 print-ready

Massive session. Locked the funnel, killed the noise, made the assessment do everything Protégé signup used to do. Marketing event in 2 weeks.

## (a) Book v4 — print-ready
- Added long-form first-person preface ("A Personal Note from the Author") — encyclopedia summers, Pearson-Shaw L-arginine, Texas Tech track injury → chiropractic, andropause at 40, 2005 A4M pivot.
- Dedication to Tom and Julia Mundheim (last sentence tightened: "...influence at least a small portion of the lives the two of you have already touched along the way").
- Foreword written by external consortium — Odysseus/journey-home framing. Replaces placeholder.
- Expanded "About the Author" (~75-word bio) for inside back cover.
- Stripped all placeholder/version/TBD/draft signals from manuscript.
- Endorsement outreach letter + Tier 1-3 target shortlist in `docs/book/draft/_outreach-endorsement-letters.md`. Tony Robbins flagged as warm lead via MD partner.
- **Back cover designed:** `docs/book/cover/back-cover-mockup-v1.html` + rendered PNG. Headline + foreword subhead + description + 2 pull-quotes + author block + assessment CTA + ISBN/QR placeholders. Matches front-cover navy+gold palette.
- Latest PDF: `docs/book/Begin-with-the-End-in-Mind-v4.pdf` (rename to drop "-v4" before sending to KDP).

## (b) Assessment IS the Protégé signup — single funnel locked
- Assessment results page stripped to thank-you screen: "Check your email." No on-page top-3 cards, no Protégé CTA box, no product tiles, no $199/$99 lab pricing, no broken Stripe checkout.
- `audit-complete` Lambda rewritten end-to-end:
  - Ensures Cognito user (AdminGetUser → AdminCreateUser if not exists) on userpool `us-east-2_kIpKnr17R`
  - Seeds `Users` table (UserProfile) keyed on sub with auditTop3 + auditCompletedAt + intakeAnswers (overwrites on retake — app always reflects latest)
  - Generates signed S3 URLs (7-day TTL) for book v4 + workbook v2 from `my4mlife-digital-fulfillment` bucket
  - Sends 4-card welcome email: navy top-3 card + gold book card + copper workbook card + green app card + care-coordinator footer
- IAM: added `cognito-idp:AdminGetUser/AdminCreateUser`, `s3:GetObject` on fulfillment bucket, `dynamodb:UpdateItem` on Users table.
- Env vars: `USER_PROFILE_TABLE=Users`, `COGNITO_USER_POOL_ID=us-east-2_kIpKnr17R`, `DIGITAL_FULFILLMENT_BUCKET`, `PROTEGE_BOOK_S3_KEY=begin-with-the-end-in-mind-v4.pdf`, `PROTEGE_WORKBOOK_S3_KEY=cohort-workbook-v2.pdf`.
- v4 book + v2 workbook PDFs uploaded to S3.
- TJ E2E verified the flow end-to-end (email arrived, app dashboard hydrated top 3 on second pass).

## (c) Sitewide discount kill (locked 2026-06-09)
- Every 25%/15% off, autoship perk, first-purchase discount, 90-day bundle pricing reference removed across 13 files.
- Cart shows retail-only ($199 not $149.25).
- `clientportal/products.ts`: `memberUSD = retailUSD`; "discounted" tier → "addon".
- `skus.ts` `computeDiscountPercent` neutralized to return 0.
- `protege-signup` welcome email discount line cleaned.
- `inbound-handler` system prompt cleaned — AI no longer promises member discounts (Lambda not yet deployed; takes effect on first deploy).
- `cart.astro` "Every purchase activates Protégé tier" rewritten — Protégé activates by assessment now.

## (d) Sitewide "coming soon" kill (locked 2026-06-09)
- All "Notify Me When Available", "Coming Soon", "launch pricing finalizing", "Ships soon — white-label" surfaces removed.
- 4M-branded unshipped products (Heritage Bulb line, SleepRestore, Biome NS Ultra, MitoVita, ArmorVita, OmegaCN Prime buy buttons) gone from user-facing surfaces.
- 8 environment subpages now Amazon-affiliate-only with `tag=my4lifeamz-20`.
- 3 other solution pages (self-image, healthcare-access, nutritional-supplements) had "Coming Soon" buttons replaced with `/consult` care-coordinator CTAs.
- Light page bridge sentence added: "Until we ship our own line, these are the products we recommend on Amazon."

## (e) Other red-team cleanup
- `cart.astro`: "Checkout opens when Stripe is wired (coming soon)" → "Currently unavailable — schedule a consult with a care coordinator."
- `nutrition.astro`: dead `MiniTwoPaths` import removed.
- `assessment.astro`: dead `SOLUTIONS_DATA` passthrough removed.
- `light.astro`: dropped FoundationStackPair (SleepRestore + Rx consult) — light is environmental, not Rx.
- `about.astro`: FAQ Protégé-tier copy corrected (assessment, not purchase).
- Legacy `/audit` page → 301 redirect to `/assessment`.
- `fast-start.astro`: `/audit` link → `/assessment`.

## (f) Stripe receipt fix
- `create-checkout-session` now passes `payment_intent_data: { receipt_email: body.email }` to force receipts regardless of Stripe dashboard setting.
- Deployed.

## (g) Legal docs located + 3-stage gating plan
- All legal-prepared docs live in `docs/legal/`:
  - `My_4M_Life_Notice_of_Privacy_Practices.md`
  - `My_4M_Life_AI_Communication_Consent.md` (already wired on assessment)
  - `My_4M_Life_Business_Associate_Agreement.md`
  - `My_4M_Life_Patient_Authorization.md`
  - `attorney-brief.md`
- `website/src/pages/privacy.astro` already exists (256 lines).
- Locked gating: Stage 1 discovery = no friction (assessment/email/book/workbook/app/consult intake); Stage 2 consult-time = DocuSign envelope (NPP + Patient Auth) before booking confirmed; Stage 3 telemed handoff = partner's own paperwork.
- MVP for launch = care coordinator manually sends DocuSign from their account. No code automation needed for 2-week event.

## E2E verification (TJ confirmed working)
- Assessment → email arrives with top 3 + book + workbook + app links ✅
- App sign-in → name + top 3 hydrated on dashboard ✅
- $2.50 cohort workbook Stripe purchase → workbook delivered ✅ (receipt missing pre-fix; fixed now)
- `/consult` intake form → notification reached TJ ✅

## Still pending before public marketing
- **Book covers — full wrap for KDP.** Front cover (v3c) and back cover (v1) both designed. Spine + full wrap require KDP template (page count + paper choice) — upload manuscript PDF to KDP as draft to generate the template, then render the wrap PDF here.
- **DocuSign envelope template** — write the consult-confirmation envelope content (combines NPP + Patient Authorization). Care coordinator sends manually for launch.
- **Headshot for back cover** — current `founder-tj.jpg` is being used; TJ to confirm or supply preferred photo.
- **Endorsement outreach** — work the Tony Robbins warm lead via MD partner this week. Tier 1 cold sends (Attia/Hyman/Huberman/Amen) in parallel.
- Item #11b — assessment retake re-seeds app correctly (carry-over from prior section — now LIKELY resolved by the audit-complete UserProfile-seed work, but worth a final retake test with cache cleared).
- Inbound-handler Lambda — not yet deployed; system prompt updated in source for first deploy.




---

# 2026-06-19 — Soft-launch polish: Rx card-capture, app UX overhaul, vitals tracker, email confirmations

Long working session. Everything below is committed + deployed (app + website) unless noted.

## (a) Rx funnels — pricing model finalized + card-on-file (clears P0 #1 Stripe blocker)
Final model across the 5 `/rx/*` funnels (see PRE_LAUNCH_HANDOFF.md §4 #1 for the table):
- **Peptides** + **Regenerative** → free consult, **card captured at intake (Stripe SetupIntent, no price shown, no charge)**. Card only charged after physician determines protocol + patient approves.
- **Leaky Gut (Biome NS Rx)** → GLP-style card-on-file, **$129/mo** (`price_1TiY0vBSbDAyoIVyvY1LmKfA`). Reverted an earlier free-consult conversion per TJ.
- **Testosterone** → $249 one-time eval (`price_1Tgx2C…`, TJ-verified one-time) → **$129/mo maintenance** (`price_1TiY2tBSbDAyoIVy2shKwNWE`).
- **GLP-1** unchanged.
- All `PLACEHOLDER_*` Stripe strings removed; build-verified zero placeholders.
- Hook pages deliberately stay "free consult" (card disclosed at intake step) — matches Hims buy-first/qualify-after. **Standing rule reinforced: default to the big-boys model; only surface divergences.** (see memory `feedback_conversion_first_alignment.md`)

## (b) email-sender — customer confirmation on every form submit
`/api/contact-form` now sends the customer an instant confirmation (was internal-notification-only). Tailored: `*-questionnaire` → "intake received, no charge made, coordinator in 24h"; `consult-intake` → consult ack; others → generic; `public-assessment` excluded (already gets the audit-complete welcome). Best-effort (never breaks the lead notification). Verified live. Leads route to `drtj@my4mlife.com` (confirmed `form-recipients` secret). NOTE: Rx form submits only EMAIL — they do NOT write a Contact record (leads live in the inbox, not DB).

## (c) inbound-handler Lambda — first deploy (clears P0 #4)
Deployed `my4mlife-inbound-handler` (Active, dormant — no SES trigger; MX points to Google Workspace). Upgraded its stub deploy.sh to a real idempotent IaC script.

## (d) App (clientportal) — red/green-team fixes + big UX overhaul (all deployed, TJ phone-verified)
- **P0 fixes:** dead-end Weeks 2-4 now render; mobile Settings/Sign-Out reachable; OTP resend. P1/P2: light-on-white text, coming-soon copy, off-brand blue, etc. (see `docs/APP_RED_GREEN_TEAM.md`).
- **Less-typing sweep:** workout log → one checkbox per exercise (+ Zone 2, HIIT); fasting → per-day "Stuck to my window" toggle (exact times optional); factor action-plans → tap-to-adopt chips; morning reflection → mood + "what improved" chips; weekly retest is the only number entry → new dashboard **Strength Trend** card (W1→W4 side-by-side, built to extend across months).
- **Cognitive training = reading the book.** Removed Dual-N-Back link everywhere (renderer + cognitive.ts + factors.ts); cohort practice is now a Mon-Sun "read 10+ pages of Begin with the End in Mind" checkbox. New `habitLog` store + `habitWeekRow()` helper. Nutrition: removed "Build Your Ancestral Pantry" affiliate links (shopping lists emailed pre-Sunday-Zoom) → Mon-Fri "used a recommended recipe" checkbox.
- **Dashboard:** removed the dead "comprehensive consult" Next-Step CTA.
- **Protein:** formula now **1 g per lb of IDEAL body weight** (200 lb → 200 g/day); target carries into W2/W3/W4.
- **Carry-forward rule (NEW standing rule):** data entered once auto-prepopulates later weeks unless overridden, with a "(carried from Week 1)" hint. New `carryForward()` helper; applied to W2 "why" ← personalWhy and accountability ← accountabilityTarget. (memory `feedback_carry_forward_rule.md`)
- **Vitals Tracker (NEW):** editable cumulative chart — Systolic/Diastolic/Resting pulse/SpO₂ across Baseline + Wk1-4 — on the dashboard AND top of every week. New `vitalsLog` store. "Not a medical device" disclaimer.
- **Week 2 Motivate** labels clarified to reference Week 2 (not ambiguous "this week").

## (e) Website / book / ops
- Homepage: "Take the Survey" → "Take the Assessment"; hero "Don't roll the dice" → "while the choice is still yours."
- New **4M emblem logo** rendered from PDF (SVG + PNG) and deployed (navbar, footer, favicon, OG).
- **Book v6** PDF rendered: corrected the ch.10 regenerative-delivery paragraph (intrathecal/cognitive is facility-based at credentialed Centers of Excellence, NOT in-home; joints + systemic IVs remain nationwide/mobile). 290pp. Upload **v6** (not v5) to KDP.
- **Ops:** deleted test Protégé **Randall Beasley** (randallbeasley@yahoo.com) from Cognito + Contact + Users (all verified gone) for a clean friends-and-family test.
- Added a committed read-only AWS-inspection allowlist (`.claude/settings.json`).

## (f) STILL OPEN / next steps
- **Analytics:** PostHog fully wired in BaseLayout; BLOCKED on TJ's real `phc_…` project key (self-disabling stub until then). Optional: add funnel step-events for drop-off.
- **TJ P0 tasks:** walk all 5 Rx funnels E2E with a real card (esp. peptides/leaky-gut/testosterone/regenerative — changed this session); upload book v6 to KDP + cover; `info@ → drtj@` Google Workspace forwarding.
- **Equipment-to-purchase website section:** TJ wants a pre-program order list (BP cuff + pulse ox to pair with vitals tracker, door-jam pull-up bar, foam squat/slant wedges, more). Needs product research + approval before building (no-weak-links rule, live affiliate links).
- **"Today" hub:** DEFERRED (option 2). The unmounted TodayView uses a different Adherence action-ID scheme than the live week rows AND predates all the new trackers — mounting needs ID reconciliation + a canonical-surface decision + is now stale. Treat as a post-launch project (likely a fresh build). Details in `docs/APP_RED_GREEN_TEAM.md`.
- Hook-page card mention: intentionally NOT added (big-boys match).
