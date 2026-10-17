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
