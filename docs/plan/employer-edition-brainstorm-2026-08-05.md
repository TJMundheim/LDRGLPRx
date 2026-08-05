# Employer/Employee Edition — Brainstorm (2026-08-05)

**Status: BRAINSTORM for TJ review. Nothing built.**

> **UPDATE 2026-08-05 (TJ direction, same session):** the workplace edition is a
> **two-audience book** — the front matter sells the EMPLOYER, the body serves the
> EMPLOYEE. Dedication/foreword cut; page one becomes a bullet-point "punchline"
> page; new Chapters 1–3 carry the business case with researched numbers; the
> "written to motivate men / 99% applies to everyone" line is demoted into the
> author's origin story rather than the headline. Full spec + all research +
> the prevention/screening-services layer (ConnectedMind, PGx, who pays):
> **[employer-edition-front-matter-spec-2026-08-05.md](employer-edition-front-matter-spec-2026-08-05.md)**.
> That doc supersedes §3.2's "For the Employer appendix" (promoted to the front
> of the book) and §3.3's front-matter assumptions.
Builds on [corporate-wellness-vertical-draft.md](corporate-wellness-vertical-draft.md) (2026-07-15)
and the direction TJ + Fable set 2026-08-05 (HANDOFF "NEXT SESSION" block).

## 0. Locked inputs (from the 2026-08-05 direction)

1. **Hims/Hers pattern** — my4mlife.com stays the men-first flagship, untouched.
   New **`/employers` front door** is the de-gendered "everyone" surface.
   A women's door is a later Hers-style move.
2. **$0 (or near-$0) PEPM** is the wedge vs CoreHealth-class competitors.
   Employees become a company cohort (Protégé mechanics); revenue comes from
   the existing product/service menu (commerce + Rx). MindSpan Score +
   assessment data = the HR outcomes-reporting product.
3. **Two book editions only** — men's edition unchanged + one
   workplace/everyone edition, both rendered from `docs/book/draft/_MASTER.md`.
4. **Canonical disclaimer line** (talks, book preface, employer pitch):
   *"I wrote this book to motivate men because they're historically not good at
   prevention — but 99% of it applies to everyone."*
5. This amends the men-only HARD commit **at the distribution layer only** —
   new audiences get their own doors; the flagship voice is not softened.

## 1. What this supersedes in the 2026-07-15 draft

| Draft said | Now |
|---|---|
| New brand + new URL for the corporate vertical | **Same domain** — `/employers` on my4mlife.com (Hims/Hers sibling door, not a clean-sheet brand). Open question: does the surface carry a sub-brand name ("My4MLife at Work") or stay plain My4MLife? |
| $2–5 PEPM SaaS layer (50K lives × $3 = $1.8M/yr) | **$0 (near-$0) PEPM.** The SaaS layer is deliberately given away to kill the procurement fight. Revenue = commerce + Rx attach only. |
| B2B billing (PEPM invoicing, seat management) = gap #3 | **Deleted from Phase 1.** No PEPM means no invoicing engine, no seat billing, no eligibility-file import at pilot. Biggest scope reduction of the pivot. |

Everything else in the draft stands: aggregate-only HR dashboard (ADA/GINA
line), tenant tagging, neutral assessment variant, engagement features as
Phase 2 demo-ware, SOC 2/SSO as Phase 3, MD Specialty Group network as the
first pipeline.

## 2. Why $0 PEPM is the right wedge (the pitch logic)

- CoreHealth-class platforms sell engagement and charge for it. We charge
  nothing for the platform and monetize outcomes the employee chooses to buy.
  The HR conversation flips from "budget line + procurement" to "free benefit
  with an outcomes report" — an easy yes for the SMB/clinic-network prospects
  we can actually reach.
- The foregone PEPM is trivial against commerce math. Illustrative 500-employee
  pilot: PEPM at $3 would be $18K/yr. Same pilot at 30% activation = 150
  Protégés; if 25% ever buy anything (Biome NS $149, a consult, a
  subscription), first-order revenue alone rivals the PEPM — and
  subscriptions/Rx compound. The PEPM was never the business; stop pretending
  it is and weaponize that.
- "$0" also neutralizes the incumbent's only defense (feature depth). They
  can't price-match to free without destroying their own model.
