# Plan: Frictionless consent + Protégé rule

## Context
TJ 2026-10-15: remove every barrier around the physician script (the script itself is the moat and stays). (1) Push Patch buyers get an instant "order received, finish your 2-minute questionnaire" email at payment. (2) The Push Patch health form's one typed signature also covers the Notice of Privacy Practices acknowledgment + Patient Authorization, so every buyer's record is complete with zero extra steps. (3) /consult collects the same NPP + Authorization signature inside the intake, so nobody waits on a second email (Steve Collier stalled there). Protégé rule (TJ): anyone who completes the assessment and gets the welcome kit IS a Protégé; buyers are counted separately (Customers) for now; a buyer who later takes the assessment is both.

Legal text source of truth: lambdas/consent-sign/src/legal.ts (NPP_HTML, PATIENT_AUTH_HTML, LEGAL_VERSION '2026-09'). Stored shape (consent-sign/src/store.ts): record.consents[CONSENT_NPP_V1] and [CONSENT_PHI_AUTH_V1] = JSON string {version, legalVersion, at, typedName, ip?, userAgent?}; audit item action 'consent.signed'; copies emailed to patient + drtj@ (copyEmailHtml). The admin hand-off gate (updateEncounterStateAdmin pipeline) lifts when both exist.

## Tasks

### [P1] Design: consult consent-at-intake vs card-on-file  [parallel]
model: opus
Read consent-sign (card.ts, cardFlow.ts, stripeSetup.ts, handler.ts), consent-request, the admin resolvers (sendConsentRequestAdmin, updateEncounterStateAdmin pipeline) and website/src/pages/consult.astro + lambdas/patient-record-intake. Today the e-sign page ALSO collects card-on-file for priced lanes. Design how /consult signs NPP + Authorization at intake (Step 5) while priced lanes still get card-on-file without a second signature: e.g. consent-request detects both consents signed → priced lane: email a card-only link (consent-sign renders card step only when consents exist) / free lane: send nothing and return {ok:true, alreadySigned:true}. Specify exact file changes, test cases, and copy changes. Append as "## Appendix B — consult design" to this file.
✓ DONE WHEN: Appendix B exists with file-level changes + test list for consent-request, consent-sign, patient-record-intake, consult.astro

### [P1] TEST+IMPL: shared legal-consents package  [parallel]
model: sonnet
Create lambdas/_shared/legal-consents (`@my4mlife/legal-consents`): move LEGAL_VERSION, LEGAL_EFFECTIVE, NPP_HTML, PATIENT_AUTH_HTML from consent-sign/src/legal.ts plus a pure `buildSignedConsents({typedName, at, ip?, userAgent?})` → {npp, phi} in the stored shape, and `copyEmailHtml` from consent-sign/src/render.ts. consent-sign re-exports/imports from it (no behaviour change). Tests: shape matches what consent-sign's store writes today; consent-sign suite unchanged and green.
✓ DONE WHEN: `pnpm --filter @my4mlife/legal-consents test` and consent-sign's test command both exit 0

### [P1] TEST+IMPL: Push Patch instant "finish your questionnaire" email at payment  [parallel]
model: sonnet
In order-handler-core, where a Push Patch payment writes the PUSH_PATCH_PENDING marker, also invoke email-sender {kind:'info', from:'support'} to the buyer with a "Your Push Patch order is in — one 2-minute step left" email: button "Finish your questionnaire" → https://www.my4mlife.com/go/push-patch/thank-you?session_id=<id>; same tone/footer as lambdas/push-patch-reminder/src/email.ts (no identity/dignity tagline on Push Patch pages; no PHI). Composer in its own module < 100 lines. Failure to send must NOT fail the order (log error name only). Replays must not resend (send only when the marker is newly written). Write the subject + body text into docs/launch/push-patch/async-visit-copy.md as "Order-received email (2026-10-15)" for TJ review. Do NOT deploy.
✓ DONE WHEN: `pnpm --filter @my4mlife/order-handler-core test` exits 0 with new tests for send-on-new, no-send-on-replay, send-failure-doesn't-throw

