# Day-1 content pack: "Lose the belly. Keep your mind." (2026-10-31)
_Drafted 2026-10-31 for TJ to review. Source plan: `docs/plan/mass-market-full-court-press-2026-10-31.md` (§2 front door, §4 vanity map, §6 reach, §7 Day-1 orders). Nothing here has been posted, texted or sent. Post and text from your own accounts and your own phone._

**The idea in one line:** Let's give people what they want, then help them keep it. Lead with the belly, the face, the energy, the bedroom, the name you just forgot. The brain protection rides along underneath.

## Facts used everywhere (check these before you post)

| Fact | Where it comes from |
|---|---|
| GLP-1 price wording, always exactly: "brand-name medication direct from the manufacturer at cash prices starting around $149/month for the starting-dose pill (varies by drug and dose)", always with "if your physician prescribes it" | Plan §3 + `/go/lose-the-belly` cost block ("Prices verified October 2026") |
| The first step is a **free 10-minute call** with a care coordinator. No card, no obligation. A licensed physician in our network reviews the case. | `/go/lose-the-belly` "How it works"; site is in coordinator mode (every path goes to the free call) |
| The **free Brain Check** is at my4mlife.com/assessment: 20 questions, about 7 minutes, top 3 priorities on screen, full results by email | `website/src/pages/assessment.astro` |
| Count Yourself Skinny method: 32 chews per bite, fork down; 12 overnight hours to start (climbing to 14 to 16); last bite 3 hours before bed; steps with a 2,500 floor, 8,000 to 10,000 goal; 10 minutes of outdoor morning light within an hour of waking; 7 hours of sleep, 7 nights a week; protein first (30 to 40 g) when you break the fast | `docs/book-cys/draft/_MASTER.md`, "The Counts on One Page" + Ch. 11 |
| Chewing trial: chewing 50% more meant about 10% less food at that meal; doubling chews meant about 15% less (Iowa State randomized trial) | CYS Ch. 2 + "The Science, Briefly" |
| Walking benefits start around 2,500 steps a day (pooled analysis of more than 225,000 adults); "10,000 steps" began as a 1960s Japanese pedometer slogan | CYS Ch. 4 |
| Morning light: people who get it fall asleep faster at night (up to half an hour faster) | CYS Ch. 5 |
| Push Patch: iontophoresis (small electrical charge through the skin), one patch a week, worn 12 hours, six patches per set (six weeks), no needle, one-time purchase, not a subscription. A licensed physician in our network reviews every order; it ships only if your physician prescribes it. Not cleared? Full refund. Final once shipped. | `website/src/pages/go/push-patch.astro` |
| Push Patch prices on the page today: Enhanced Glow $650, Glutathione Radiance $550, Metabolic $795, NAD+ Restore $700, Wolverine $650, Repair $650, Calm Gut $650. **The October promo code has expired; no code or discount appears anywhere in this pack.** Prices stay out of social posts and texts (same rule as the earlier Push Patch social copy); use them in DMs and replies. | `website/src/data/pushPatch.ts` |
| Enhanced Glow: our highest-GHK-Cu blend, which "may help support skin appearance and tissue quality." Glutathione Radiance: "may help support skin quality." | Per-blend lines on `/go/push-patch` |
| Medicare pays $0 toward custodial care. A private nursing-home room runs $129,575 a year (CareScout 2025); memory care about $96,000 a year (SeniorLiving.org 2026). | `/go/uninsured-decade` + `docs/book-uninsured-decade/draft/_MASTER.md` sources |
| Your gut makes about 90% of your body's serotonin | Gut-brain axis canonical talking points (locked 2026-05-20) |
| ED often shows up before heart trouble because the penile arteries are smaller than the coronary arteries, so narrowing shows there first | ED canary thesis (locked 2026-05-08); standard cardiology teaching |

**UTM pattern (every link):** `utm_source=<platform>&utm_medium=<social|personal|qr>&utm_campaign=lose-the-belly&utm_content=<slug>`. In the video scripts, `{platform}` is a placeholder: swap in `facebook`, `instagram`, `tiktok`, `youtube` or `linkedin` for each upload of the same recording.

---

## 1. Thirty hooks

_One line each. Use as the first 3 seconds of a video or the first line of a post. Where a hook implies a result, the post or video carries "results vary."_

