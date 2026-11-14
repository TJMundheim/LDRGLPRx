# Uninsured Decade calculator report: copy for TJ approval (2026-11-14)

Status: DRAFT. Nothing deploys until TJ approves this copy.
Plan: docs/plan/ud-calculator-gate-2026-11-14.md
Rules applied: endorse-the-professional-partner, "Dr. TJ" only (no ", DC"), identity/dignity tagline verbatim, gender-neutral, no "coming soon", no prevention claims, no comparison against insurance or the advisor.

Placeholders: `{firstName}`, `{bill}`, `{stateName}`, `{onsetYear}`, `{date}`, plus the other `{...}` values the server computes from the shared math.

---

## 1. Gate form copy (on /go/uninsured-decade)

**Hero sub line** (replaces "Answer six questions below. No name, no email — just the math."):
> Answer six questions to see The Bill. Add your first name and email to unlock the full breakdown and get it as a PDF you can review with your advisor.

**Gate heading:** Unlock your full breakdown

**One-line why:** We'll email you a personalized PDF of the full ledger, so you have it to review with the professionals who help you plan.

**Field labels**
- First name
- Email
- Send a copy to my financial advisor (optional)
  - Advisor field label: Advisor's email
  - Fine print: We send the copy once, with you on it. We don't keep your advisor's email address.

**Opt-in checkbox (unchecked by default):** Email me occasional notes from Dr. TJ

**Button label:** Unlock and email my report

**Privacy fine print:** We use your first name and email to send this report. We don't store your age, state, net worth, or spending. Opting in is optional and you can unsubscribe any time. See our <a href="/privacy">Privacy</a> page.

**Error line (400, stays locked):** Please check your first name and email, then try again.

**Fallback line (send failed, page still unlocks):** We couldn't email your report just now. Your full breakdown is unlocked below. Use "Print this for your advisor" to save it as a PDF.

**After unlock, secondary link:** Email me the updated report

---

## 2. Email

**From:** Dr. TJ <drtj@my4mlife.com>
**To:** {email}
**Attachment:** Uninsured-Decade-{firstName}.pdf

**Subject:** {firstName}, your Uninsured Decade report

**Body (plain text, 118 words):**

```
Hi {firstName},

Your Uninsured Decade report is attached. For {stateName}, the illustrative 10-year cost of care, in {onsetYear} dollars, comes to {bill}. The PDF shows how that number is built, line by line.

Please review it with your financial advisor, estate attorney, or CPA. Your plan, your policies, your powers of attorney, and your health-care directives are theirs to get right, and you need them. This report is only one more input for that conversation.

If you'd like to look at the part that is in your control, you can start here:

Get your free MindSpan assessment
https://www.my4mlife.com/assessment?src=ud-report-email

Don't lose your identity and your dignity while you still have a choice.

Dr. TJ
```

Word count of body above: about 118 (limit 150).

Footer line, small (unsubscribe/opt-in handling is the standard email-sender footer): You received this because you requested your report at my4mlife.com/go/uninsured-decade.

---

## 3. Advisor-CC line

Shown as the first line of the email body only when an advisor address was supplied. The advisor sees the same email and PDF; the requester is visible on it.

> {firstName} asked us to copy you, their financial advisor, on this. It is a planning input for your next conversation together, and the figures are illustrative.

(If the advisor field was used, the greeting stays "Hi {firstName}," so both recipients read the same message.)

---

## 4. PDF layout (1 to 2 pages, letter)

Per the branding rule, the calculator itself carries no author name or credential. The PDF header uses the My4MLife mark only.

**Header:** My4MLife · The Uninsured Decade

**Title:** Your Uninsured Decade report
**Subtitle:** Prepared for {firstName} · {date}

**A. Inputs summary** (labels and values)
- Your age: {age}
- Spouse / partner age: {spouseAge} (or "None")
- State: {stateName}
- Approximate net worth: {netWorthBandLabel}
- Current monthly out-of-pocket health spend: {monthlySpend}
- Hours/week of exercise: {exerciseHours}
- Assumed relative risk reduction: {rrrPct}%

**B. Three headline numbers**
1. **The Bill**: {bill}. "Illustrative 10-year staged care cost, adjusted to {stateName}, in {onsetYear} dollars." Why-line: `{billWhy}`
2. **The Premium: new money**: {newMoneyTenYear}. "What the basket costs beyond what you already spend, over 10 years." Why-line: `{premiumWhy}`
3. **Years Until Spend-Down**: {spendDownDisplay}. "At your net worth band, custodial care alone would take about this long to spend you down to Medicaid eligibility." Why-line: `{spendDownWhy}`

**C. The ledger** (columns: Line | 10-year amount | Notes)
- Stage 1 — early-stage care | {stage1} | Mostly in-home support, illustrative
- Stage 2 — mid-stage care | {stage2} | Heavier in-home / adult-day support
- Stage 3 — late-stage custodial care | {stage3} | Memory care / nursing home, state-adjusted
- The Bill (total) | {bill} | Sum of stages 1–3, in onset-year dollars
- The Premium — full basket (10 years) | {fullBasketTenYear} | 4M protocol basket, $675/mo ($81,000 over 10 yrs)
- Already spending (10 years) | {alreadySpendingTenYear} | Your reported current monthly health spend × 120
- New money (10 years) | {newMoneyTenYear} | The actual new spend the basket requires
- Hours to add per month | {hoursToAdd} | {hoursNote} (default: "Target: 10 hrs/mo (~2.3 hrs/wk)")
- Expected savings, dementia-cost avoidance only [assumption, not a guarantee] | {expectedSavings} | Compared against the full basket — the honest premium

