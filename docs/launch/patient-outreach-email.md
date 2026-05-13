# Patient-Network Outreach Email — Template

_TJ — this is the email you send to your 30 years of patient relationships announcing My4MLife. Personalize the bracketed fields per recipient. 200–300 words._

---

## Subject line (primary)
> A quick note from Dr. TJ — something I've been building for you

## Subject line alternates
1. > After 30 years, here's what I built
2. > [First name] — a project I'd like you to see
3. > The thing I've been working on for men your age

---

## Email body

> Hi [Patient first name],
>
> It's Dr. TJ. It has been a while [optional: — last time we talked you were working on [specific topic from past appointment]]. I'm writing because I built something I want you to see, and because you are exactly the person I built it for.
>
> After 30 years of practice — and a lot of watching the same pattern repeat in men our age — I launched a platform called **My4MLife**. The idea is simple: most men in their 50s and 60s are getting medicine that treats one symptom at a time. The actual problem is upstream, it is integrated, and the endpoint that matters is your brain in your last decade. Not your waistline, not your testosterone, not any single number. The mind you walk into your granddaughter's wedding with.
>
> I built My4MLife around that — a four-pillar framework, a free workbook, and direct access to me when it matters. No subscription trap. No exaggerated promises. Just the integrated picture I wish more men had been handed at 50.
>
> If you're curious, the lowest-friction starting point is an 8-question audit. It takes about three minutes:
>
> > **Take the free audit:** https://my4mlife.com/assessment
>
> If you already know you're ready to start, here's the door:
>
> > **Start here:** https://my4mlife.com/solutions
>
> Either way — I'd love to hear how you've been. Hit reply.
>
> — Dr. TJ
>
> _NBCE-certified since 1994 · 30+ years in practice · Founder, My4MLife_

---

## Patient-list export instructions

Pull a list from whatever system you've been keeping records in. The minimum columns we need:

- **first_name** (required)
- **last_name**
- **email** (required)
- **last_appointment_topic** (optional — enables the personalization line in the email)
- **last_seen_year** (optional — helps tone the "it's been a while" line)

**If your records are in:**

- **An EMR (ChiroTouch, ACOM, Genesis, etc.)** — Reports → Patient Demographics → Export to CSV. Filter by date range if you want to start with most recent first.
- **Practice management software (Jane, Cliniko, SimplePractice)** — Settings → Export → Contacts/Clients → CSV.
- **A spreadsheet (Excel/Google Sheets)** — File → Download → CSV. Make sure the column headers match the field names above.
- **Paper / handwritten records only** — start with the men you remember by name. A list of 50 you actually remember will outperform 500 you don't.

Save as `patients-export-YYYY-MM-DD.csv` and drop it in `docs/launch/` (gitignore it before commit if it contains PHI — verify with the engineering agent).

---

## Sequencing recommendation

- **Do not** send all 500 at once. Mailgun deliverability will tank, and you will not have capacity to handle replies.
- **Send 20–50 per day** over 1–2 weeks. Start with the most recent / most-engaged patients (the people most likely to reply warmly — this seeds momentum and inbox reputation).
- **Reply window:** budget 30 minutes per day during the send window to respond personally. The reply is where the relationship reactivates — the email is just the door.
- **Throttle automatically** if reply rate is high — slow the sends until you've cleared the inbox. The point is reconnection, not throughput.
- **Subject line A/B:** use the primary subject for the first 100 sends; rotate alternates if open rate falls below 35%.
- **Compliance:** include a one-line unsubscribe at the foot of every send ("If you'd rather not hear from me, just reply with 'no thanks' and I'll take you off."). For a personal-relationship list this is enough; for cold lists it would not be.

---

## Brand-rule check
- [x] Lead credential: "NBCE-certified since 1994" (no MD, no forbidden titles)
- [x] No "treat" verb in marketing copy
- [x] Brain-health-first thesis is the through-line
- [x] No exaggerated claims, no fake testimonials
- [x] Soft CTA (audit) + ready CTA (solutions) — Two-Paths funnel
- [x] Personal tone — Dr. TJ writing to people who know him
