# Website midlife re-centering sweep — 2026-09-22

Follows the 2026-09-21 gender sweep (53 files, pronouns and sex-specific framing).
That pass fixed *sex*. This pass fixes *age*: every shared page should read as written
to a 42-year-old in midlife, not a 58-year-old executive male.

Scope: `website/src` only. Untouched by instruction: `women.astro`, `men.astro`,
the `index.astro` hero, `/go/uninsured-decade`, `/employers`, `lambdas/`, `apps/`.

Source: `docs/plan/all-genders-midlife-reframe-2026-09-22.md` §1, §3, §9.

## Spine sentence placed (once each)

> Alzheimer's is a disease that shows up when you're older. It starts in midlife.

| File | Placement |
|---|---|
| `website/src/pages/pillars/mind.astro` | new opening paragraph of "The Role of Mind in the 4M Framework" — spine + the modifiable-risk list (hearing, blood pressure, LDL, weight, alcohol, inactivity, depression, isolation, sleep), no study named |
| `website/src/pages/pillars/motivate.astro` | new paragraph before the barriers paragraph — spine + the same modifiable-risk list, framed as *why adherence over years is the point* |
| `website/src/pages/assessment.astro` | second hero sub-line, above the identity/dignity tagline |

Already carried the sentence before this pass (left as-is): `index.astro` hero,
`men.astro`, `women.astro`.

## Files changed

| File | Before → After |
|---|---|
| `website/src/data/skus.ts` (Fast Start Protocol tagline) | "For the man who wants to understand the system before he puts a supplement in his body." → "For you, if you want to understand the system before you put a supplement in your body." |
| `website/src/pages/solutions/financial-stress.astro` | "…poor quality of life **in your 60s** dwarfs any investment in prevention today." → "…**a narrowing life later** dwarfs any investment you make now, **in the decade the damage starts**." (no printed age range) |
| `website/src/pages/pillars/muscle.astro` | "Testosterone replacement therapy and **men's** hormone optimization…" → "Hormone optimization **on your lane** — TRT if you're a man, menopause and HRT if you're a woman…" (muscle loss is not a male-only topic; both lanes exist on site) |
| `website/src/pages/pillars/mind.astro` | + spine paragraph (above) |
| `website/src/pages/pillars/motivate.astro` | + spine paragraph (above) |
| `website/src/pages/assessment.astro` | + spine sub-line (above) |

Six files.

## Deliberately left

**Sex-specific by physiology — untouched, per rule:**
- `/rx/testosterone-ed` + questionnaire ("For Men", "$249", wife-lapel alt)
- `/rx/menopause-hrt` + questionnaire
- `/solutions/erectile-dysfunction` (incl. "men over forty", wife alt text)
- `/solutions/hormones` (TRT one-liner and description)
- `/blog/canary-in-the-mine-erectile-dysfunction`, `/blog/eliminate-the-insulting-behavior-hormones` and its excerpt on `/blog`
- `/solutions/environment/mineral-bath` (phthalate → testosterone), `/solutions/environment/grounding` (men's shoe sizing)
- nav/footer/home labels "For Men" / "Men" / "Women", and the `/consult` "Testosterone (men)" checkbox — those are lane clarity, not audience framing

**"Executive" left everywhere it appears** — every instance on the site is the
clinical term *executive function* (`/about`, the cognitive and gut "insulting
behavior" posts). No persona-executive copy survived the 09-21 pass; there is no
"peak-power decade" string anywhere in `website/src`.

**Other judged holds:**
- `/about` — Dr. TJ's own story ("the system **he** runs himself", three decades of
  clinical work). Founder voice stays male and honest, per §1/§9.
- `/about` photo alt "Patriarch with family" — the alt is accurate to the image that
  is there. Flagged for the photography pass (§4 shot list), not reworded here.
- `/regenerative-medicine`, `/solutions/pain-chronic` — "he" refers to Dr. TJ.
- Study citations that were run in men (`/solutions/environment` Finnish sauna cohort,
  `/pillars/muscle` creatine meta-analysis in older men) — accuracy beats framing.
- `/solutions/muscle` "through your 60s and 70s" — that is the *outcome* horizon, not
  the reader's age; it reads correctly to a 42-year-old.
- `/solutions/stress` "career peaks" — neutral, fits midlife.
- `/go/uninsured-decade` ("a retirement decade spent on your feet") — the Uninsured
  Decade line is written for the executive earner on purpose; out of scope by instruction.
- `/solutions/nutrition` "breakfast with the kids or grandkids" — both offered already.

Identity/dignity tagline untouched wherever it appears. No emoji, no Rx formula
exposure, no Genesis naming, no printed age range introduced.
