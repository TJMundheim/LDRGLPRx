# Logbook v9 — midlife spine + women's perimenopause canary (2026-09-22)

Scope: `docs/cohort-workbook/` only. Driven by `docs/plan/all-genders-midlife-reframe-2026-09-22.md` §6 (and §9 constraints). Builds on the v8 gender-specific sweep (`docs/audit/gender-sweep-logbook-2026-09-21.md`).

**Page count: 154 (v8) → 155 (v9).** Rendered source of truth = `draft/_MASTER.md`; chapter files `01-09` remain stale copies predating v6 (05 has no §5.2b/§5.3b at all) and are NOT the render input.

**Output:** `docs/cohort-workbook/The-Logbook-Month-1-v9.pdf` (2,067,989 bytes; v8 was 2,056,606).

## Constraints held

- No age range printed anywhere.
- No "men and women" as a phrase anywhere in the rendered file.
- No "gender neutral" phrasing.
- Identity/dignity tagline unchanged (cover, Part 1, back matter).
- De-branded print rule unchanged — no product brand names, no Genesis, "regenerative therapies" only.
- Dr. TJ's male-perspective voice kept in "Who This Logbook Is For".

## Changes

### 1. Midlife spine in the opening author's note (`_MASTER.md`, "Who This Logbook Is For")

Added above the existing "I am a man…" paragraph:

> **Alzheimer's is a disease that shows up when you're older. It starts in midlife.**
>
> That one sentence is why this program starts where it starts. The damage that gets a name in your seventies is laid down in the decade you are most likely standing in right now — the years when blood pressure creeps, sleep stops holding, the waist moves, hearing dulls, the drinking gets normalized, and the hormones begin to drift, and nobody calls any of it a disease yet. So this logbook is not written for the person already worried about a diagnosis. It is written for the person in the decade it starts, who still has every lever available.

### 2. "Peak-power decade" reframed (×1)

`_MASTER.md` §5.1 (and the stale `05-week-3-hormones-ed.md` copy, synced):

- before: "Most men I see in their **peak-power decade** have never had an honest conversation…"
- after: "Most men I see in their **forties and fifties** have never had an honest conversation…"

`_voice-brief.md` audience line also updated — it previously printed an age range ("readers aged ~50-65 in their peak-power decade") → now "men and women in midlife, centred on the decade it starts (the forties and fifties). Never print an age range." (Brief is not rendered into the PDF; changed so the range can't be reintroduced.)

### 3. "Executive" — nothing to reframe

The plan's "executive ×3" count is the **site** count (§3 of the plan), not the logbook. The only occurrences in `_MASTER.md` are the clinical term "executive function" (Magtein entry, Semax entry ×2). Left alone — correct usage, not audience framing.

### 4. Week 3 — women's canary brought to full equal weight

The women's track already existed at parity from v6 (§5.2b ten-marker self-audit on the identical 0–10 scale format as the men's, §5.3b four-domain worksheet, women's lab lane in §5.4 — all kept). v9 closes the three remaining gaps:

- **Heading:** "For women — the other canary" → **"For women — the perimenopause canary"**. §5.1 pointer line updated to match.
- **Intro:** two new Dr. TJ-voice paragraphs ahead of the existing cluster paragraph — perimenopause as the first readable signal (sleep that stopped holding, a mood you don't recognize, fog, weight to the middle, six years of being told to manage your stress); estrogen/progesterone/sleep architecture/metabolism moving together and moving through the brain; **"a cognitive event, not only a comfort one"**. Now three paragraphs of framing before the ten markers, matching the men's three.
- **Decision block:** new "The one decision this month" block closing §5.3b — engage the Rx consult layer now via the **Menopause & HRT lane** through the care coordinator at my4mlife.com, or stay OTC and reassess in 90 days, with both checkbox lines and a date field. "Both are legitimate. Defaulting is not."
- **Parity edit on the men's track:** the identical block added closing §5.3 (Testosterone & ED lane), so neither track carries more weight than the other. §5.4 (shared decision tree) unchanged.

### 5. Worked examples — no change needed

No named worked-example person appears anywhere in the logbook (the book's James/Elena question is a book-v23 item). Nothing to alternate; not forced.

### 6. Version markers

The logbook prints **no** internal version string — versioning lives only in the output filename. `v8 → v9` therefore = new PDF name `The-Logbook-Month-1-v9.pdf`. No cover/colophon/footer edit was required or made.

## Render + fulfillment

```
python3 docs/cohort-workbook/render.py            # _MASTER.md → draft/_MASTER.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=The-Logbook-Month-1-v9.pdf file://…/draft/_MASTER.html
aws s3 cp The-Logbook-Month-1-v9.pdf s3://my4mlife-digital-fulfillment/the-logbook-month1.pdf     --region us-east-2 --content-type application/pdf
aws s3 cp The-Logbook-Month-1-v9.pdf s3://my4mlife-digital-fulfillment/cohort-workbook-month1.pdf --region us-east-2 --content-type application/pdf
```

S3 verified via `head-object`: both keys **2,056,606 → 2,067,989 bytes**. No key added or renamed, so the bucket policy did not need re-running.

Rendered pages 56, 63 and 70 inspected as images — new heading, both decision blocks and the surrounding tables break cleanly; page numbering intact.

## Left open

- `draft/01-09` chapter files are stale relative to `_MASTER.md` (they predate the v6 women's track). Either regenerate them from the master or delete them; today only the exactly-matching lines were synced.
- `gen-assessment-ref.py` was NOT re-run — `website/src/data/audit-questions.ts` was not touched this session.
