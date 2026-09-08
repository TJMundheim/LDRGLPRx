# The Uninsured Decade — Calculator + Masterclass Talk Spec

_Drafted 2026-09-07. Spec only — nothing built. Third door in the Hims/Hers pattern: the money door for the executive male earner. See `docs/book-uninsured-decade/README.md` for program context and `docs/book-uninsured-decade/source/motivate-section-cost-of-cognitive-decline-2026-07.md` for sourced figures and the 90-second close reused below._

---

## PART A — Cost-of-Decline Calculator

### Route

**Recommend `/go/uninsured-decade`** (not `/cost-of-decline`). Reasoning: this is a thin, `hideChrome` conversion asset fed by talk QR codes and advisor referrals — it belongs in the `/go/*` LP family (`project_landing_pages.md`), not the indexed content library. `noindex,follow`, same as `go/gut-repair.astro`. A calculator that ranks in search is a bonus we don't need; a calculator that converts talk/book/advisor traffic is the job.

### Purpose & positioning

One-CTA conversion asset: **free MindSpan assessment**, `?src=` attributed. No product sold on this page (no OTC/Rx buy buttons) — this is a top-of-funnel financial-fear tool for a room (or a reader) that isn't shopping for supplements, it's underwriting a risk. Per `feedback_conversion_first_alignment.md`, the single CTA still has to be the shortest path to a buying decision available for this audience today — and today that path is the assessment (free, live, funnels to book/logbook/app/Protégé), not a straight-to-Stripe SKU. No compliance flag needed per `feedback_compliance_preapproved.md`, but keep the required disclaimer and no-prevention-claims language per the source doc's compliance note.

### Inputs (single-page form, no multi-step wizard)

| Field | Type | Notes |
|---|---|---|
| Your age | number, 45–85 | default 62 |
| Spouse/partner age (optional) | number, toggle "I don't have a spouse/partner" | if omitted, single-person scenario only |
| State | select, 50 states + DC | **default Texas** |
| Approximate net worth band | select: <$500K / $500K–$1M / $1M–$2.5M / $2.5M–$5M / $5M+ | band only, never a raw dollar figure — matches PostHog no-raw-net-worth rule below |
| Current monthly spend on health (out-of-pocket: supplements, gym, concierge care, etc.) | number, $ | used only to frame "premium already partially paid," not in the spend-down math |
| Hours/week of exercise | number | used for the "10 hrs/month protocol" framing tie-in from the talk, not in the cost math |

No name/email/phone on this page — that capture already lives at `/assessment`. This page computes and shows results with zero PII collected.

### The math (pure functions, unit-testable, no backend call)

1. **10-year staged care-cost model** — reuse the three-stage table from the source doc (`~$35–40K` / `~$170–180K` / `~$290–340K`, midpoint totals ~$525K) as the **national baseline**, keyed to a single-diagnosis-at-70 scenario. Scale the stage-3 late-stage figure (the state-cost-sensitive component: memory care / nursing home) by a **state cost-of-care index** (see data file below); scale stages 1–2 lightly (in-home aide wage varies by state too, smaller effect) using the same index. Formula:
   - `stage1 = 37500 * costIndex[state].inHome`
   - `stage2 = 175000 * costIndex[state].inHome`
   - `stage3 = 315000 * costIndex[state].facility`
   - `tenYearTotal = stage1 + stage2 + stage3`
   - Age-adjust only lightly: if current age > 70, compress the 10-year window proportionally (still show as "the bill," not a false precision estimate) — label as illustrative, not actuarial.
2. **Medicaid spend-down timeline** = `netWorthBandMidpoint / annualPrivatePayCost(state)`, where `annualPrivatePayCost` = late-stage facility annual cost for that state. Net worth band midpoints: $250K / $750K / $1.75M / $3.75M / $6M (top band is open-ended — floor the years-until-spend-down display at "10+ years" rather than a huge misleading number).
3. **"Premium"** = the user's protocol basket — hold this as a **single labeled constant** for v1 (~$10K/yr all-in per the book's framing: 4M protocol + Biome NS + testosterone/labs as applicable), not a live product picker. Footnote: "based on the 4M protocol basket — see your MindSpan results for your specific plan."
4. **Expected-value comparison** — `expectedSavings = tenYearTotal * relativeRiskReduction`, where `relativeRiskReduction` is a **single named, visibly-labeled assumption constant** (e.g. 20%, sourced generically to "modifiable-risk-factor literature," not to any specific claim about this protocol reversing or preventing disease). Render this number in a lighter, secondary style with an inline "This is an assumption, not a guarantee — see disclaimer" tag. Never state or imply the protocol "prevents" dementia — expected-value framing only, matching the source doc's compliance note and `feedback_branding_credential_rules.md`'s no-medical-claims posture.

