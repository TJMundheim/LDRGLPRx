# Stage-2 HIPAA consent: hosted e-sign + provider hand-off gate (2026-09-22)

Finding: no DocuSign integration existed (June plan = coordinator sends manually; never built). Replaced with an owned e-sign page.

## Flow
1. Admin → Patients → Consent checklist → **Send consent forms** → `sendConsentRequestAdmin` → `my4mlife-consent-request` emails patient a personal HMAC link.
2. Patient opens `my4mlife-consent-sign` Function URL: reads NPP + Patient Authorization (legal text from docs/legal, version 2026-09), checks both acknowledgments, types full legal name (E-SIGN) → UpdateItem `consents['consent-npp-v1']`, `consents['consent-phi-auth-v1']` (+ typedName, ip, userAgent, legalVersion) + audit `consent.signed`; copies emailed to patient and drtj@.
3. Gate: `updateEncounterStateAdmin(toState:'sent-to-provider')` → pipeline resolver reads record consents; rejects `ConsentRequired` unless both present. Admin UI disables the transition until signed.

## Stage model (unchanged): Stage 1 no friction; Stage 2 = this page before booking; Stage 3 = telemed practice's own paperwork (BAA in docs/legal).
## Deploy order: consent-sign (prints Function URL) → set CONSENT_SIGN_URL in consent-request deploy.sh → consent-request → CDK (schema, pipeline resolver, new mutation) → clientportal app. Verify with a synthetic record: send → open link → sign → gate lifts.
