# Push Patch: zero-dollar launch plan (for TJ's review, 2026-10-01)

**Live page:** https://my4mlife.com/go/push-patch ("Stop sticking yourself. Same peptides. No needle. One patch a week.")
**Budget:** $0. No paid ads. **Who does the work:** Claude drafts, builds and measures. TJ approves, posts from his own accounts and spends a few minutes on camera. Nothing gets posted, sent or scheduled without TJ's explicit OK on that item.
**Status:** DRAFT. Once TJ approves, Claude runs the 14-day calendar in section 5 starting Thu 2026-10-01.

---

## 0. Before the first post (Gate 0, Day 1 morning)

| # | Check | Owner | Why |
|---|---|---|---|
| 1 | Real-card test purchase on the live page, then refund it in Stripe | TJ (5 min) | This is still open from 09-30. Don't drive traffic until one real order has gone through checkout, the thank-you page, the order email and fulfillment. |
| 2 | Count the sets on hand per blend | TJ (5 min) | We ship from our own stock first. If a blend has fewer than 3 sets, Claude temporarily turns off its Buy button so we never sell something we can't ship. |
| 3 | Prep and wear instructions in each box | TJ / Genesis | The page FAQ keeps prep neutral. Buyers need Genesis's printed steps (also asked for in the Genesis email). |
| 4 | Build and verify the vanity links (section 4) | Claude | Every post uses them, so they must exist before the first post. Deployed through the existing website deploy script after TJ's OK. |
| 5 | TJ approves the Day-1 assets (section 6) | TJ (20 min) | Gate for everything on Day 1. |

**One honest flag (conversion-first rule):** Genesis's suggested patient price runs $445–$565 a set, and we charge $650/$550. TJ's decision stands ("we offer much more than a product"), but two things follow. First, no post invites price comparison: posts never show the price, and only the page does. Second, the Genesis ask aims at consumers who have no Genesis clinic nearby, not at clinicians who already sell the patch at a lower price. The "match the big boys" option would be to price at or near Genesis's suggested retail and win on convenience (Hims's play). That stays TJ's call. It is not part of this plan.

---

## 1. Positioning and message angles

**Positioning (one paragraph).** The Genesis Push Patch is the needle-free way to run a peptide or NAD+ protocol. It is one single-use patch a week, applied like kinesiology tape and worn for 12 hours, using iontophoresis, a delivery technology used in medicine for decades. It is for two groups: people who already inject and are worn down by the routine, and people who never started because of needles. We sell the delivery story, not the molecule. The molecules and doses live on the page. Every public post leads with "no needle" and "once a week". The one number we quote is the NAD+ exposure figure, always credited: 276% more NAD+ in your system than daily injections (area under the curve, data from Push Patch, LLC).

**Hard copy rules for every asset:** no "treat/cure/heal"; no "absorption" or "bioavailability"; the only multiples we quote are the NAD+ figures (276% vs daily injections, 163% vs a weekly IV), never multiples for BPC-157, KPV or glutathione; no regulatory-approval language; no before/after; no testimonials until real ones exist with written permission; no age ranges; never the "men and women" phrase; no emoji; Dr. TJ is never called a physician and never implied to prescribe (nothing here needs a prescription).

### Angle A: Needle fatigue (people who already inject)
1. Stop sticking yourself.
2. You've done the morning pinch-and-stick long enough.
3. Retire the sharps container.
4. Same peptides. No needle. One patch a week.
5. How many injection sites have you rotated through this year?

### Angle B: Needle fear (people who never started)
1. If needles are the reason you never started, read this.
2. No needle at any step. Not one.
3. Put it on like a strip of tape. That's the whole routine.
4. You don't have to get braver. You need a different delivery.
5. Needle-free means needle-free.

### Angle C: Steady vs. spike (the data-minded)
1. An injection spikes and clears, often in under an hour. The patch keeps delivering for 12.
2. 276% more NAD+ in your system than daily injections. (AUC data, Push Patch, LLC)
3. It's not only how much goes in. It's how long it stays.
4. Seven spikes a week, or one steady 12-hour curve?
5. Total exposure over time is the number that matters, and it's the number we show.

---

## 2. Channels, ranked by expected sales per hour of TJ's time

Estimates for the first 14 days are deliberately conservative. A $650 one-time purchase converts far below a book.