**D. Expected value, stated honestly: for {who}** ({who} = "the two of you" or "you")

> This is the part most calculators fudge. We won't. Nothing lowers your risk to zero, and nothing "prevents" dementia — the honest claim is that a sustained, structured lifestyle protocol can *lower the odds*. Here's what that's worth in dollars, using an assumption you control:

> Lifetime risk of any dementia after age 55 is **42%** (or, for a couple, about a **66%** chance at least one partner is affected) — per the largest long-running U.S. cohort study to date (Fang, Coresh et al., *Nature Medicine*, 13 Jan 2025, ARIC cohort).

> Assumed relative risk reduction: **{rrrPct}%**
> 45% = Lancet Commission 2024 ceiling if all 14 modifiable risk factors are addressed (a population figure, not a personal guarantee)
> This is an assumption, not a guarantee — see disclaimer below.

Math line: `{evMath}`, built exactly as the page builds it: "Unmitigated expected cost (probability-weighted): **{unmitigatedExpectedCost}**. With a {rrrPct}% assumed risk reduction: **{mitigatedExpectedCost}**. Expected savings: **{expectedSavings}** against a {fullPremium} ten-year premium — the full basket, the honest comparison." followed by `{evVerdict}` (the page's breaks-even or falls-short sentence).

**E. Closing paragraphs (verbatim from the page)**

> **Read plainly: whichever way your number lands, dementia-cost avoidance is a single-disease bet, and this is never a single-disease decision.** A couple at the default 30% assumed risk reduction shows expected savings of roughly $80K against an $81K ten-year premium; at the 45% Lancet ceiling, roughly $120K. The honest case for the spend is that the ledger really tips once the same modifiable factors' effect on diabetes, cardiovascular disease, and stroke — plus the wide right tail past the $405,262 average cost, plus quality-of-life and caregiver-hour value — are counted alongside dementia. None of that is captured in the math above. Insurance is a ruin-avoidance trade, not an ROI calculation — the same trade you already make on your house. You don't insure your house because you expect it to burn down; you insure it because you can't afford it if it does.

> **What the ledger can't count.** The same premium that may lower the odds of the bill pays a dividend now, whether or not a claim ever comes: sleep, strength, energy, a retirement decade spent on your feet. That dividend is worth more than any number above, and it is the reason the people who do this keep doing it. What it protects was never really the money. Don't lose your identity and your dignity while you still have a choice.

> A policy funds the risk; it can't lower it — that part is on you. Take this printout to the advisor who sent you here, and review your plan, policies, powers of attorney, and health-care directives with them — that step is necessary, not optional.

*One more caveat: the 42% figure counts all dementia, including mild cases diagnosed late in life — so treat this as a range to reason with, not a promise about your own outcome.*

(Note: the second paragraph in the PDF is rendered from the page's text. For the "couple" illustrative sentence, the server uses the same computed values as the page.)

**F. Advisor endorsement line (boxed, new)**
> Review this report with your financial advisor, estate attorney, or CPA. They protect the money. This protects the person the money is for. You need both.

**G. Tagline (centered, own line)**
> Don't lose your identity and your dignity while you still have a choice.

**H. Disclaimers (verbatim)**

> **Medical Disclaimer:** My4MLife provides access to telehealth services and prescription medications through licensed healthcare providers and pharmacies. Compounded medications are not FDA-approved. Individual results may vary. GLP-1 medications are prescription-only and require a physician evaluation. This website does not provide medical advice. Always consult with a qualified healthcare provider regarding your health. Testimonials reflect individual experiences and are not guarantees of results. Images may use models for privacy.

> These figures are illustrative estimates based on published third-party cost-of-care data (Alzheimer's Association, CareScout/Genworth, USC Schaeffer Center) and a hypothetical relative-risk-reduction assumption. This is not financial, tax, insurance, or legal advice, and no protocol guarantees a reduction in your personal risk. Consult your own financial advisor and physician.

**I. Footer (every page):** my4mlife.com/go/uninsured-decade?src=advisor-pdf

---

## 5. Open questions for TJ

1. **Name on the PDF.** The branding rule says generic calculator tools carry no author name or credential, so the PDF above shows only the My4MLife mark and the email is the only place "Dr. TJ" appears (From line and sign-off). OK to keep it that way?
2. **Medical Disclaimer in a financial PDF.** I included the site's Medical Disclaimer verbatim as requested, but it speaks of telehealth, GLP-1s, and compounded drugs, which reads oddly in an estate-planning handout an advisor will see. Keep it verbatim, or approve a shorter health-span-educator line for this PDF only ("Dr. TJ speaks as a health-span educator and does not provide medical care through this platform")?
3. **Copy of the closing paragraph.** The page's "Insurance is a ruin-avoidance trade..." paragraph is carried over verbatim. Advisors who sell long-term-care products will read it. It does not rank us against insurance, but do you want it kept as is, or trimmed to end with "some households should own both — ask your advisor"?
