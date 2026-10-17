# Beasley reciprocal section + founder 1:1 coaching offer (DRAFT — TJ reviews before anything ships)

Requested by TJ 2026-10-17. Both pieces are built behind `SHOW_DRAFTS` (website/src/lib/siteMode.ts, true only when `PUBLIC_SHOW_DRAFTS=1`), so a normal website deploy keeps them hidden until TJ approves.

Randall's site (randallbeasley.com) has a "PARTNER · MY4MLIFE" section: he coaches "the surface" (mindset, habits, discipline); Dr. TJ goes deeper (nutrition, cognitive decline, research, regenerative medicine). Book: *Running From Excuses* — Kindle B0HH9LTSY8 ($7.99), paperback B0HH9Q67QD ($17.99), companion workbook B0HH9MKT6K ($16.99). His coaching: $129/month, randallbeasley.com/#coaching. Fit per partnership memory: Randall owns the "who" (mindset/becoming), Dr. TJ owns the "how"; his book maps to the **Motivate** pillar.

## 1. Reciprocal section — "Partner · Randall Beasley"
Placement: a band on the homepage (after the free-resources section) and a fuller block on /pillars/motivate.

**Homepage band**
- Eyebrow: PARTNER · RANDALL BEASLEY
- Heading: Running From Excuses
- Body: My work starts with the body and the brain: what you eat, how you sleep, what you are exposed to, and what medicine can do. My best friend of thirty years, Randall Beasley, works on what has to come first: the decision to stop making excuses. His book is part memoir and part roadmap. He lost his business and his health, and he rebuilt both with a simple framework, one honest decision at a time.
- Body 2: In the 4Ms, that is Motivate. We send people back and forth, each to the one best equipped to help. If the thing holding you back is the decision itself, start with Randall.
- Buttons: "Get the book" → https://www.amazon.com/dp/B0HH9Q67QD · "Coaching with Randall" → https://randallbeasley.com/#coaching
- Fine print: Randall's coaching is not medical care. Medical care through My4MLife is provided by our network's licensed physicians.

**/pillars/motivate block** — same heading + body, plus: the three formats (Kindle $7.99 · Paperback $17.99 · Companion Workbook $16.99, each linking to its Amazon page) and one line: "Read it alongside *Begin with the End in Mind*: his book is the why, ours is the how."

## 2. Founder 1:1 coaching offer
Name (TJ to confirm): **The Captain's Table** (from the 2026-07-14 draft; fits the voyage theme). Page: /coaching. Homepage band links to it.

**Homepage band**
- Eyebrow: ONE-ON-ONE WITH DR. TJ
- Heading: Four seats. Your home. Your whole life.
- Body: I take on no more than four people at a time, and I come to you. Four days in your home, Sunday through Wednesday. We clear the pantry, set up your home environment, build your workout and your morning routine, and cook the week together. Then we talk every day for the rest of the month.
- Price line: $20,000 for the first month.
- Button: "Apply for a seat" → /coaching

**/coaching page**
- Hero: The Captain's Table · "Four seats. Your home. Your whole life." · "Don't lose your identity and your dignity while you still have a choice."
- What happens (in order): 1) Apply (2 minutes). 2) A private call with Dr. TJ to see if it is a fit. 3) Your four days: Sunday through Wednesday at your home. 4) Daily calls for the rest of the first month.
- During the four days: kitchen and pantry reset (out with the insulting foods, in with a stocked week); home environment set-up (light, sleep, air, water); a workout program built for your body and your schedule; your morning routine, practiced until it sticks; cooking the week's meals together; the book and the Logbook applied to your actual life.
- After the visit: a call every day for the rest of the month, and the My4MLife app, Logbook and weekly Zooms.
- Price: $20,000 for the first month. "Seats are limited to four at a time. If the table is full, you'll be first in line for the next opening."
- Application form: first name, last name, email, mobile phone, city and state, "What do you most want to change?", "When would you like to start?" (Next month / Within 3 months / Just exploring). Submit → contact-form relay to drtj@ inbox + /api/lead-capture (source `coaching-application`). Success: "Thank you. Dr. TJ will personally reach out within two business days."
- Fine print: Coaching is lifestyle and education, not medical care. Any prescription goes through our network's licensed physicians.