### Outputs

**Above the fold, three numbers:**
1. **The Bill** — `tenYearTotal` for their state, big number, red/dark accent.
2. **The Premium** — the ~$10K/yr protocol basket, ×10 years for comparison, gold accent (mirrors the LP palette's gold-CTA treatment).
3. **Years Until Spend-Down** — from the Medicaid math, framed as "at your net worth band, custodial care alone would take about **N years** to spend you down to Medicaid eligibility."

**Below the fold:**
- A simple ledger table: the three-stage cost breakdown for their state, side-by-side with the flat 10-year premium total, and the expected-value line as a fourth (clearly assumption-flagged) row.
- **One chart max**: a simple two-bar comparison (Bill vs. Premium×10), no stacked/multi-series complexity — keep the mobile-first constraint sacred. No pie charts, no animated draws.

### Copy voice

Dr. TJ voice: plainspoken, insurance-underwriting framing ("you can't insure this risk, you can only underwrite it"), no fear-mongering hyperbole beyond what the sourced figures already carry, no prevention claims. Required disclaimer block (reuse `MedicalDisclaimer.astro` component, same as `go/gut-repair.astro`) plus an additional financial-illustration disclaimer:

> "These figures are illustrative estimates based on published third-party cost-of-care data (Alzheimer's Association, CareScout/Genworth, USC Schaeffer Center) and a hypothetical relative-risk-reduction assumption. This is not financial, legal, or medical advice, and no protocol guarantees a reduction in your personal risk. Consult your own financial advisor and physician."

### Share / print for advisors

- A "Print / Save as PDF" button that triggers `window.print()` against a dedicated print stylesheet (no library needed — CSS `@media print` hiding nav/CTA, showing only the ledger + disclaimer + a `my4mlife.com/go/uninsured-decade?src=advisor-print` footer URL for re-attribution).
- No server-side PDF generation for v1 (keeps this in one session) — the print stylesheet is the deliverable advisors hand clients.

### PostHog events (no PII)

- `calc_start` — fired on first input interaction. Properties: `src` (from query param).
- `calc_complete` — fired when results render. Properties: `src`, `state`, `netWorthBand` (the band label, e.g. `"1m-2.5m"` — never a raw number), `ageBand` (bucket: `<60`/`60-70`/`70-80`/`80+`, not raw age), `spendDownYearsBand` (bucket the output too: `<5`/`5-10`/`10+`).
- `calc_cta_click` — fired on the assessment CTA click. Properties: `src`.
- No email, no name, no raw net worth, no raw age anywhere in event payloads.

### Attribution slugs

`?src=advisor-<slug>` (per advisor/firm), `?src=talk-<slug>` (per venue, matching the existing `talk-<venue>` convention in `docs/plan/speaking-circuit-traffic-strategy.md`), `?src=book`. The calculator's own assessment CTA link should **forward** the `src` param through: `/assessment?src=${src}` so attribution survives calculator → assessment → Protégé signup as one funnel.

### Mobile-first / hideChrome

Match `go/gut-repair.astro` structural pattern: `BaseLayout` with `hideChrome={true}`, `robots="noindex,follow"`, minimal top bar with wordmark, single-column stacked sections, no nav maze. Inputs stack vertically on mobile; the two-bar chart must not force horizontal scroll (fixed aspect, no fixed pixel widths).

### Components (new)

- `website/src/pages/go/uninsured-decade.astro` — page shell, mirrors `gut-repair.astro` structure (top bar → hero → input form → results block → ledger table → chart → assessment CTA → disclaimer/footer).
- `website/src/lib/uninsured-decade-math.ts` — pure functions: `stageCosts(state)`, `tenYearTotal(state)`, `spendDownYears(netWorthBand, state)`, `expectedValue(tenYearTotal, riskReduction)`. No DOM, no fetch — importable by both the page script and the test file.
- `website/src/data/cost-of-care-by-state.ts` — data file, one row per state: `{ state, inHomeIndex, facilityIndex }`, indexed to national baseline = 1.0. **Source: Genworth/CareScout 2025 Cost of Care Survey** (already cited in the source doc for national figures; per-state indices need to be pulled from the same CareScout survey's state tables — flag as a data-sourcing task, not fabricated).
- Inline `<script>` block (like `gut-repair.astro`'s checkout script) for form wiring, PostHog capture calls, and calling the math module client-side.
- Simple inline SVG or `<canvas>` two-bar chart — no charting library needed for one comparison chart (keep bundle thin; this is a `hideChrome` LP, not an app screen).

### Tests

- Unit tests (Vitest, matching whatever test runner the Astro site already uses — confirm during build) for `uninsured-decade-math.ts`: known-input/known-output cases for `stageCosts`, `tenYearTotal` (Texas vs. a high-cost state vs. national), `spendDownYears` at each net-worth band boundary (including the open-ended top band renders "10+"), and `expectedValue` (confirm it never exceeds `tenYearTotal`).
- No integration/E2E tests required for v1 given the one-session constraint — the math is the only thing that must be provably correct; the page itself is copy + form wiring.

### Build estimate

| Task | Hours |
|---|---|
| Data file: state cost-of-care indices (source + transcribe from CareScout survey) | 1.5 |
| Math module + unit tests | 2 |
| Page shell + copy (adapted from LP template, Dr. TJ voice pass) | 2.5 |
| Form wiring + results rendering + chart (inline SVG) | 2 |
| PostHog events + `src` forwarding to `/assessment` | 0.5 |
| Print stylesheet | 1 |
| QA pass (mobile, print preview, all net-worth-band edge cases) | 1 |
| **Total** | **~10.5 hours** — buildable in one focused session or two half-sessions |

---

## PART B — Masterclass Talk: "The Uninsured Decade"

_40 min + Q&A. Reuses the speaking-circuit rules from `docs/plan/speaking-circuit-traffic-strategy.md`: no selling from stage, QR is the only ask, Q&A is the sales floor, back-table author copies. This talk is the Tier 3 "financial advisors / estate attorneys / CPAs" and "CEO peer groups" venue play from that doc — higher-trust, higher-net-worth rooms than the Tier 1 Rotary-club circuit, so the frame shifts from prevention-education to risk-underwriting, but the stage discipline is identical. Every variant endorses the host/advisor as necessary — never a better or competing solution — per `feedback_endorse_the_professional_partner.md`._

### Slide list (max 12)

1. Title: "The Uninsured Decade" + Dr. TJ credential line (per `feedback_branding_credential_rules.md`: "Dr. TJ Mundheim, DC").
2. Bill & Cindy — the scenario (photo/illustration, age 70, retired, active).
3. The diagnosis moment (one line: "Then one of them is diagnosed.")
4. The $0 line — "What Medicare pays for custodial care."
5. The collapsed LTC insurance market (one stat: most carriers have exited or repriced LTC policies out of reach — cite general market-collapse framing, not a specific carrier claim).
6. The whiteboard: 3-stage spend-down math ($37K–40K → $175K–180K → $315K+, ~$525K ten-year total) — built live if possible, or revealed stage-by-stage.
7. "You can't insure it. You can only underwrite it." (pull quote slide)
8. The premium paid in hours — 10 hrs/month framing.
9. The 4Ms as the coverage schedule (four-quadrant slide, taught for real — no gating).
10. The two canaries — ED (men) / perimenopause (women), one line each, calibrated so neither sex feels singled out.
11. The 90-second close numbers ($405,262 / 63%) — pulled directly from source doc.
12. QR code slide — `my4mlife.com/go/uninsured-decade?src=talk-<venue>` (or `?src=talk-<venue>` straight to `/assessment` for non-financial rooms — advisor-hosted events route to the calculator since the audience is already underwriting-literate; CEO/civic rooms route straight to `/assessment` per the existing playbook).

### Speaker notes per beat

1. **Title** — Land the credential once, plainly, then move on. Don't dwell.
2. **Bill & Cindy** — "We've talked about Bill's shoulder before. Tonight I want to ask a harder question." Open with the number: for a couple their age, the odds that one of them develops dementia run about 42% individually, 2 in 3 for the couple together (Nature Medicine, 2025). Use the exact bridge language from the source doc's Section 4.
3. **The diagnosis** — Let it land in silence for two seconds before continuing. No slide animation needed.
4. **The $0 line** — This is the room's "wait, what?" moment. Pause after saying it. Most people believe Medicare covers this — correcting that belief is the hook.
5. **Collapsed LTC market** — Brief, factual, not a rant. One sentence: private LTC insurance has largely priced itself out of reach or exited the market — this is why "just buy a policy" isn't a real answer anymore for most families.
6. **The whiteboard** — This is the emotional and financial core. Build it stage by stage if the room allows a literal whiteboard; if slides-only, reveal one row at a time. Land on the $525K ten-year total and the $405,262 lifetime-average national figure as cross-validation ("this isn't a scare number I made up — it's the Alzheimer's Association's own average").
7. **"Underwrite it"** — The reframe. You can't buy a policy against this anymore. What you CAN do is lower your own risk profile the way an underwriter lowers a premium — through modifiable factors. Expected-value language only; no prevention claim.
8. **10 hrs/month premium** — Reframe the ask from money to time. This is the pivot from fear to action, and it's the least expensive moment in the talk for the audience — say it plainly, don't oversell.
9. **The 4Ms** — Genuinely teach all four (Mind/Muscle/Mitigate/Motivate per `project_4m_deck_reconciliation.md` historical ordering — confirm current framework naming before finalizing slide, since 4M ordering/branding has evolved). Hold nothing back — this room converts on trust, not scarcity.
10. **Two canaries** — For a mixed advisor/CEO-group room, spend equal time on both: ED as the male canary, perimenopause/hormone shifts as the female canary. Per `project_ed_canary_thesis.md`: canary framing, not diagnosis framing. Keep clinical, not locker-room.
11. **90-second close** — Deliver verbatim (or near-verbatim) from the source doc's Section 5 script. It's already tested language: $405,262 / 63% / "you cannot buy back those ten years."
12. **QR** — Single ask, no selling. "Scan it, it's free, seven minutes, you get your score and my book." Stop talking. Let Q&A do the rest.

### Three audience-specific variants

**1. Advisor client dinner** (hosted by a financial advisor/CPA/estate attorney for their own clients)
- Frame: "Protect the mind that signs the documents." Open by crediting the host advisor's practice for caring enough to bring this topic to clients.
- Emphasize the calculator (`/go/uninsured-decade?src=advisor-<slug>`) over the assessment as the primary QR destination — this room is financially literate and will engage more with the spend-down math than a wellness quiz.
- Close with: "Talk to [Advisor] about how this fits your plan, and take seven minutes with my assessment to see where you personally stand."

**2. CEO peer group (Vistage / Tiger 21)**
- Frame: "Your cognitive capital is the asset your whole balance sheet depends on." These rooms already think in ROI/risk language — lean harder into the underwriting metaphor and the "10 hrs/month" time-ROI framing.
- Cut slide 5 (LTC market collapse) shorter — this room needs less convincing that insurance has failed them; they already know. Spend the reclaimed time on slide 9 (4Ms) since these are high-performers who respond to frameworks they can operationalize.
- QR routes straight to `/assessment?src=talk-<group-slug>` — peer-group members are less likely to want a spouse-inclusive financial calculator mid-meeting; the individual assessment fits the format better.

**3. Estate-planning council (CE-credit eligible)**
- Frame: shift from "you" language to "your clients" language throughout — this audience is attorneys/advisors earning continuing-education credit, not the end consumer.
- **Learning objectives** (for CE filing):
  1. Identify the financial exposure custodial cognitive-care costs create for clients, and why Medicare does not mitigate it.
  2. Explain the Medicaid spend-down mechanism and its planning implications for client net-worth bands.
  3. Describe modifiable-risk-factor frameworks (the 4Ms) clients can be pointed toward as part of holistic risk planning, with appropriate non-medical-advice framing.
- No product/company pitch language in this variant at all — position entirely as continuing education; the QR (`?src=talk-estate-<council-slug>`) is offered as "a resource to share with clients," not personally targeted.
- Compliance note for this variant specifically: never let this read as TJ practicing law or giving financial advice — stay in "here's a risk category your clients face" lane throughout.

### Five hardest Q&A questions with answers

1. **"Doesn't long-term-care insurance still exist? Can't I just buy a policy?"**
   → "Some carriers still sell it, but premiums have risen so sharply and underwriting has tightened so much that for a lot of the people in this room, by the time you're motivated to buy it, you may not qualify — or the premium itself becomes a second mortgage. It's worth exploring with your own advisor, but it's no longer the reliable backstop it was twenty years ago. That's exactly why the frame tonight is underwriting your own risk, not just insuring against it."

2. **"Is this just a sales pitch for your supplements?"**
   → "Nothing I've said tonight is for sale from this stage. What I've given you is the risk math and a framework — the 4Ms — that's free to learn and free to start using tonight. If you want to see where you personally stand, there's a free assessment on the QR code. That's it. No pitch."

3. **"What if my spouse and I both develop dementia — does the math double?"**
   → "It doesn't double the way you'd think, because a shared facility or shared caregiving arrangement has some overlap in cost — but yes, the exposure is materially worse, and frankly the caregiver-mortality data I showed you doesn't have a second spouse left to absorb the strain. That scenario is the argument for acting on your own risk profile now, for both of you, not waiting."

4. **"How much of this can I actually prevent?"**
   → "I want to be careful here — nothing prevents or guarantees against Alzheimer's, dementia, or Parkinson's, and anyone who tells you otherwise is selling you something dishonest. What the research supports is that a set of modifiable factors — sleep, gut health, hormones, movement — can meaningfully shift your risk profile. That's expected-value thinking, not a guarantee. It's the same logic as diet and exercise for heart disease: it changes your odds, it doesn't write you an ironclad policy."

5. **"Why should I trust a chiropractor talking about dementia and estate planning?"**
   → "Fair question, and I'll answer it directly: I'm a Doctor of Chiropractic, NBCE-certified since 1994, thirty-plus years in clinical practice. I'm not your physician and I'm not your financial advisor, and I'm not pretending to be either tonight. What I bring is thirty years of watching this pattern up close in patients, and a framework built with a clinical team around the modifiable-risk-factor science. The cost data you saw tonight isn't mine — it's the Alzheimer's Association's and CareScout's, cited on the last slide. My job is connecting the dots between the money and the biology; your own doctor and advisor are still the ones managing your specific plan."

### One-page leave-behind (for advisor to give clients)

**"The Uninsured Decade — What Your Clients Need to Know"** (single page, advisor-branded space at top for their own logo/contact):

- **The number:** $405,262 average lifetime cost of dementia care (Alzheimer's Association, 2024 dollars) — 70% paid by the family.
- **The gap:** Medicare pays $0 toward custodial/memory care. Private LTC insurance has largely priced itself out of reach.
- **The mechanism:** Families private-pay until spend-down to Medicaid eligibility — a formula any advisor can run for a specific client: net worth ÷ annual private-pay cost in their state.
- **The other cost:** Spousal caregivers under strain have a 63% higher 4-year mortality rate (Schulz & Beach, JAMA).
- **The action:** Modifiable-risk-factor frameworks (sleep, gut health, hormones, movement) can shift a client's risk profile — expected-value, not a guarantee.
- **The resource:** Free 7-minute risk assessment + cost-of-decline calculator at `my4mlife.com/go/uninsured-decade` — a tool advisors can hand clients directly.
- Footer: required disclaimer (illustrative estimates, not financial/legal/medical advice) + Dr. TJ credential line + sources (Alzheimer's Association, CareScout/Genworth, USC Schaeffer Center, JAMA).

_(Word count for Part B outline: kept to speaker-usable bullet density rather than full script, per the 3,000-word cap for the combined deliverable — the 90-second close is the only verbatim script, reused from the source doc.)_

---

## Open items / follow-ups for TJ

- Per-state CareScout cost-of-care indices need to be sourced from the full survey tables (national figures are already cited; state breakouts are the one net-new data-sourcing task).
- Confirm current 4M naming/ordering before finalizing slide 9 — `project_4m_deck_reconciliation.md` is flagged historical-context-only.
- Decide whether the calculator ships before or after the first advisor-dinner or estate-council booking (talk can run with `?src=talk-<venue>` → `/assessment` on day one even if the calculator isn't built yet — same pattern as the existing Tier 1 talk).
