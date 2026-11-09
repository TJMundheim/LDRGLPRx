# Plan: Publish Count Yourself Skinny ahead of the app

## Context
TJ approved on 2026-11-09 getting the paperback ready before the iOS app ships. The book stands alone, but its citations are unchecked, it has no way to capture Amazon buyers, and seven decisions are open. Nothing reaches KDP, the live site or any inbox without TJ's say-so. Project rule overrides the plan template: commit to `main`, no branch, no PR, no worktree.

## Tasks

### [P1] Verify the 12 citations  [parallel]
model: sonnet
For each entry on the Sources page of `docs/book-cys/draft/_MASTER.md`, confirm the paper exists, the bibliographic details are right, and the book's claim matches the finding. Report only; no manuscript edits.
✓ DONE WHEN: `docs/book-cys/citation-check-2026-11-09.md` exists with one verdict per entry (12 or more verdict rows).

### [P1] Check the My4MLife claims printed in the book  [parallel]
model: haiku
Check whether the "free 12-week program, app, and weekly live calls" (title page, Ch 13), printed URLs and printed email addresses are true and reachable today.
✓ DONE WHEN: `docs/book-cys/claims-check-2026-11-09.md` exists with one true/false/unknown row per claim.

### [P2] Write proposed book edits  [sequential after P1]
model: opus
One before/after list: decisions 2a and 2b, the "32 is a limit, more isn't better" line, the My4MLife app clarification, citation fixes, and one free-offer page that promises nothing unavailable today. No manuscript edits.
✓ DONE WHEN: `docs/book-cys/proposed-edits-2026-11-09.md` exists and contains a before and after for each item.

### [P2] Build the free printable Count Log  [sequential after P1]
model: sonnet
Printable PDF of the weekly Count Log for Week 13 onward, matching the book's log and carrying its educational disclaimer.
✓ DONE WHEN: `docs/book-cys/free-offer/count-log-week-13-on.pdf` exists and opens with at least one page.

### [P2] TEST: signup page contract  [parallel]
model: sonnet
Assert the draft page posts to the existing lead-capture endpoint with email, name when given, source `cys-book`, and consent; contains no "coming soon", no weight-loss claim and no Amazon link in email.
✓ DONE WHEN: the new test runs under `pnpm vitest` in `website/` and fails only on missing behaviour.

### [P2] IMPL: finish the signup page  [sequential after TEST above]
model: sonnet
Finish `website/src/pages/go/_draft-count-yourself-skinny.astro`. Keep the underscore so it stays unrouted until TJ approves. No deploy.
✓ DONE WHEN: the P2 test passes and `pnpm build` in `website/` exits 0.

### [P2] Draft the welcome email  [parallel]
model: sonnet
Delivers the free log and the six counts. Link only to my4mlife.com pages. Draft only; sends nothing.
✓ DONE WHEN: `docs/launch/cys/welcome-email-draft-2026-11-09.md` exists and contains no `amazon.` or `amzn.` string.

### [P3] TJ decision sitting  [sequential after P2] [no-delegate: needs TJ's live answers]
Seven decisions in `docs/book-cys/tj-decisions.md`, the subtitle lock, the proposed edits, the page and the email.
✓ DONE WHEN: every item has a recorded answer in `docs/book-cys/tj-decisions.md`.

### [P4] Apply approved edits and rebuild  [sequential after P3]
model: sonnet
Apply only approved edits, run `docs/book-cys/render.py`, regenerate the cover at the new page count.
✓ DONE WHEN: a new B&W interior PDF exists and its page count matches the `--pages` value used for the cover.

### [REVIEW] Review  [sequential — runs last]
model: opus
- [ ] Tests green, `pnpm build` passes in `website/`
- [ ] No dead imports, no secrets committed
- [ ] Book and page follow brand rules
- [ ] Committed and pushed to `main` (no PR, per project rule)
✓ DONE WHEN: all checklist items checked and the commit is on `origin/main`.

Uploading to KDP and deploying the page are TJ-approved steps after this plan.
