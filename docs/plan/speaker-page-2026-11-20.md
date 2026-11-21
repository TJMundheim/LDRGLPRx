# Plan: Speaker page (/speaking) + booking requests

## Context
TJ (2026-11-20): talks are the main $0 channel ("anybody that will either pay me or let me speak for free"). Program chairs, gyms, advisors and HR people need one page to see the talk and request a date. Content follows deck v4.4 (Body, Brain, Bank; mission up front). Requests go through the existing public form route (email-sender, POST /api/contact-form) as formId `speaking-inquiry`: the requester is saved to Contact (tag `speaking`), TJ gets the internal alert, and the requester gets a short confirmation from Dr. TJ. Page ships noindex behind `SPEAKING_APPROVED = false` until TJ approves the copy.

## Decisions (copy rules)
- Name him "Dr. TJ" (no ", DC"); positioning "health-span educator · 30+ years in clinical practice"; never "physician"/"MD"/"treat".
- Disclaimer line: "Dr. TJ speaks as a health-span educator and does not provide medical care through this platform."
- Identity line verbatim: "Don't lose your identity and your dignity while you still have a choice."
- Fee: free for community groups and nonprofits; conferences, corporate and client-appreciation events ask about an honorarium. No pitch from the stage.
- No "coming soon" (no video placeholder until the recording exists). drtj@ address never on the page.
- Based in Dallas–Fort Worth; travels for events; anywhere on Zoom.

## Tasks

### [P1] TEST+IMPL: email-sender accepts `speaking-inquiry`  [parallel]
model: sonnet
lambdas/email-sender: add `speaking-inquiry` to form-contact ALLOWED with TAGS ['speaking']; bot check like partner-application; new `speaking-confirmation.ts` (pure, from Dr. TJ, includes the identity line) wired in handler.ts like partner-application. Tests first.
✓ DONE WHEN: `pnpm test` and build in lambdas/email-sender pass, with tests for capture, bot skip and confirmation copy.

### [P1] TEST+IMPL: /speaking page + footer link  [parallel]
model: sonnet
website/src/pages/speaking.astro (+ siteMode flag `SHOW_SPEAKING`, noindex while false), footer "Speaking" link, form posting formId `speaking-inquiry` with honeypot + timing. Source test in website/tests.
✓ DONE WHEN: website `pnpm test` + `pnpm build` pass and dist/speaking/index.html exists.

### [REVIEW]  [last]
model: opus (orchestrator reviews in browser)
- [ ] Tests/builds green  - [ ] Copy rules above  - [ ] Mobile layout  - [ ] No secrets/PHI
✓ DONE WHEN: checklist green; deploy only on TJ's OK.
