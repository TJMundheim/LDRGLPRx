# Voice map: what can be swapped without breaking the book

**Purpose:** a later edition can replace the money sections, drop the Captain's Table, or add an advisor's page, using this map as its checklist. Line numbers are for `draft/_MASTER.md` as of 2026-11-04, before patches. **They will shift once patches land, so re-run the search commands at the end.** Nothing has been tagged in the source (patch list S6).

**Owners:** **H** = health, Dr. TJ only. **M** = money, co-author in v2. **S** = shared. **L** = needs Marla's legal read. **X** = removable.
**Advisor Edition (AE)** uses the core text with no co-author chapters.

## The map

| Lines | Section | Words | Owner | v2 action | AE action | Tag to add |
|---|---|---:|---|---|---|---|
| 1 to 45 | Title, copyright, disclaimers | 401 | H | New co-author line, Second Edition, firm disclaimer | Firm disclosures added | `voice:front` |
| (insert before 47) | Foreword, A Word About Marla | 1,045 | Marla, TJ | Unchanged, with reconsent | Unchanged | `voice:marla` |
| (insert after above) | Questions page or advisor page | 0 | Slot | Not used | Advisor's own signed page | `slot:advisor` |
| (insert after above) | Note from co-author | 0 | Slot | Planner's disclosure | Not used | `slot:coauthor-note` |
| 47 to 61 | Who This Book Is For | 266 | H | Keep | Soften "The numbers are not wrong" | `voice:health` |
| 63 to 75 | A Note on the Numbers | 189 | S | Both sign | Keep | `voice:shared` |
| 79 to 94 | Ch 1 opening | 296 | M | Rewrite | Keep | `voice:money` |
| 95 to 119 | First, the inventory | 425 | M | Rewrite; keep the table form | Keep | `voice:money` |
| 120 to 127 | Who holds the pen | 182 | H | Keep; add planner's line | Keep | `voice:health` |
| 128 to 137 | Bill | 200 | S | Keep | Keep | `voice:shared` |
| 138 to 145 | Audit finding, the promise | 156 | S | Keep the promise verbatim | Keep | `voice:shared` |
| 146 to 163 | What Nobody Pays For | 312 | M | Rewrite | Keep | `voice:money` |
| 164 to 172 | Private-pay meter | 87 | M | Rewrite with dated figures | Keep | `voice:money` |
| 173 to 182 | Spend-down | 202 | M, L | Rewrite; keep sending to counsel | Keep | `voice:money-legal` |
| 183 to 197 | The market that left | 470 | M | Rewrite; conflict check | Stay neutral | `voice:money` |
| 199 to 215 | The ledger | 353 | M | Co-author and TJ rebuild | Keep | `voice:money` |
| 216 to 223 | Why it is shaped like that | 201 | M | Rewrite | Keep | `voice:money` |
| 224 to 227 | Which account | 131 | M | Largest expansion | Keep | `voice:money` |
| 228 to 231 | The tail | 104 | M | Rewrite | Keep | `voice:money` |
| 232 to 238 | Not on the statement | 123 | H | Keep | Keep | `voice:health` |
| 240 to 271 | Ch 4 The Second Patient | 807 | H | Keep; add survivor sidebar `slot:survivor-sidebar` | Keep | `voice:health` |
| 276 to 329 | Ch 5 The Dividend | 864 | H | Keep | Keep | `voice:health` |
| 332 to 345 | Ch 6 time | 300 | H | Keep | Keep | `voice:health` |
| 346 to 366 | Ch 6 basket | 332 | H | Keep; budget note possible | Keep; medication lines go neutral | `voice:health` |
| 367 to 383 | Ch 6 premium vs face value | 319 | S | Shared review of "five to one" | Reword for review | `voice:shared` |
| 386 to 405 | Ch 7 inputs and table | 368 | S | Planner re-runs and signs | Keep | `voice:shared-math` |
| 407 to 418 | Ch 7 quoted number; evidence | 371 | H | Planner takes no position | Keep | `voice:health` |
| 419 to 436 | Ch 7 three things; the trade | 447 | S | TJ leads | Keep | `voice:shared` |
| 441 to 577 | Part III, Ch 8 to Ch 11 | 3,279 | H | **Keep. Print the disclaimer** | Medication lines go neutral | `voice:health` |
| 582 to 625 | Ch 12 | 895 | H | Keep | Keep | `voice:health` |
| 630 to 636 | Ch 13 opening, Weeks 1 to 3 | 394 | H | Keep | Drop /consult call-out at 636 | `voice:health` |
| 638 | Ch 13 Week 4 | 154 | M, L | Rewrite | Name the advisor | `voice:money-legal` |
| 640 | Day 30 | 142 | H | Keep | Keep | `voice:health` |
| 642 to 671 | The 30-Day Ledger | 363 | S | Split health and money lines | Same | `voice:shared` |
| 673 to 681 | Captain's Table | 257 | X | Back matter, optional | **Removed** | `slot:captains-table` |
| 685 to 699 | Signing | 306 | H | Keep | Keep | `voice:health` |
| 703 to 721 | The Assessment | 291 | H | Keep | Remove /coaching sentence in 719 | `voice:health` |
| 725 to 733 | About the Author | 117 | H | Add About the Co-Author | Add advisor's firm disclosures | `voice:health` |
| 736 to 768 | Sources | 1,551 | S | Joint, dated "as of" | Same | `voice:shared` |