### [P1] TEST+IMPL: Protégé = completed assessment (protegeSince)  [parallel]
model: sonnet
contact-upsert: add optional input `protege: true` → `protegeSince` via if_not_exists (tests). audit-complete passes stage 'protege' AND protege:true (TJ's rule supersedes the 2026-10-13 'lead' default); protege-signup and Cognito post-confirmation pass protege:true. nurture-worker accepts 'lead' OR 'protege' (still skips banned). Admin Protégé list (infra/clientportal/cdk/resolvers/listProteges.js) and the daily digest's new-Protégé count (grep for it) count rows with lifecycleStage 'protege' OR attribute_exists(protegeSince), so a customer who took the assessment still counts. Validate any APPSYNC_JS change with `aws appsync evaluate-code`. Do NOT deploy.
✓ DONE WHEN: tests exit 0 for contact-upsert, audit-complete, protege-signup, nurture-worker, and `cd infra/clientportal/cdk && pnpm test`

### [P2] TEST+IMPL: Push Patch form signature covers NPP + Authorization  [sequential after legal-consents]
model: sonnet
website/src/pages/go/push-patch/thank-you.astro: under the telehealth consent box add ONE required checkbox: "I acknowledge the Notice of Privacy Practices and sign the Authorization to share my health information with our network's licensed physicians and pharmacy partner." with links that open the full texts (new static pages website/src/pages/legal/privacy-notice.astro and legal/authorization.astro rendered from @my4mlife/legal-consents, Push-Patch-neutral styling ok). The same typed name signs all three. push-patch-intake: require the checkbox flag, write consents NPP + PHI-auth via buildSignedConsents (ip/UA from the request), audit 'consent.signed', email the copy to the patient (from support) — never block the intake on the copy email. No extra step for the buyer.
✓ DONE WHEN: push-patch-intake tests exit 0 (new: consents written in stored shape, missing checkbox → 400, copy-email failure doesn't fail) and `pnpm --filter ldrglprx-website build` exits 0

### [P2] TEST+IMPL: /consult signs at intake  [sequential after Design + legal-consents]
model: sonnet
Implement Appendix B exactly.
✓ DONE WHEN: every test command listed in Appendix B exits 0 and the website builds

### [P3] Copy: assessment invitation for Push Patch buyers  [sequential after P2; needs TJ OK before deploy]
model: sonnet
Add a short card to the Push Patch WELCOME email (sent on physician approval; lambdas/_shared/push-patch-decision-core) inviting the buyer to the free MindSpan assessment → https://my4mlife.com/assessment?src=push-patch-buyer ("take it and you get the book, the Logbook and the app"). Draft copy into docs/launch/push-patch/async-visit-copy.md first; tests for presence of link + src.
✓ DONE WHEN: push-patch-decision-core tests exit 0 and the copy is in the doc

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] All touched packages' tests green; website builds; APPSYNC_JS validated
- [ ] Stored consent shape identical across consent-sign, push-patch-intake, patient-record-intake; admin gate lifts for intake-signed records
- [ ] No PHI in emails/logs beyond what existing Push Patch emails already carry
- [ ] No new barrier added to the buyer path (count clicks/fields before vs after)
- [ ] No secrets; modules < 100 lines; commit message with summary + test plan pushed to main
✓ DONE WHEN: all checklist items checked and commits are on origin/main

## Deploy (after REVIEW + TJ OK on the two new email copies)
legal-consents consumers: consent-sign, consent-request → push-patch-intake, patient-record-intake → order-handler + stripe-events-retry → push-patch-decision + push-patch-decide-admin → audit-complete, protege-signup, lead-capture → clientportal CDK (cdk diff first) → website.

## Appendix B — consult design

**Shape.** The server builds the signature from one flag plus the typed name. The card stays a separate step with no signature, and it never blocks hand-off (the gate only checks the two keys). No resolver JS changes; if any resolver `.js` is touched anyway, validate it with `aws appsync evaluate-code`. New modules must stay under 100 lines.

**Pre-existing bugs fixed here:** the intake's `consents = :con` replaces the whole map, so a /consult re-submit wipes signatures already collected by email. The intake also stores whatever consents the client sends, so a forged `consent-npp-v1` would lift the gate.

### lambdas/patient-record-intake
- New `src/signature.ts` (pure): `typedSignature(parsed, demo)` returns the name or null. Requires `privacySign.agreed === true`, at least 3 characters, and a match on the first or last name. This is the same rule as consent-sign/validate.ts; keep them in sync.
- New `src/intakeConsents.ts`:
  - `writeConsentKeys`: bootstraps the map with `if_not_exists`, then SETs `#c.#k` for each key.
  - `signAtIntake`: calls `buildSignedConsents({typedName, at, ip: http.sourceIp, userAgent: http.userAgent})`, writes both keys, and audits `consent.signed` at `auditSk(ts, 1)` with detail `{npp, phiAuth, source:'intake'}`.
  - Emails: `copyEmailHtml` to the patient (subject "Your signed My4MLife privacy notice and authorization") and `[Consent signed] <name>` to NOTIFY_TO, both via email-sender `kind:'info'`. Wrap in try/catch and never fail the intake.
- `handler.ts`:
  - Drop `consents = :con`.
  - Strip client-sent `consent-npp-v1` and `consent-phi-auth-v1`, then write the remaining keys per key.
  - Call `signAtIntake` when the signature is valid. An invalid signature still saves the intake, and today's flow applies.
  - Return `consentsSigned`.
- `infra/deploy.sh`: add invoke permission on `my4mlife-email-sender`, plus env `EMAIL_SENDER_FN` and `NOTIFY_TO`. Add the `@my4mlife/legal-consents` dependency.
- Tests:
  - `valid signature → both keys stored as JSON {version, legalVersion, at, typedName, ip, userAgent}`
  - `consent.signed audit has encounterId, sk ≠ record-created`
  - `copy to patient + notice to drtj@`
  - `copy-email failure → 200, consentsSigned:true`
  - `name mismatch → 200, consentsSigned:false, no NPP/PHI write or audit`
  - `forged client consent keys ignored`
  - `no UpdateExpression contains "consents = "`
  - Rewrite the two `:con` tests to assert the per-key SET.

### website/src/pages/consult.astro (Step 5)
- Sub-copy: "Confirm everything looks right, then sign below so the physician can review your case. A care coordinator will reach out at the time you gave us."
- Required checkbox `#q-privacy`: "I acknowledge the Notice of Privacy Practices and sign the Authorization to share my health information with our network's licensed physicians." The two document names link to `/legal/privacy-notice` and `/legal/authorization` (new tab). The Push Patch P2 task builds those pages; if it hasn't landed, build them here.
- Input `#q-typed-name` labelled "Type your full legal name to sign", with `ESIGN_LINE` verbatim as fine print.
- `submitIntake`: run the same check client-side and show errors in `#q-submit-error`. The two messages:
  - "Please check the privacy box and type your full legal name to sign."
  - "The name you typed doesn't match the name you gave us. Please type your full legal name."
- Then send `privacySign: {agreed:true, typedName}`.

### lambdas/consent-request
- New `src/email.ts`: move `renderEmail` here (re-exported from handler) and add `renderCardEmail`.
  - Subject: "Save a card for your prescription".
  - Body: "Hi {first}, your privacy notice and authorization are already signed. One quick step left: save a card for your {laneLabel} prescription ({price} per 30-day supply). Nothing is charged until the physician approves."
  - Link: "Save my card". Footer: "This link is personal to you. — Dr. TJ"
- New `src/signed.ts`: `consentState(record)` returns `{signed, hasCard}`. `signed` means both keys are present, mirroring the gate.
- `handler.ts`: keep the lane stamp, then branch:
  - signed, priced, and no card: send the card email, audit `card.requested`, return `{ok, url, sentTo, alreadySigned:true, cardOnly:true}`.
  - signed otherwise: send nothing and return `{ok:true, alreadySigned:true}`.
  - Unsigned path unchanged.
- `store.ts`: the audit writer takes an `action` (default `consent.requested`).
- Tests:
  - `signed+priced+no card → card email, no "Read and sign", audit card.requested`
  - `signed+free lane → nothing sent, alreadySigned`
  - `signed+card on file → nothing sent`
  - `one consent only → today's email`

### lambdas/consent-sign
No code change. It already sends a signed record with no card to the card step. New test: `intake-signed, no card → GET shows card step only, no consent form/writes/emails`.

### Admin
- `infra/clientportal/appsync/schema.graphql`: add `alreadySigned` and `cardOnly` (Boolean) to `ConsentRequestResultAdmin`. Add the same fields to `operations.ts` (type and selection set).
- `admin/consents.ts`: new `consentAction(ready, card, requested)`:
  - not ready: today's labels.
  - ready, no card: "Send card link".
  - ready with a card: hidden.
- `PatientsAdmin.svelte`:
  - Button hidden: show "Signed and card on file — nothing to send."
  - `cardOnly` result: "Card link sent to {sentTo}."
  - `alreadySigned` result: "Already signed — nothing sent (no card needed for this lane)."
- Tests: the three `consentAction` branches in `consents.test.ts`.

**Existing patients** (no keys yet) keep today's exact flow. Signed patients on an unset or $0 lane get no card request; the coordinator picks a priced lane to collect a card.

**Commands:**
- `pnpm --filter @ldrglprx/patient-record-intake test`
- `pnpm --filter @ldrglprx/consent-request test`
- `pnpm --filter @ldrglprx/consent-sign test`
- `pnpm --filter clientportal test`
- `cd infra/clientportal/cdk && pnpm test`
- `pnpm --filter ldrglprx-website build`
