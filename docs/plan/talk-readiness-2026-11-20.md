# Plan: Talk readiness: event mode, drawing, website fixes

## Context
TJ's talk deck (v4.2) and presenter script promise four things the system doesn't do yet:
- automatic drawing entry for everyone who completes the assessment with the event's QR tag (`?src=talk-<event>`)
- a drawing run "from the admin page on your phone"
- a thank-you and email confirming the entry, the book/Logbook/app delivery and the Monday Zoom
- a free care-coordinator call where "we never call unless you ask"

A reviewer who walked through it also found:
- the assessment page sells prescription lanes
- the home page shows the $50,000 coaching offer
- three names for the assessment
- an undefined call

TJ approved building event mode, the drawing page and the quick fixes (2026-11-20). Nothing goes live until TJ gives the Monday Zoom start time.

## Decisions
- **Event mode** = the assessment URL carries `src` starting with `talk-`. In event mode:
  - no prescription-lane promotion on the assessment page or its results/thank-you screen
  - sensitive questions get "Prefer not to say"
  - thank-you shows: entered in tonight's signed-book drawing; book, Logbook and app in your email; "Join us Mondays at {ZOOM_TIME} on Zoom"; optional free call
  - the call line reads: "Want to talk it through? A free 15-minute call with a care coordinator. We never call unless you ask."
- **One name everywhere:** "MindSpan Assessment" (retire "Brain Check" and "4M Assessment" in UI copy).
- **Home page:** remove the Captain's Table ($50K) band. /coaching stays as a page for people TJ invites personally.
- **Consult page:** add the one-line call definition (free, about 15 minutes, by phone, a care coordinator calls, no card).
- **Zoom time:** ONE config value per codebase (website siteMode + audit-complete env/constant), currently `TBD`. Deploy is blocked while it is TBD (a test asserts it is not TBD at deploy time, or the deploy script refuses).
- **Drawing:**
  - an admin view in apps/clientportal (Cognito admin group): pick an event tag (list of `talk-*` sources seen in the last 14 days), see the entrant count, press Draw.
  - picks at random among entrants not already drawn and shows first name + last initial.
  - up to 3 winners in order (1st picks any book, 2nd from the two left, 3rd gets the last).
  - entrants = Contacts whose sources include that tag (completed assessment). No PHI shown.
- **Welcome email (audit-complete):** when src starts with `talk-`, add an event block (drawing entry confirmation + Monday Zoom line + the "we never call unless you ask" line). Otherwise unchanged.
- **Pending TJ inputs (not built):** treatment starting prices; Logbook Wednesday→Monday edit (book rebuild + S3 re-upload); app steps habit 10,000 → 2,500 floor; deck slide 33 hardcover line (TJ's file).

## Tasks

### [P1] TEST+IMPL: assessment event mode + website quick fixes  [parallel]
model: sonnet
- Files: website (assessment.astro and its results/thank-you, index.astro, consult.astro, siteMode.ts).
- Tests in website/tests.

✓ DONE WHEN: website `pnpm test` + `pnpm build` pass, and a source test proves event mode hides Rx lanes, shows the drawing + Zoom lines, offers "Prefer not to say" on sensitive questions, and that index has no Captain's Table band.

### [P1] TEST+IMPL: event welcome email  [parallel]
model: sonnet
- lambdas/audit-complete: event block when src starts with `talk-`; ZOOM_TIME config; confirm src is written to Contact.sources (it is the drawing's entry record).

✓ DONE WHEN: audit-complete tests + build pass, with tests for the event and non-event emails.

### [P1] TEST+IMPL: drawing admin view  [parallel]
model: sonnet
- apps/clientportal admin view + AppSync admin query/resolver in infra/clientportal (list event tags; list entrants for a tag as first name + last initial + contactId only).

✓ DONE WHEN: clientportal tests show no new failures vs the ~7 baseline, the build passes, and CDK tests + `cdk synth` pass.

### [REVIEW]  [last]
model: opus
- [ ] Tests and builds green
- [ ] Non-event assessment unchanged
- [ ] No PHI in the drawing view
- [ ] Copy matches the deck
- [ ] Deploy order written; deploy blocked on ZOOM_TIME

✓ DONE WHEN: checklist green.