### Belly / jeans (5)
1. Your waistband knows something your bathroom scale doesn't.
2. I stopped counting calories and started counting to 32.
3. The belly fat you can't lose is the fat your brain pays for.
4. You don't need insurance to get a GLP-1 if your physician prescribes it. Here's what it actually costs.
5. 10,000 steps was a pedometer slogan from the 1960s. Here's the real number.

### Glow / skin (4)
6. The glow your friends ask about doesn't come out of a jar.
7. Copper peptides for your skin, one patch a week, no needle.
8. People can see a bad night's sleep on your face. Researchers have tested it.
9. Before you buy another serum, ask what's going on under the skin.

### Energy (4)
10. Your 3 p.m. crash might have started at breakfast.
11. Ten minutes outside before your coffee. The cheapest energy fix I know.
12. NAD+ without the IV chair and without the needle.
13. Tired isn't a personality trait. It's a signal.

### Bedroom (4, sex-specific)
14. **(Men)** ED isn't a bedroom problem. It's often the first warning light on the dashboard.
15. **(Men)** Guys: the arteries in the bedroom are smaller than the ones in your heart. They tend to show trouble first.
16. **(Women)** Menopause brain fog is real, and you don't have to just ride it out.
17. **(Women)** Painful sex after menopause is common, and it's treatable.

### Bloat / flat stomach (3)
18. Bloated by 3 p.m.? Count your chews at lunch.
19. Your bloat isn't just a stomach problem. Your gut makes about 90% of your serotonin.
20. Probiotics didn't fix your bloat? Here's what nobody tells you.

### Sleep / eye bags (3)
21. The best eye cream I know is a bedtime alarm.
22. Finish dinner three hours before bed and pay attention to tomorrow morning.
23. Your brain takes out the trash while you sleep. Short nights leave it on the curb.

### Sharpness / never blank on a name (4)
24. Ever blanked on the name of someone you've known for ten years? Let's talk about that.
25. Alzheimer's is a disease of middle age that shows up when we're older.
26. Want to be the sharpest person in the room? Start with your waistline.
27. Your brain is getting older at its own speed. The free Brain Check shows you where you stand.

### Money / parents' care (3)
28. Medicare pays $0 toward Mom's custodial care. Did you know that?
29. A private nursing-home room runs $129,575 a year. Who's paying for yours?
30. Your parents' long-term care plan is probably you.

---

## 2. Ten vertical-video scripts for Dr. TJ

_Phone, vertical, one take, no editing. Each script runs about 30 to 60 seconds spoken. The link goes in the caption (and the bio on Instagram and TikTok), never spoken as a URL. The "Day [X]" scripts are only for things you are actually doing: fill in your real day number and say only what has actually happened to you. The formats rotate: "What nobody tells you" (4), "Day X of my own" (3), myth vs. truth (3)._

### Script 1: What nobody tells you about GLP-1s
**Slug:** `nobody-glp1-muscle` · **Format:** What nobody tells you
- **Hook (0:00 to 0:03):** "Here's what nobody tells you about GLP-1s." _[on screen: "What nobody tells you about GLP-1s"]_
- **Say:** "Some of the weight you lose on one can be muscle, and muscle is what keeps you strong and keeps your metabolism working. So our plan pairs the medication, if your physician prescribes it, with protein first, thirty to forty grams when you break your fast, and a daily walk. Lose the belly, keep the muscle, keep your mind. Results vary."
- **CTA:** "The first call is free. Link's below." _[on screen: "Free 10-minute call"]_
- **Caption:** Some of the weight lost on a GLP-1 can be muscle. Our plan pairs medication (if your physician prescribes it) with protein first and a daily walk. Results vary. Free 10-minute call:
  https://my4mlife.com/go/lose-the-belly?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=nobody-glp1-muscle

