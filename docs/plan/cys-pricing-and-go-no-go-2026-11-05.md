# Count Yourself Skinny: pricing and go/no-go (2026-11-05)

For Dr. TJ. Research checked on Nov 4, 2026. When this was written, nothing had been sent, published or changed in the app. See the status note below for what has changed since.

## Status note, added by the final review (Nov 4, night)

The app work moved ahead of this schedule. Read the tables below with these in mind.

**Already done, so skip these rows and dates:** $0.99/$4.99 prices, free first meal, code button removed, first-run safety step, usage-data question with an off switch, 18+ wording, day-30 Brain Check card (streak or 12 weeks only, never weight), icon, privacy and support pages live. The purchase code now runs against Apple's local test store on a simulator; a real sandbox purchase still hasn't happened. The "Nov 9 to 20" Claude row and the "App README" row near the end are done. Taps to the assessment are now tracked from the Home card and the About link (`next_door_tapped`), and the two links carry their own `src`.

**Still true:** the count has never met a real chew. Nothing else matters until Gate 1.

**Four corrections to the logic:**
1. **Gate 1 needs a method.** "Within 20% of a hand count" can't be done on a whole lunch. The AirPods guide now has the method: 5 hand-counted bites per lunch, plus real bites times your average, across three lunches.
2. **Gate 2 has no instrument yet.** The TestFlight build has no Chew Lab and no CSV, so testers can only compare their own count with the big number, and a failure gives Claude nothing to tune. Claude needs to write a one-page tester sheet before Nov 23, and external TestFlight testers need Apple's beta review first.
3. **Test 3 of the spear decision can't mostly be met by Jan 31.** The Brain Check card appears at a 30-day streak or 12 weeks. Someone who installs on Jan 4 can't see it before Feb 3. By Jan 31 only the About screen's link and email box can move that number. Either judge test 3 later (around Mar 1) or count only December installers.
4. **A failed Gate 1 isn't only "stop."** This doc says to keep the book and Bite Pacer; the launch plan says the dare survives on the free pacer. That still means shipping the app, with counting and the paywall taken out. Small, but it's unplanned work.

**The D-U-N-S clock has no fallback date in the table below.** `docs/launch/cys/app-store-kit/tj-steps.md` Part 0 now sets one: Dec 1.

## The answer

**Price:** $0.99 a month and $4.99 a year, with no Apple free trial. The first chew-counted meal is free instead. Show the yearly plan first, with the line "about 42¢ a month." You get your under-50-cents number, and you collect $4.24 up front instead of 42¢ at a time.

**Go/no-go:** Yellow. Launch it as a cheap side bet after Nov 20, aimed at New Year's. It is **not** the point of the spear today. It can earn that title only if it passes three tests, listed under "Should this be the point of the spear?" below.

**Why you shouldn't lose sleep over price:** at 10,000 downloads, the difference between 49¢ and $2.99 is about $475 versus $3,100 for the year. One Captain's Table seat ($50,000) equals about 11,700 yearly payers at $0.99/$4.99. Pick the price, then get back to the blitz.

**Three blunt findings:**
1. The price mechanics run the opposite way from what you were told. At these prices, raising is easy and lowering is the one-way door (details below). So 49¢ wouldn't trap you. It just doesn't earn its keep.
2. The evidence says low prices don't lift conversion enough to pay for themselves on subscription money alone. Low prices make sense here for other reasons: a free rival, an unproven count, and your funnel.
3. Your own competitor is the warning. Ododok has shipped AirPods chew counting, free, since July (US listing date Aug 10), across at least 17 releases. It has **zero** US ratings. "Your AirPods count your chews" hasn't gone viral by itself.

---

# PART 1: PRICING

## 1. What Apple's rules actually say

