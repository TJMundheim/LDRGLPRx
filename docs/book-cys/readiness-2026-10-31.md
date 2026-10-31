# Count Yourself Skinny — KDP readiness (2026-10-31)

**Interior:** `docs/book-cys/Count-Yourself-Skinny-v3.pdf` (color) and `Count-Yourself-Skinny-v3-bw.pdf` (grayscale, for a black-and-white KDP interior). Both copied to the Desktop. **81 pages**, 6 × 9 in. KDP adds one blank page at the end, so you're billed for 82.
**Source:** `docs/book-cys/draft/_MASTER.md`. **Build:** `python3 docs/book-cys/render.py --pdf OUT.pdf [--bw]`. This needs `markdown`. PyMuPDF is optional and fills in the table-of-contents page numbers. v2 is kept for comparison.

**Verdict:** the interior can be uploaded today as a paperback interior. The book itself can't be published until there's a cover, a price, and a decision on the ISBN (section c).

---

## (a) Fixes made

### Content (in `_MASTER.md`)

| # | Where | Before → After | Rule / reason |
|---|---|---|---|
| 1 | "Also by" page | Flagship listed with its full subtitle ("Don't Lose Your Identity and Your Dignity…") → main title only | Identity/dignity line appears only at the last-chapter bridge |
| 2 | Title page | `*Author of "Begin with the End in Mind" · Founder · My4MLife*` (title in quotes, ran onto the name's line) → own line: "Author of *Begin with the End in Mind* · Founder of My4MLife"; page centered | Typo / render |
| 3 | Copyright | "references… maintained and updated at my4mlife.com/science" → "listed in the Sources section at the back" | No coming soon: **/science does not exist on the site** |
| 4 | Copyright | Removed "Printed in the United States of America" | KDP prints in several countries, so this line can be false |
| 5 | Copyright | ISBN note turned into a clear placeholder comment that doesn't print | KDP doesn't require the ISBN on this page (see c) |
| 6 | Contents | Italic "Then: the counts on one page…" line → real list of back-matter sections (adds Sources and About the Author); every entry now has its page number | Contents didn't match the actual sections |
| 7 | Ch 4 | "Large studies pooling tens of thousands of adults" → "A large analysis pooling more than 225,000 adults" | Didn't match the Science appendix (225,000) |
| 8 | Ch 10 | Stock "a full fruit bowl for the first meal after" the walk → "the eggs, fish, or meat you'll break the fast with" | Protein-first fast-break |
| 9 | Ch 11 | "Tonight's sleep — set eight hours in advance by that light" (the arithmetic is wrong) → "scheduled this morning: the light that hit your eyes on the walk sets tonight's melatonin" | Accuracy |
| 10 | Ch 11 | Added after the 32-chew first meal: make it protein-first, 30–40 g, eyeballed and never weighed (4–5 eggs or a palm-and-a-half of chicken/fish) | Protein-first 30–40 g after fasted training. **TJ review: see c** |
| 11 | Ch 11 | "not maintaining seven habits" → "six" | Matches "one lever in a stack of six" (Science appendix) |
| 12 | Ch 11 | ✓ marks → ☑ | ✓ printed as a Type3 bitmap font, which is a print-quality risk |
| 13 | Ch 13 | Added the identity/dignity line, verbatim, right after the assessment call to action | Tagline at the bridge point in the last chapter |
| 14 | Finish Line page | Removed the identity/dignity line (moved to Ch 13) | Tagline appears only once |
| 15 | Finish Line page | Added a "Mornings outside per week" row | The Starting Line asks for it, so the Finish Line couldn't compare it |
| 16 | Count Log, Weeks 6–12 | The "2 glasses before noon" row had dropped out of all 7 tables → restored | Water is one of the six counts and one of the five boxes |
| 17 | Count Log, Week 2 | "Stretch the overnight hours toward 12" → "Make 12 overnight hours automatic…" | Week 1 already asks for 12+ |
| 18 | Count Log, Week 11 | "Hint: the answer the research gives is 'the walk and the 32'" → points to the book's own Week 13 and Forever page | Claimed research support that doesn't exist; now a working cross-reference |
| 19 | FAQ "What should I eat?" | "that's the next book" → "my other book, *Begin with the End in Mind*"; added one line on protein-first | "Next book" implies an unpublished book; protein-first |
| 20 | FAQ "Why trust a chiropractor?" | "puts its references at my4mlife.com/science" → "prints its sources at the back" | /science doesn't exist |
| 21 | FAQ (was "My spouse… anything different for women?") | "Nothing… work[s] the same way in every body" → same for chewing, steps, light, sleep, and water, but long fasts can land differently across the cycle, in perimenopause, or while trying to conceive: stay at 12 hours longer. Question reworded to "My partner…" | Sex-specific only where the physiology actually differs |
| 22 | FAQ + "Give the Count Away" | "the data is unambiguous that a partner roughly doubles your odds" / "doubles the odds you both finish" → "consistently more likely to finish and keep the results" / "more likely to finish" | Overclaim (the cited trial doesn't show doubled completion) |
| 23 | Science intro | "Full citations live at my4mlife.com/science" → "listed in the Sources that follow" | /science doesn't exist |
| 24 | Science, light | "roughly 10,000 lux on a gray day" → "a few thousand lux" | Overcast daylight is about 1,000–10,000 lux |
| 25 | New back matter | **Sources** page: 12 primary citations (Zhu & Hollis 2014; Ohkuma 2015; Sutton 2018; Banach 2023; Tudor-Locke 2004; Wright 2013; Figueiro 2017; Spiegel 2004; Taheri 2004; Dennis 2010; Lally 2010; Wing & Jeffery 1999) | The book now stands alone with no web dependency |
| 26 | About the Author | Was a sub-heading on the Notes page → its own page; "Dr. TJ Mundheim is…" → "Dr. TJ is…" | Author-name rule; layout |

### Layout (in `render.py`)

| # | Problem in v2 | Fix |
|---|---|---|
| 27 | Every typed blank (`______`) was read as Markdown emphasis, giving **869** broken bold fragments and short, uneven write-in lines on every log page | Blanks become real ruled lines: full-width lines under prompts, a two-row weigh-in/streak block, ruled cells in the tables |
| 28 | The Notes page "lines" printed as short gold ornament rules | 14 full-width ruled lines on one page |
| 29 | The daily-notes page-break rule never fired (wrong heading ID), so weeks spilled onto partial pages and there was a blank page 38 | Each week is now a true two-page spread: log on the left page, daily notes on the right (pp. 38–61) |
| 30 | Book-wide CSS sibling rules leaked from one section into later ones (for example, the FAQ question style hit About the Author) | Each chapter is wrapped in its own section and the styles are scoped to it |
| 31 | Half-title, also-by, title, and copyright pages carried page numbers; the copyright page ran over two pages | No folios on those front pages; copyright set at 8.6 pt on one page |
| 32 | Chapter 1 position | An unnumbered blank left-hand page after the contents, so Chapter 1 opens on a right-hand page (p. 9) |
| 33 | "my4mlife.com" was hyphenated across lines ("my4m-life.com") | Web addresses never hyphenate or break |
| 34 | The drop cap on one-line openings ("Now stack them.") indented the next paragraph | Drop cap contained |
| 35 | Drop cap on the italic intro lines (Science, Sources) | Removed there |
| 36 | — | `--bw` grayscale build added; PDF bookmarks generated |

**Total: 36 fixes (26 content, 10 layout).** Re-checks on the final PDF: page size 432 × 648 pt (6 × 9 in) on every page; all fonts embedded (Georgia, Apple Symbols, Helvetica, Times subsets) with no Type3; zero mentions of /science; the identity/dignity line appears exactly once (Ch 13); no age ranges, brand or affiliate names, "workbook", "coming soon", or electrolyte/creatine copy.

### App claims (item 2 of the brief)

**There is nothing to fix.** The book never mentions the Count Yourself Skinny iOS app, AirPods chew counting, the App Store, or the "1 free month" book code. The only "app" mentions are:
- "the free 12-week program, **app**, and weekly live calls at my4mlife.com" ("Also by" page)
- "a free program… with a companion **app**" (Ch 13)

Both mean the My4MLife member app, which is live and free today. The other three are generic ("your phone's health app", "delete the calorie app", "no apps demanding you photograph your lunch"). The method already needs no app. **Keep it that way until the CYS app is actually listed in the App Store.** Adding an app or code page to the book is a later edition (v4).

---

## (b) KDP checklist

| Item | Verdict | Notes |
|---|---|---|
| Interior PDF | **READY** | 81 pp, every font embedded, no bleed needed. Body text sits 0.7 in or more from the trim; the page numbers are about 0.35 in from the bottom edge, and KDP's minimum is 0.25 in. Upload the **-bw** file if you choose a black-and-white interior, or the color file if you pay for color |
| Trim size | **READY** | 6 × 9 in, the same as the flagship. KDP's minimum margins for 24–150 pages are 0.375 in inside and 0.25 in outside; ours are 0.7 in on both sides |
| Page count / blanks | **READY** | 81 pages (KDP bills 82). Only one intentional blank page (p. 8), and it's unnumbered. Spine ≈ 0.19 in on white paper. KDP allows spine text only above 79 pages, so 81 just qualifies, but at that width a blank spine is the safer design |
| Ink and paper | **TJ-DECIDES** | Black-and-white is much cheaper per copy than color, and the book is meant to be given away. Recommend **black-and-white, white paper** |
| Title page / front matter | **READY** | Half-title, also-by, title, copyright, Who This Book Is For, Contents (with page numbers), blank page, Ch 1 on p. 9 |
| Contents accuracy | **READY** | All 13 chapters and 8 back-matter sections, page numbers generated from the actual PDF |
| Copyright page | **READY** | © 2026 TJ Mundheim, My4MLife Press, all-rights statement, trademarks, medical disclaimer (formal Doctor of Chiropractic wording unchanged), First Edition, printer's key |
| ISBN | **TJ-DECIDES** | Free KDP ISBN: nothing to change, since KDP prints it in the back-cover barcode (imprint then shows as "Independently published"). Your own Bowker ISBN: imprint shows as **My4MLife Press**, and it's a one-line edit plus re-render |
| Cover | **NOT READY** | **No Count Yourself Skinny cover exists anywhere in the repo or on the Desktop.** The plan calls for a giant numeral "32" motif and the back-cover pull quote "The diet industry got fat. This book got skinny." Full wrap at 6 × 9 with 0.125 in bleed and a ≈0.19 in spine (final width from KDP's cover calculator once paper is chosen) |
| Back matter | **READY** | Counts on One Page, 12-week Count Log, FAQ, Science, Sources, Week 13, Give the Count Away, Notes, About the Author |
| Author name | **READY** (one check) | "Dr. TJ" in About the Author and the sign-offs; no ", DC" anywhere. The title-page byline and the "Also by" page keep **Dr. TJ Mundheim**, the same pattern as *The Uninsured Decade*, so the KDP author field matches the flagship and Amazon links the books on one author page. Enter the same name in KDP |
| Price | **TJ-DECIDES** | Not set anywhere. The profit model assumes about $5 margin per retail copy. At KDP's 60% royalty, minus about $2.30 print cost (black-and-white, this length; confirm in KDP's calculator), $12.99 nets about $5.50 and $9.99 about $3.70 |
| Categories / keywords | **TJ-DECIDES** | Suggested categories: Health & Fitness › Diets & Weight Loss › General; Health & Fitness › Diets & Weight Loss › Intermittent Fasting (or Healthy Living); Self-Help › Habits. Suggested keywords: no calorie counting; mindful eating chew; intermittent fasting for beginners; walking for weight loss; simple weight loss habits; 32 chews; weight loss journal 12 week |
| Description | **TJ-DECIDES** | Not written. Draft opener: "You'll never count a calorie. You'll count to 32 instead. Count Yourself Skinny replaces calorie math with six easy numbers — chews, hours, steps, minutes of morning light, glasses of water, nights of sleep — plus a 12-week Count Log built into the book. Nothing to buy, nothing to weigh, no forbidden foods." |
| App claims | **READY** | None in the book (see above) |
| Book offer code | **READY** | Not printed. Don't add it until the App Store listing and code are live |
| Kindle eBook | **NOT READY** (optional) | The interior is a write-in paperback. A Kindle edition needs a reflowable file without the log blanks. Do it after the paperback |

---

## (c) Gaps only TJ can close

1. **Cover.** None exists. Either commission one or have Fable build it from the flagship cover templates in `docs/book/cover/`. This is the only true blocker.
2. **Price, ink, and ISBN.** Pick a list price, black-and-white or color (recommend black-and-white), and the free KDP ISBN or your own (your own shows "My4MLife Press").
3. **Read four added lines and keep or strike them:**
   - The protein-first sentence in Ch 11 (30–40 g, eyeballed). It sits next to the cover promise of never counting grams.
   - The women's-physiology answer in the FAQ.
   - The new Sources page (12 studies; have someone spot-check the citation details).
   - The removed "Printed in the USA" line.
4. **Two science claims to confirm or soften** (not changed, because they affect the method):
   - Ch 12 and the Science appendix say trials show weekly weighing beats daily. The best-known trial (Steinberg 2015) actually favors daily weighing.
   - "Up to half an hour faster" sleep onset from morning light: the supporting studies show a smaller, variable effect.
5. **The "Why should I trust a chiropractor?" FAQ.** It's honest and disarming, but it puts the chiropractic credential front and center, while current staging leads with "30 years in clinical practice." Keep or reword.
6. **Description, categories, and keywords.** Drafts are in the checklist above; approve or edit.
