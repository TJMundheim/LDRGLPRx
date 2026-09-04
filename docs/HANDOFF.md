# ===================================================================
# COMPLETE PROJECT HANDOFF — My4MLife (repo: LDRGLPRx)
# Last updated: 2026-09-02 · self-contained current-state snapshot
# (Dated changelog of prior sessions follows this block.)
# ===================================================================


## ⚡ 2026-09-02 SESSION — Direct-buy front door + gender-specific pivot (SHIPPED fae167fb + 74edbe90, deployed website + intake lambda)

- **MEN-ONLY (07-03) SUPERSEDED → GENDER-SPECIFIC:** neutral where physiology isn't sex-specific; explicit men (testosterone) / women (menopause). Never scrub men→people; rewrite. Dr. TJ male-perspective voice stays.
- **Front door = direct-buy Rx (Hims/Ro):** homepage treatment picker → /rx page → questionnaire → visit. Lanes: GLP-1 free · Gut-Brain Rx free (retitled leaky-gut; formula never shown) · **NEW /rx/gh-peptide** free (placeholder: tesamorelin OR CJC-1295, TJ to pick; truncal fat + muscle w/ GLP-1) · Testosterone $249 live · **NEW /rx/menopause-hrt** $249 live audio-visual ($129/mo mirror of TRT). Peptides/regenerative → Services only. Plan: docs/plan/direct-buy-front-door-2026-09-02.md.
- Backend: only change = `lambdas/_shared/patient-record` forcedVisitType adds 'menopause-hrt' → audio-visual (TDD). Consult amount is admin-entered at approval (no pricing code).
- Traffic thesis: redesign = landing pad; **Count Yourself Skinny = traffic engine.**
- **GO-LIVE FOLLOW-UPS (reviewer flags):** (1) menopause-hrt questionnaire carries TRT Stripe price IDs — INERT today (charge comes from admin-entered amountCents in charge-on-approval) but must be replaced before any code reads them; (2) gh-peptide questionnaire Step 3 still GLP-1 screening + "no lab work" + tesamorelin off-label wording — revisit when TJ picks the product; (3) hero photos on neutral lanes (/rx/weight-loss dawn-walk, /rx/gh-peptide rowing) still show men — need neutral/dual assets; (4) Navbar has NO rendered Sign In link (pre-existing); (5) intake handler.ts 111 lines (pre-existing >100 rule); (6) Target-weight field on hormone intakes (TRT+menopause) is a GLP-1 template leftover.
- Homepage keeps Amazon book links (Kindle B0H7FJRHXC / Paperback B0H7742SDD / Hardcover B0H75TYF1G) in the free band (TJ 2026-09-02).
- **BOOK v20 SHIPPED (bcc7870f), 280pp:** gender-specific sweep (318 judged edits; Dedication/Foreword/Personal Note untouched; "Who This Book Is For" rewritten: man writing, medicine for everyone, two canaries), NEW Ch7 section "The Other Canary: Perimenopause, Menopause, and the Female Brain" (~2.1k words), NEW Ch9 section "The Regenerative Protein Array: The Signal Without the Cell" (~2.2k words; RPA+Muse = headline config per TJ; brand never named; source notes docs/products/rpa-source-notes-2026-09-02.md), copyright page carried. Paperback wraps re-spun (B&W 0.631in, color 0.657in); hardcover wrap NOT re-spun (sized ~259pp; now 280 — recheck in KDP previewer). S3 fulfillment PDF = v20. Desktop KDP-UPLOAD v20 files staged; v19 was never uploaded (TJ hold) — upload v20 instead. Kindle docx: regenerated via docs/book/build_ebook_docx.py (md→docx generator replaces hand-edits).
- **TESAMORELIN lane LIVE (f98add1f):** /rx/gh-peptide = tesamorelin (not CJC-1295); evidence block w/ sources, 6-question tesamorelin screening, labels sitewide.
- **FLAG for TJ:** book Ch4 (~line 718) still names "oral BPC-157" in the Rx gut protocol — conflicts with the 2026-07-09 "never expose Biome NS Rx formula" rule (pre-existing in v19; left as-is in v20 — TJ decision).
- Women's HRT product line still needs telemed partner prescribing. **CYS APP RUNS ON SIMULATOR (2026-09-02):** Xcode 26.6 + iOS 26.5 runtime installed; iPhone 17 Pro sim UDID DFE0EF33-…; build via MCP build tool OK, launch via `xcrun simctl bootstatus -b` + `simctl install/launch` (MCP launch reports Shutdown — use simctl). Home screen verified. **Chew Lab (v1.5 AirPods prototype) SHIPPED c4428eca:** Sources/Motion/ChewDetector.swift (CMHeadphoneMotionManager; scalar |rotRate|+2·|accel.y|; EMA band-pass 0.8–2.5 Hz; adaptive MAD peak gate k=2.5, min 0.35 s; CSV export) + ChewLabView; graceful on simulator. Device test = TJ opens .xcodeproj, Signing → personal team, Run to iPhone (7-day profile). Next: TJ Apple Developer account (Org if D-U-N-S exists, else Individual) → StoreKit products + offer code; TJ records 2–3 meals via Chew Lab → evaluate CSVs.
- CYS status unchanged since 08-19 (book v2 82pp; app scaffold uncompiled — no Homebrew/xcodegen on TJ's Mac; needs TJ password or permission to download xcodegen binary).

## ⚡ 2026-08-19 SESSION — Book v19: formal copyright page (all formats)

- **Book v19 built (color + BW paperback + Kindle docx):** new dedicated copyright page (page 2, own page) inserted after title page in `_MASTER.md` and surgically into the ebook docx. Contains: full rights-reserved paragraph, **My4MLife Press imprint**, trademark notice (My4MLife / 4M framework / MindSpan Score / Biome NS), formal medical disclaimer (DC-credential-compliant per branding rules), references pointer to my4mlife.com/science, First Edition 2026, printer line, print run. Old one-line © removed from title page.
- **ISBN intentionally omitted from print** — HTML comment placeholder in `_MASTER.md` copyright block. RECOMMENDED: buy Bowker ISBNs (~$295/10) so publisher of record = My4MLife Press, not "Independently published". Add before/at KDP upload if purchased.
- v19 preserves the v18 "Who This Book Is For" page (men-motivation / 99%-for-everyone) in ALL formats. 262pp both PDFs (+2 vs v18 — covers' spine widths unaffected in practice but re-check if reprinting wraps).
- S3 fulfillment refreshed: `begin-with-the-end-in-mind.pdf` = v19 color.
- TJ intends to upload v19 to KDP (Kindle + paperback + hardcover). Kindle uses the updated ebook docx; both print interiors = v19 PDFs.
- Open credibility ideas (TJ aware, not built): named foreword author instead of "consortium" signature; advance-praise page once real endorsement quotes exist (outreach letters already drafted).

## ⚡ 2026-07-29→08-04 SESSION LEDGER (Fable) — first real Protégé + Logbook rename + Austin

- **FIRST ORGANIC PROTÉGÉ (2026-07-30):** coonan_michael@yahoo.com, Michael, Jacksonville FL phone. Pipeline verified end-to-end: Contact + Cognito + Users profile + Mailgun-delivered welcome email. Top-3: gut 5 / weight 4 / mood 5.
- **All 5 /rx questionnaires were DEAD (JS syntax errors — stray braces + orphan catch) — fixed + deployed (231b649b).** State dropdown + Continue verified live.
- **"Cohort Workbook" → "The Logbook" everywhere (7c1a1e85, deployed):** PDF v5 (139pp) + S3 `the-logbook-month1.pdf` (old key refreshed, same content) + welcome emails + concierge prompt + 11 site pages + app sidebar + `/products/logbook` redirect. Stripe SKU `cohort-workbook` + app storage keys intentionally unchanged. NEVER "workbook" in new copy.
- **Book links split per format (e6b0afa1):** Kindle B0H7FJRHXC / Paperback B0H7742SDD / Hardcover B0H75TYF1G. v17 interiors copied to TJ Desktop as `KDP-UPLOAD — *.pdf` (Desktop copies were stale v16 — repo is source). Covers still valid (259pp vs 258, spine delta negligible).
- **INBOUND EMAIL — support@ CONFIRMED WORKING 2026-09-03** (a Protégé's email to support@my4mlife.com reached drtj@; MX → Google Workspace, alias/catch-all now routes it). **info@ (welcome-email FROM / reply-to) still UNVERIFIED** — TJ to send a test to info@ and add the alias in admin.google.com if it doesn't arrive. Outbound from info@ needs nothing (SES domain identity verified). SES inbound-handler can't be live (MX points to Google).
- **ops-agent post-event 30-min cron DISABLED** (9,153 no-op Bedrock runs; exhausted daily tokens, starved Mon 7/27 weekly-Zoom run). Weekly Monday rule still ENABLED — will fail gracefully at zoom_create_meeting until Zoom acct exists. Nurture queue still unprovisioned (lead-stage only, no current impact).
- **Austin (7/31 Speed of Light dinner):** Sinicropi follow-up ON HOLD pending TJ debrief. NEW: **Landen Fredrick** (CEO Mannatech + M5M chair) demanded follow-up. Mannatech: going-concern 10-Q, –$5.6M equity, ~$10M mkt cap, Nasdaq notice, 16% insider loans, Americas –25.6%. Strategy: advisory/licensing angles, never distributor; TJ has the leverage (Rx layer). Memory: project_sinicropi_speaker_track.
- **TJ priority list delivered 2026-08-03** (Austin follow-ups → Google aliases → Zoom Pro → live $149 test → first admin sign-in → KDP v17 upload → ConnectedMind URL → photographer → ambassador review). Scouting calendar: docs/launch/speaking/scouting-calendar-aug2026.md.

## ▶ NEXT SESSION STARTS HERE

**STATUS 2026-08-09: NEW PROJECT — "COUNT YOURSELF SKINNY" (mass-market prequel book + companion app). Book v1 draft DELIVERED → `docs/book-cys/draft/_MASTER.md` (11 ch, ~5.5k words, de-branded, "Everyone" audience page, ch.11 funnels to assessment). Master plan DELIVERED → `docs/plan/count-yourself-skinny-master-plan-2026-08-09.md`** — science thresholds table (32 chews / 2,500-step floor / 12-16h fasting / 10-min morning light / 7×7 sleep / streak), native-iOS app spec (v1 = 5 counters + "One Walk, Five Boxes" mode, NO ML; v1.5 = AirPods chew counting via CMHeadphoneMotionManager — IMChew research: 91% accuracy; competitor Ododok exists but tiny), monetization ladder (rec: free + $2.99/mo Pro vs TJ's $1.99 instinct — DECISION OPEN; employer Pro-seats as $0-PEPM wedge; funnel to assessment = real engine), hardware affiliate strategy (Apple = App Store featuring not partnership; challenger earbud brands = real co-marketing target, co-branded bundles). Native iOS is a deliberate exception to the Vite-PWA rule (CMHeadphoneMotionManager is iOS-native only). NOTHING BUILT app-side. TJ open decisions: pricing model, title lock, iOS exception approval.

## ▶ PRIOR QUEUE (2026-08-05)

**STATUS 2026-08-05: BRAINSTORM DELIVERED → `docs/plan/employer-edition-brainstorm-2026-08-05.md` — awaiting TJ review.** Covers: one-source/two-renders book mechanics (`render.py --edition` + `<!--ed:-->` markers, mens output byte-identical), chapter-by-chapter delta map (Ch1/3/7/11/13/17/18 + "For the Employer" appendix + preface = canonical disclaimer line), subtitle candidates, /employers page skeleton ($0-PEPM wedge + HR-report-as-product-shot), neutral assessment Q18 + org-code tenant tagging, Logbook Workplace Edition (baseline #05 neutral + workday boxes), Phase-1 HR report = emailed aggregate PDF (min-cohort suppression ~10), build order (book → /employers → enrollment pipe → Logbook → report), 7 open decisions (sub-brand?, exact-$0?, employee pricing vs discounts-killed rule, pilot target, Amazon listing?). Supersedes draft's separate-brand/URL + $2–5 PEPM + B2B-billing-gap items. NOTHING BUILT.

**STATUS 2026-08-05 (part 2, TJ direction): FRONT-MATTER SPEC + RESEARCH DELIVERED → `docs/plan/employer-edition-front-matter-spec-2026-08-05.md`.** Workplace edition = TWO-AUDIENCE book (front sells the employer, body serves the employee). Dedication/foreword CUT; Personal Note trimmed ~8pp→2pp and moved after the business case; page 1 = "The Punchline" bullet page (drafted); new Ch1 Cognitive-Performance-Is-Job-Performance / Ch2 What-Doing-Nothing-Costs / Ch3 Why-This-Costs-You-Nothing; "motivate men/99%" line demoted into the author origin story. 3 parallel research streams captured w/ sources + staleness flags: employer burden (KFF $26,993 family premium 2025, employer share ~$20K; Mercer 6.5%/Aon 9.5%/WTW 9.1% for 2026; CDC 90%-of-spend; IBI $575B/1.5B days; RAND sleep $411B; Harvard insomnia $2,280/employee; ADA diabetes $12,022; Greenberg depression $16,854; NSC fatigue $1,200–3,100; Whitehall II decline-starts-at-45; 55+ = ~24% of workforce), ROI truth (Baicker 2010 6:1 dead → Song/Baicker JAMA 2019+2021 + Illinois QJE 2019 null; selection effect $1,384; RAND/PepsiCo disease-mgmt $3.78:1 vs lifestyle $0.50:1; incentives +20pp w/ diminishing returns >$100–200 = empirical backing for TJ's small-incentive instinct; retention 33–200% of salary; CoreHealth $3.75–5.40 PEPM = the wedge), cognition↔performance (Schmidt-Hunter r=.51/.58 w/ Sackett 2022 downward revision — print "among the strongest," never "the single strongest"; Dawson & Reid 17-19h awake ≈ BAC 0.05; **US POINTER JAMA 2025 structured>self-guided = the book's most important citation**; resistance-training + visceral-fat + gut-brain + perceived-organizational-support carryover evidence). PITCH LINE: "wellness programs don't fail because wellness doesn't work — they fail because employers pay clinical prices for non-clinical products." ALSO SPEC'D (TJ raised): prevention/screening ladder — free (MindSpan + ConnectedMind) / insurance-covered (USPSTF A/B incl. depression screening, $0 cost-share) / cash-pay HSA-FSA (PGx + advanced labs). **PGx: do NOT bill insurance — only ~46% of PGx claims reimburse, 8 of 12 payer policies cover ≤10 drug-gene pairs; cash-pay HSA/FSA on the existing Stripe rail.** Employer-paid screening rejected as default (breaks $0 wedge + ERISA exposure). NOTHING BUILT.

**STATUS 2026-08-05 (part 3, TJ correction — IMPORTANT): THE BUSINESS CASE NEVER GOES IN THE EMPLOYEE'S BOOK.** TJ: employees seeing the cost/savings data will conclude the employer enrolled them to save money, not to help them. Correct, and empirically backed — Nishii/Lepak/Schneider (Personnel Psychology 2008): employee ATTRIBUTIONS about why management adopted a practice drive commitment/satisfaction; wellbeing-attributions build commitment, cost-reduction attributions don't. Handing employees the ROI chapter writes the cost-reduction attribution for them and destroys the retention effect that is the employer's own best argument. → **THREE artifacts now: (1) men's edition unchanged, (2) workplace EMPLOYEE edition — de-gendered, ZERO financials, opens with a warm "Your company opened a door" page (guardrail: never "invested in you"), Personal Note stays near-full length, (3) THE EMPLOYER BRIEF — NEW separate ~20–30pp non-book asset (`docs/employer-brief/`, NOT off _MASTER.md, never in an employee's hands) carrying the Punchline page + Letter to the Employer + the 3 business-case chapters + screening ladder + privacy page.** Brief doubles as /employers page content + speaking leave-behind + pilot follow-up PDF. Deliberate crossover: the Brief TELLS the employer we never show their people the cost argument (trust-builder + filter). Book editions lock still holds (2 editions off the master); Brief is not a third edition. REVISED BUILD ORDER: Employer Brief first (~25pp new writing, fastest, sells everything else) → workplace employee edition (now a LIGHTER lift — delta map + short front matter, not 35–45pp of business case) → /employers page → enrollment pipe → Logbook workplace edition → HR report generator. Also stale-number guardrails for print: never "presenteeism = 10× absenteeism" (2–3× defensible); never "the single strongest predictor" of job performance (Sackett 2022 revision) — use "among the strongest, largest in complex/managerial roles".

**ORIGINAL QUEUE ENTRY: employer/employee edition of *Begin with the End in Mind*** + corresponding website / app / Logbook changes for the workplace target market. Build ON TOP of the existing corporate-wellness vertical draft (docs/plan/corporate-wellness-vertical-draft.md; memory: project_corporate_wellness_draft). Book source: docs/book/draft/_MASTER.md (v17). Logbook source: docs/cohort-workbook/draft/_MASTER.md.

**DIRECTION SET 2026-08-05 (TJ + Fable aligned, pre-brainstorm):**
- TJ's intent: blend corporate approach using everything already built; serve men / women / everyone / employers from one engine. TJ floated a 4-choice homepage; Fable recommended AGAINST a chooser homepage → **Hims/Hers pattern instead**: my4mlife.com stays the men-first flagship untouched; NEW `/employers` front door for the corporate vertical (the de-gendered "everyone" surface); a women's door is a later Hers-style move. TJ to confirm in brainstorm.
- Employer model: **$0 (or near-$0) PEPM as the wedge vs CoreHealth-class competitors** — employees become a company cohort (Protégé mechanics), revenue from existing product/service menu (commerce + Rx), improved and expanded. MindSpan Score + assessment data = the HR outcomes-reporting product.
- Book: **TWO editions only** — current men's edition (unchanged) + one workplace/everyone edition (de-gendered voice, cognitive-performance-is-job-performance framing, employer cohort structure), both from the master source. Not four.
- Canonical disclaimer line (from TJ's tested Facebook post): "I wrote this book to motivate men because they're historically not good at prevention — but 99% of it applies to everyone." Goes in talks, book preface, employer pitch.
- This deliberately amends the men-only HARD commit at the distribution layer (new audiences get their own doors); the men-first flagship voice is NOT softened.

## ⚡ 2026-07-13→14 SESSION LEDGER (Fable) — 20-question assessment + ambassador draft

**20-QUESTION MINDSPAN ASSESSMENT LIVE (spec: ~/Documents/MindSpan-20Q-Assessment-Spec-for-ClaudeCode.md):**
- **Question set:** 20 items grouped by pillar (Mind 6 / Muscle 4 / Mitigate 9 / Motivate 1), 0–5 each, total /100. Bands: 0-15 Sharp / 16-35 Early drift / 36-60 Time for a plan / 61-100 Act now. **Dental folded into #3 → "Hearing, vision & dental"** (TJ 2026-07-14 — oral microbiome = front door of gut-brain axis; keeps format at 20 without diluting gut). Legacy ids preserved for the 8 carried categories (lambda RX_MAP + app factor map keep working). New canonical data: `website/src/data/audit-questions.ts` (AUDIT_PILLARS, DIAGNOSED_QUESTION, AUDIT_BANDS, AUDIT_BONUS_BY_ID) — mirrored in assessment.astro inline script.
- **Ranking (TJ locked):** gut +3, weight +2 (bonus forfeited at raw 0); ties break by question order; **already-diagnosed = Yes/No FLAG outside the audit** — never ranked/scored, transmitted as `already-diagnosed: 0|5` inside scores for downstream compat, Yes → regen-medicine banner on results + rx-rec in email.
- **On-screen results (reviewer feedback via TJ):** score /100 + band + top-3 with /solutions links render immediately on submit — no email wait. Email now also carries a **pillar-grouped table of all 20 scores** (audit-complete `buildBreakdownCard`, payload: breakdown/totalScore/band).
- **ConnectedMind module (results-side, outside audit):** wired per spec (prominent if mood ≥3 or diagnosed=Yes, else quiet link) but **HIDDEN until TJ supplies the consumer URL** — set `CONNECTEDMIND_URL` in assessment.astro (no-coming-soon rule; no dead buttons). App factor 'Mental health & mental wellness' already tagged "Connected Mind".
- **App synced:** data/audit.ts → 21 categories (20 + flag); renderer selectTop3 new rules; AUDIT_ID_TO_FACTOR_NAME extended (mood→Mental health, hearing-vision-dental→Poor dental health, pain-injury→Injury history, bp/sugar/ldl→Excess body fat, social/purpose→Social isolation; smoking-nicotine BLANK — no factor yet); `auditTotals()` scale-aware (/50 legacy vs /100 new, diagnosed excluded); band thresholds percent-based; "10-category" copy swept. localStorage key bumped public-assessment-v1→v2.
- **Sitewide copy sweep:** all "10 questions / 5 minutes" → "20 questions / about 7 minutes" (index ×5, SolutionPage, about, privacy, thank-you, products ×3, fast-start, bmi JSON-LD, go/gut-repair). Rx-page "Five minutes, from your phone" untouched (describes rx questionnaire).
- **E2E VERIFIED LIVE:** browser-driven full run (20 answers + No) → on-screen 44/100 "Time for a plan" + top-3 Gut/Weight/Sleep exactly as computed → Contact row (21 intakeAnswers keys, top3, protege) → results email sent → **found + fixed pre-existing bug: randomPassword could miss a symbol → InvalidPasswordException → Cognito seed silently failed for some real signups** (fixed in audit-complete + protege-signup, redeployed, re-verified user creation). Test identity fully cleaned (Cognito + Contact + Users).
- **Deployed:** website, app.my4mlife.com, audit-complete, protege-signup. One test run polluted PostHog assessment funnel (~1 event set, 2026-07-14).
- **AMBASSADOR PROGRAM DRAFT (do NOT build):** `docs/plan/ambassador-program-draft.md` — subscription-qualified residuals (Ambassador wk13-52 25% / Graduate yr1+ 30% proposed), Protégé/Ambassador/Graduate timeline redefinition, event-discount placeholders, AI back office. Awaiting TJ review. Legacy /referral page ($50-per-consult) must die when this builds.

**OPEN:** TJ: ConnectedMind consumer URL → one-line switch to go live · ambassador draft review · paperback/hardback Amazon URLs · $149 order test · KDP v16 upload. Book appendix still prints the old 10-question assessment (update at next book rev). Smoking factor missing from app factor catalog. Nurture queue got 2 test messages for a deleted contact (worker will warn + no-op).

## ⚡ 2026-07-10 SESSION LEDGER (Fable) — tidy-up sweep (TJ delegation: "I'll work on 1 and 2, you take the rest")

**SHIPPED & LIVE (all committed/pushed/deployed):**
- **Newsletter capture LIVE (was a black hole).** `lambdas/lead-capture` rewritten as merge-upsert: `Contact.newsletter=true` + `newsletterSource` + `newsletterAt`, all creation fields `if_not_exists` (never downgrades a Protégé/customer row); CORS allowlist; deployed via new full `lambdas/lead-capture/infra/deploy.sh` (role scoped to logs + `dynamodb:UpdateItem` on Contact only). Route `POST /api/lead-capture` + OPTIONS on API v9svm8ds74 — live-verified end-to-end (test row created, checked, deleted). `EmailCapture.astro` now POSTs `{email, source}` there IN ADDITION to the drtj notify email. **Subscriber query:** scan Contact for `newsletter=true`.
- **/weekly-picks page LIVE** (`website/src/pages/weekly-picks.astro`) — the hosted tagged-Amazon-links page every Wednesday email must link to (HARD RULE: no tagged links in email bodies). Data-driven: edit the `WEEK` object → rebuild → deploy. First edition: pantry staples + protocol staples (6 tagged links), equipment cross-link, EmailCapture signup band (source `weekly-picks`), Associates disclosure.
- **ED early-signs sweep DONE (site).** ⚠️ LESSON: `oneliner` prop is NOT rendered on `compact` SolutionPage — put copy in visible body. ED canary now in: pillars/mind cognitive card, solutions/cognitive Why-This-Matters list (+ link to /solutions/erectile-dysfunction), solutions/hormones why-list ("bedroom goes quiet first"), low-T blog symptom list. Book (Ch7 + glossary + closing) and workbook (§1 + §9) already carried it. All live-verified post-invalidation.
- **Founder shoot list delivered:** `docs/design/founder-shoot-list.md` — 12 shots, brand grade for the photographer, 40/25/15/10/10 coverage math, A/B plan. TJ books the photographer.
- **Per-route API throttling applied** via new `infra/api-throttling.sh` (idempotent): request-otp/audit-complete/protege-signup/send-app-link = 1 rps burst 3; contact-form/lead-capture/Stripe/patient-record-intake = 2 rps burst 5; stage default stays 10/50. WAF + CAPTCHA still open (cost call for TJ).
- **Old Desktop repo copy DELETED** after final sweep. Recovered first (byte-verified into new repo): `.claude/settings.local.json`, `infra/clientportal/.state.env`, `infra/website/.state.env`, `.secrets-local/admin-demo-auth-password.txt`. Remaining untracked were iCloud "… 2.*" conflict dupes — discarded. Symlink `~/Desktop/Development/LDRGLPRx → ~/Development/LDRGLPRx` intact.
- **(Prior turn, this session:) Programs menu fixed** — dead Buy-the-Book link removed; 3 book formats (Ebook/Paperback/Hardback-for-cohorts) all → Amazon dp/B0H7FJRHXC, no prices (TJ choice); Buy-the-App + Cohort Workbook placeholders removed.

**OPEN / NEXT:**
1. TJ's own tasks: live $149 order test → refund · KDP v16 upload (on his Desktop).
2. **Split book format links** when TJ provides paperback + hardback Amazon URLs (all three currently → the Kindle ASIN page).
3. Wednesday email workflow: first real send should link to /weekly-picks; weekly edit = `WEEK` object in weekly-picks.astro.
4. Logbook v1 full build · homepage flagship Biome band · contextual gut links in services pages · Search Console Rx-term check · ~15 long-tail solution images · blog headers from images/editorial/ · WAF/CAPTCHA.

## ⚡ 2026-07-07→09 SESSION LEDGER (Fable) — audit sweep + measurements + gut-repair guide

**SHIPPED & LIVE this session (all committed/pushed/deployed):**
- **Red/green audit FULLY CLEARED (44 findings).** Multi-agent audit (5 red finders + adversarial verifiers + green team) → 44 confirmed (5 crit / 16 high / 13 med / 10 low). ALL fixed + deployed across website, app, 6 lambdas, 2 AppSync resolvers. Punch list: `docs/audit/red-green-2026-07-07.md`. Criticals: rx SetupIntent re-confirm trap (all 5 questionnaires), charge-on-approval double-charge (Stripe idempotency keys + payment-status guard), stale-v1 welcome PDFs (env vars fixed + verified live), upsertMyProfile privilege escalation (resolver denylist, verified via `aws appsync evaluate-code`), unauth PHI overwrite (merge not blind Put). Program engine now consistent: signup-week anchoring everywhere, partial-first-week Move fairness (`effectiveTarget`), DST-safe `calendarWeek`, retired-id read aliasing, reactive PWA clock, unified grid/Move/score week window.
- **Weekly measurements + morning routine (TJ 2026-07-08).** Dashboard "Today's readings" card (sys/dia/pulse/SpO₂/weight/waist) → `measure-*` Adherence rows w/ numeric `value`; dashboard charts each **week's AVERAGE across all 12 weeks** (sparkline + delta since week 1). Morning routine restored: daily tape row + month dots; weekly aggregate = day-count. New `weeklyAggregate(entries, actionId, anchor, 'average'|'count')` in program.ts (16/16 tests). Legacy single-value vitals table removed. `measure-*` + `morning-routine` in recordAdherence allowlist (resolver deployed).
- **Fast Start Guide to Gut Repair (TJ 2026-07-08).** Standalone 6-page PDF (`docs/guides/fast-start-gut-repair/` — HTML source + PDF), gender-neutral, OTC dosing (Biome NS Ultra 8-ingredient table, 1 scoop 8-12oz water WITH/after first meal) + Rx (oral BPC-157 250–1000mcg physician-set, 4-wk cycle, concurrent) + 7-day fast start + 3-path CTA page + full disclaimer. Live at `s3://my4mlife-digital-fulfillment/fast-start-gut-repair.pdf`. **AUTO-EMAILED with every Biome NS purchase** (order-handler `GUT_REPAIR_GUIDE`, best-effort — never fails the order; 13/13 tests). LP CTA live on `/go/gut-repair`: "✓ Free Fast Start Guide… emailed instantly with every order."
- **Refund policy** fixed: app access = free for Protégé, no subscription.

**OPEN / NEXT (priority order):**
1. **Gut-repair singular repositioning** (TJ's #1, approved to build). Strategy: memory `project_gut_repair_singular_positioning`. Plan: homepage hero leads with gut-repair-for-cognitive-repair; demote GLP-1/testosterone/peptides/regenerative from top-nav (`website/src/components/Navbar.astro` ~lines 84-89, the 5 `nav-rx-item` links) into the **Services** mega-menu as a new "Prescription Therapies" section — KEEP crawlable (SEO: net neutral-to-positive if pages stay built + footer-linked + real `<a href>` + contextual body links; pull Search Console split before finalizing). Homepage hero (`index.astro` ~80-112) still 5-condition framing → rewrite. NOT started in files.
2. **ED early-signs sweep** — add ED to every "early signs of decline" list across site/app/book (homepage founder quote done). Memory `project_ed_canary_thesis`.
3. **Founder photo shoot list** (`docs/design/founder-shoot-list.md`) for founder-hero A/B vs boardroom hero.
4. Audit infra follow-ups (not code): rate-limiting/WAF on public `/api`; CAPTCHA.
5. Long-tail: ~15 solution-page images; blog headers from `images/editorial/`.

**PROCESS NOTES:** (a) LOCKED — stay on Fable, never suggest model switches (memory `user_model_preference_fable`). (b) Background `Agent` subagents stalled repeatedly this session (600s watchdog) — prefer inline work. (c) `infra/clientportal/cdk` needs `pnpm install --ignore-workspace` before `cdk deploy`. (d) Deploy scripts prompt each run — consider allowlisting.

## ⚡ 2026-07-06→07 SESSION LEDGER (Fable) — funnels + app v2 + shakedown
**⚠️ CRITICAL LESSON — repo move stranded untracked files.** `apps/clientportal/.env.local` (VITE_APPSYNC_URL etc.) and `website/.env` (PUBLIC_LEAD_CAPTURE_API_URL) never moved from the old iCloud copy — app deploys on 07-06 shipped with NO API address (every call failed client-side; zero AppSync traffic; app fell back to localStorage ghosts). BOTH files recovered from `Desktop/Development/LDRGLPRx-OLD-DELETE-AFTER-VERIFY` and redeployed. **Do NOT delete the old Desktop copy without a fresh untracked-file sweep.**

**SHIPPED (2026-07-06→07):**
- **PostHog funnels LIVE:** 8 step events wired (assessment: started/questions_completed/contact_reached/submitted; rx: step_reached{1-6}/card_saved/submitted w/ category prop on all 5 questionnaires) + localhost guard on init (dev no longer pollutes prod data). Dashboard built via API: https://us.posthog.com/project/496350/dashboard/1804715 (assessment funnel + rx funnel breakdown-by-category, 30d rolling, 14d window). **A/B slate now unblocked.** TJ has personal API key `fable-funnels` (may delete/recreate).
- **App "Mission Control v2" — 12-week program engine + single-surface dashboard** (apps/clientportal): `lib/program.ts` = 12-Move ladder on 4M month arc (M1 MITIGATE / M2 MUSCLE / M3 MOTIVATE→MIND; W12 = retake assessment), program slot model 312, **MindSpan v2 program-paced scoring** (0.40 cumulative + 0.20 moves + 0.15 rolling-7d + 0.25 inverted risk — ring fills toward 100 across ~12 weeks; fresh member starts ~12-30). `MissionControl.svelte` replaced TodayView: ONE scrolling page (score hero w/ labeled drivers → Move banner w/ cohort line → tappable 7-day grid, **backfillable whole current week** → measurements trend tiles → month dots → 12-week bars → cohort attest (attest bumps weekUnlocked) → Move ladder). Mockups: docs/design/app-week-mockups.html (TJ chose Direction 2 + parts of 3 + gold fill ring).
- **Program targets (TJ locked):** eating window **5 of 7** (up to 2 off-days — breakfast w/ grandkids, walk 30 min after) · strength **3–4×/wk** · walks 2× · dailies = Biome NS Ultra + protein-first. W2 Move = window 5/7; W5 Move = strength ×3. Weekly score total 26; program total 312.
- **Weekly vitals strategy (memory: project_weekly_vitals_strategy):** every metric = baseline (pre-W1) + identical weekly slot ×12 + dashboard trend chart. Instrument = renderer "Weekly Measurements" card (weight/waist/sys/dia/pulse/SpO₂ — push-ups dropped, strength-trend card owns testing), single home on dash tab; MissionControl reads vitalsLog from `4m:workbook:*` localStorage for trend tiles.
- **Legacy renderer cleanup:** risk score display /200→**/50** (10 q × 5) + rescaled copy thresholds; "Welcome back" dash greeting removed; morningTracker (day-buttons/videos/cold-showers) + fastingDailyTracker + Circadian Anchor card + stale progress bars REMOVED (redundant w/ tape); **Month 1 supplements = Biome NS Ultra ONLY** — full stack (SleepRestore/OmegaCN/ArmorVita/NeuroBridge/MitoVita) parked in docs/plan/month1-supplement-stack-parked.md.
- **MindSpan Logbook (paper track):** genre locked — book=Field Guide, paper=Logbook, "shade the ring" self-scoring mechanic (12-segment ring, weekly score /26, thresholds 21 solid / 13 half). Sample week spread: docs/cohort-workbook/logbook/week-spread-sample.{html,pdf} + artifact. Full build AFTER app program locks; add measurements row + baseline page then.
- **Odyssey voyage theme locked** (memory: project_odyssey_voyage_theme): program = heroic crossing not chore list; nautical vocabulary, Greek references sparing; W12 retest = homecoming; ring = circle sailed home.
- **Website:** Graduate tier card removed from homepage (no-coming-soon; re-add when a cohort visibly earns it — note in code) · Protégé band single-card rework · book page count 280→**258** (homepage + welcome email lambda) · ED added to homepage founder-quote early-signs list ("and the bedroom goes quiet first") · founder portrait 340px · nutrition page philosophy-first rework · images-at-top rule applied.
- **TJ test-data wipe procedure (repeatable):** deleted Contact (4) + Users (7 incl. orphans) + Adherence (31) rows for drtj@my4mlife.com / mdspecialtygroup / tjshcacs / tmundheim / genesisregenerative identities. KEPT: Jager's rows, all Cognito users + Admins membership. Device side: iOS Settings→Safari→Advanced→Website Data→delete my4mlife (PWA icon delete does NOT clear storage; app signOut sweep only runs on a working build). PatientRecords had zero TJ matches.
- **New locked rules (memory):** no-alcohol imagery (feedback_no_alcohol_imagery) · weekly-vitals strategy · odyssey theme · ED in every early-signs list (sweep still pending beyond homepage).

**07-07→08 AUDIT FULLY CLEARED:** All 44 confirmed findings (5 crit / 16 high / 13 med / 10 low) fixed + deployed across website, app, 6 lambdas (charge-on-approval, patient-record-intake, protege-signup, audit-complete, create-checkout-session, order-handler) + 2 AppSync resolvers (upsertMyProfile, recordAdherence). Program engine: signup-week anchoring now consistent everywhere, partial-first-week Move fairness (effectiveTarget), DST-safe calendarWeek, retired-id read aliasing (ID_ALIASES), reactive PWA clock, unified grid/Move/score week window, 14/14 tests. Funnels: rx double-submit guards, step-event high-water-mark + total_steps, setup-intent try/catch, intake retry+telemetry, category alignment, assessment submit-on-success + contact dedupe. Lambdas: checkout sku/price validation, order-handler retry-safe fulfillment (deliverOnce markers), audit-complete server-derived contactId + server-stamped consent, recordAdherence actionId allowlist + no-future-date, protege-signup welcome-only-for-new-accounts. Website copy: ED alcohol image → couple-lapel, Graduate/tier cleanup (4 pillars+about+index CSS), protein 30→30-40g, window 5-of-7, no-coming-soon workbook price. Punch list w/ infra follow-ups: docs/audit/red-green-2026-07-07.md. **INFRA TODO (not code): rate-limiting/WAF on public /api; refund-policy 'active subscription' wording (TJ/legal).**

**QUEUED STRATEGY (not started, TJ 2026-07-07):** gut-repair singular positioning — see memory project_gut_repair_singular_positioning. Lead brand as THE cognitive-repair solution via gut repair; demote GLP-1/peptides/TRT under "Services"; only gut-repair gets top-nav landing page; flagship = Biome NS Ultra + Rx. Build AFTER shakedown/audit perfected.

**07-07 RED/GREEN AUDIT (Fable multi-agent, 5 red finders + verifiers + green team):** 44 findings confirmed, 5 refuted → docs/audit/red-green-2026-07-07.md. **All 5 CRITICAL fixed + deployed:** (1) rx SetupIntent re-confirm trap (Back→Next after card save bounced user forever, corrupted funnel) → `if(paymentMethodId)return true` guard in all 5 questionnaires; (2) charge-on-approval double-charge (no idempotency key, non-atomic state) → deterministic Stripe idempotencyKeys + payment-status guard; (3) protege-signup welcome email shipped STALE v1 book/workbook → correct S3 keys in code fallback + deploy.sh env vars (verified live); (4) upsertMyProfile privilege escalation (any user self-set tier/subscription/stripeCustomerId) → resolver denylist, verified via appsync evaluate-code; (5) patient-record-intake unauth PHI overwrite (public endpoint keyed by uuidv5(email), blind Put wiped cardOnFile/consents) → merge UpdateCommand + welcome-email XSS escape. **STILL OPEN: 16 HIGH / 13 MED / 10 LOW** (biggest: program-math week-anchor edge cases incl. Move-1-impossible-after-Monday-signup, more retired-adherence-id writers, rx double-submit + funnel double-fire, order-handler retry no-op, website copy drift [protein 30g, window daily, page count, alcohol wine glasses on ED page, Graduate/tier leftovers]). NOTE: infra/clientportal/cdk is NOT in pnpm workspace — needs `pnpm install --ignore-workspace` before cdk deploy (repo-move casualty).

**07-07 SHAKEDOWN FIXES (deployed):** program clock now anchors to SIGNUP week via profile.createdAt (programAnchor/calendarWeek in program.ts — early attest can no longer shift week 1 into the past); Moves ladder shows per-week Move completion (✓/x-of-y) not adherence %; rolling 7-day covers 3 dailies; Mitigate top-3 auto-fills for ALL 10 audit categories (AUDIT_ID_TO_FACTOR_NAME complete); **Biome NS Ultra = WITH/immediately after first meal** (memory project_biome_timing_rule; ingredient list removed from app; Month 1 = Biome only); THIRD duplicate logging path killed (legacy w1WeekdayRow ids mitigate-biome-ns/mitigate-eating-window/muscle-strength → pointers to dashboard tape; orphan rows migrated/cleaned for TJ's test acct 410b3580…). TJ clean-run test identity: tjmundheim@genesisregenerative.com ("TJm Test").

**STATE AT HANDOFF:** TJ mid-shakedown of the rebuilt app (was retesting as a fresh Protégé; single-surface build deployed but not yet re-verified by him after his Safari-data clear). Tests: 111 pass + 7 pre-existing env failures (client/triggers/AuthGate — see memory). All payment lambdas still LIVE mode.
**OPEN / NEXT:** TJ re-verify app (fresh signup → tape taps → attest → measurements entry) · legacy week 1-4 pages still carry curriculum/reflections/strength/cog-training — decide keep-vs-fold into program surface · logbook full build (after program lock) · founder shoot list (docs/design/founder-shoot-list.md pending) → hero A/B via PostHog · ED early-signs sweep (site/app/book) · /weekly-picks + newsletter list · long-tail solution-page imagery (~15) + blog headers from images/editorial/ · delete old Desktop repo copy ONLY after untracked sweep · KDP v15 upload (TJ) · live $149 order test (TJ).

## ⚡ 2026-07-05→06 SESSION LEDGER (Fable) — imagery pass — read this first
**SITEWIDE PHOTOGRAPHY SHIPPED (TJ generated in Midjourney, Fable reviewed/placed/deployed):** 28 images across 27 pages — homepage hero (boardroom dawn) + all 5 /rx pages + all top-8 master categories + 4 pillars (mitigate got hero-bg) + /consult + stress/alcohol/morning-routine/purpose-goals + sauna/cold-plunge. All at TOP of page, caption below (TJ rule). Production line: TJ runs prompts from `docs/design/midjourney-prompts.md` in order → Fable reviews (hands/logos/text/grade), optimizes ~1800px JPEG q80, places per `docs/design/imagery-map.md`, deploys. Old off-brand pool DELETED (survivors → `images/editorial/` for blog headers).
**NEW LOCKED RULES:** (1) **No alcohol imagery** anywhere — even "untouched glass" metaphors; social scenes show iced/green tea (memory feedback_no_alcohol_imagery). (2) **Images at top of page**, caption directly below. (3) **ED in every early-signs list** (homepage founder quote done; site/app/book sweep PENDING — memory updated in project_ed_canary_thesis). (4) New genres: partner/attraction (tasteful admiration) + product-mood (protocol as luxury object — TJ inventions: magnesium bedroom, relabeled vials, green-tea still life).
**ALSO:** Nutrition page reworked philosophy-first (affiliates OFF public site, 30→30–40g fixed, 9–6 window added, insulting-behavior section). Founder portrait 340px on homepage. Membership.astro discovered to be a 301 → purpose-goals got the cohort image.
**APP REWORK SHIPPED 2026-07-06 (Mission Control v2, TJ-approved Direction 2 from docs/design/app-week-mockups.html):** dashboard = results only (gold ring fills toward 100 across the 12-week program; MindSpan v2 in lib/program.ts = 0.40·cumulative + 0.20·moves + 0.15·rolling7d + 0.25·(100−risk)); Week surface = 7-day tape grid + weekly Move + cohort line; 12-Move ladder on the 4M month arc (W12 = retake assessment); attest advances weekUnlocked. MissionControl.svelte replaced TodayView (file kept, unmounted — its "Why" expanders/affiliate links/bonus targets NOT yet ported). PostHog funnels LIVE: events on assessment + 5 rx questionnaires, dashboard us.posthog.com/project/496350/dashboard/1804715, localhost guarded.
**OPEN:** port TodayView "Why" content into Week surface (TJ call); founder shoot list (docs/design/founder-shoot-list.md, pending) → founder-vs-boardroom hero PostHog A/B; ED early-signs sweep (site/app/book); ~15 long-tail solution pages need images; blog headers from editorial/ pool; PostHog funnels + /weekly-picks still queued from last ledger.

## ⚡ 2026-07-02→05 SESSION LEDGER (Fable) — read this first
**REPO MOVED:** now at `/Users/thomasmundheim/Development/LDRGLPRx` (out of iCloud; symlink at old Desktop path; old copy at Desktop/Development/LDRGLPRx-OLD-DELETE-AFTER-VERIFY — delete after TJ verifies a clean session). Memory copied to the new project dir.

**SHIPPED & LIVE this session (all committed/pushed/deployed):**
- **App "Mission Control" redesign** (app.my4mlife.com): --mc-* tokens + self-hosted Playfair/Inter; TodayView="Daily Brief" w/ **MindSpan Score** hero (lib/mindspan.ts, 27 tests; score=0.45·adherence+0.35·(100−risk)+0.20·streak/14; mounted at top of dash tab); PatientsAdmin="Care Console" (triage lanes, waiting-age, stepper, **charge-confirm gate** = only path to chargeEncounterAdmin, audit trail); retry toasts; branded PWA icons.
- **Messaging spine sitewide** (TJ granted full authority): category claim "The first brain-healthspan platform for men" (gold kicker; FEAR headline restored as hero h1 per TJ) · MindSpan definition strip · CTA verb "Get your MindSpan baseline — free" · MindSpan tie-in line on all 33 solution pages · book v15 + workbook v4 name the score (S3 fulfillment refreshed; **TJ manual: KDP interior re-upload v15**).
- **PostHog LIVE** both surfaces (key phc_qZQ…EYbY): website full (autocapture+replay); app RESTRICTED (pageviews only, no replay/autocapture — PHI, PostHog has no BAA; documented in index.html).
- **/go/gut-repair LP** (template for all /go/*): hideChrome, men-first; Biome NS Ultra **$149 one-time / $129/mo sub** live Stripe checkout w/ US shipping collection; Rx panel full formulary (BPC-157+L-Glutamine+Aloe, bold custom-dosage line); order email → drtj@my4mlife.com (order-handler-core, 13 tests). **TJ pending: live $149 order test → refund.**
- **Enterprise website pass:** How-It-Works band + TrustBand (homepage+5 rx) · sticky mobile CTA (funnel-gated) · minimal Pagefind search (/go/* excluded from index) · enterprise footer · 46 pages navbar-clip/mobile fixes (incl. assessment sticky progress bar) · rx heroes offset · gut LP hero color fix.
- **Amazon affiliate hygiene:** disclosures normalized/added; HARD RULE: no tagged links in emails (email→hosted /weekly-picks page pattern; page not built yet); prices "approximate" qualifier; Kindle link (dp/B0H7FJRHXC) untagged, beside book covers (navbar button removed per TJ).
- **Strategy locked:** Lifeforce analysis → 3 moves (no cold T marketing; T=finding not product; invert any JV: small T-clinic feeds US, flat papered marketing fee, no % splits). MindSpan = category moat.

**OPEN / NEXT:** TJ: live order test; KDP v15 upload; Midjourney images (prompt set delivered in transcript 2026-07-05 — regenerate on request; navy/gold grade, men 50s-60s, face-averted). Build-next: PostHog funnels (assessment + rx) then A/B slate (fear-vs-destination hero #1); /weekly-picks page + newsletter list-building (EmailCapture currently only emails drtj@my4mlife.com — NO subscriber list is stored anywhere; wire Contact.newsletter flag); delete old Desktop repo copy after verify. Email routing rule: drtj@my4mlife.com = all internal notifications, NEVER public-facing.

## 0. Orientation
**My4MLife** is an AI-operated telehealth + commerce + lifestyle company. Mission (TJ verbatim): help men optimize for "the best mind possible until your last day of life" — cognitive longevity through the final years. Brand wordmark **My4MLife** (exact casing). Tagline **"Begin with the end in mind."** The framework is the **4 Ms — Mind, Muscle, Mitigate, Motivate** (Mind is the destination; you run the work Mitigate→Muscle→Motivate→arrive at Mind). Repo dir name `LDRGLPRx` is legacy; the brand is My4MLife.

Business model = **freemium**: the assessment makes you a **Protégé** (free: app, book, workbook, weekly Zooms, cohort). Monetize via **member-priced products** (Amazon-affiliate OTC bridge now; white-label later) and **direct-buy Rx** (GLP-1, testosterone/ED, leaky-gut, peptides, regenerative). Operator = Dr. TJ Mundheim, solo, non-technical, AI-first ops.

## 1. Repo, access, conventions
- **Path:** `/Users/thomasmundheim/Development/LDRGLPRx`
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
- **Digital fulfillment:** S3 `my4mlife-digital-fulfillment`. Keys the welcome email links to: `begin-with-the-end-in-mind.pdf` (book) + `the-logbook-month1.pdf` (logbook; `cohort-workbook-month1.pdf` kept for already-sent emails). Both are served as plain public URLs (no presign) via bucket policy — **the policy lives in `infra/digital-fulfillment/deploy-bucket-policy.sh`; re-run it after any key add/rename** (2026-09-04 incident: logbook rename left the new key out of the policy → AccessDenied for new Protégés). **STANDING RULE: re-upload BOTH logbook keys on every book/logbook change** — currently serve book v20 + logbook v7 (2026-09-04: v6 = gender-specific sweep to book-v20 parity — 'Who This Logbook Is For' page, Week 3 = 'Hormones and the Canaries' with women's 5.2b/5.3b perimenopause track + MHT stack entry, duplicated front-matter removed; v7 = Part 1 Exercise 4 baseline + §9.1 reference regenerated from the live 20-question MindSpan assessment via `docs/cohort-workbook/gen-assessment-ref.py` — RE-RUN that script + render after ANY edit to website/src/data/audit-questions.ts; 154pp; source docs/cohort-workbook/draft/_MASTER.md, chapter files 01-09 are stale copies). Same day: 4 men-only wordings fixed in audit-questions.ts (Q17 hormones note, Q18 sexual-function prompt/guide/note now sex-inclusive, Q10 pain note, Q20 purpose note) — ids/scoring untouched, website deployed.

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
- **Fulfillment refresh:** `aws s3 cp <pdf> s3://my4mlife-digital-fulfillment/{begin-with-the-end-in-mind.pdf|the-logbook-month1.pdf|cohort-workbook-month1.pdf} --region us-east-2 --content-type application/pdf`. Then `./infra/digital-fulfillment/deploy-bucket-policy.sh` if any key changed.
- **Secrets Manager:** all-stripe-keys, form-recipients, export-clinical-packet-key.
- **Memory system:** durable facts in `~/.claude/projects/-Users-thomasmundheim-Desktop-Development-LDRGLPRx/memory/` (index = MEMORY.md). Read it for locked brand/product/architecture decisions.

## 10. FOR FABLE — app enterprise-level design review + mockups
**STATUS 2026-07-02 (Fable) — SHIPPED & LIVE:** Direction C "Mission Control" approved by TJ and DEPLOYED to app.my4mlife.com (commit 194ded33). Live: --mc-* design tokens + self-hosted Playfair/Inter, full dark navy/gold sweep (app.css, renderer.ts, ~30 components), TodayView = "Daily Brief" with **MindSpan Score** hero (lib/mindspan.ts — 0-100 = 0.45*adherence + 0.35*(100-riskLoad) + 0.20*streak/14; 27 unit tests; labs = v2 term), PatientsAdmin = "Care Console" (triage lanes, waiting-age flags, 5-node stepper, CHARGE CONFIRMATION GATE — single path to chargeEncounterAdmin, opus-verified — visible audit trail), retry toasts on failed mutations, branded navy/gold PWA icons. Tests 101 pass / 7 pre-existing env failures. Interactive reference comp: docs/design/mission-control-demo.html.
NEXT (messaging alignment, TJ directive "leave no gap"): website MindSpan copy pass (agent in flight at handoff time — homepage hero "The first brain-healthspan platform for men" + CTA "Get your MindSpan baseline — free" + per-solution MindSpan-tax lines; verify + deploy website/deploy.sh). Then: workbook v4 weekly MindSpan line; book v15 light-touch (name the score in Ch18 CTA, next printing — KDP re-upload is TJ-manual); PostHog key from TJ unlocks the A/B experiment slate (headline fear-vs-destination, CTA verbs, score-reveal gating, /rx ordering).

Original status note (superseded):  Review delivered + 3 mockup directions built and shown to TJ — `docs/design/enterprise-design-directions.html` (open in any browser; also published as a Claude artifact). Directions: A "Private Bank" (dark navy/gold statement), B "Clinical Atelier" (porcelain lab-report), C "Mission Control" (MindSpan-score data hero). Fable's recommendation: A's suit + C's MindSpan hero on the member home + B's restraint for clinical detail/packet. Introduces the **MindSpan Score** concept (composite brain-healthspan metric — adherence + assessment + labs — trending weekly) as the product spine. AWAITING TJ's direction approval; then: design-token layer → TodayView "Daily Brief" rebuild → PatientsAdmin "Care Console" rebuild (incl. charge-confirm dialog + visible audit trail) → instrumentation pass (PostHog in app, branded PWA assets, error surfacing).

Original brief (kept for context): TJ's ask: **review the app and produce mockup demos of ways to make it look more enterprise-level / premium.**
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
