# From Marla's OK to live: v1 checklist

**Nothing here has been run for real.** The commands were tested on the current v4 text and wrote only to `kit/test-builds/`. No PDF or draft was overwritten, and `_MASTER.md` was not changed. Do the steps in order. Each is done or not done.

**Run from:** `/Users/thomasmundheim/Development/LDRGLPRx/docs/book-uninsured-decade`
**Chrome:** `CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`

## What exists for rendering

| Job | Script | Status |
|---|---|---|
| Color interior HTML | `render.py` (this book) | Exists. Writes `draft/_MASTER.html`. Its HTML title still says "Count Yourself Skinny," so color PDFs carry the wrong title (patch list L1). |
| B&W interior | `docs/book/render_bw.py` and `docs/cohort-workbook/render_bw.py` | Exist for the other two books, not this one. Each reads its own folder. **New: `kit/render_bw.py`** does this job for this book. |
| Kindle docx | `docs/book/build_ebook_docx.py` | Exists, but on this manuscript's raw text it would print `{.part}`, `<br>`, and `### The Premium`. **New: `kit/build_kindle_docx.py`** cleans a temporary copy and calls it. Tested: 23 chapter-level headings, 6 tables, no stray markup. |
| Wrap cover | **New: `kit/cover/build_cover.py --pages N`** | Regenerates HTML, PDF, front PNG, and Kindle JPG for any page count, and prints the spine clearances. |

## Stage 1: Before the text is touched

- [ ] **1. Marla's OK in writing,** covering the foreword text, "A Word About Marla," her name and credential as printed, and the disclosure lines. All her [brackets] are resolved.
- [ ] **2. Marla's one-page permission** for later editions and an Advisor Edition (patch list S2). Same sitting: "Which two planners do you trust with your own clients?"
- [ ] **3. TJ decides each "TJ decides" item** in `v1-patch-list-2026-11-05.md`. The subtitle (E2) comes first because it locks on KDP.
- [ ] **4. TJ picks the ISBN route** (S1). If owned: buy at myidentifiers.com and assign one to paperback and one to Kindle, with title, subtitle, author, and imprint exactly as on KDP.

## Stage 2: Lock the manuscript

- [ ] **5. Paste the approved foreword and "A Word About Marla"** into `draft/_MASTER.md`, immediately before `# Who This Book Is For` (line 47 today). Remove the editor's notes and brackets.
- [ ] **6. Apply the approved patches** to `draft/_MASTER.md`. Fill in the ISBN comment on the copyright page (line 38).
- [ ] **7. Send Marla the final foreword page and any patch that touches her areas:** Spend-down, the POA and directive lines, and Week 4. She has not seen patched text.

## Stage 3: Build the upload files

- [ ] **8. Render:**
```bash
cd /Users/thomasmundheim/Development/LDRGLPRx/docs/book-uninsured-decade
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 render.py                # refreshes draft/_MASTER.html from _MASTER.md
python3 kit/render_bw.py         # writes kit/_MASTER-bw.html
"$CHROME" --headless=new --no-pdf-header-footer \
  --print-to-pdf="kit/uninsured-decade-bw-interior-v5.pdf" \
  "file://$PWD/kit/_MASTER-bw.html"
python3 kit/build_kindle_docx.py -o kit/uninsured-decade-kindle-v5.docx
```
- [ ] **9. Get the page count and check the interior:**
```bash
python3 -c "import fitz;d=fitz.open('kit/uninsured-decade-bw-interior-v5.pdf');print(len(d),d[0].rect.width/72,d[0].rect.height/72,d.metadata['title']);print('blank:',[i+1 for i,p in enumerate(d) if len(p.get_text().split())<=1]);print('Type3:',sum(1 for p in d for f in p.get_fonts() if f[2]=='Type3'))"
```
Pass: 6.0 x 9.0, title "The Uninsured Decade," no blank pages, zero Type3 fonts. Read every page once by eye, including the Ch 3, Ch 6, and Ch 7 tables.

- [ ] **10. If the count is odd, add 1** for the cover. KDP adds a blank last page to an odd count.
- [ ] **11. Build the cover at that count:**
```bash
cd kit/cover && python3 build_cover.py --pages 90    # use the even count from step 10
```
Pass: both spine clearances print at or near 0.0625 in. If they are uneven, rerun with `--nudge`. Before rerunning, set `SUBTITLE` and `FOREWORD` at the top of the script to match the title page and Marla's approved wording exactly. The back-panel foreword sentence is in the same script.

- [ ] **12. Copy to the Desktop with upload names:**
  - `KDP-UPLOAD -- uninsured-decade-bw-interior-v5.pdf`
  - `KDP-UPLOAD -- uninsured-decade-bw-COVER-v5.pdf` (from `kit/cover/full-wrap-paperback-6x9-draft.pdf`)
  - `KDP-UPLOAD -- uninsured-decade-kindle-v5.docx`
  - `KDP-UPLOAD -- uninsured-decade-kindle-cover-v5.jpg` (from `kit/cover/ebook-cover-draft.jpg`)

## Stage 4: KDP setup (TJ's account, TJ's click)

- [ ] **13. Create the paperback.** Enter details from `kit/kdp-listing.md`. Interior black on white, trim 6 x 9, matte, no bleed. Upload interior, wait for processing, then upload the cover.
- [ ] **14. Read the previewer.** Fix any margin, spine, or barcode flag. Confirm the print cost matches the listing ($2.30 is unconfirmed until this screen) and set the price.
- [ ] **15. Order one printed proof before publishing.** Check the spine by eye, because 5.8 to 6.5 pt type is at the edge of legible. Check the bone color and the table rules. Marla gets one proof too.
- [ ] **16. Press Publish on the paperback.** Note the 72-hour window for title, subtitle, and author corrections.
- [ ] **17. Create the Kindle edition.** Upload the docx and JPG, check the preview on phone and tablet, and leave KDP Select off unless TJ decided otherwise.
- [ ] **18. Link the editions** in KDP and Author Central, and connect the author page.

## Stage 5: After it is live

- [ ] **19. Order author copies** for Marla and for the Lead Concepts and advisor pilots. Allow about two weeks.
- [ ] **20. Test every address printed in the book by phone:** /assessment, /consult, /go/uninsured-decade, /coaching.
- [ ] **21. Update** `docs/book-uninsured-decade/README.md` and `docs/HANDOFF.md` with the version, ASIN, and page count.
- [ ] **22. Then and only then, open the v2 track:** `v2-coauthor/chapter-plan.md`.

Timing note: KDP review took about two days per upload on the flagship.
