# Broadening the Audience: Men and Women, Starting in Midlife
**Review draft for TJ — 2026-09-22. Nothing here is built yet.**

## 1. The decision underneath everything

The brand today is written to one person: a man about 58, running something, doing fine on paper. Every photo, the hero, Chapter 18, the identity prompts, the "peak-power decade" phrase, the pricing anchor — all of it points at him.

The new spine is one sentence:

> **Alzheimer's is a disease that shows up when you're older. It starts in midlife.**

That sentence does three jobs at once. It moves the center of the audience from 58 to about 42. It makes sex irrelevant to the *why* (the damage clock runs on everyone). And it is the strongest evidence-backed claim we have (the Lancet 2024 Commission modifiable-risk list, midlife hypertension, hearing loss, LDL, obesity, alcohol, inactivity, depression, isolation — every one is something we already sell a fix for).

**Recommendation:** re-center on "midlife, both sexes." Do not print "18 to 80" anywhere. Age gates dilute; the sentence self-selects. The 60-year-old executive still walks in. Count Yourself Skinny is the under-35 bridge and stays that way.

What does NOT change: Dr. TJ's voice (a man, 30 years, honest about it), the Uninsured Decade book and its advisor channel (built for the executive earner on purpose), the Rx lanes, pricing, the intake machine, the consent flow.

## 2. Two doors: Men / Women — build it, but make the door real

Two buttons that land on the same page is a fake fork and people feel it. The Hims/Hers rule: the split has to change what they see next, even if the back end is one machine.

**What the door changes**
| | Women door `/women` | Men door `/men` |
|---|---|---|
| Hero line | "Your brain is keeping score of your forties." (working) | same family, male photo |
| Photo | woman ~45, leadership or kitchen-morning scene | man ~45 (not 60) |
| First lane shown | Menopause & HRT | Testosterone / ED |
| Lane order | Menopause → GLP-1 → Gut-Brain → Peptides | Testosterone → GLP-1 → Gut-Brain → Peptides |
| Canary paragraph | perimenopause: sleep, mood, brain fog, weight shift as the first signal | ED as the first vascular signal |
| CTA | same two doors: assessment / free coordinator call | same |

**What the door carries through**
- `?sex=female|male` → pre-fills the consult intake and the assessment.
- Stored on UserProfile at audit-complete. (Nothing stores it today — that is why the app can only say "man or woman".)
- App, welcome email, pre-call brief, plan-of-action all branch on it: "the woman I want to be at 70", her lab lane, her stack notes. Same machine, her copy.

Homepage: keep the current two-door hero (assessment / call) and add the Men / Women pair directly beneath as the *audience* choice, not the *action* choice. Two questions, two rows: "Who are you?" then "What do you want to do?" Do not replace the action doors with the sex doors.

## 3. The site — page by page

**Tone rule for every rewrite:** write to a 42-year-old who is busy and not yet scared. Not "you've been ignoring this for years" (the 58-year-old's guilt) but "the clock started and you can still set it" (the 42-year-old's agency). Second person always. Sex-specific only where physiology is.

