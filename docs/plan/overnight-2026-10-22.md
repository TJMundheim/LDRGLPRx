# Plan: Overnight 2026-10-22 → 23 (study section, PUSHPATCH copy, segment exports)

## Context
TJ starts marketing hard on 2026-10-23. Tonight, prepare three things for his morning review. **Nothing goes live**: no deploys, no sends, no Stripe or SSM writes. Source for the study: ~/Downloads/Push Patch Study Results.pdf (Push Patch, LLC internal human studies). Key facts:
- NAD⁺ 1300 mg MeScreen 30-day study (n = 30): repeated 12-hour applications gave statistically significant gains in mitochondrial efficiency (ATP per oxygen) by days 15 and 30, in both sexes, with less oxidative stress.
- KPV + NAD⁺ study (n = 120, 7 days): NAD⁺ alone cut hs-CRP by a mean 82.8%; KPV + NAD⁺ cut it 94%, with 95% of participants under 1 mg/L; mean onset of a ≥ 1 mg/L drop was 2 days (KPV + NAD⁺) vs 4.7 days (NAD⁺ alone); p < 10⁻¹¹.
- Attribute everything as "in the manufacturer's testing". The study's KPV + NAD⁺ doses aren't stated, so don't claim it is our exact blend.

Live offer: code **PUSHPATCH**, $150 off any Push Patch blend through Oct 31, 11:59 p.m. CT (entered at Stripe checkout under "Add promotion code"). Prices: $650 for NAD⁺ blends, $550 for Glutathione Radiance.

Standing rules:
- Buyer-facing name is "Push Patch", never "Genesis Push Patch".
- Physicians are "our network's licensed physicians", never named.
- No identity/dignity tagline on Push Patch pages.
- No "men and women", no age ranges, no emoji in member UI.
- No Amazon links in emails.
- Physician review is the moat: never imply it is skipped.

## Tasks

### [P1] Study results section on /go/push-patch (hidden behind a flag)  [parallel]
model: sonnet
Add a compact "What the testing showed" section to website/src/pages/go/push-patch.astro, following the page's existing look. It is visible only when a new flag, SHOW_PP_STUDY, is true; follow how SHOW_COACHING / SHOW_BEASLEY_PARTNER flags are defined and read in website/. The default is off.

Content:
- Two stat cards: "94% average drop in hs-CRP (inflammation) in 7 days with KPV + NAD⁺" and "More energy per breath: mitochondrial efficiency up by day 15 and day 30 with NAD⁺ 1300", plus one line each of plain-language explanation.
- A small footnote naming the studies, their size and duration, "manufacturer's internal testing", and the statement that results vary.
- No new claims beyond the facts above.

Run `pnpm build` in website/ with the flag off (the section must be absent from dist), then with it temporarily on (present). Take a mobile and a desktop screenshot of the flag-on build: use the preview tools if available, else describe the section. Save the screenshots in docs/launch/push-patch/ as study-section-preview-*.png. Leave the flag OFF in the committed code.
✓ DONE WHEN: the build passes with the flag off and on, and a grep of dist confirms the section only renders with the flag on

### [P1] PUSHPATCH marketing copy  [parallel]
model: sonnet
Write docs/launch/push-patch/pushpatch-promo-copy-2026-10-23.md, matching the voice, structure and UTM style of docs/launch/push-patch/launch-posts-2026-10-06.md. Include:
- LinkedIn and Facebook posts for both angles ("tired of injections" and "never started because of needles"), each with the code, the deadline, one study stat and the UTM link (utm_campaign=push-patch-pushpatch, utm_source=linkedin|facebook, utm_content=<angle>).
- Three short "countdown" posts for Oct 29, 30 and 31.
- A warm-list email (subject options, body, a button to the page with utm_source=email) that tells people to type PUSHPATCH at checkout.
- A 30-second short-video script.

Facts only from Context. Make sure every link uses the real page URL https://my4mlife.com/go/push-patch.
✓ DONE WHEN: the file exists, every link includes utm_campaign=push-patch-pushpatch, and a grep finds no "Genesis Push Patch", no age range and no "men and women"

### [P1] TEST+IMPL: customer segment exports (queue step 5)  [parallel]
model: sonnet
In lambdas/_shared/contact-backfill (it already has AWS clients and an esbuild CLI pattern), add pure `src/segments.ts`: given Contact items, return named segments.
- push-patch-buyers: skusPurchased has push-patch-*, or stage customer with a push-patch source.
- push-patch-started-not-paid: source push-patch-form and no push-patch purchase.
- proteges: protegeSince or lifecycleStage protege.
- consult-leads: a source starting consult-intake:.
- captains-table: tag captains-table or source form:coaching-application.
- marketing-opted-in: marketingConsent.status opted_in.
- all-contacts.

Every segment excludes the tag suspected-bot, lifecycleStage banned, and test addresses (drtj+…@my4mlife.com, @example.com, smoke). Add `src/csv.ts` (RFC-4180 escaping) with columns email, firstName, lastName, phone, lifecycleStage, sources, tags, lifetimeValueUSD, createdAt. Tests come first.

Then add `src/export-cli.ts` and a package script `"export"` that scans Contact (read-only) and writes one CSV per segment to `~/Downloads/my4mlife-exports-<YYYY-MM-DD>/`, never inside the repo. It prints counts only, with no emails. Run it once for real and report the per-segment counts. Each module < 100 lines.
✓ DONE WHEN: `pnpm --filter @my4mlife/contact-backfill test` exits 0 and `pnpm --filter @my4mlife/contact-backfill export` writes the CSVs outside the repo and prints counts

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] Website builds; the study section is absent with the flag off; the claims match Context exactly and are attributed
- [ ] The copy follows the standing rules; the code, deadline and price math are correct ($650→$500, $550→$400)
- [ ] Export tests are green; no CSV or emails in the repo; exclusions are applied; modules < 100 lines
- [ ] Commit (no PR; main only) + HANDOFF START HERE updated with what TJ needs to review in the morning
✓ DONE WHEN: all checklist items checked and the commit is pushed to origin/main