### Script 2: Day X of my own Count Yourself Skinny (the 32)
**Slug:** `day-x-chew-32` · **Format:** Day X of my own
- **Hook:** "Day [X] of my own Count Yourself Skinny, and the whole trick fits on a fork." _[on screen: "Day [X]: count to 32"]_ _(hold up a fork, put it down on the table)_
- **Say:** "I'm 59, and every bite I take, the fork goes down and I chew thirty-two times. In a randomized trial at Iowa State, people who chewed fifty percent more ate about ten percent less at that meal, and people who doubled their chews ate about fifteen percent less, same food, nobody told to eat less. [One honest sentence about what you've noticed so far.] Results vary."
- **CTA:** "If you want the whole method, plus a physician in the loop, link's below."
- **Caption:** Day [X]. Fork down, 32 chews per bite. Chewing trial results from Iowa State; your results vary. The method plus a free 10-minute call:
  https://my4mlife.com/go/lose-the-belly?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=day-x-chew-32

### Script 3: Myth vs. truth: you need insurance for a GLP-1
**Slug:** `myth-glp1-insurance` · **Format:** Myth vs. truth
- **Hook:** "Myth: you need great insurance to get a GLP-1." _[on screen: "MYTH: you need insurance"]_
- **Say:** "Truth: if your physician prescribes it, you can buy brand-name medication direct from the manufacturer at cash prices starting around $149/month for the starting-dose pill (varies by drug and dose). No insurance needed. And finding out if you're a candidate costs you nothing: a free ten-minute call, and a licensed physician in our network reviews your case."
- **CTA:** "Link's below. No card." _[on screen: "TRUTH: no insurance needed, if your physician prescribes it"]_
- **Caption:** If your physician prescribes it: brand-name medication direct from the manufacturer at cash prices starting around $149/month for the starting-dose pill (varies by drug and dose). The call is free:
  https://my4mlife.com/go/lose-the-belly?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=myth-glp1-insurance

### Script 4: What nobody tells you about belly fat
**Slug:** `nobody-belly-fat` · **Format:** What nobody tells you
- **Hook:** "What nobody tells you about belly fat: it isn't just sitting there." _[on screen: "Belly fat isn't just storage"]_
- **Say:** "The deep fat packed around your organs acts like a gland and sends out inflammation all day long. That inflammation pushes your blood sugar up, and high blood sugar over the years raises the risk of cognitive decline. So when you lose the belly, you're not just fitting the jeans, you're taking pressure off your brain."
- **CTA:** "Lose the belly, keep your mind. The free call is linked below."
- **Caption:** Visceral fat sends out inflammation all day, and the brain pays for it. Free 10-minute call, a licensed physician in our network in the loop. Results vary:
  https://my4mlife.com/go/lose-the-belly?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=nobody-belly-fat

### Script 5: Day X of my own morning walk
**Slug:** `day-x-morning-walk` · **Format:** Day X of my own _(film it outside, on the walk)_
- **Hook:** "Day [X] of my morning walk, and this one walk checks five boxes." _[on screen: "One walk. Five boxes."]_
- **Say:** "Out the door within an hour of waking, twenty to thirty minutes, before breakfast: that's my steps, my ten minutes of morning light, a longer overnight fast, and it sets up tonight's sleep. And forget 10,000 steps; that started as a pedometer slogan, and a pooled analysis of more than 225,000 adults found the benefits start around 2,500 a day. Then I walk in and eat protein first."
- **CTA:** "Want to know which of these your brain needs most? Take the free Brain Check, link below."
- **Caption:** Day [X]. One morning walk: steps, light, a longer fast, tonight's sleep. Benefits start around 2,500 steps a day. Free Brain Check (about 7 minutes):
  https://my4mlife.com/assessment?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=day-x-morning-walk

### Script 6: Myth vs. truth: ED is a bedroom problem (men)
**Slug:** `myth-ed-bedroom` · **Format:** Myth vs. truth
- **Hook:** "Guys. Myth: ED is a bedroom problem." _[on screen: "MYTH: ED is a bedroom problem"]_
- **Say:** "Truth: it's often a blood-vessel problem, and the arteries down there are smaller than the ones in your heart, so they tend to show trouble first, often years before your heart does. Sometimes it's hormones too, like low testosterone. Either way, it's worth a real look from a licensed physician in our network, and treatment only if your physician prescribes it."
- **CTA:** "Start with the free Brain Check. Link's below."
- **Caption:** ED is often the first warning light, not the whole problem. Free Brain Check (about 7 minutes), then a free call if you want one. Treatment only if your physician prescribes it:
  https://my4mlife.com/assessment?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=myth-ed-bedroom