| Surface | Today | Change |
|---|---|---|
| Home hero | "the right treatment, chosen with you" + 2 doors | keep; add midlife sentence as the sub-line; add Men/Women row |
| Home photo | executive at boardroom window (60, suit) | replace: two-shot or diptych, man + woman ~45, daylight, not a boardroom |
| /women, /men | don't exist | new thin landing pages (§2) |
| /consult | already lists both lanes | pre-fill sex from door; women's lane copy gets its own two-line canary |
| /assessment | ED question already both-sex; no sex captured | add a sex field (1 tap, first screen); pass to audit-complete |
| /rx/testosterone-ed, /rx/menopause-hrt | fine, sex-specific by design | leave |
| /rx/weight-loss, /rx/leaky-gut, /rx/gh-peptide | check for "men" defaults | sweep |
| Solution pages (/solutions/*) | "executive" ×7, "for men" ×17 across site | judged rewrite, not find-replace; keep "for men" only on ED/T |
| About | founder + 5 male advisors + family scene | add a female advisor or clinician when one exists; founder story stays male and honest |
| Navbar/Footer | lanes labeled (Men)/(Women) | keep, that's clarity |
| Pillar pages Mind/Motivate | | add the midlife sentence + the 14-risk list; this is where the younger reader lands from search |

## 4. Photography — the biggest single tell

Every people photo on the site is a man 55–65: boardroom window, marble lobby, dawn road, dock. The morning-protocol still life is a man's watch and leather journal. A 44-year-old woman lands and knows in one second this isn't for her.

**Direction (updates the 2026-05-08 photography rule, keeps its spirit):**
- Subject split: **50% women / 50% men** across the site, never a token woman in a group of men.
- Age read: **40–50** for the lead shots, 55–65 allowed in supporting shots. Nobody reads under 35.
- Roles stay "peak power": she runs the meeting, closes the deal, coaches the team, leads the dinner table. Not yoga-mat stock, not "wellness woman with green smoothie."
- Same lighting language we have: dawn, golden hour, real rooms, no studio white.
- Keep the no-alcohol rule and the iced-tea/green-tea social scenes.

**Shot list to generate (14 images, replaces or pairs the current set):**
1. Home hero: man and woman ~45 walking into a workday together, or a diptych
2. Woman at the head of a conference table, mid-sentence
3. Woman on a dawn walk (pairs with weight-dawn-walk)
4. Woman, kitchen morning protocol, her watch/journal version of the still life
5. Woman lifting in a home gym, golden light (pairs with gym-golden)
6. Woman at the lab draw / reading her results (hormones-labs pair)
7. Woman, contemplative, porch or window (mind-contemplative pair)
8. Two women at dinner, iced tea, mid-40s (membership-dinner pair)
9. Mother ~45 with teenage kids, boat or hike (family-boat pair)
10. Woman ~45 with her mother ~75: the "what year is it" moment, from the daughter's side
11. Man ~45 (not 60) version of the hero for /men
12. Mixed leadership team shot, woman leading
13. Couple ~45 (replace couple-lapel which reads 60)
14. Woman with the app on a phone, morning light

I can generate all 14 with the same prompt style as the existing set in one pass once you approve the direction.

## 5. The app

- Store `sex` on UserProfile (from door → intake/assessment → audit-complete).
- Renderer: every identity prompt, commitment line, and stack note branches: `sex === 'female' ? … : …`, with the paired "man or woman" copy as the fallback when unknown.
- Week 3 hormones content: today it is the ED canary. Add the women's block (perimenopause canary, her lab lane, HRT decision) and show the matching one.
- Stack reference: testosterone note gets a women's counterpart (estradiol/progesterone/T in women).
- Accountability-target placeholder: "my husband, my wife, my kids, my parents, myself."
- MissionControl/Protocol Score: no gendered copy today; leave.
- Remove the dead `app.js.legacy` file (still full of "Brain Optimization for Men 35+"); it is not bundled but it will confuse the next sweep.

## 6. The Logbook (v9)

v8 already did the honest sweep (paired identity lines, women's lab lane). What is left is framing, not pronouns:
- Author's note: add the midlife sentence up front.
- "Peak-power decade" (×1) and "executive" (×3): reframe to midlife.
- Week 3: the ED canary section is labelled "For men"; the women's counterpart needs equal weight and its own worksheet (perimenopause symptom audit, the same ten-marker honesty format).
- Every "why" and identity prompt: the paired lines already exist; keep.
- Re-render, re-upload to S3 (standing rule).

## 7. The book (v23, after you have read v22)

Three specific answers to your questions:

**Page 285, "question nine."** You are right, it is wrong. The already-diagnosed question is not question nine and never was in the current assessment. It is a separate gate card that sits after the 20 scored questions ("Have you already been diagnosed with mild cognitive impairment, early dementia, Alzheimer's, or Parkinson's?"). Three places in the book say "question nine" (Ch. 10 close, the Already-diagnosed line on the last page, and one mention in the routing paragraph). Fix: "the already-diagnosed question at the end of the assessment." One-line edit in three places.

**Page 282, the QR code.** Keep one QR, pointing to the homepage as it does now. Reasons: a printed code has to survive every site change we make for years; the homepage is where the Men/Women row will live, so the reader chooses there; two QR codes on a page reads as a form, not an invitation. If you want the door in print, print one QR plus one line under it: "Choose the door for you: men or women." The web does the routing.

**Chapter 18 and James.** Don't neutralize James. A composite with no sex has no Monday. Two options:
- (a) Keep James, add "One Week, Another Life": Elena, 46, runs a regional practice or a sales team, mother of teenagers, her mother just asked what year it was. Six to eight pages, same Monday-to-Sunday format, her lane is perimenopause + gut + sleep instead of TRT. Chapter grows to ~24 pages. Best option: the reader picks the week that looks like theirs.
- (b) Split the chapter: Monday to Wednesday is James, Thursday to Sunday is Elena. Shorter, but neither story lands.
Recommendation: (a). Also lower James from 58 to 52 in the same pass; the book's center moves with him.

Rest of v23 pass: the midlife sentence into the introduction and Ch. 4 (Why You, Why Now); "peak-power decade" reframed; Ch. 3 Uninsured Decade already carries the middle-age framing.

## 8. Order of work and effort

| # | Work | Effort | Blocks |
|---|---|---|---|
| 1 | Sex captured (assessment field + consult pre-fill) and stored on profile | ½ day | everything that branches |
| 2 | /women and /men landing pages + homepage Men/Women row + midlife sub-line | ½ day | photos for the heroes |
| 3 | Photography: 14 images generated to the shot list, swapped in | ½ day after approval | your approval of §4 |
| 4 | Site copy sweep (executive ×7, for-men ×17, pillar pages get the midlife spine) | 1 day | — |
| 5 | App branching on sex + Week 3 women's block + legacy file removed | 1 day | #1 |
| 6 | Logbook v9 + S3 | ½ day | — |
| 7 | Book v23: question-nine fix, Elena chapter, midlife spine, James 52 | 1–2 days | your v22 read |
| 8 | Memory + HANDOFF: photography rule and audience center updated | — | — |

Items 1–3 are what your first female associate's audience will hit. Those first, this week.

## 9. What I would not do
- Print an age range anywhere.
- Put "men and women" into every sentence; write to *you* and let the door and the stored sex do the work.
- Touch the Uninsured Decade book or its advisor materials.
- Rewrite the book before you have read v22.
- Replace every male photo with a female one; the target is balance, not a swap.
