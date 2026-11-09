# DRAFT, NOT SENT

Welcome email: *Count Yourself Skinny* readers who requested the free Count Log (Week 13 onward). Drafted 2026-11-09. Not sent; no email tool used.

**Subject:** Your Count Log is here
**Alternate subject:** Your Week 13 Count Log (and one small question)

**From:** Dr. TJ (TJ to approve sender identity before any send)

---

## Body

Hi [First name],

Here is your free Count Log for Week 13 onward:

https://my4mlife.com/downloads/count-log-week-13-on.pdf

The six counts, straight from the book:

- **Chews:** 32 per bite, fork down between bites
- **Hours between meals:** 12, then 14, then 16
- **Steps:** 2,500 as a floor, then 5,000, then 8,000 to 10,000
- **Morning light:** 10 minutes outside
- **Water:** 2 glasses before noon
- **Nights:** 7 hours, 7 nights a week

One small thing for today: at your next bite, count your chews. Don't change anything. Just count. Mine was [TJ fills in: his real number, or delete this line].

Hit reply and tell me: **what's your number?**

One note: 32 is a limit, not a score. More isn't better.

If you ever want more, the next step is the free assessment at my4mlife.com/assessment.

Fork down. Chew. Count.

Dr. TJ

---

## Footer

For adults 18 and older. This email is educational only and is not medical advice. Talk with your clinician before changing how you eat or move. If you have a history of disordered eating, skip the chew counting and talk with your clinician.

[Unsubscribe link placeholder: required merge tag from the sender]

*(Body word count: about 150, under the 200 limit.)*

---

## Wiring notes (not part of the email)

Existing mail goes through `lambdas/email-sender` (Mailgun, templates in `src/templates.ts`, per-purpose composers like `partner-confirmation.ts`, allowlisted `drtj` sender in `handler.ts`). To wire this one: add a `composeCountLogWelcome` composer plus test, a signup source tagged to the Contact list with consent, a real unsubscribe link, and a deploy via `infra/deploy.sh`, then confirm the PDF is live at the URL.