## What breaks if you swap a section: the dependencies

Any rewrite of a money section has to keep these, or change every line named.

### Numbers that travel

| Value | Defined at | Also used at |
|---|---|---|
| $495,000 to $560,000 ledger | 212 | 370, 380; plus leave-behind, dinner script, and calculator outside the book |
| Over $800,000 tail | 230 | 370 |
| $405,262 and 70% | 214 | 394, 398, 400 (Ch 7's whole table) |
| 42%, 35%, 48% | 114 | 124, 390, 622 |
| About 66%, two in three | 114 | 142, 270, 392, 398, 403 |
| $35 an hour, $36,400, $1,820 | 170, 210, 220 | 506 |
| $96,000 to $130,000 | 168, 171, 222 | 226, 230 |
| $100,000 premium, about $10,000 a year | 369 | 400, 405, 411 |
| 100 days skilled nursing | 160, 162 | 107, 506 |

### Promises made and kept across sections

- **"It does not break even."** Promised at 142, delivered at 388 to 405, closed at 691. If Ch 1 changes hands, the promise at 142 must stay word for word in meaning. The honesty clause in the term sheet covers this.
- **"Keep them close" and "your advisor."** Lines 83, 110, 193, 195, 374, 425, 588, 638, 679, 719. The partner rule requires at least these touchpoints. A co-author planner praising "your advisor" in their own chapters is a different thing, and counsel should read it (term sheet item 8).
- **Coverage inventory.** Built at 97 to 108. Line 638 and line 662 ask the reader to bring it to the meeting.

### Bill and Cindy

They run through 130 to 136, 201 to 236, 242 to 262, 284, 324 to 326, 520, 548, 612 to 616. A co-author may use them in money chapters, but must keep their facts: diagnosed at seventy, Cindy keeps the books and holds the folder, ten-year course, roughly 3.5 years in a facility, A1c 5.9 at fifty-five. Ch 12 (H) depends on Ch 1 (S) for who they are.

### Chapter-number references

Moving or renumbering a chapter breaks these lines:

- Chapter 1: 388, 405, 638
- Chapter 3: 71, 318, 370, 433, 476, 506, 548, 668, 719
- Chapter 4: 566, 610
- Chapter 6: 316, 456
- Chapter 7: 142, 320, 326, 518, 668
- Chapter 10: 634
- Chapter 11: 604
- Chapter 13: 719
- Part I: 610. Part III: 600, 638, 717
- Table in Ch 8, lines 447 to 450, also names chapters.

### Voice details that age or belong to one person

- **"I am fifty-nine"** (524). Update each edition.
- **"I am a man, and I write from..."** (51, 122). Dr. TJ's voice only. Stays in H sections. A co-author writes from their own chair and should not borrow it.
- **"I do not sell insurance and I cannot advise you on it"** (195). **This line becomes false in a co-authored chapter if the planner sells insurance.** Rewrite it as first-person disclosure.
- **"thirty years"** (691, 727). TJ's. Do not let a co-authored chapter carry it.
- **"My first book," "my other book"** (328, 574). See patch list B12.
- **Marla's cross-references:** "A Word About Marla" ends by leading into "the money." If the co-author's note is inserted between that page and Who This Book Is For, check that the transition still reads.

### Links and calls to action

| Address | Lines | Treatment |
|---|---|---|
| /assessment | 14, 632, 695, 707, 733 | Stays in all editions |
| /consult | 636, 719 | AE: drop at 636. Review 719 |
| /go/uninsured-decade | 638, 719 | Stays. Per-advisor `?src=` gives aggregate counts only |
| /coaching | 681, 719 | v2 back matter. AE: remove both |

## The rule for slots

- **`slot:advisor`:** 150 words, written and signed by the advisor. Firm name, disclosures, how they are paid. No performance claims, product names, or health claims. Same page count as the Questions page it replaces, so nothing shifts.
- **`slot:captains-table`:** one page in back matter. Removing it must not leave a reference behind, so the line 719 sentence moves with it.
- **Comments are safe.** `render.py` passes HTML comments through unprinted, and the Kindle builder skips them. Put each tag alone on its own line, with blank lines around it.

## Re-run after patches

```bash
cd /Users/thomasmundheim/Development/LDRGLPRx/docs/book-uninsured-decade/draft
grep -n -E '\$405,262|\$495,000|\$560,000|\$800,000|two in three|66' _MASTER.md
grep -n -E 'Chapter [0-9]+|Part (I|II|III|IV)\b' _MASTER.md
grep -n -E 'my4mlife\.com/[a-z]' _MASTER.md
```