| Rank | Channel | TJ time (14 days) | Claude does | Expected sales (14 days) | Risk |
|---|---|---|---|---|---|
| 1 | **Warm 1:1 messages** (people TJ knows who inject, or who have avoided needles) | 30 min | Drafts 3 text/DM versions; TJ picks names | 2–4 | None |
| 2 | **Genesis co-marketing** | 15 min + one call | Writes the email, the tracked link and a ready-to-forward clinician note | 0–10 (high variance, biggest upside) | Channel conflict on price (see Gate 0) |
| 3 | **Facebook, personal post** | 10 min per post (2 posts) | Writes the posts, watches comments, drafts replies | 1–3 | Low if rules are followed |
| 4 | **Email to the existing list** | 10 min (approve the test send) | Writes the email, builds the send script, test-sends to TJ | 1–3 | Low (list is brain-health, not peptide-native) |
| 5 | **LinkedIn** (consultant angle) | 15 min (3 posts) | Writes posts and the first comment, drafts replies | 0–2, plus clinician and partner leads | Low |
| 6 | **Short video** (one film, four posts: IG Reels, TikTok, YouTube Shorts, FB Reels) | 10 min per video (3 videos) + 15 min account setup | Scripts, shot lists, captions, on-screen text | 0–3; compounds over weeks | Medium (platform enforcement) |
| 7 | **SEO blog posts** (5) | 15 min total review | Writes and builds the posts; deploys after OK | 0 now; long tail from month 2 | None |
| 8 | **Podcasts** | 20 min (approve pitches) + recordings later | List of 20 shows, personalized pitches, sent via Gmail after per-batch OK | 0 now; lag of 3–8 weeks | None |
| 9 | **Facebook groups** | 20 min | Value-first posts tailored to each group's rules | 0–1 | Medium (removal, account limits) |
| 10 | **X** | 5 min | Thread (section 6) | about 0 (no audience) | Low |
| 11 | **Reddit** | 30+ min | Value-first answers only | about 0; useful for learning objections | High (self-promo bans) |

### Channel notes (number = rank)