- Guardrail: "near-$0" could be a nominal setup/onboarding fee ($500–1K
  one-time) purely to qualify seriousness — TJ call (open decision #4).

## 3. The book — workplace/everyone edition

### 3.1 One source, two renders (production mechanics)

Keep `_MASTER.md` as the single source. Add **edition markers** the render
script resolves at build time:

- Block form: `<!--ed:mens-->…<!--ed:else-->…<!--/ed-->` — gendered passages
  keep their exact current text in the mens branch (edition 1 output stays
  byte-identical), workplace branch carries the rewrite.
- `render.py --edition mens|workplace` strips the losing branch before the
  markdown pass. Mens remains the default so the existing pipeline and v17
  output are untouched.
- Shared text (the ~90%) stays unmarked. Fixes to shared text flow to both
  editions automatically — this is the whole point of two-from-one-master.

### 3.2 Chapter-by-chapter delta map (where the ~10% lives)

| Section | Mens (unchanged) | Workplace edition |
|---|---|---|
| Title/subtitle | *Begin with the End in Mind — Don't lose your identity and your dignity while you still have a choice.* | Same title (brand equity, Hims/Hers). New subtitle — see 3.4. |
| Who This Book Is For (p2) | motivate-men/99% statement (v18) | Becomes the **preface anchor**: the canonical disclaimer line verbatim, then "this edition rewrites the 1%." |
| Personal Note from the Author | TJ's story | **Keep whole.** It's a human story, not a gendered one; authenticity is the asset. |
| Ch 1 — The Fear | "The man at the table" | Same scene, de-gendered framing + a second scene: **the colleague in the meeting** — the sharp one who started repeating himself, missing threads. Fear of losing the mind = fear of losing the career. |
| Ch 3 — Why You, Why Now | "A word to the man in his forties" / "to the wife or daughter" | "A word to the reader in their forties" / "to the spouse or adult child." Add the **cognitive-performance-is-job-performance** argument here: your mind is the asset that earns; decline is a career event years before it's a medical one. |
| Ch 7 — Hormones & the ED Canary | ED as THE canary | Reframe as **"Warning Lights"**: hormonal decline signals for everyone (libido, cycle/menopause transition, energy, sleep-hormone cascade), with ED kept as the male example — canary thesis intact, aperture widened. Mirrors the neutral assessment Q18. |
| Ch 11 — GLP-1 | "why most men over 50 can't lose it" | "most adults in midlife." Mechanism copy is already neutral. |
| Ch 13 — Purpose & Accountability Target | "Become the Man Who Does This" | "Become the Person Who Does This." Accountability-target exercise is already universal (name a face). Add the **team as accountability layer**: your company cohort sees your attest. |
| Ch 17 — The 4M Loop in Real Life | "One Week, One Man" | "One Week, One Working Life" — same structure, protagonist written neutral, the Wednesday Zoom becomes the company-cohort Zoom, Friday social-pressure test becomes the client-dinner test. |
| Ch 18 — Your Next Step | QRs → my4mlife.com | QRs → the employer-cohort assessment door (company-code URL or /employers). CTA copy: "your employer already paid the toll — the door is open." |
| NEW back-matter | — | **"For the Employer" appendix (2–3 pp):** how a company cohort runs (assessment → 12-week voyage → score movement), what HR sees (aggregate only, never individual), the $0 model in one page. Doubles as the leave-behind sales asset. |

Voice pass across shared text: "men" → "people/you" only where it's incidental;
where the mens edition argues *from* maleness (prevention-avoidance, the ED
canary), the workplace branch re-argues from the career/asset frame rather than
sanding it to mush. De-brand rules, no-alcohol rules, protein/window numbers
all carry over unchanged.

### 3.3 What the workplace edition is FOR (three jobs)

1. **Employer pitch artifact** — the physical book on the HR/CEO desk is the
   credibility wedge CoreHealth can't match with a demo login.
2. **Cohort onboarding gift** — every enrolled employee gets the PDF (existing
   S3 fulfillment pattern; new key, e.g. `begin-with-the-end-in-mind-workplace.pdf`).
3. **Speaking-circuit handout** for mixed/corporate audiences (ties to the
   speaking strategy + Sinicropi track) — TJ can finally hand the book to a
   room that's half women without the disclaimer doing all the work.

### 3.4 Subtitle candidates (workplace edition)

- *Cognitive performance is job performance.* (the frame, verbatim — recommended)
- *Protect the asset that does the work.*
- *A field guide to keeping the mind that built your career.*
- *The 12-week protocol for the working mind.*

### 3.5 KDP mechanics

Separate ASINs/ISBNs (it's a distinct edition), same 6×9 trim so the cover
pipeline reuses computed dims. Cover = same design language, different
accent treatment + subtitle band (differentiated at thumbnail size). Kindle +
paperback at launch; hardcover only if the employer gift market asks.
Page count will drift from 258 — new spine calc required.

## 4. Website — the `/employers` front door

**Consumer flagship untouched** except one discreet "For Employers" link
(footer now; nav "More" dropdown later if traffic justifies).

Page skeleton (reuses the existing Astro component library and the enterprise
design direction already delivered):

1. **Hero** — de-gendered boardroom/team photography (photography direction
   already allows leadership scenes). Headline territory: *"The wellness
   benefit that costs you $0 and shows you the score."* Sub: engagement
   platforms count steps; we move biology — and report it.
2. **The wedge band** — $0 PEPM vs incumbent pricing, three-column contrast
   (them: PEPM + engagement metrics / us: $0 + MindSpan movement).
3. **How it works** — assessment → company cohort (12-week voyage) →
   quarterly MindSpan report to HR. Aggregate-only privacy promise stated
   ON the page (it's a selling point, not fine print).
4. **What employees get** — free app/book/Logbook/Zooms (Protégé mechanics),
   benefit-priced products & telehealth they choose to buy. Employer never
   billed for employee purchases.
5. **The HR report mock** — participation %, avg MindSpan, risk-band
   distribution, top-3 category heat. This IS the product shot.
6. **CTA** — "Book a pilot call" (single CTA per locked LP rules). Phase 1 =
   contact-form → TJ; no self-serve employer signup yet.
7. Canonical disclaimer line appears in the founder note on this page.

Compliance note: employee purchase pricing on this surface must reconcile with
the "all discounts killed pre-launch" rule — treat employer-cohort pricing as
its own menu (like the consult fee structure), not a "discount" off consumer
retail (open decision #5, carried from the draft).

## 5. Assessment + app + data layer

- **Neutral assessment variant:** same 20-question engine; Q18
  (sexual function) gets the neutral counterpart already flagged in the draft
  — libido/sexual-health wording works for everyone and preserves the canary
  signal. Copy voice pass on the other 19 (mostly already neutral). Same
  scoring/bands/top-3 — the MindSpan number must be comparable across doors
  or the HR report is garbage.
- **Company-code signup:** employer gets a code/URL (`/assessment?org=acme`
  or `/a/acme`); `employerId` tenant tag written to Contact + Users at
  audit-complete. No schema surgery — additive attributes.
- **Company cohort = existing cohort mechanics** with a tenant filter: the
  weekly Zoom, attest, Move ladder all work as-is. Phase 1 pilots can share
  the existing Wednesday Zoom; a dedicated per-employer slot is a Phase 2
  nicety.
- **HR dashboard (Phase 1 = a generated report, not a login):** monthly/
  quarterly PDF or HTML emailed to the employer contact — participation, avg
  MindSpan, band distribution, top-3 heat. **Aggregate only, minimum-cohort
  suppression (no stats below ~10 enrolled)** — the ADA/GINA trust line from
  the draft, now also a stated product feature. A live HR login is Phase 2.
- **App:** voice is already near-neutral (Mission Control, voyage vocabulary).
  Sweep needed for residual "men/man" strings; Month-1 protocol (Biome-only,
  protein-first, eating window) is universal as-is.

## 6. The Logbook — workplace edition

Same one-source/two-renders approach on
`docs/cohort-workbook/draft/_MASTER.md`:

- Baseline item **05 (erectile + sexual function)** → neutral sexual-health
  counterpart, mirroring assessment Q18.
- Accountability-target + Why exercises already universal — untouched.
- **Add a "workday integration" box per week** (workplace branch only):
  eating window vs. office lunch culture, walking meetings, the 4–5pm
  cortisol cutoff vs. the late-meeting reality, travel weeks.
- Wednesday Zoom prep pages become company-cohort Zoom prep.
- Title: **The Logbook — Workplace Edition** (never "workbook"; rename rule).
- S3 key: `the-logbook-workplace-month1.pdf`; welcome email for tenant-tagged
  Protégés links the workplace pair (book + Logbook) instead of the mens pair.

## 7. Build order (when TJ green-lights — nothing started)

1. **Workplace book edition** (markers + render flag + delta rewrite + preface
   + employer appendix) — it's the sales weapon; everything else sells with it.
2. **`/employers` page** + footer link + pilot-call form (days, not weeks —
   pure Astro reuse).
3. **Neutral assessment variant + org-code tenant tagging + workplace welcome
   email** (the enrollment pipe).
4. **Logbook workplace edition** (rides the book's marker infrastructure).
5. **HR aggregate report generator** (deliver first one manually for pilot #1;
   automate after).
6. Phase 2+ unchanged from the draft (challenges, roster import, SSO, SOC 2,
   broker/PEO channel).

Pipeline while building: MD Specialty Group seminar network = pilot prospect
list (draft §6); Austin contacts (Fredrick follow-up) may open a second door.

## 8. Open decisions for TJ

1. **Confirm the Hims/Hers call** (no 4-choice homepage; `/employers` door;
   flagship untouched) — Fable's recommendation, queued for this brainstorm.
2. **Sub-brand or not:** plain My4MLife on the employer surface, or a named
   skin ("My4MLife at Work")? Recommendation: plain My4MLife for Phase 1 —
   one brand to defend, rename later is cheap, and the draft's
   separate-brand rationale (men-only rule) is already solved by the
   distribution-layer amendment.
3. **Workplace edition subtitle** (candidates in 3.4).
4. **Exactly $0 vs near-$0:** free forever, or nominal one-time onboarding fee
   to qualify seriousness?
5. **Employee pricing:** benefit-priced menu vs. plain retail at Phase 1
   (interacts with the discounts-killed rule; separate menu framing
   recommended).
6. **Pilot #1 target:** MD Specialty Group network, an independent SMB, or an
   Austin-contact door?
7. **Does the workplace edition go on Amazon at launch,** or stay a
   direct/fulfillment-only artifact until pilot #1 proves the pitch?
   (Amazon listing = discoverability but also public price anchor.)