### Script 7: What nobody tells you about bloat
**Slug:** `nobody-bloat` · **Format:** What nobody tells you
- **Hook:** "What nobody tells you about bloat." _[on screen: "Your gut makes about 90% of your serotonin"]_
- **Say:** "Your gut makes about ninety percent of your body's serotonin, so an unhappy gut can show up in your mood and your focus, not just your waistband. Before you buy another probiotic, try two free things: chew every bite thirty-two times with the fork down, and give your gut twelve hours off overnight. Results vary."
- **CTA:** "Then take the free Brain Check and see where your gut lands. Link below."
- **Caption:** Your gut makes about 90% of your serotonin. Two free things to try first: 32 chews per bite, 12 hours overnight. Results vary. Free Brain Check:
  https://my4mlife.com/assessment?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=nobody-bloat

### Script 8: Day X of my own Push Patch
**Slug:** `day-x-push-patch` · **Format:** Day X of my own · **Post only if you are actually wearing one, and only say what you've actually noticed.** _(patch on your arm, on camera)_
- **Hook:** "Day [X] of my own Push Patch. No needle." _[on screen: "One patch. Once a week. No needle."]_
- **Say:** "This patch uses a small electrical charge to move NAD+ and peptide blends through the skin over twelve hours, one patch a week, six weeks a set. I'm on [blend name], and what I've noticed so far is [your honest observation]; results vary. A licensed physician in our network reviews every order, and it ships only if your physician prescribes it."
- **CTA:** "The blends are linked below."
- **Caption:** Day [X] of my own Push Patch. One patch a week, worn 12 hours, no needle. Every order reviewed by a licensed physician in our network; ships only if your physician prescribes it. Results vary:
  https://my4mlife.com/go/push-patch?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=day-x-push-patch

### Script 9: What nobody tells you about your parents' care
**Slug:** `nobody-medicare-care` · **Format:** What nobody tells you
- **Hook:** "What nobody tells you about your parents' care: Medicare pays zero." _[on screen: "Medicare pays $0 toward custodial care"]_
- **Say:** "Not a copay, zero toward custodial care, the help with bathing, dressing and memory care. A private nursing-home room runs about a hundred and twenty-nine thousand dollars a year. Prevention comes with no guarantees, but it's the only part of that bill you get any say in, and it starts with your own brain."
- **CTA:** "Take the free Brain Check, link below. Then send it to whoever holds the family checkbook."
- **Caption:** Medicare pays $0 toward custodial care. A private nursing-home room: $129,575 a year (CareScout 2025). Start with your own brain. Free Brain Check:
  https://my4mlife.com/assessment?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=nobody-medicare-care

### Script 10: Myth vs. truth: menopause brain fog (women)
**Slug:** `myth-menopause-fog` · **Format:** Myth vs. truth
- **Hook:** "Ladies. Myth: menopause brain fog is all in your head." _[on screen: "MYTH: it's all in your head"]_
- **Say:** "Truth: it's in your hormones. Falling estrogen affects the brain, and a lot of women report fog, poor sleep and hot flashes in the same stretch. Hormone therapy may be an option if your physician prescribes it, and a licensed physician in our network can look at your whole picture."
- **CTA:** "Start with the free Brain Check, link below. If hormones show up, the call is free too."
- **Caption:** Menopause brain fog is real. Hormone therapy may be an option, if your physician prescribes it. Free Brain Check (about 7 minutes), then a free call:
  https://my4mlife.com/assessment?utm_source={platform}&utm_medium=social&utm_campaign=lose-the-belly&utm_content=myth-menopause-fog