- **Warm 1:1 (1).** TJ lists 15–25 people (gym friends, colleagues, anyone who has mentioned peptides, NAD+ or hating needles). Claude drafts three versions: injector, never-started, clinician. One personal line plus my4mlife.com/patch/friend. No blasts.
- **Genesis (2).** The only $0 lever that can reach scale. The asks are in email 6.6. A revenue share for referring partners, paid from margin after a sale, costs nothing up front. Genesis clinic cost is $200–$350 a set, so a $50–$100 share still leaves margin. It is TJ's decision and off by default. Each partner gets its own path (/patch/p-name) for tracking.
- **Customer referral offer: none.** All discounts were killed 2026-06-09 (`project_discounts_killed_pre_launch`). The only zero-cost move is to ask: every post and email ends with "send this to someone who comes to mind."
- **Facebook (3, 9).** Personal profile, story first, link in the post (the format that sold 48 books). Claude drafts same-day replies to comments. Groups: only ones TJ already belongs to whose rules allow sharing, at most 1–2 a week, value-first, never the same text twice.
- **Email (4).** A one-off send script in `infra/scripts/` using the existing Mailgun setup: dry run, test send to TJ, then the real send on TJ's "send". Before sending, Claude checks the list count, Mailgun's daily limit (batching if needed), email opt-in, and the unsubscribe link and mailing address. Links go to the page, never Amazon.
- **LinkedIn (5).** Consultant voice, with the Genesis role disclosed, aimed at clinicians, gym and med-spa owners, and operators. Link in the first comment.
- **Short video (6).** Faceless; TJ films in under 10 minutes and one film posts to four places. TJ creates the My4MLife IG, TikTok and YouTube accounts (Claude can't create accounts), never named to look like Push Patch, LLC or Genesis. If TikTok withholds the bio link, say and show "my4mlife.com/patch" in every video.
- **SEO (7).** The landing page is `noindex` on purpose, so blog posts carry search. Five posts in `website/src/pages/blog/`, each with one link to the page (`utm_source=blog&utm_content=<slug>`):

| Slug | Target query | Angle |
|---|---|---|
| `/blog/needle-free-peptides` | needle-free peptides | How iontophoresis patches work, and who they suit |
| `/blog/bpc-157-without-injections` | BPC-157 without injections | Delivery options compared on method only, with no BPC multiples |
| `/blog/nad-patch-vs-injection` | NAD+ patch vs injection | Delivery curves and AUC; the 276% and 163% figures, credited |
| `/blog/needle-fatigue` | needle fatigue | Why people drop injectable routines |
| `/blog/afraid-of-needles-peptides` | afraid of needles peptides | Starting with no needle at any step |

- **Podcasts (8).** Angle: "The needle is the weakest link in peptide protocols", with the Genesis role disclosed. Claude verifies 20 active shows and their booking contacts. Tier B: Jay Campbell, Mark Bell's Power Project, Muscle Intelligence, Ben Greenfield Life, The Human Upgrade. Tier C (more likely to say yes): strength and CrossFit coach shows, functional-medicine, chiropractic and regenerative-medicine shows, med-spa industry (B2B), midlife health. Sent from drtj@my4mlife.com via Gmail, with TJ's OK on each batch.
- **X (10).** Post the thread once. No ongoing effort.
- **Reddit (11).** Peptide subreddits typically ban vendor posts, and new accounts that drop links get shadowbanned. Only if TJ has an account with real history: honest, disclosed answers to "is there a non-injection option?", with links only where the rules allow. Otherwise, read it for objections only.
- **Network.** *Beasley:* one ask to share the Facebook post. *Sinicropi: hold.* The agreed strategy decouples Sinicropi follow-up from Genesis, and a Genesis product pitch would undercut the speaker goal. *Lead Concepts: not for this product.* That audience belongs to the Uninsured Decade. Don't spend the relationship on a $650 patch.

---

## 3. Platform risk: how to post without getting restricted

**What the platforms enforce (verify against current policy pages before Day 1; Claude does this as part of Gate 0):**

| Platform | What gets content removed or accounts limited | Our posture |
|---|---|---|
| Facebook / Instagram (Meta) | Community Standards on restricted goods: content that tries to buy or sell pharmaceutical or drug-like products ("DM me for price", compound plus price, "selling"). Commerce policies bar these products from Marketplace and Shops. Ads in this category are heavily restricted, which doesn't matter because we run none. | Lead with the delivery story; no compound names except NAD+; no price; no "DM to buy"; link to the page. |
| TikTok | Guidelines on regulated goods and commercial activity, plus health misinformation; drug and injection imagery is often suppressed or removed. | Never show a needle or syringe in use; product and patch only; no compound names on screen; no health claims; use only the platform's commercial-use audio. |
| LinkedIn | Policies on sale of regulated goods; hard-sell posts get low reach. | Professional and educational framing; link in the first comment; disclose the Genesis consulting role. |
| X | Organic is permissive. | Same copy rules anyway. |
| Reddit | Sitewide self-promotion norms plus subreddit rules; new accounts that drop links get shadowbanned. | Value-first answers only, disclosed, links only where allowed. |
| YouTube Shorts | Medical misinformation and regulated-goods policies. | Same as TikTok. |

**Phrasing rules for organic posts**
1. Lead with "no needle, once a week". The word "peptides" is fine as a category word in a story. Compound names (BPC-157, TB-500, KPV, MOTS-c, GHK-Cu) stay on the landing page. NAD+ may appear in posts because it's widely sold as a supplement and is the only figure we quote.
2. No prices and no "buy now / DM me / link to order" in Meta or TikTok posts. "Take a look" plus the link is enough.
3. No health claims: no "helps you recover", no "gives you energy". Describe the delivery, not results.
4. No before/after, no body-transformation shots, no needles in use.
5. Disclose the connection every time: "I consult for Genesis Regenerative" or "We carry it at My4MLife." FTC endorsement rules apply, and the same goes for any partner who shares for a revenue share.
6. Protect the accounts that matter. TJ's Facebook profile and LinkedIn carry years of trust. Never risk them on group spam: one or two groups a week at most.
7. **Kill switch.** If any post is removed or any account gets a warning, stop sales posts on that platform for 7 days. Claude rewrites the asset to describe delivery only and TJ re-approves it.

---

## 4. Measurement

**UTM convention:** `utm_campaign=push-patch-launch` on everything. `utm_source` = platform or partner. `utm_medium` = `social | email | partner | referral | audio | organic | qr`. `utm_content` = the specific asset when one source has several (e.g. `email-1`).

**Vanity paths (Claude builds as redirects in `website/astro.config.mjs` `redirects`, deployed with the existing website deploy script after TJ's OK).** PostHog picks up the UTMs automatically on the landing pageview.

| Vanity path | Use | Redirects to |
|---|---|---|
| my4mlife.com/patch | Spoken or on screen in videos, bios | `/go/push-patch?utm_source=video&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/fb | Facebook posts | `/go/push-patch?utm_source=facebook&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/fbg | Facebook groups | `/go/push-patch?utm_source=facebook-groups&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/li | LinkedIn | `/go/push-patch?utm_source=linkedin&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/ig | Instagram bio and stories | `/go/push-patch?utm_source=instagram&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/tt | TikTok bio | `/go/push-patch?utm_source=tiktok&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/yt | YouTube Shorts | `/go/push-patch?utm_source=youtube&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/x | X thread | `/go/push-patch?utm_source=x&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/r | Reddit (where allowed) | `/go/push-patch?utm_source=reddit&utm_medium=social&utm_campaign=push-patch-launch` |
| /patch/friend | TJ's 1:1 texts and DMs | `/go/push-patch?utm_source=network&utm_medium=referral&utm_campaign=push-patch-launch` |
| /patch/genesis | Genesis channels | `/go/push-patch?utm_source=genesis&utm_medium=partner&utm_campaign=push-patch-launch` |
| /patch/pod | Podcast show notes and mentions | `/go/push-patch?utm_source=podcast&utm_medium=audio&utm_campaign=push-patch-launch` |
| /patch/qr | Printed QR (talks, cards) | `/go/push-patch?utm_source=qr&utm_medium=qr&utm_campaign=push-patch-launch` |

**Email links** (not typed, so they use full URLs): `https://my4mlife.com/go/push-patch?utm_source=email&utm_medium=email&utm_campaign=push-patch-launch&utm_content=email-1` (then `email-2`).
**Blog links:** `...?utm_source=blog&utm_medium=organic&utm_campaign=push-patch-launch&utm_content=<slug>`.

**Small build to close the loop (Claude, Day 2, after TJ's OK):** pass the visitor's UTM source into the Stripe Checkout session metadata, so every Stripe payment shows its channel even if PostHog misses it (ad blockers). This is a small change to the checkout call and the existing `create-checkout-session` lambda, which stays under 100 lines, tested before deploy.

**Weekly scorecard (Claude posts it to TJ every Wednesday):**

| Channel | LP views (`lp_patch_view`) | Checkout clicks (`lp_patch_checkout`) | Purchases (`lp_patch_purchase` + Stripe) | Revenue | TJ minutes | Sales per TJ hour |
|---|---|---|---|---|---|---|
| (one row per utm_source) | | | | | | |

**Targets (all channels combined):**

| Week | Dates | LP views | Checkout clicks (~5%) | Purchases | Revenue (approx.) |
|---|---|---|---|---|---|
| 1 | Oct 1–7 | 400 | 20 | 3 | $1,950 |
| 2 | Oct 8–14 | 600 | 30 | 5 | $3,250 |
| 3 | Oct 15–21 | 800 | 40 | 6 | $3,900 |
| 4 | Oct 22–28 | 1,000 | 50 | 8 | $5,200 |
| **Total** | | **2,800** | **140** | **22** | **~$14,300** |

**How to read the numbers:**
- Views low, everything else healthy: a distribution problem. Push Genesis and add more 1:1 messages.
- View-to-click below 2% after 300+ views: a page problem. Test the hero and the order of blends.
- Click-to-purchase below 15%: a checkout or price-shock problem. Revisit the price flag in Gate 0.

Reality check against the $1M target: organic alone won't get there. The scale lever is Genesis distribution, and these four weeks exist to prove the page converts so Genesis will push it.

---

## 5. 14-day calendar (Day 1 = Thu 2026-10-01)

"Gate" = what TJ must approve before it goes out. Claude never posts or sends on its own.

| Day | Date | Channel | Asset | TJ (min) | Claude | Gate |
|---|---|---|---|---|---|---|
| 1 | Thu 10/01 | Setup, Facebook, LinkedIn, Genesis | Gate 0; FB post 1; LI post 1 + first comment; Genesis email | 50 | Builds vanity links, verifies UTMs, makes the QR, finalizes assets, drafts comment replies | TJ OKs the plan, assets and deploy; TJ posts and sends |
| 2 | Fri 10/02 | Email, X | Email 1 to the list; X thread | 10 | Send script, dry run, test send to TJ; UTM-to-Stripe metadata build | TJ OKs the test email, then says "send"; TJ posts the thread |
| 3 | Sat 10/03 | Video | Account setup (IG, TikTok, YT); film Reel 1; post to 4 places | 25 | Script, shot list, captions, on-screen text | TJ OKs the final cut before posting |
| 4 | Sun 10/04 | 1:1 network | List 15–25 names; send personal texts | 30 | Three message versions; tracks replies | TJ sends each message himself |
| 5 | Mon 10/05 | Podcasts, SEO | Pitch batch 1 (10 shows); blog post 1 drafted | 15 | Verified show list and pitches; builds `/blog/needle-free-peptides` | TJ OKs the batch (Gmail connector) and the post deploy |
| 6 | Tue 10/06 | LinkedIn, Beasley | LI post 2 ("the needle is an adherence problem"); ask Randall to share the FB post | 10 | Writes post 2 and the Beasley text | TJ posts and sends |
| 7 | Wed 10/07 | Video, scorecard | Reel 2 (Angle B); Week-1 scorecard | 15 | Script; pulls PostHog and Stripe; recommends what to double down on | TJ OKs the cut; reviews the scorecard |
| 8 | Thu 10/08 | Email | Email 2 (Angle B: never started because of needles) | 5 | Writes, test-sends | TJ OKs, then "send" |
| 9 | Fri 10/09 | Facebook | FB post 2 (Angle B, or a real buyer question answered, with permission) | 10 | Writes it; drafts replies | TJ posts |
| 10 | Sat 10/10 | Facebook groups, SEO | 1–2 value-first group posts; blog posts 2 and 3 | 15 | Checks group rules, tailors posts; builds 2 posts | TJ posts; OKs the deploy |
| 11 | Sun 10/11 | Video, Reddit (optional) | Reel 3 (Angle C, steady vs. spike); Reddit answers only if TJ has an aged account | 20 | Script; finds relevant threads; drafts disclosed answers | TJ OKs the cut and each answer |
| 12 | Mon 10/12 | Podcasts, Genesis | Pitch batch 2 (10 shows) and follow-ups; Genesis follow-up if no reply | 10 | Drafts both | TJ OKs and sends |
| 13 | Tue 10/13 | LinkedIn, SEO | LI post 3 ("what AUC means, in plain language"); blog posts 4 and 5 | 15 | Writes and builds | TJ posts; OKs the deploy |
| 14 | Wed 10/14 | Scorecard, plan | Week-2 scorecard; plan for weeks 3–4 (cut the bottom 3 channels, double the top 2) | 15 | Analysis and the revised plan | TJ decides |

**TJ total: about 4 hours across 14 days.**

---

## 6. Ready-to-post Day-1 assets

*Truth check: each asset speaks in TJ's first person. Before posting, TJ confirms that every first-person statement matches his own experience. If a line isn't true for him, Claude rewrites it. Nothing is invented.*

### 6.1 Facebook post (TJ's personal profile; link in the post)

> I want to tell you about something I've been waiting to be able to share.
>
> Over 30 years in clinical practice, I've had the same conversation more times than I can count. Someone does the reading, gets interested in peptides or NAD+, and then it all stops at one word: needles.
>
> Some of them never start. Others start, and a few months in they're worn down by the routine. Pinching skin first thing in the morning. Rotating sites. A sharps container on the bathroom shelf. Packing syringes for every trip.
>
> So when I started working with the team at Genesis Regenerative on something called the Push Patch, I paid attention.
>
> It's a patch. You put it on like a strip of kinesiology tape, wear it for 12 hours, and that's it for the week. No needle at any step. It uses iontophoresis, a small electrical charge that moves the blend through the skin. Iontophoresis has been used in medicine for decades. What's new is a wearable patch you use once a week.
>
> The part that caught my eye is the delivery curve. An injection spikes and clears, often in under an hour. The patch keeps delivering for 12. In data from Push Patch, LLC, total NAD+ in your system over time was 276% higher with the patch than with daily injections.
>
> We're carrying it at My4MLife now. Seven blends, six patches each, six weeks.
>
> If you've been injecting and you're tired of it, or if needles are the reason you never started, take a look:
> my4mlife.com/patch/fb
>
> And if someone comes to mind who'd want to know about this, please send it to them. That's how the book found its readers, and I'm grateful every time.
>
> Dr. TJ

### 6.2 LinkedIn post (link in the first comment)

> The biggest problem in peptide protocols might not be the molecule. It might be the needle.
>
> I consult for Genesis Regenerative, and lately I've been looking hard at one question: why do so many people who start an injectable protocol stop?
>
> The answers I hear are rarely about the science. They're about the routine. The morning stick. Site rotation. Bruising. Sharps containers. Traveling with syringes. And there's a large group who never start at all because they won't use a needle.
>
> That's a delivery problem, not a compound problem. Delivery is where the Push Patch gets interesting:
>
> - Iontophoresis: a small electrical charge moves charged molecules through the skin. It's an established technology, used in medicine for decades, now in a wearable, single-use patch.
> - One patch a week, worn for 12 hours.
> - Steady release instead of a spike. In area-under-the-curve data from Push Patch, LLC, total NAD+ exposure was 276% higher than with daily injections and 163% higher than with a weekly IV.
>
> If you're a clinician, a gym owner, or anyone who works with people on peptide protocols, here's a question worth asking: how many of your people are quietly skipping doses because of the needle?
>
> We've made the Push Patch available at My4MLife with one-click ordering. Link in the first comment.
>
> For those of you who work in this space: is needle fatigue something you see?

**First comment (TJ posts immediately after):**
> The page, with all seven blends and the delivery data: https://my4mlife.com/patch/li

### 6.3 X thread (6 posts)

> **1/** Stop sticking yourself. A short thread on why the needle may be the weakest link in peptide protocols, and what a once-a-week patch changes.
>
> **2/** Most people who quit an injectable protocol don't quit over the science. They quit over the routine: the morning stick, rotating sites, bruises, the sharps container, flying with syringes.
>
> **3/** And a lot of people never start at all, for one reason: needles.
>
> **4/** The Push Patch uses iontophoresis: a small electrical charge moves the blend through the skin. Used in medicine for decades. Now in a single-use patch you wear for 12 hours, once a week.
>
> **5/** The delivery curve matters. An injection spikes and clears, often in under an hour. The patch keeps delivering for 12. In AUC data from Push Patch, LLC: 276% more NAD+ in your system than daily injections.
>
> **6/** Seven blends, six patches each, six weeks. No needle at any step. Details and data: my4mlife.com/patch/x
> Disclosure: I consult for Genesis Regenerative, and My4MLife sells the patch.

### 6.4 Instagram caption + 30-second Reel (faceless)

**Caption:**
> Stop sticking yourself.
>
> Same peptides. No needle. One patch a week.
>
> The Push Patch goes on like a strip of tape, delivers for 12 hours, and that's your week done. No syringes, no sharps container, no bracing for the morning stick.
>
> Never started because of needles? There's no needle at any step.
>
> Details: link in bio, or my4mlife.com/patch
>
> We carry the Genesis Push Patch at My4MLife.
>
> #needlefree #needlefatigue #weeklyroutine

**Reel script (30 seconds).** Film vertically in good window light. Use a real patch from stock for the application shot, never a stand-in. No needles or syringes on camera. Voiceover is optional (TJ reads the VO lines); otherwise text-only with commercial-use audio from the app.

| Time | Shot (phone, vertical) | On-screen text | Voiceover (optional) |
|---|---|---|---|
| 0–3s | Close-up: a hand closes a bathroom cabinet door | **Stop sticking yourself.** | "Stop sticking yourself." |
| 3–8s | A Push Patch pouch set down on a clean counter | Same peptides. No needle. | "Same peptides. No needle." |
| 8–15s | Hands smooth the patch onto an upper arm, like tape (phone propped on a shelf) | One patch. Once a week. Worn 12 hours. | "One patch a week. You wear it for 12 hours." |
| 15–22s | Laptop showing the page's injection-vs-patch curve graphic, slow push-in | An injection spikes and clears. The patch keeps delivering for 12 hours. | "An injection spikes and clears. The patch keeps going for 12 hours." |
| 22–27s | Laptop or phone showing the page's 276% badge | 276% more NAD+ in your system than daily injections* / *AUC data, Push Patch, LLC | "The numbers are on the page." |
| 27–30s | The pouch on the counter, hand taps it once | my4mlife.com/patch | "my4mlife.com/patch" |

**Filming checklist (under 10 minutes):** 6 clips, 3–7 seconds each, phone vertical, no faces needed, no mirror reflections showing the room, no visible prescription bottles or syringes in frame. Claude adds the text and assembles it if TJ sends the raw clips, or TJ uses the app's text tool by following the table.

### 6.5 Email to the existing list (sent only after TJ approves the test send)

**Subject:** Stop sticking yourself
**Alternate subject (Email 2 or a re-send):** Never started because of needles?
**Preview text:** Same peptides. No needle. One patch a week.

> Hi {first_name},
>
> Over the years, a lot of people have told me they're curious about peptides or NAD+, and then said the same thing: "I'm not doing needles."
>
> Fair enough. Now you may not have to.
>
> We're carrying the Genesis Push Patch at My4MLife:
>
> - **No needle at any step.** You prepare the pad, apply the patch like a strip of kinesiology tape, and wear it.
> - **One patch a week, worn for 12 hours.** Six patches, six weeks.
> - **Steady, not a spike.** An injection spikes and clears, often in under an hour. The patch keeps delivering for 12. In data from Push Patch, LLC, total NAD+ in your system over time was 276% higher than with daily injections.
>
> There are seven blends. The page shows exactly what's in each one, and checkout takes about a minute (Apple Pay, Google Pay, card, Klarna or Affirm).
>
> **[See the seven blends]** → https://my4mlife.com/go/push-patch?utm_source=email&utm_medium=email&utm_campaign=push-patch-launch&utm_content=email-1
>
> If you already inject and you're tired of it, this was made for you. If you know someone who is, forward this to them.
>
> Dr. TJ
>
> ---
> *Don't lose your identity and your dignity while you still have a choice.*
>
> My4MLife · my4mlife.com · [mailing address, filled in by Claude from the existing email footer] · [Unsubscribe]
>
> These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person. Dr. TJ speaks as a health-span educator and does not provide medical care through this platform. All sales are final.

### 6.6 Email to Genesis proposing co-marketing (TJ sends from his own mailbox, or Claude sends via the Gmail connector after TJ's OK)

**To:** [TJ's Genesis contact]
**Subject:** Push Patch is live on My4MLife: co-marketing proposal

> Hi [Name],
>
> A quick update and a proposal.
>
> The Push Patch page is live: https://my4mlife.com/go/push-patch. One page, seven blends, one-click checkout (Apple Pay, Google Pay, card, Klarna, Affirm). It leads with the needle-free story and the Push Patch, LLC AUC data (NAD+ figures only, credited).
>
> We're launching this week with zero ad spend: my Facebook and LinkedIn, our email list, short-form video and search content. To reach the scale we've talked about, the biggest lever is your reach. Four specific asks:
>
> 1. **Feature the page to consumers who don't have a Genesis clinic nearby:** a mention on your site, in your email and on your social channels. We'll give you a tracked link (my4mlife.com/patch/genesis) so you can see exactly what it drives.
> 2. **Route direct-to-consumer inquiries** you can't serve through a clinic to that link.
> 3. **A short written OK** for the assets we're using (the NAD+ AUC figures, the product and pouch photos), so it's on file.
> 4. **The exact prep and wear instructions** that ship in each kit, and a rough timeline for drop-ship to take over as volume grows.
>
> I'd also welcome 20 minutes this week to talk about two things: a referral arrangement for clinicians who don't stock the patch, and how we bring RPA to market next using the same playbook once this one has proven out.
>
> Thanks,
> Dr. TJ
> My4MLife · my4mlife.com

---

## 7. Decisions TJ makes on review (yes/no)

| # | Decision | Default if TJ says nothing |
|---|---|---|
| 1 | Approve the plan and the Day-1 assets as written | Nothing posts |
| 2 | Approve building the /patch vanity links and deploying | Posts use full UTM links instead |
| 3 | Approve the UTM-to-Stripe metadata build (Day 2) | PostHog-only attribution |
| 4 | Partner/clinician revenue share: yes, and how much? | Off; the Genesis email only opens the conversation |
| 5 | Create IG, TikTok and YouTube accounts for My4MLife (TJ creates them) | Video channel skipped |
| 6 | Reddit: does TJ have an aged account? | Skip Reddit |
| 7 | Revisit the price gap vs. Genesis's suggested retail ($445–$565) | Price stays $650/$550 |
