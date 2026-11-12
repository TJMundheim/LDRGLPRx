# Plan: Push Patch Pull-Up Challenge page

## Context
TJ's brief is his email of 2026-11-12, 11:48 CT, subject "Claude - Pull-Up Challenge page brief and rules (CORRECTED…)". The source text is saved in `docs/launch/pull-up-challenge/brief-2026-11-12.md`.

What it asks for:
- **A landing page on my4mlife.com.** Short version on top, the entry form near the top, and the full rules **verbatim**. Rules, dates and prize terms are never edited; problems go to TJ as flags.
- **An updated privacy policy** covering contest data and SMS/email marketing, with the sponsor address filling the placeholder.
- **The live URL sent back to TJ,** for his Instagram caption and the video end card.

URL: `my4mlife.com/pullup` (short enough for a video end card).

Project rules apply:
- commit on `main` only;
- Lambdas thin, under 100 lines, built with esbuild;
- deploy only through scripts;
- every funnel writes to the ONE Contact list with source and consent;
- PHI never goes in the Contact list. Age and bodyweight stay in the contest store only.
- Entering is NOT marketing consent. The email and SMS opt-ins are separate, optional and unchecked.

## Tasks

### [P1] TEST+IMPL: contest-entry Lambda  [parallel]
model: sonnet
New `lambdas/pullup-challenge-entry`. POST validates the fields, writes to a new DynamoDB table `PullUpChallengeEntries`, upserts the Contact record (email, name, phone, source `pullup-challenge`, explicit email and SMS consent with timestamps and consent text version; no age or bodyweight), and emails TJ a short new-entry notice. Bot fields work like lead-capture. Includes `infra/deploy.sh` and table creation.
✓ DONE WHEN: tests pass, handler is under 100 lines, `bash -n` passes on the scripts.

### [P1] TEST+IMPL: challenge page  [parallel]
model: sonnet
`website/src/pages/pullup.astro`: the Part 2 short version, the form, then the Part 3 rules verbatim, with every `[link coming]` replaced by `https://my4mlife.com/pullup`. Two separate consent boxes, each with its own consent language and a privacy link. The 18+/rules checkbox is required.
✓ DONE WHEN: tests assert verbatim rule paragraphs, the form fields, unchecked opt-ins and no "[link coming]"; `pnpm build` passes.

### [P1] Privacy policy update  [parallel]
model: sonnet
Edit `website/src/pages/privacy.astro` (and `docs/legal` source, if one exists): add contest entry data and SMS/email marketing, and replace "[Address to be provided]" with the sponsor address.
✓ DONE WHEN: the diff covers all three; `pnpm build` passes.

### [P2] TJ caption flags  [no-delegate: TJ]
The three flags: "one rep short of failure" conflicts with the true-max rule; "man among boys" reads men-only; stray "Instinct" at the end.

### [REVIEW]  [sequential — runs last]
model: opus
Checks: rules verbatim against the brief; consent separation; the PHI boundary; tests green; Lambda under 100 lines; no secrets. Then deploy the Lambda and the site through their scripts **after TJ previews the page**, send the URL to TJ, and commit and push.