| Question | Verified answer | Source |
|---|---|---|
| Lowest US subscription price | **$0.29.** 49¢ and 99¢ are both allowed, in 10¢ steps at the low end. The $0.29 floor is from Apple's 2022 announcement. I can't see the live price list without an account, so confirm in App Store Connect. | [Apple newsroom](https://www.apple.com/newsroom/2022/12/apple-announces-biggest-upgrade-to-app-store-pricing-adding-700-new-price-points/), [TechCrunch](https://techcrunch.com/2022/12/06/apple-loosens-grip-on-app-store-pricing-with-700-new-price-points-support-for-prices-that-dont-end-in-99) |
| Small Business Program | **15%** commission, so you keep 85%. Open to new developers and those under $1M in proceeds a year. Enroll as the Account Holder after accepting the Paid Apps agreement. The lower rate starts 15 days after the end of the fiscal month you're approved, so **enroll before your first sale.** | [Apple SBP](https://developer.apple.com/app-store/small-business-program/) |
| Commission after year one | Standard developers go from 70% to 85% after a year. Small Business members get 85% from day one, so nothing changes for you in the US. | [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/) |
| **Lowering the price** | Existing subscribers **automatically** drop to the lower price. You can't keep the old price for them. Once it takes effect it can't be reversed, though you can schedule an increase later. | [Apple pricing help](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/) |
| **Raising the price** | US subscribers must opt in only if the rise is more than 50% **and** more than $5 per period ($50 for annual), or if they already had a rise in the past 12 months. So 49¢ to 99¢, 99¢ to $1.99, and $4.99 to $9.99 need **notice only, not consent.** Apple notifies them 27 days ahead. You can also keep current subscribers at the old price and charge only new ones. | [Apple pricing help](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/), [US thresholds](https://developer.apple.com/help/app-store-connect/reference/auto-renewable-subscription-price-increase-thresholds) |
| Intro offers and offer codes at these prices | Both exist for subscriptions, with free, pay-as-you-go and pay-up-front types, and I found no rule barring them at 99¢. One intro offer per customer per subscription group. Offer codes can be redeemed by link, in the App Store or in the app, with one redemption per customer per offer. Custom codes: expiry is optional, 6 months maximum if set, and each batch is capped at 25,000 redemptions. Up to 1 million codes per app per quarter. | [Apple offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/), [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/) |
| Refunds | The customer asks Apple directly at reportaproblem.apple.com. You don't decide. Published refund rates: 2% to 5% of payers overall, 4.71% for Health & Fitness, 2.2% for low-priced plans. | [Apple Support](https://support.apple.com/en-us/118223), [RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025) |
| Renewal notices | Apple always notifies people in advance of a price **increase**. Customers do get a "receipt from Apple" email for purchases, and that's how Apple tells people to find a charge to refund. **Unverified:** whether Apple sends a routine reminder before an ordinary annual renewal. | [Apple Support](https://support.apple.com/en-us/109501), [refund page](https://support.apple.com/en-us/118223) |
| Fine print on "42¢ a month" | The sign-up screen must clearly show the full renewal price and the period. So "$4.99 a year" stays the big text and "about 42¢ a month" stays secondary. | [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/) |

**Correction.** The first answer you got said "lowering is easy, raising is hard." At these prices that's backwards. A rise costs a 27-day notice and no consent, and you can shield current subscribers. A cut hits everyone at once and can't be undone. The real argument against 49¢ is that it gives up half the money for a lift nobody has shown, covered in section 2.

**On "they'll never think about it again."** The data doesn't support that. In Health & Fitness, only a median 57% of monthly subscribers make it past the first renewal (46% to 68%), and only 25% of annual subscribers renew (16% to 37%) ([RevenueCat](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category)). And 35% of annual cancellations come in month one ([9to5Mac](https://9to5mac.com/2026/05/27/new-report-shows-annual-app-subscribers-rarely-return-after-they-cancel/)). Those plans cost far more than yours, so forgetting may be more common at 99¢, but no one has published that. The side-button purchase itself is quick, but it still takes a deliberate double-click and Face ID, and a subscription confirmation comes with it.

## 2. What the market data says

**Plain statement: I found no published data on conversion or churn for subscriptions at 49¢, 99¢ or $1.99.** The closest source, RevenueCat, sorts apps into "low, mid, high" relative to other apps, with no dollar cutoffs. The median Health & Fitness monthly price is $9.99, so every price we're discussing sits below the benchmark's whole range. Everything below is an extrapolation.

| Metric (median) | Low-priced | Mid | High-priced | Source |
|---|---|---|---|---|
| Download to paid, by day 35 | 1.4% | 2.0% | 2.8% | [RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps-2026-education) |
| Download to trial | 4.4% | 5.4% | 8.9% | same |
| Revenue per install, day 60 | $0.11 | not stated | $0.94 | same |
| Monthly plan still active after 1 year (2025 data) | 22.5% | 16.4% | 12.2% | [RevenueCat 2025](https://www.revenuecat.com/state-of-subscription-apps-2025) |
| Annual subscribers retained after 1 year | 36% | 26% | 23% | [RevenueCat](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category) |

Read this carefully. Low-priced apps **don't** convert better, though cheap apps are also often weaker apps, so this isn't proof of cause. They do keep people longer and see fewer refunds. So a low price buys loyalty and goodwill, and I can't show it buys volume.

**Other benchmarks**
- Health & Fitness download to paid: 2.9% (top quartile 6.2%). Trial to paid: 37.7%. Only 18.3% of H&F apps run no trial, so a no-trial launch is against category habit. ([RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/))
- Freemium apps (our model): 2.1% download to paid, top quartile 4.5% ([RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps-2026-education)).
- Of people who cancel a 7-day trial, 39.8% do it on day zero ([RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/)).
- Only 4.6% of new apps reach $10,000 a month within two years ([RevenueCat 2026](https://www.revenuecat.com/state-of-subscription-apps/)).

**49¢ vs 99¢ vs $1.99+**
- The famous research on tiny prices is about **free versus almost free** ([Shampanier, Mazar, Ariely 2007](https://people.duke.edu/~dandan/webfiles/PapersPI/Zero%20as%20a%20Special%20Price.pdf)). You already have free: the app is a free download. That research says nothing about 49¢ beating 99¢.
- iPhone owners already know 99¢ a month as a normal price: it's what Apple charges for [50 GB of iCloud+](https://support.apple.com/en-us/108047).
- My inference, not data: 99¢ and 49¢ both feel like "under a dollar," so I see no reason for 49¢ to double sales. Going from 99¢ to $1.99 crosses a real line, so a drop in sales there is more believable.

**What rivals charge** (rechecked Nov 4, via Apple's public [search listing](https://itunes.apple.com/search?term=chew&entity=software&country=us) and App Store pages)

| App | How it works | Price | US ratings | Note |
|---|---|---|---|---|
| [Ododok](https://apps.apple.com/us/app/ododok-meal-chew-tracker/id6784962920) | AirPods, **now also the front camera** | Free, no purchases listed | 0 | v1.11.1 released Nov 4. Added food portions and calories, weekly insights. Fast and well built. |
| [Chewing Diet](https://apps.apple.com/us/app/chewing-diet-mindful-eating/id6444375180) | Timer, Watch cues | Free; remove ads $1.99; points packs $0.99 to $3.99 | 7 | Live since 2023 |
| [SlowEat](https://apps.apple.com/us/app/sloweat-mindful-eating-tracker/id6742094566) | Camera, haptics | Free; **$4.99 lifetime** | 3 | Developer says he chose one-time over a subscription |
| [ZenMunch](https://apps.apple.com/us/app/zenmunch-for-mindful-eating/id6753739367) | Camera | Free | 0 | |
| [Slow Eats for Weight Loss](https://apps.apple.com/us/app/slow-eats-for-weight-loss/id1645476380) | Pause timers, no chew counting | Free; **$1.99/mo or $14.99/yr** | 126 | Not in our earlier analysis. The only real subscriber-priced neighbor, and it sits above $0.99. |

$2.99/$19.99 is the most expensive thing in this niche, against a free rival doing the same trick. That price should go. $4.99 a year equals SlowEat's lifetime price, which is about the ceiling for a pure counter.

## 3. Scenarios

**Assumptions, all visible, change any of them:**
- You keep 85%. US prices shown before sales tax.
- Monthly payer: 5.1 paid months in year one. That comes from a 57% first renewal (H&F median) and 22.5% active at one year (low-price tier). Low case 3.5 months, high case 6.9.
- 60% of payers choose yearly. This is my assumption. RevenueCat's H&F figure is about 67% ([2025](https://www.revenuecat.com/state-of-subscription-apps-2025)); its 2026 page contradicts itself on this.
- Same conversion at every price in the "downloads needed" columns, 2% (the freemium median, rounded down). The conversion lift columns then show how much that would have to change.
- Year-one proceeds only. Renewals in year two are extra and small.

| Plan (monthly / yearly) | You keep per monthly charge | You keep per yearly charge | Year-one value of a monthly payer | Blended value per payer | Payers for $100K | Payers for $1M | Downloads for $100K at 2% | Downloads for $1M at 2% |
|---|---|---|---|---|---|---|---|---|
| $0.49 monthly only (your idea) | $0.42 | none | $2.13 | $2.13 | 46,970 | 469,700 | 2.35M | 23.5M |
| $0.49 / $2.99 | $0.42 | $2.54 | $2.13 | $2.38 | 42,080 | 420,800 | 2.1M | 21M |
| **$0.99 / $4.99 (recommended)** | **$0.84** | **$4.24** | **$4.30** | **$4.27** | **23,440** | **234,400** | **1.17M** | **11.7M** |
| $1.99 / $9.99 | $1.69 | $8.49 | $8.65 | $8.55 | 11,690 | 116,900 | 585K | 5.8M |
| $2.99 / $19.99 (current) | $2.54 | $16.99 | $12.99 | $15.39 | 6,500 | 65,000 | 325K | 3.2M |

**Two things worth noticing**
- At $0.99/$4.99, a yearly buyer ($4.24 today) is worth almost exactly what an average monthly payer is worth over the year ($4.30). So the yearly deal costs you nothing and removes churn risk. That's why $4.99 is the right yearly number.
- The model's revenue per download at $0.99/$4.99 is $0.085. RevenueCat's real low-tier figure is $0.11 at day 60. The model is in the right neighborhood.

**What a year actually pays, subscriptions only, at 2%**

| Downloads | $0.49/$2.99 | $0.99/$4.99 | $1.99/$9.99 | $2.99/$19.99 |
|---|---|---|---|---|
| 1,000 | $48 | $85 | $171 | $308 |
| 10,000 | $475 | $853 | $1,711 | $3,078 |
| 50,000 | $2,377 | $4,265 | $8,553 | $15,391 |
| 400,000 (the profit model's number) | $19,000 | $34,100 | $68,400 | $123,100 |

**Breakeven: how many times more payers does the cheaper plan need?** "Extra value per payer" is what each payer brings beyond the subscription: a $5 book sale, or funnel money later.

| Extra value per payer | 49¢/$2.99 vs 99¢/$4.99 | 99¢/$4.99 vs $1.99/$9.99 | 99¢/$4.99 vs $2.99/$19.99 |
|---|---|---|---|
| $0 (subscription only) | 1.79x | **2.01x** | 3.61x |
| $5 (one book, near the $5.49 royalty) | 1.26x | **1.46x** | 2.20x |
| $20 (some funnel value) | 1.08x | 1.18x | 1.46x |
| $50 (strong funnel value) | 1.04x | 1.08x | 1.21x |

**What this tells you**
- On subscription money alone, a price cut needs a lift I can't find evidence for. The numbers favor $1.99/$9.99.
- If payers also buy the book or enter the funnel, low prices start to make sense quickly. That's the honest case for your instinct. Your own Aug 19 directive says not to count on the funnel, though, and **today nobody can measure it**. The app has no tracking event for a tap to the assessment or the book.
- The book matters as much as the app. A $5.49 paperback royalty ([tj-decisions.md](../book-cys/tj-decisions.md), print cost still to confirm) equals about 6.5 months of a 99¢ subscriber. At 1,000 downloads, 2% buying the app earns $85; 1% buying the book earns $55.

**Funnel value per 1,000 downloads, an illustration with made-up conversion rates.** 5% leave an email (50 contacts). If 2% of those buy, that's 1 order, the same rate your 58-contact list produced. At the $210 Push Patch margin in the [full-court press plan](mass-market-full-court-press-2026-10-31.md), that's $210, more than double the subscription money. It's the bigger prize, it's unproven, and a free download drives it regardless of the Pro price.

**The false premise.** A low price doesn't create reach. The free download and the story do. The Pro price only decides how many people already in the app pay something. The tip of the spear is **free**, whatever you charge for Pro.

## 4. Recommendation

| Item | Decision |
|---|---|
| `cys.pro.yearly` | **$4.99 a year.** Shown first and selected by default. Secondary line: "about 42¢ a month." |
| `cys.pro.monthly` | **$0.99 a month.** |
| Group | Same one subscription group. Keep these same two product IDs. Neither is created yet, so nothing migrates. |
| Apple free trial | **None.** Instead, **the first chew-counted meal is free**, then the paywall appears right after the summary. |
| Why not a trial | At 99¢ a 7-day trial makes people decide twice, delays the charge until the novelty has faded, and invites day-zero cancelling. |
| Why not simply "no trial" | Today the paywall comes **before** the app knows if the AirPods work. Charging someone 99¢ for "No AirPods found" earns a one-star review. The free meal fixes that and doubles as the press demo: a journalist can try it without paying. |
| Fallback | If the free-meal change takes Claude more than half a day, ship with the 7-day trial instead. The paywall already reads trial details from Apple, so this is a settings change, and you can remove the trial later without an app update. |
| Territories | **US only at launch.** It keeps the consent rules simple and avoids EU trader-disclosure work (from memory, unverified). |

**The book's free-month code: kill it.**
- A free month is now worth 99¢. It's not a selling point, and the "$14.99 lock-in" idea in the profit model is dead too.
- **First printing: no code and no mention of the app,** as the readiness doc already says. It also obeys the no-"coming soon" rule.
- **After the app is live (book v4):** one page offering **a free year of Pro**, delivered by a QR code to a page on your own domain (countyourselfskinny.com/book) that forwards to Apple's redemption link. You can then change the offer without reprinting. Worst case it costs $4.24 of revenue against a $5.49 royalty, and it's a real reason to buy the paperback.
- Confirm that a free 1-year offer is selectable in App Store Connect. Apple's help page doesn't list the durations.
- **Remove the "Have an offer code?" button** from the paywall. Apple's redemption link works without it, and the README already says to remove it if no code is printed.

**How to test cheaply after launch**

Apple's built-in A/B tool tests [icons, screenshots and videos, not price](https://developer.apple.com/app-store/product-page-optimization/). So:
1. **Days 1 to 30:** $0.99/$4.99. Watch paywall views to purchases in PostHog.
2. **Days 31 to 60:** raise the price **for new customers only** to $1.99/$9.99 in App Store Connect, keeping current subscribers at their price. No code needed. It's cruder than a true split test, because a press spike can distort a period, but it's free.
3. Keep $1.99/$9.99 if purchases fall by less than half. That's the 2x breakeven. Allow for book and funnel value once you can measure them.
4. **Only at 2,000+ installs a month:** a real split test, with Claude randomly assigning extra products in-app (half a day, no outside service). You need about 1,140 people per price to detect a 2x difference and 3,820 to detect 1.5x (at a 2% base rate).
5. **Test 49¢ only if** funnel value per payer is measured at $20 or more. It would then need about 8% more payers than 99¢.

Revisit a one-time "lifetime" option later if the subscription draws complaints. Not at launch.

---

# PART 2: RED LIGHT / GREEN LIGHT

Colors are where it stands today. Who: TJ, Claude, or attorney (the healthcare attorney Marla is referring).

| Angle | Light | Why | Fix | Who |
|---|---|---|---|---|
| **Product: AirPods count on a real meal** | RED | Detector has only met synthetic waveforms, no CSV exists in the repo, and the README lists known blind spots: double counts, talking. Research shows it's possible ([IMChew](https://mobile-systems.cl.cam.ac.uk/papers/bodysys24-yang.pdf): about 91% detection, 9.5% count error, 8 people, per a [survey](https://arxiv.org/pdf/2506.05720); I couldn't read the paper itself). Ododok claims it works, but that's their code. | 3 real meals (see path). Pass: within 20% of hand count on 2 of 3, then 5 other people. Fail after two tuning rounds: no paid chew feature. | TJ eats, Claude scores |
| **Product: purchase flow** | RED | Purchase code has compiled but never run. Plan rows have never been seen on screen. | Sandbox test on a real iPhone: buy, cancel, restore, expire, Ask to Buy. | TJ + Claude |
| App Review 1.4.1 (health accuracy) | YELLOW | [Apple](https://developer.apple.com/app-store/review/guidelines/) rejects unvalidated accuracy claims for health measurements. A chew count isn't a medical reading, but a percentage claim invites scrutiny. | Claim no accuracy figure anywhere. Say "estimates." Keep the see-your-doctor line. | Claude |
| App Review 2.1 (complete, tested) | RED | Privacy and support pages are 404 until deployed, icon not picked, hardware demo video not made. Paywall can't be reviewed until products exist. | Deploy pages, pick icon, film the meal, attach products to the first version. | TJ + Claude |
| App Review 3.1.2 (subscriptions) | YELLOW | Requires "ongoing value." The list of good examples favors content, cloud and regular updates; ours is an on-device counter. Rule isn't a ban. Paywall already has price, terms and Restore. | Ship regular updates; describe Pro plainly. If rejected, switch to a one-time purchase. | Claude |
| App Review 4.2 (minimum function) | GREEN | Real native utility, not a book in an app or a web wrapper. | None. | None |
| App Review 5.1.1 (i), (ii), (x) (privacy, consent, email) | YELLOW | (ii) says apps must get consent for usage data "even if anonymous." The app sends usage events with **no consent step** that I could find. Email is optional, good. Privacy page not live. | One-line notice with an off switch at first run. Deploy page. Turn on PostHog "Discard client IP data." Set age rating to match the privacy page's "under 18" line. | Claude; TJ for the toggle |
| App Review 5.1.1(ix) (legal entity) | GREEN if LLC, YELLOW if individual | Text covers apps "in highly regulated fields" such as healthcare, or apps "that require sensitive user information." CYS provides no healthcare service, so I read it as probably not applying. But it reads Health data and links to a telehealth assessment, and developers report this rejection, for example on a [medical information app](https://developer.apple.com/forums/thread/727268). The [reported fix is an organization account](https://developer.apple.com/forums/thread/745323) (forum reports only, and enforcement looks uneven). Individuals do ship in this niche: Ododok (sungho choi), Chewing Diet (Seunggon Kim), Slow Eats (Shannon Bolick). | Enroll as My 4Mlife LLC. The question goes away. | TJ |
| App Review 5.1.3(i) (health data and marketing) | YELLOW | Bars using HealthKit or Motion data for marketing. The [master plan](count-yourself-skinny-master-plan-2026-08-09.md) triggers its funnel card on a "weight-trend milestone." The code doesn't do this today. | Funnel prompts may key only off the yes/no streak or time since install. Never steps, chews or weight. | Claude |
| Individual vs company enrollment | YELLOW | [Apple](https://developer.apple.com/programs/enroll/): individual shows **your legal name** as seller; organization shows the legal entity name, needs D-U-N-S, a website on the domain, a domain email, signing authority. No DBAs. HANDOFF says enroll as My 4Mlife LLC, but **I couldn't confirm a D-U-N-S exists.** Converting later is done by asking [Apple support](https://median.co/blog/how-to-change-your-apple-developer-account-from-individual-to-organization) (third-party guides, "a few days"). [App transfer](https://developer.apple.com/help/app-store-connect/transfer-an-app/overview-of-app-transfer/) also exists and keeps ratings and bundle ID. Timing guides: D-U-N-S about 5 business days, plus about 2 for Apple to see it (unverified). | **Go LLC now.** Individual is faster only if launching this week, and you aren't. It would also put your personal name on a "Skinny" app. Seller line will read My 4Mlife LLC, which is fine. Look up D-U-N-S today. | TJ (30 min) |
| Paperwork: Paid Apps, tax, bank | YELLOW | Nothing started. Nothing can be sold without it. | Accept Paid Apps, W-9, bank, Small Business enrollment, before first sale. | TJ (45 min) |
| Trademark | YELLOW | **Knockout search only, not legal clearance.** [USPTO search](https://tmsearch.uspto.gov) Nov 4: "count yourself skinny" 0 hits; "count yourself thin" 0. Similar marks are all dead: ORGANIZE YOURSELF SKINNY 86320570, COLOR YOURSELF SKINNY 86066154, LAUGH YOURSELF SKINNY 86362038, SIP YOURSELF SKINNY 86736072, LICK YOURSELF SKINNY 75346780. But about 397 live or pending marks contain SKINNY (I reviewed the first 300), including SKINNY MS. 85492088, TRANSFORM YOUR SKINNY 88980258, SKINNY FRIEND 50052161, MORNING SKINNY 99293987. Crowded, so no one owns the word, and neither will you. Common-law use not checked. A single book's title generally can't be registered (from memory, unverified). | Attorney does a one-hour opinion, then files intent-to-use for the app. [$350 per class](https://www.fr.com/news-insights/articles/new-uspto-trademark-fees-go-into-effect-january-18-2025/). | Attorney, after Nov 20 |
| Domain | GREEN | countyourselfskinny.com, .app and .co all show **unregistered** (WHOIS and RDAP, Nov 4). This has been "still open" since September. | **Buy .com and .app today.** About 10 minutes. | TJ |
| Social handles | YELLOW | @countyourselfskinny: TikTok shows "couldn't find this account" and YouTube returns 404, so both look free. Instagram, Facebook, Threads couldn't be checked by script. X limits handles to 15 characters (from memory), so this name can't fit there. | Sign up where it's free, check Instagram by hand, pick a short X name. | TJ (15 min) |
| Name: press and disordered-eating criticism | RED | The combination looks bad to a critic. [NEDA lists excessive chewing among food-ritual warning signs](https://www.nationaleatingdisorders.org/warning-signs-and-symptoms-of-eating-disorders/) (page blocked to my fetcher; confirmed via search listing and [PBS](https://www.pbs.org/perfectillusions/help/warningsigns.html)). Now add a chew count, a fast clock, weigh-ins, and "Skinny." [TikTok blocked #SkinnyTok in 2025](https://www.engadget.com/social-media/tiktok-now-blocks-search-results-for-skinnytok-222836828.html). Your provocation strategy assumes people get mad at the word. They may get mad at the method, and that's a harder fight. | Title stays locked. Lower the risk: rate 18+; show the fasting and eating-disorder caution as a first-run step (today it's small print on the home screen and in About); no before/after images; no chew streak pressure; prepare one answer for the "chew rituals" question, including that the chew count is a pacing cue. Run it by the attorney. | Claude drafts; TJ approves |
| Name: App Store search | YELLOW | Searching "skinny" returns body-editing photo apps, a NZ phone carrier, and "Make Me Thin" ([Apple search](https://itunes.apple.com/search?term=skinny&entity=software&country=us)). Bad neighbors, and nobody finds you on that word. The exact name has no rival. Apple featuring, a master plan pillar, looks unlikely under this name (my judgment). | Listing leads with "Count to 32 / chew counter / no calories." Don't count on featuring. | Claude |
| Market: iPhone + compatible AirPods | YELLOW | CIRP: 44% of US iPhone owners have earbuds and 59% of those use AirPods, about 26% ([MacRumors](https://macrumors.com/2025/07/16/airpods-pro-3-to-turn-around-sales-flatline), [MacTrast](https://www.mactrast.com/2025/07/new-cirp-report-says-apple-needs-airpods-pro-3-to-provide-much-needed-sales-boost/)). Assuming 150M to 170M US iPhone users (no solid source found) and 60% to 80% on compatible models (my guess; 1st and 2nd gen don't work), that's **about 23M to 35M people.** Plenty. The real limit is behavior: who wears earbuds at the dinner table? Unknown, and it caps Pro's conversion. | Measure Pro uses per week after launch. Bite Pacer serves everyone else. | Claude |
| Android gap | YELLOW | Roughly 40% of US phones (unverified) can't get the app, including some book buyers. | Book stays fully usable with no app, as it is now. No Android until proven. | None now |
| Apple copying it | YELLOW | Patents, not products: [chewing detection 2023](https://appleinsider.com/articles/23/01/31/future-iphones-could-listen-for-chewing-and-tell-you-to-diet), [jaw health via AirPods 2026](https://appleworld.today/2026/03/apple-wants-its-airpods-products-to-be-able-to-measure-your-jaw-health/). No announced feature found. Could land in any iOS release. | Treat the counter as marketing. The 32 rule, book and voice are what survive. | None now |
| Rival: Ododok | YELLOW | Free, ships constantly, now has camera mode so it works without AirPods. It removes the earlier claim that only we degrade gracefully. Still no US traction. | Don't compete feature by feature. Compete on the rule, the book, the voice. | TJ's call |
| **Distribution and reach** | RED | 58 contacts. $0 budget. No page. TikTok's [ad policy](https://ads.tiktok.com/help/article/tiktok-ads-policy-weight-management) bars body-ideal and disordered-eating messaging and it [banned fasting-app ads in 2020](https://www.engadget.com/tiktok-body-image-policy-193208999.html) (still in force? unverified). Meta policy not verified. No rival has shown organic demand: the most-rated direct chew app has 7 ratings. | Your daily videos are the test. 3 videos of the live chew demo at launch. Warm list next. Paid ads off the table for now. | TJ + Claude |
| **Funnel to My4MLife** | RED | A link and an email box are buried in About. Apple never gives you a buyer's email, so a paying subscriber isn't a contact. No tap tracking. The main offer, GLP-1, has no checkout yet. | Add tap tracking and a day-30 streak card ("What comes after skinny?"). Email prompt tied to something useful. Measure before believing. | Claude, then Molina decision |
| Economics | YELLOW | Downside is tiny: $99 a year, about 0 running cost. Upside from subscriptions is small: $853 per 10,000 downloads. The profit model's $300K isn't reachable this way. | Treat as attention spend, judged on contacts and books. | TJ's call |
| **TJ's time vs the 20-day blitz** | RED before Nov 20, GREEN after | The [blitz](20-day-revenue-blitz-draft2-2026-11-01.md) says it plainly: nothing new unless it closes money this month. The app won't. A Captain's Table seat is worth about 11,700 $0.99/$4.99 payers. | About 3 hours before Nov 20, fitting the lunch slot and 3:30 block. Everything else waits. | TJ |
| Brand fit | YELLOW | "Skinny" sits oddly with "best mind possible until your last day of life." It fits the mass-market "Lose the belly. Keep your mind." The app's look already stands apart; the seller line and the About link are the only bridges. A "Skinny" controversy could reach a telehealth brand selling GLP-1s. | Keep it separate in look. One bridge line only. Don't feature it on my4mlife.com until after launch reads. | TJ |
| Founder scrutiny | YELLOW | Reporters covering a provocative health app look up the founder. | Have the existing if-asked statement ready before any press push. | TJ + attorney |
| Book dependency | YELLOW | App doesn't technically need the book, but the rule, voice and moat live there. Book isn't listed; 7 yes/no decisions are open in [tj-decisions.md](../book-cys/tj-decisions.md). Two science claims and citations still need a check. A draft cover exists. | 20 minutes of decisions, then KDP. Book first, so the app listing can point to it. | TJ, Claude spot-checks |

## Should this be the point of the spear?

**Not today.** Blunt reasons:
- You've named several front lines in two months: Lead Concepts as "point of the spear" (Sept 8), the magic pill as the "mass-market engine" (Oct 31), Captain's Table as the "main event" (Nov 1), and now this. A spear with four points is a rake.
- It has an unproven core feature, no list, no measured funnel and a free rival with no traction.
- Your Aug 19 directive said CYS must stand alone and the cohort is only upside. A spear to My4MLife is the opposite claim. Both can't drive the plan.

**It can earn the title if, by Jan 31, 2027, all three are true** (thresholds are my judgment):
1. **The count holds:** within 20% for at least 5 people other than you, on real meals.
2. **People come:** at least 1,000 downloads in the first 30 days with no ad spend, or one video that passes 100,000 views.
3. **People cross over:** at least 5% of users leave an email or tap to the assessment, and at least 1 paid My4MLife order traces back to the app.

If it passes, it's a good spear: cheap, demonstrable and memorable. If it fails, keep it as the book's companion and stop investing.

---

## Overall verdict

**Conditional go: launch cheaply at $0.99/$4.99 after Nov 20 for the New Year's window, but it's no-go as the point of the spear until a real-meal test and first-month reach prove it.**

## The 3 things that would kill this

1. **The count doesn't hold** on real meals with real talking, across several people. Then there's no story and nothing worth paying for.
2. **Nobody comes.** The AirPods trick has already been free for four months and hasn't spread. With 58 contacts and no ad budget, your face on video is the only engine.
3. **The name backfires** on the method, not the word: a "chew-counting skinny app is an eating-disorder ritual" story, or a platform block, that splashes onto a telehealth brand.

## Rabbit holes to avoid

- More debate about 49¢ vs 99¢. Decided; it's a 30-second change later.
- Split testing before 2,000 installs a month.
- Android, Apple Watch, Live Activities, streak freeze, meal photos, chasing Ododok's features.
- Earbud brand deals, Apple affiliate, chasing featuring.
- Employer seats, grocery racks, bulk book programs before there's traction.
- A separate LLC for CYS. Do it only if it earns it.
- Machine learning for the detector. Try simple tuning first.
- Icon perfectionism. Pick one and move.
- A third-party subscription service. Apple's reports and PostHog are enough.

## Shortest path to launch

Nov 1, 2026 is a Sunday per the blitz, so Nov 5 is a Thursday and Thanksgiving is Nov 26. All within 10 to 4.

| Date | Step | Who | TJ time |
|---|---|---|---|
| Thu Nov 5, 3:30 block | Say yes to price. Buy domains. Grab free handles. D-U-N-S lookup for My 4Mlife LLC. | TJ | 30 min |
| Fri Nov 6 | Start Apple organization enrollment. Request a D-U-N-S if there isn't one. | TJ | 30 min |
| Nov 5, 6, 8 at lunch | **Real-meal test, three meals** using the [guide](../launch/cys/airpods-test-guide-2026-11-01.md): quiet, talking, TV or music. AirDrop CSVs. | TJ | 30 min install + lunches |
| Nov 9 to 12 | Score and tune. **Gate 1:** within 20% on 2 of 3. | Claude | none |
| By Nov 16 | If two tuning rounds fail: chew counting doesn't ship paid. Stop here, keep book and Bite Pacer only. | Claude reports | 5 min |
| Nov 9 to 20 (evenings) | Claude, on your OK: new prices, free first meal, remove code button, first-run safety note, analytics notice, tap tracking, updated README and test config. | Claude | none |
| Nov 5 to 20 | **Blitz only.** No other CYS work. | TJ | none |
| Sat Nov 21 | Book decisions, KDP upload. Icon. Deploy privacy and support pages through the deploy script. PostHog toggle. If Apple has approved: Paid Apps, tax, bank, Small Business. | TJ + Claude | 2 hrs |
| Mon Nov 23 | Create products. Sandbox purchase test. TestFlight to 5 people with compatible AirPods (mixed sex and age). | TJ + Claude | 1 hr |
| Thu Nov 26 | Testers run it. A Thanksgiving meal is a good stress test. | Testers | none |
| Nov 27 to 30 | Score testers. **Gate 2:** within 20% for most. Film review video. Screenshots and listing. | TJ + Claude | 1.5 hrs |
| Tue Dec 1 | **Submit to Apple.** Apple's stated target: [50% in 24 hours, 90% in 48](https://developer.apple.com/help/app-review/after-submitting-for-review/request-expedited-review). | TJ clicks | 10 min |
| By Tue Dec 8 | Live, allowing one rejection round. CYS landing page goes up, now allowed by the no-coming-soon rule. Attorney's trademark opinion. | Claude, attorney | 30 min |
| Dec 8 to 22 | Warm-list launch. Book v4 with QR page. Apple has warned of [slower reviews Dec 23 to 27](https://9to5mac.com/2022/12/01/app-store-submissions-holiday-season/) in past years, so no updates then. | TJ + Claude | small |
| Fri Jan 1, 2027 | Public push: three chew-demo videos and press pitch. January is when people diet (common knowledge, unchecked). | TJ + Claude | your daily video slot |
| Jan 31, 2027 | **Spear decision** from the three tests above. Start price test if warranted. | TJ | 20 min |

**Total TJ time:** about 3 hours before Nov 20, about 6 hours from Nov 21 through launch.

## What's now wrong in the existing plan docs

| Doc | What it says | Now |
|---|---|---|
| [Profit model](cys-standalone-profit-model-2026-08-19.md) | 400K downloads × 5% × ~$15 = ~$300K | 5% is above the freemium top quartile (4.5%). At 2% and $4.27 that's about $34K. Even at the old prices it's about $123K. |
| Profit model | Book code plus "$14.99/yr lock" | Dead at these prices. |
| Profit model | Employer seats at $12 a year; "$6/employee" offer sheet | Above the consumer price of $4.99. Needs repricing. How to deliver seats through Apple is unverified. |
| [Master plan](count-yourself-skinny-master-plan-2026-08-09.md) | $2.99/$19.99; 1 free month in book; AirPods in a later v1.5; Pro has morning-mode history; Cognito account | Chew counting is in 1.0; no accounts; prices and code as above. |
| Master plan | Funnel card on weight-trend milestone | Conflicts with guideline 5.1.3 caution. Use streak only. |
| [Competitive analysis](cys-competitive-analysis-2026-09-19.md) | Ododok v1.6.1, no camera mode; "none degrade gracefully"; MAD floor; "$7 checkout-aisle book"; "book sells the app" | v1.11.1 with camera and calories. MAD gate was removed from our detector. Book lists at $12.99 proposed and doesn't mention the app. Add Slow Eats ($1.99/$14.99, 126 ratings). |
| [Readiness doc](../book-cys/readiness-2026-10-31.md) and HANDOFF line 11 | "No cover exists" | Draft cover exists at docs/book-cys/cover/. Awaits your approval and KDP spine check. |
| [Full-court press](mass-market-full-court-press-2026-10-31.md) | Kindle $2.99 in week 3; CYS the "traffic engine" | No Kindle file exists (write-in book). Traffic engine is an untested hope until Jan 31. |
| Blitz | "Nothing new gets built unless it closes money this month" | **Still right.** "Point of the spear" talk doesn't override it. |
| App [README](../../apps/count-yourself-skinny-ios/README.md), `ProStore.swift` comment, `.storekit` file | $2.99/$19.99, 7-day trial, book code button | Change if you approve this. Not changed. |
| Earlier advice to you | "Raising is hard, lowering is easy" | Backwards at these prices. |

## What I could not verify

- **No data exists that I could find on 49¢, 99¢ or $1.99 subscription performance.** All of that is extrapolated.
- Live Apple price list ($0.29 floor is from 2022 and secondary coverage). Whether a free 1-year offer code is selectable. Whether Apple sends a routine pre-renewal reminder.
- Whether My 4Mlife LLC has a D-U-N-S, and its exact registered name.
- Current D-U-N-S and enrollment turnaround from Apple itself. Individual-to-organization conversion steps come from third-party guides.
- US iPhone user count and AirPods model split. Press reports present CIRP's figures as US, while CIRP's own post says "iPhone owners" without limiting it, and its model chart wasn't readable. Android share.
- Meta's ad rules (page unavailable). Whether TikTok's 2020 fasting-app ad ban still applies; the current page doesn't mention apps.
- NEDA's own page was blocked to my tool. The wording is confirmed through search listings and mirrors.
- IMChew figures came from a survey paper. I couldn't read the original PDF.
- Instagram, Facebook and Threads handles. Common-law trademark use. Amazon wasn't checked directly for a same-titled book; a web search found none.
- RevenueCat's 2026 page contradicts itself on Health & Fitness plan mix, and its "83.4% annual renewal" figure, quoted in press, doesn't match its own 25% median first annual renewal for H&F. I used the category table.
- Your actual dinner-table behavior question: will people wear earbuds to eat? Only launch can answer it.
