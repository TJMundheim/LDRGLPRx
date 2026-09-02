# Direct-buy Rx front door + gender-specific sweep — plan (2026-09-02)

LOCKED (TJ 2026-09-02): homepage = Hims/Ro treatment picker; 5 lanes in order —
GLP-1 (free) / Gut-Brain Rx (free) / GH-peptide placeholder tesamorelin-or-CJC-1295 (free) /
Testosterone men $249 live / Menopause & HRT women $249 live (NEW). Peptides+regenerative →
Services only. Copy GENDER-SPECIFIC (neutral where physiology isn't sex-specific).
Men-only commit (2026-07-03) SUPERSEDED.

## Phases
P1 (parallel, subagents): shared forcedVisitType TDD (menopause-hrt → audio-visual) ·
/rx/gh-peptide + questionnaire (clone weight-loss) · /rx/menopause-hrt + questionnaire
(clone testosterone-ed, $249/$129) · leaky-gut → "Gut-Brain Rx" no-formula copy ·
weight-loss neutral sweep · Navbar 5 treatment links · Footer/StickyCta/TrustBand/HowItWorks ·
index.astro rebuild (opus).
P2: website pnpm build; lambda vitest + esbuild.
REVIEW (opus): builds green, category strings consistent, gender rules, no formula leak,
no dead code/secrets, commit to main.
P4: deploy lambda (infra script) + website/deploy.sh; curl /rx/menopause-hrt = 200.

## Out of scope this pass
Book one v20 sweep · women's HRT prescribing partner · /solutions/* body copy · app.
