# Logbook v10 — electrolytes around the fasted lift (2026-09-23)

Scope: `docs/cohort-workbook/` only. Source of truth = `draft/_MASTER.md`.
**Page count: 155 (v9) → 156 (v10).** Output: `docs/cohort-workbook/The-Logbook-Month-1-v10.pdf` (2,074,346 bytes).

## The protocol (TJ approved 2026-09-23)

Electrolytes are now a named part of the stack, used around the fasted strength workout.
Training days: half a scoop of electrolytes with 5 g creatine in 16 oz of water before the fasted lift,
the other half after. It also blunts appetite if the member wants to push the fast further into the day.
Non-training days: creatine with breakfast as before.

## De-branded print rule honoured

No product brand name appears anywhere in the Logbook. The electrolyte is printed as
**"electrolyte powder (zero-calorie, low-sodium; see my4mlife.com for the one we use)"**.
Verified: zero occurrences of the live product name, zero of "LMNT", zero of "sea salt".
The live name lives only in the app and on the site.

## Six edits applied

1. **§3.2 stack table** — creatine row rewritten to the training/non-training split, and a new
   electrolyte row added beneath it ("Training days — half before the lift, half after").
2. **Seven daily check-in tracker checklists** — `Creatine 5g (breakfast)` →
   `Creatine 5 g (+ electrolytes around the lift on training days)` (×7, Mon–Sun of Week 1).
3. **Weekly grid row** — `D3 + K2 stack + creatine (breakfast)` →
   `… (+ electrolytes around the lift on training days)`.
4. **§4.2 cooldown / pre-workout note** — new **"Electrolytes on training days:"** line carrying
   the half-before / half-after split, the appetite note, and the non-training-day fallback.
5. **Creatine Monohydrate reference section, "What it pairs with"** — electrolyte split and the
   appetite note added ahead of the existing pre-workout-blend pairing.
6. **Pre-Workout Creatine + Citrulline + Beetroot + Electrolyte Blend section** — new
   **"Until the blend is in your hands:"** sentence noting a plain zero-calorie, low-sodium
   electrolyte powder covers the electrolyte part on its own.

Identity/dignity tagline untouched (9 occurrences, unchanged).

## Render + fulfillment

```
python3 docs/cohort-workbook/render.py            # _MASTER.md → draft/_MASTER.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=The-Logbook-Month-1-v10.pdf file://…/draft/_MASTER.html
aws s3 cp The-Logbook-Month-1-v10.pdf s3://my4mlife-digital-fulfillment/the-logbook-month1.pdf     --region us-east-2 --content-type application/pdf
aws s3 cp The-Logbook-Month-1-v10.pdf s3://my4mlife-digital-fulfillment/cohort-workbook-month1.pdf --region us-east-2 --content-type application/pdf
```

S3 verified via `head-object`: both keys **2,067,989 → 2,074,346 bytes**. No key added or renamed,
so the bucket policy did not need re-running.

Rendered **page 26** (the stack table) inspected as an image — the two new/rewritten rows break
cleanly and the whole table still fits on one page with room to spare.

## Left open

- `draft/01-09` chapter files remain stale relative to `_MASTER.md` (carried over from v9); they are
  not the render input and were not touched.
