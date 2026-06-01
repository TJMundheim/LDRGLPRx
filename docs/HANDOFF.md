# 2026-05-31 — One-path Protégé flow is fully working

End-to-end signup → app dashboard with carried-forward assessment data is live and tested.

## The journey (debugging chain that landed us here)

1. **Phone E.164 normalization** — Protégé signups weren't landing in Contact because the form sent unformatted phone numbers; Lambda rejected with 400.
2. **Assessment results email missing** — added audit-complete → email-sender path.
3. **Assessment retake in app** — `Contact` and `Users` (UserProfile) are separate DDB tables; app couldn't see audit data. Extended UserProfile schema with `auditTop3` / `auditCompletedAt` / `intakeAnswers` and made protege-signup seed those from Contact.
4. **Duplicate signup form on /protege-signup** — replaced with `window.location.replace('/welcome-protege')` to make back-button safe.
5. **PWA service worker stale** — added `skipWaiting`/`clientsClaim` + controllerchange auto-reload.
6. **Welcome email pointed to non-existent /set-password** — rewrote to link to app root with honest email-OTP copy.
7. **One-path refactor** — removed Sign In from homepage, added phone-required + Protégé consent to assessment, built `/become-protege` page that POSTs signup behind the scenes + redirects to app with `?new=1&email=…`.
8. **Double sign-in code** — /become-protege pre-triggered OTP causing two codes; moved auto-trigger to EmailEntry onMount with `?new=1`.
9. **Intake gate stuck** — disabled the gate entirely per locked 2026-05-25 spec (signed-in = Protégé = full access).
10. **Renderer reading wrong localStorage key** — `audit-v1` vs `intake-audit-scores-v1`; hydration now writes both.
11. **AppSync client envelope confusion** — App.svelte was reading `profileResult.data.getMyProfile`; client already strips the `data` wrapper. Fixed to read `profileResult.getMyProfile`.
12. **AWSJSON double-encoded over the wire** — added `parseAwsJson()` that parses once and re-parses if the result is still a string.

## Working today

- Assessment carries name/email/phone/consent + answers + top3 to /become-protege.
- /become-protege auto-creates Protégé in Cognito + Contact + Users, redirects to app.
- App auth screen auto-sends OTP, skips firstName field for fresh signups.
- App dashboard hydrates `audit-v1` + workbook.factorScores + workbook.priorities from UserProfile on sign-in.
- Top-3 priorities show on dashboard + Week 1; sidebar fully unlocked.

## TJ blockers still pending (carryover; pre-existing)

- Stripe E2E #1/#2/#3 walkthroughs
- Bedrock daily token quota increase (optional)
- Zoom S2S credentials into `zoom-ops-creds` secret
- Phone number for SMS approval queue v2 (email approvals already working)

## 2026-05-31 (late) — Cross-device sync confirmed working

After fixing the workbookJson double-decode (commit dba622e7), TJ tested
Mac → iPhone signed-in cross-device flow with drtj@essentialmanage.com.
Phone dashboard populated with all Mac state: name, start date, top-3
priorities, Week 1 motivation answer. End-to-end Protégé flow is
production-ready for inner-circle UX testing.

The double-encoding pattern (parseAwsJson) now wraps all three AWSJSON
fields: auditTop3, intakeAnswers, workbookJson. Any future AWSJSON
field added to UserProfile should use the same defensive parse.