## Open questions for TJ
1. Name: The Captain's Table, or something else?
2. After the first month: what does month two onward look like and cost? (Draft says only the first month for now.)
3. Travel: are flights and lodging included in the $20,000, or billed at cost? Any regions you won't travel to?
4. Payment: paid in full before the visit? Refund if you cancel / if they cancel?
5. Filming: may the visit include a Keto Cattle Baron episode in their kitchen (the July draft had this)? Only with their written consent.
6. Amazon links to Randall's book: plain links (no My4MLife affiliate tag) — OK?


## 3. REVISION 2026-10-17 (TJ) — The Captain's Table v2 (supersedes section 2 copy where different)
Name confirmed by TJ: **The Captain's Table**. Price **$35,000 for the first month, travel included** (Dr. TJ pays his own travel). By application only — commitment, not just ability to pay.

**Homepage band**
- Eyebrow: ONE-ON-ONE WITH DR. TJ · THE CAPTAIN'S TABLE
- Heading: Four seats. Your home. Your whole life.
- Body: I take on no more than four people at a time, and I come to you twice in your first month. First, four days in your home, Sunday through Wednesday: we test, we clear the pantry, set up your home, and build your workout and your morning routine. Then a call every day. At the end of the month I come back for three days to see what thirty days of change has done, and to deliver your regenerative therapy in person.
- Price line: $35,000 for the first month. Travel included.
- Button: "Apply for a seat" → /coaching
- Small line under button: By application only.

**/coaching page**
- Hero: THE CAPTAIN'S TABLE · "Four seats. Your home. Your whole life." · tagline · "Apply for a seat"
- What happens (in order):
  1. Apply (5 minutes). This is by application only.
  2. A private call with Dr. TJ to see if it is a fit, for both of us.
  3. Visit one: four days in your home, Sunday through Wednesday.
  4. A call every day for the rest of the month.
  5. Visit two: three days in your home, Sunday through Tuesday, at the end of your first 30 days.
- Visit one — four days (Sunday–Wednesday): genetic testing for how your body handles medications (PGx) and nutrients (NGx), plus a comprehensive lab panel; kitchen and pantry reset (out with the insulting foods, in with a stocked week); home environment set-up (light, sleep, air, water); a workout program built for your body and your schedule; your morning routine, practiced until it sticks; cooking the week's meals together; the book and the Logbook applied to your actual life.
- Between visits: a call every day; the My4MLife app, Logbook and weekly Zooms.
- Visit two — three days (Sunday–Tuesday, end of month one): we review your results and your labs together and work on whatever is still in the way at home; then your full-dose regenerative therapy (Genesis RPA), delivered by nasal atomizer, with Dr. TJ there to walk you through it. Approved by one of our network's licensed physicians, like every treatment we offer.
- "Why I stay in your home": The fastest way to change a life is to see it as it is lived. When I can, I stay in your guest room during visits, so I see the real morning, the real kitchen, the real evening. If that is not comfortable at first, we start without it; many people are ready by the second visit.
- "Who this is for" (application criteria): You are ready to change how you live, not just what you take. You will do the daily calls and the work between them. You and your household are open to me being in your home, ideally staying in your guest room. You can commit the first month in full. — "Being able to pay is not enough. I choose people who are ready."
- Price: $35,000 for the first month. Travel included. Includes both visits, all testing and labs, daily calls, and your regenerative therapy. "Seats are limited to four at a time. If the table is full, you'll be first in line for the next opening."
- Application form: existing fields + new required question "Would your household be comfortable with Dr. TJ staying in your guest room during visits?" (Yes / After the first visit / No — prefer he stays nearby) + "Why now?" (textarea, required). Submit text: "Send my application". Success: "Thank you for applying. I read every application myself and will reach out personally within two business days. — Dr. TJ"
- Fine print: Coaching is lifestyle and education. Testing, labs and any prescription or regenerative therapy are ordered and approved by our network's licensed physicians.

### Still open for TJ
Refunds/cancellation; what month two onward looks like; filming (Keto Cattle Baron) with written consent; Randall's Amazon links plain (no tag); personal confirmation email to applicants instead of the generic one.
