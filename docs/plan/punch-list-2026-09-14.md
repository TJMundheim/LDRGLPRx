# TJ site/app test punch list — 2026-09-14 (Surface laptop, fresh account drtj@mdspecialtygroup.com)

## Batch 1 — functional (building now)
1. Hero = two doors only in coordinator mode: free care coordinator call / take the MindSpan assessment. Cards off front page.
2. Blank-intake loop: site remembers a finished intake (localStorage my4m_intake) → "You're all set… add a note" instead of the empty form; results page leads with the call.
3. Welcome email: intake-aware CTA ("Your intake is in…" vs "Book your free care coordinator call"); never link Rx questionnaires in coordinator mode.
4. /rx/leaky-gut caption: gut-lining formulation taken WITH first meal when breaking the fast (late morning/early afternoon), not "one morning at a time".
5+8. App dashboard: top tally box = "Protocol Score — this week" (adherence tally; 12→15 when Monday's boxes checked); MindSpan Score = assessment baseline (56) as headline.
6. Wording: "MindSpan assessment" = questionnaire; "MindSpan Score" = number; never "assessment score"/"audit" user-facing.

## Batch 2 — app restyle + voice-first logging (next pass)
7. Visual: navy backdrop reads near-black on Surface; red text on blue and blue checkboxes on blue fail contrast. Apply enterprise A+C hybrid direction (docs/design/enterprise-design-directions.html, docs/plan/mission-control-restyle.md); lighter surfaces; contrast-checked palette.
9. Logging labor: a day's log in <30 s, doable mid-workout, voice-first — "Tell Dr. TJ's AI" mic/text log (Bedrock parses into fields), "Same as yesterday" one-tap, chips not keyboards for numbers, nothing mandatory daily. Note: PWA cannot read Apple Health (native only).

## Held locally until batch 1 deploys (all pushed together)
Peptides card/nav (51bd0275), standard tagline in hero (f846ea1e), cleanup script (e7d38fc8 + fix).