**Record first (TJ's three for today):** Script 3 (myth-glp1-insurance), Script 2 (day-x-chew-32) and Script 4 (nobody-belly-fat). They lead with the front door and need no props but a fork.

---

## 3. Warm-list text v2 (SMS, 3 variants)

_From your phone, one person at a time, first name in. Each variant is 300 characters or fewer including the link, counted with the "[first name]" placeholder in place (counts below; a long first name can push A or B a few characters over, so trim a word if needed). Wait for a reply before sending anything else._

**Variant A (belly):** 297 characters
> [first name], TJ. I'm helping people lose the belly without counting calories and keep their mind sharp. Free 10-min call, physician in the loop. Want me to save you a spot? https://my4mlife.com/go/lose-the-belly?utm_source=sms&utm_medium=personal&utm_campaign=lose-the-belly&utm_content=warm-v2-a

**Variant B (jeans):** 300 characters
> [first name], TJ. Want your jeans to fit again? Physician review (GLP-1 only if your physician prescribes it) and a chew-and-walk plan. Results vary. Save you a spot on a call? https://my4mlife.com/go/lose-the-belly?utm_source=sms&utm_medium=personal&utm_campaign=lose-the-belly&utm_content=warm-v2-b

**Variant C (sharpness):** 263 characters
> [first name], TJ here. If the 3 p.m. crash or blanking on names bugs you, try my free Brain Check. Then want me to save you a spot on a free call? https://my4mlife.com/assessment?utm_source=sms&utm_medium=personal&utm_campaign=lose-the-belly&utm_content=warm-v2-c

_If they say yes: book them through /consult yourself, or send the lose-the-belly link again and tell them it takes ten minutes. Every person who says yes gets a reply from you the same day._

---

## 4. Glow-tester ask (SMS, 3 variants)

_For five visible people (the plan names Kyla, Bryan and Brian, plus two more). No link in the first text; you want a conversation, not a purchase at full price._

**Variant A (straight ask):**
> [first name], TJ here. Favor to ask. I'm picking 5 people to try a Push Patch set at my cost, in exchange for honest before/after photos and a 30-second video. Written consent, honest results, whatever they are. A physician still reviews your order. Interested?

**Variant B (glow):**
> [first name], it's TJ. You're one of 5 people I'd trust to give me an honest read. I'll get you a six-week Push Patch set at my cost (the glow blends are the obvious pick) if you'll share before/after photos and a 30-sec video. Results vary, and I want the real ones. In?

**Variant C (short):**
> [first name], TJ. Want to be one of my 5 Push Patch testers? Your set at my cost, you give me honest before/after photos and a 30-second video with your written OK. Results vary. Say the word and I'll send details.

**What "details" means (send after a yes):**
- **The price:** the set at our cost, no markup. _[TJ: fill in the cost of the blend they pick; the plan's figures are about $200 for Repair and about $280 for Metabolic, plus about $35 shipping.]_
- **Which blend:** Enhanced Glow or Glutathione Radiance for skin; NAD+ Restore or Metabolic for energy. Their choice.
- **Same safety path as every order:** the safety check, the health form, and review by a licensed physician in our network. It ships only if their physician prescribes it. Not cleared? Full refund.
- **What you ask of them:** a front photo and a side photo, same light, same spot, on day 1 and at week 6; one 30-second phone video in their own words at week 6.
- **Written consent first:** a signed photo-and-video release before anything is posted. They can say no to any photo, and they can pull consent for future posts at any time.
- **Labels on everything we post:** "Results vary." Their posts and ours also say they received the set at cost, because the public has a right to know that.
- **Honest means honest:** if it did nothing for them, they say so, and we don't post it as a win.

---

## 5. Referral-partner one-pager

_For gyms, salons, med spas, chiropractors, CrossFit boxes and church wellness ministries. Print on one page with a QR code; one QR per partner. Partners are introducers only._

> # My4MLife
> ## Lose the belly. Keep your mind.
>
> **What we do (three lines)**
> 1. We help people lose the weight they've been fighting, with a physician in the loop and a simple daily method: count chews, fasting hours and steps instead of calories.
> 2. When it fits, a licensed physician in our network reviews them for treatments such as GLP-1 medication, testosterone or menopause hormone therapy, only if their physician prescribes it.
> 3. Underneath it all, we're protecting the brain: the belly, the blood sugar, the sleep and the hormones are what age it fastest.
>
> **What your people get, free**
> - **A free Brain Check:** 20 questions, about 7 minutes, with their top three priorities on screen and full results by email.
> - **A free 10-minute call** with a care coordinator. No card, no obligation.
> - If they're prescribed a GLP-1, brand-name medication direct from the manufacturer at cash prices starting around $149/month for the starting-dose pill (varies by drug and dose). No insurance needed.
>
> **What you do**
> Put this card at the front desk, in the locker room, or in the bulletin. That's it. If you'd like, Dr. TJ will give a free 20-minute "Lose the belly, keep your mind" talk for your members or congregation.
>
> **How we work with you**
> - **You are an introducer, nothing more.** We pay no referral fees, commissions or kickbacks for medical services, and we never ask you to recommend a treatment.
> - What your people tell us stays between them and us. We don't report their health information back to you.
> - Results vary, and nothing here is a promise.
>
> **Scan to start**
> _[QR code]_ → https://my4mlife.com/go/lose-the-belly?utm_source=partner&utm_medium=qr&utm_campaign=lose-the-belly&utm_content={partner-slug}
>
> Questions: info@my4mlife.com · my4mlife.com
>
> *Don't lose your identity and your dignity while you still have a choice.*

**For TJ, not printed:** `{partner-slug}` is a short lowercase name for each partner (for example `ironworks-gym` or `first-baptist-wellness`), so the weekly scoreboard shows which partner's card brought people in. Make one QR per slug. The plan's §6.4 says partners "earn per referral"; this one-pager drops that on purpose: no referral fees for medical services.

---

## 6. Facebook / LinkedIn post set (5 posts)

_Facebook: link in the post. LinkedIn: link in the first comment, with the comment text "Here's the page:" plus the LinkedIn link. No prices for the Push Patch in posts; answer price questions in replies or DMs from the facts table._

### Post 1: The belly (GLP-1 + Count Yourself Skinny)
I stopped counting calories and started counting to 32.

Here's the whole trick. One bite, fork down, 32 chews before you swallow. In a randomized trial at Iowa State, people who chewed 50% more ate about 10% less at that meal. Doubling the chews cut it about 15%. Same food, and nobody told them to eat less.

Pair that with 12 hours between dinner and breakfast and a morning walk, and you have the method we call Count Yourself Skinny. For some people, a licensed physician in our network may add a GLP-1, if your physician prescribes it: brand-name medication direct from the manufacturer at cash prices starting around $149/month for the starting-dose pill (varies by drug and dose).

Why I care: the belly fat you can't lose sends out inflammation all day, and your brain pays for it. Lose the belly. Keep your mind. Results vary.

The first call is free, 10 minutes, no card:
- Facebook: https://my4mlife.com/go/lose-the-belly?utm_source=facebook&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-belly
- LinkedIn (first comment): https://my4mlife.com/go/lose-the-belly?utm_source=linkedin&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-belly

### Post 2: The glow and the energy (Push Patch)
The glow your friends ask about doesn't come out of a jar.

It comes from sleep, from blood sugar that isn't on a roller coaster, and from what's going on under the skin. That last part is where the Push Patch comes in. A small electrical charge moves peptide and NAD+ blends through your skin over 12 hours. One patch a week, six weeks a set, no needle.

Enhanced Glow is our highest-GHK-Cu blend, which may help support skin appearance. Glutathione Radiance may help support skin quality. NAD+ Restore and Metabolic are the energy blends. A licensed physician in our network reviews every order, and it ships only if your physician prescribes it. Results vary.

See the blends:
- Facebook: https://my4mlife.com/go/push-patch?utm_source=facebook&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-glow
- LinkedIn (first comment): https://my4mlife.com/go/push-patch?utm_source=linkedin&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-glow

### Post 3: The bedroom (sex-specific)
Two things nobody wants to bring up at dinner. Let's bring them up anyway.

**Guys:** ED isn't a bedroom problem. It's often the first warning light on the dashboard. The arteries down there are smaller than the ones in your heart, so they tend to show trouble first, often years earlier. Sometimes it's low testosterone too.

**Ladies:** menopause brain fog is real, and so is painful sex after menopause. Both are common, and both are treatable. You don't have to just ride it out.

Either way, a licensed physician in our network can take a real look, with treatment only if your physician prescribes it. Start with the free Brain Check (about 7 minutes). If hormones show up, the call is free too.
- Facebook: https://my4mlife.com/assessment?utm_source=facebook&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-bedroom
- LinkedIn (first comment): https://my4mlife.com/assessment?utm_source=linkedin&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-bedroom

### Post 4: Sharpness (Brain Check)
Ever blanked on the name of someone you've known for ten years?

Here's the part nobody likes to hear: Alzheimer's is a disease of middle age that shows up when we're older. The belly, the blood sugar, the short nights and the hormones are all working on your brain right now, long before anything shows.

The good news is that the fixes are mostly free. Ten minutes of morning light. A walk before breakfast. Seven hours of sleep. Chewing your food. The free Brain Check takes about 7 minutes and shows you the three things aging your brain fastest, so you know where to start.

Be the sharpest person in the room:
- Facebook: https://my4mlife.com/assessment?utm_source=facebook&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-sharp
- LinkedIn (first comment): https://my4mlife.com/assessment?utm_source=linkedin&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-sharp

### Post 5: The money (Uninsured Decade)
Medicare pays $0 toward custodial care.

Not a reduced amount. Zero toward the help with bathing, dressing and memory care. A private nursing-home room runs $129,575 a year (CareScout 2025). If you've helped a parent through it, you already know who ends up holding the bill.

Prevention comes with no guarantees. But it's the only part of that bill you get any say in. Our free calculator shows what a decade of decline could cost in your state, and it's worth ten minutes with whoever holds the family checkbook, and with your advisor.
- Facebook: https://my4mlife.com/go/uninsured-decade?utm_source=facebook&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-money
- LinkedIn (first comment): https://my4mlife.com/go/uninsured-decade?utm_source=linkedin&utm_medium=social&utm_campaign=lose-the-belly&utm_content=post-money

---

## Open items for TJ
- **Day X scripts (2, 5, 8):** only for things you are actually doing. Fill in your real day number and your real observation; Script 8 only if you're wearing a Push Patch now.
- **Glow testers:** fill in the at-cost price per blend, and get a one-page photo-and-video release ready before the first photo is taken.
- **Assessment page:** the hero says "Take the free Brain Check," and the badge and meta description say about 7 minutes. This pack says "about 7 minutes" to match.
- **Push Patch weekly dosing** ("one patch a week, six weeks") comes from the page and earlier approved copy; it is still worth a final confirm with the manufacturer.

---

## Self-check

Each grep below was run on sections 1 to 6 and the Open items (every line above the "Self-check" heading). The patterns themselves appear only in this table.

| Rule | Check | Result |
|---|---|---|
| Buyer-facing name is "Push Patch"; manufacturer brand never named | grep `Genesis` | 0 hits |
| Expired code never used | grep `OCT2026` | 0 hits |
| No "men and women" filler | grep -i `men and women` / `women and men` | 0 hits |
| No emoji | perl scan for characters in the emoji and pictograph Unicode ranges | 0 hits |
| No Amazon links | grep -i `amazon` | 0 hits |
| Brain Check never called 3 minutes | grep -i `3-minute` / `3 minutes` / `three-minute` / `three minutes` | 0 hits |
| Wordmark exactly "My4MLife" | grep -i `my4mlife` with no `my4mlife.com` and no exact `My4MLife` | 0 hits (only URLs, the email address and the exact wordmark) |
| Identity/dignity tagline on the one-pager only | grep `identity and your dignity` | 1 hit (section 5) |
| GLP-1 price only in the required wording | every `$149` line carries "brand-name medication direct from the manufacturer at cash prices starting around $149/month for the starting-dose pill (varies by drug and dose)" | 5 of 5 uses (facts table, Script 3, Script 3 caption, one-pager, Post 1) |
| Rx items carry "if your physician prescribes it" | every GLP-1, testosterone, ED treatment, hormone therapy and Push Patch mention | Yes |
| Physicians never named | "a licensed physician in our network" only | Yes |
| No guaranteed results; "results vary" where outcomes are implied | outcome scripts and posts | Yes (Scripts 1, 2, 4, 7, 8; Posts 1, 2; SMS B; glow-tester texts; one-pager) |
| No audience age ranges | grep for `in your 40s`, `over 40`, `35`, `55`, decade ranges | 0 audience ranges (Dr. TJ's own age, 59, appears in Script 2 only) |
| Push Patch prices match the page; none in posts or texts | facts table vs `website/src/data/pushPatch.ts` | Match ($550 to $795); none in posts or SMS |
| Every link tagged | utm_campaign=lose-the-belly on all links; scripts use `{platform}` and their own slug; SMS uses utm_source=sms; partner QR exactly as specified | Yes |
