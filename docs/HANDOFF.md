# LDRGLPRx — Handoff

Last updated: 2026-05-25 (Stripe pipeline live, Protégé signup, EventBridge native integration).

---

## Current State

**Stripe Pipeline (EventBridge Native)**
- Contract: `docs/plan/stripe-eventbridge-architecture.md`
- Build plan: `docs/plan/stripe-eventbridge-implementation.md`
- All 5 handler Lambdas deployed: `order-handler`, `subscription-handler`, `refund-dispute-handler`, `stripe-events-retry`, `customer-portal-session`
- Infrastructure live: `stripe-keys` secret (placeholder values), SQS DLQ + permanent-failures queue, RetryState DDB table, SNS `my4mlife-stripe-alerts`, CloudWatch alarms
- No custom webhook Lambda; all events flow via AWS EventBridge Partner Event Source (native Stripe integration)

**Protégé Signup (New — 2026-05-25)**
- Lambda: `protege-signup` (Cognito user auto-create + DDB contact record + Mailgun welcome email)
- Frontend: `/protege-signup` page live, `/assessment` shows Protégé CTA + product tiles
- Home CTA points to `/assessment`; PWA installable
- Membership spec locked: Protégé (free app, sign-up only) → Graduate (earned after 12mo member activity); Insider tier removed

**Email & AI Concierge**
- Lambda: `email-sender` (Cognito CustomMessage + Mailgun send + direct invoke) — live
- Lambda: `inbound-handler` (Bedrock Claude inference on Mailgun replies) — wired, awaiting Mailgun activation
- System prompt: `lambdas/inbound-handler/src/system-prompt.ts` (full product catalog, consult pricing, gut-brain canonical, brand voice)
- Nurture stages 1–3 templates ready at `lambdas/nurture-worker/src/templates.ts`; Stage 1 works (15min via SQS); Stages 2–3 blocked on EventBridge Scheduler integration

**Build & Test Status**
- Website: 71 pages, clean build, 8/8 tests pass
- App: clean build, 80/81 tests pass (AdminDashboard.test.ts pre-existing failure)
- All 5 Lambda pairs (with tests): green
- Lambdas without tests: `inbound-handler`, `email-sender` (esbuild clean)

---

## Blocked on TJ

1. **Stripe Keys**: Live + test key values into `stripe-keys` secret via `aws secretsmanager put-secret-value`
2. **EventBridge Acceptance**: Stripe Dashboard → AWS EventBridge partner source acceptance (Partner Event Source setup)
3. **SNS Subscription**: Confirm email subscription to `my4mlife-stripe-alerts` topic
4. **E2E Walkthroughs**: 3 full-stack test payments once keys + EventBridge wired (including retry, chargeback, refund flows)

---

## Next Up

1. EventBridge Scheduler integration for nurture stages 2 + 3 (3-day, 7-day delays)
2. SES production-access request (volume threshold pending)
3. 10DLC SMS registration (volume threshold pending)
4. Photography: 40% leadership / 25% active / 15% family / 10% contemplative / 10% protocol

---

## Hot Files

- `docs/plan/stripe-eventbridge-architecture.md` — contract, event flow, schema
- `docs/plan/stripe-eventbridge-implementation.md` — Lambda specs, deploy scripts
- `lambdas/inbound-handler/src/system-prompt.ts` — AI brand voice & product catalog
- `apps/my4mlife/src/routes/protege-signup.astro` — signup page
- `apps/my4mlife/src/routes/assessment.astro` — Personalized Assessment (8-category audit)
- `apps/my4mlife/src/lib/stores/tiers.ts` — membership tier definitions
- `apps/my4mlife/src/lib/stores/skus.ts` — product SKU pricing + bundle config
