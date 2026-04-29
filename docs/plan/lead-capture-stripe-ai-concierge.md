# Plan: Public Lead Capture → Stripe Cart → AI Concierge

## Context
Build a public, no-login lead funnel for 4M Life: anonymous visitor submits a discovery form, lands in a Stripe Checkout cart, pays for a consult, and from then on Claude autonomously emails and texts them to schedule and upsell. A single `Contact` table is the golden record across the platform; `Conversations`, `Touchpoints`, and `Orders` tables capture every interaction. Mirrors the proven Hims/Ro/Noom funnel; AI handles all conversation; capital-efficient (~$6K runway constraint).

## Execution rules
- Orchestrator delegates every task to a subagent (per global rules + TJ's explicit request).
- All same-phase tasks dispatch in parallel; wait; then next phase.
- TDD: every TEST task runs before its paired IMPL.
- Each Lambda <100 lines, esbuild-bundled.
- All deploys via `infra/clientportal/deploy.sh` (extended) — never console.

---

## Tasks

### [P1] Audit reusable code + Stripe/reCAPTCHA decisions  [parallel]
model: haiku
Read: existing AppSync schema (`infra/clientportal/appsync/schema.graphql`), existing DDB tables in `infra/clientportal/cdk/lib/data-stack.ts`, current Discovery flow (`apps/clientportal/src/lib/components/discovery/*` + `submitDiscovery` in `operations.ts`), and `apps/clientportal/.env.local`. Produce `docs/plan/lead-funnel-inventory.md` listing: existing entities reused, new entities needed (Contact/Conversations/Touchpoints/Orders), every Discovery callsite to refactor (file:line), existing SES setup in `lib/auth-stack.ts` to mirror for `concierge@my4mlife.com`. Also list env vars the build will need (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ANTHROPIC_API_KEY, RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY).
✓ DONE WHEN: `docs/plan/lead-funnel-inventory.md` exists with all four sections populated.

### [P1] Extend GraphQL schema with public + new types  [parallel]
model: opus
Edit `infra/clientportal/appsync/schema.graphql`. Add types: `Contact`, `Conversation`, `ConversationMessage`, `Touchpoint`, `Order`. Add a public mutation `submitLead(input: SubmitLeadInput!): Contact!` annotated `@aws_api_key` (NO @aws_cognito_user_pools — public). `SubmitLeadInput` carries `email!`, `phone`, `name`, `category`, `intakeAnswers: AWSJSON`, `recaptchaToken!`, optional `utmSource/utmMedium/utmCampaign`. Authenticated queries: `getContact(contactId)` (admin), `listMyConversations`, `listMyTouchpoints` (owner-scoped). Resolver intent comments: lead-router Lambda invokes via IAM; reCAPTCHA verified server-side before write. Add `@aws_iam` to admin queries so Lambdas can call.
✓ DONE WHEN: `npx graphql-schema-linter` exits 0 (using existing `.graphql-schema-linterrc`).

### [P1] Research Stripe + reCAPTCHA wiring (no code)  [parallel]
model: haiku
Produce `docs/plan/lead-funnel-vendors.md`: (a) Stripe Checkout session creation API surface (line items, success_url, cancel_url, metadata.contactId), webhook events to subscribe (`checkout.session.completed`, `charge.refunded`), test-mode key acquisition steps; (b) reCAPTCHA v3 invisible setup (script tag, action name, server-side `siteverify` endpoint + score threshold 0.5); (c) AWS WAF rate-limit rule structure for AppSync (`RateBasedStatement`, 10 req/IP/hour, key=IP). One page. No code.
✓ DONE WHEN: `docs/plan/lead-funnel-vendors.md` exists with all 3 sections.

---

### [P2] TEST: 4 new DDB tables synthesize  [sequential after P1]
model: sonnet
Extend `infra/clientportal/cdk/test/data.test.ts` to assert tables `Contacts`, `Conversations`, `Touchpoints`, `Orders` exist with PAY_PER_REQUEST, deletion protection, `removalPolicy: RETAIN`. `Contacts` PK `contactId`, GSI `byEmail` on `email`. `Conversations` PK `contactId` SK `messageId`. `Touchpoints` PK `contactId` SK `ts`. `Orders` PK `orderId`, GSI `byContact` on `contactId`. `Contacts` has DynamoDB Streams enabled (NEW_IMAGE).
✓ DONE WHEN: `pnpm --dir infra/clientportal/cdk test data --run` red (missing impl).

### [P2] IMPL: 4 new DDB tables  [sequential after TEST above]
model: sonnet
Edit `infra/clientportal/cdk/lib/data-stack.ts`: add the 4 tables matching test assertions. Streams on `Contacts`. Export as readonly props.
✓ DONE WHEN: `pnpm --dir infra/clientportal/cdk test data --run` exits 0 and `cdk synth` exits 0.

### [P2] TEST: AppSync public mutation + IAM admin queries  [parallel after P1, sequential after P1 schema]
model: sonnet
Extend `test/api.test.ts` to assert: API has `API_KEY` listed in additional auth providers (alongside Cognito + IAM); resolvers attached for `submitLead`, `getContact`, `listMyConversations`, `listMyTouchpoints`; an API key resource exists.
✓ DONE WHEN: `pnpm --dir infra/clientportal/cdk test api --run` red.

### [P2] IMPL: AppSync API key + resolvers for new types  [sequential after TEST above]
model: opus
Edit `infra/clientportal/cdk/lib/api-stack.ts`: add `API_KEY` to additional auth providers; create `IApiKey` resource (1 year expiry, output value). Add JS resolvers under `infra/clientportal/cdk/resolvers/`: `submitLead.js` (calls a NONE data source pipeline that invokes a Lambda data source for reCAPTCHA verify, then PutItem to Contacts; stamps `contactId = util.autoId()`, `lifecycleStage = "lead"`, `createdAt`), `getContact.js` (admin-gated GetItem), `listMyConversations.js` (owner-scoped Query on Conversations PK), `listMyTouchpoints.js` (owner-scoped Query). For owner scoping: contact owns rows where `cognitoSub == ctx.identity.sub` — resolver looks up Contact by sub via `byEmail` GSI fallback if needed; if no contact yet, return empty.
✓ DONE WHEN: `pnpm test api --run` exits 0; `cdk synth` exits 0.

### [P2] TEST + IMPL: reCAPTCHA verify Lambda  [parallel after P1, sequential after P1 schema]
model: sonnet
Lambda `infra/clientportal/cdk/lambdas/lead/recaptcha-verify.ts` (<100 lines): receives `{token, expectedAction, remoteIp}`, POSTs to `https://www.google.com/recaptcha/api/siteverify` with `RECAPTCHA_SECRET_KEY`, returns `{success, score, action}`. Throws if score < 0.5 or action mismatch. Unit test with `vi.fn` fetch mock asserts both happy path and low-score rejection.
✓ DONE WHEN: `pnpm --dir infra/clientportal/cdk test recaptcha --run` exits 0.

### [P2] TEST + IMPL: AWS WAF rate-limit on AppSync  [parallel after P1]
model: sonnet
In `lib/api-stack.ts` add `wafv2.CfnWebACL` with rule `RateBasedStatement` (limit 10/5min/IP, aggregate IP), associate via `wafv2.CfnWebACLAssociation` to the AppSync API ARN. `test/api.test.ts` asserts both resources exist and association points at the GraphQL API.
✓ DONE WHEN: `pnpm test api --run` exits 0.

---

### [P3] TEST: lead-router Lambda invokes Claude + sends email/SMS  [sequential after P2]
model: sonnet
`test/lead-router.test.ts`: mock `@aws-sdk/client-sesv2`, `@aws-sdk/client-sns`, `@aws-sdk/client-dynamodb`, and `@anthropic-ai/sdk`. Assert handler (a) parses DDB Streams INSERT event from Contacts, (b) calls Anthropic `messages.create` with cache-control on system prompt + product catalog, (c) sends SES email from `concierge@my4mlife.com` with In-Reply-To-eligible Message-ID, (d) publishes SNS SMS if `phone` present, (e) writes 2 rows to Conversations (system+assistant), (f) writes Touchpoints (`emailOut`, optional `smsOut`).
✓ DONE WHEN: `pnpm test lead-router --run` red.

### [P3] IMPL: lead-router Lambda  [sequential after TEST above]
model: opus
`lambdas/lead/lead-router.ts` (<100 lines split across small files if needed: `lead-router.ts`, `concierge-prompt.ts`, `claude-client.ts`). System prompt establishes 4M Life voice (mirror Hims tone — warm, expert, concise; brain-health framing). Pulls product catalog from `AppConfig` table and pricing from `TierCatalog`. Email body links to `https://app.my4mlife.com/cart?contactId=<id>&category=<cat>`. SES + SNS clients. Adds `@anthropic-ai/sdk` to bundling externals; reads `ANTHROPIC_API_KEY` from env. Wire as DDB Streams trigger on Contacts in `data-stack.ts` or new `lib/concierge-stack.ts`.
✓ DONE WHEN: `pnpm test lead-router --run` exits 0; lambda <100 lines per file; `cdk synth` exits 0.

### [P3] TEST + IMPL: SES concierge identity setup  [parallel after P2]
model: sonnet
Extend `infra/clientportal/setup-ses.sh` to also verify `concierge@my4mlife.com` (auto-covered if domain identity verified — assert via script). Update `lib/concierge-stack.ts` to grant ses:SendEmail on the lead-router lambda from concierge@. Test: cdk assertion that lead-router IAM policy includes `ses:SendEmail`.
✓ DONE WHEN: cdk test green; `setup-ses.sh` re-run exits 0.

---

### [P4] TEST: SES inbound handler  [sequential after P3]
model: sonnet
`test/inbound-email.test.ts`: simulate S3 PutObject event for raw email (mailparser-stub), mock SES, DDB, Anthropic. Assert handler (a) parses email, looks up Contact by From: address (byEmail GSI), (b) loads last 20 messages from Conversations, (c) calls Claude with full thread + system prompt, (d) sends reply via SES with In-Reply-To + References headers preserving thread, (e) appends 2 rows to Conversations, (f) appends `emailIn` + `emailOut` Touchpoints.
✓ DONE WHEN: `pnpm test inbound-email --run` red.

### [P4] IMPL: SES inbound receipt rule + handler Lambda  [sequential after TEST above]
model: opus
Create `lib/inbound-stack.ts`: S3 bucket `clientportal-inbound-mail` (lifecycle expire 90d), SES receipt rule set storing mail to S3 + invoking `lambdas/lead/inbound-email.ts` (<100 lines using `mailparser`). MX records for `my4mlife.com` upserted to Route53 pointing at `inbound-smtp.us-east-2.amazonaws.com` priority 10. Handler logic per test.
✓ DONE WHEN: `pnpm test inbound-email --run` exits 0; `cdk synth` exits 0; deploy script idempotent.

### [P4] TEST + IMPL: SNS inbound SMS handler  [parallel after P3]
model: sonnet
SNS two-way SMS via `aws sns set-sms-attributes` is limited; for v1 use SNS topic `inbound-sms` that the user's reply hits via SNS subscription on origination number. Lambda `lambdas/lead/inbound-sms.ts` (<100 lines): parse SNS message, lookup Contact by `byPhone` GSI (add to Contacts table via P2 migration if not present — adjust P2 task plan), load Conversations, call Claude, publish reply via SNS. Test mocks SNS + Claude + DDB. Note: until phone-number provisioning is done, deploy this stack but don't expose; document gap in handoff.
✓ DONE WHEN: `pnpm test inbound-sms --run` exits 0.

---

### [P5] TEST: Stripe Checkout session Lambda + webhook  [sequential after P3]
model: sonnet
`test/stripe.test.ts`: 
(a) `createCheckoutSession` Lambda — given `{contactId, lineItems[]}`, returns Stripe session URL with `metadata.contactId`, `success_url=https://app.my4mlife.com/cart/success?session_id=...`, `cancel_url=.../cart`. Mock Stripe SDK.
(b) `stripe-webhook` Lambda — verifies signature, on `checkout.session.completed` updates Contact `lifecycleStage=consult-paid`, creates Order row, writes Touchpoint `paymentSucceeded`, triggers a follow-up message on Contacts (rewrites `lastEvent` field — DDB Stream UPDATE picks it up; OR direct invoke lead-router with event type).
✓ DONE WHEN: `pnpm test stripe --run` red.

### [P5] IMPL: Stripe Lambdas + API Gateway  [sequential after TEST above]
model: sonnet
`lambdas/payments/create-checkout-session.ts` and `lambdas/payments/stripe-webhook.ts` (<100 lines each). Add `stripe` npm dep. Expose both via `apigatewayv2.HttpApi` in new `lib/payments-stack.ts` — endpoints `POST /checkout` (open, takes contactId+items) and `POST /stripe/webhook` (validates `Stripe-Signature` header). Reads `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from Secrets Manager (created in stack with placeholder until TJ provides keys). Output API URL.
✓ DONE WHEN: `pnpm test stripe --run` exits 0; `cdk synth` exits 0.

### [P5] TEST + IMPL: Order table + post-payment concierge follow-up  [sequential after P5 IMPL above]
model: sonnet
On `checkout.session.completed`, after writing Order, also re-trigger lead-router with event type `paymentCompleted` so it sends "your consult is paid, we'll reach out within 24h to schedule" and creates an `AdminQueueItem` in the existing AdminQueue table (so TJ sees it in the admin dashboard). Test asserts AdminQueue write happens.
✓ DONE WHEN: `pnpm test stripe --run` exits 0.

---

### [P6] TEST + IMPL: Frontend public Discovery → cart route  [sequential after P2 (API key) + P5 (Stripe)]
model: sonnet
`apps/clientportal/src/lib/components/discovery/DiscoveryFlow.svelte` + new `Cart.svelte`:
- DiscoveryFlow now usable while logged-out. On submit, calls a new `apps/clientportal/src/lib/api/public-client.ts` (uses `x-api-key` header from `VITE_APPSYNC_API_KEY` env), invokes `submitLead`, captures returned `contactId`, then `goto('/cart?contactId=<id>&category=<cat>')`.
- `Cart.svelte`: reads contactId+category from query, fetches SKUs from `getAppConfig` + `TierCatalog`, presents line items, "Pay" button POSTs to Stripe `/checkout` Lambda → redirects to Stripe-hosted Checkout. Free workbook ($0) SKU "checkout" hits a no-charge enrollment endpoint and routes to /thanks.
- Add invisible reCAPTCHA v3 script + token attach on submit.
- Component tests for both with vitest+jsdom asserting submit happy-path and free-tier path.
✓ DONE WHEN: `pnpm --dir apps/clientportal test --run` exits 0; `pnpm check` exits 0.

### [P6] TEST + IMPL: Touchpoints append helper + admin dashboard hook  [parallel after P5]
model: sonnet
`apps/clientportal/src/lib/api/operations.ts`: add `adminListContacts`, `adminGetContact(contactId)`, `adminListConversations(contactId)`, `adminListTouchpoints(contactId)`. Update `AdminDashboard.svelte` to render Contacts list with lifecycleStage badges + drill-in showing conversation thread. Tests mock operations.
✓ DONE WHEN: `pnpm --dir apps/clientportal test --run` exits 0.

---

### [P7] Seed v1 SKUs + AppConfig updates  [sequential after P6]
model: haiku
Extend `infra/clientportal/seed/seed.ts` to upsert v1 SKUs into AppConfig:
- `sku:consult` — Telemedicine consultation, $99 (default; placeholder until TJ confirms)
- `sku:workbook-free` — 4M Workbook App, $0 (freemium pivot)
- `sku:cohort-foundation`, `sku:cohort-optimization`, `sku:cohort-longevity`, `sku:cohort-concierge` — existing 4 tier prices retained but flagged `legacyPaidTier: true` per freemium pivot memory.
- Concierge system prompt under key `concierge:system-prompt` (read by lead-router and inbound-email lambdas at cold start).
✓ DONE WHEN: `./infra/clientportal/seed.sh --dry-run` exits 0 listing all 7 mutations; live `./infra/clientportal/seed.sh` succeeds in deploy phase.

---

### [P8] Deploy infra to live  [sequential after P7, no-delegate: requires user AWS confirmation]
model: sonnet  [no-delegate: requires user AWS credential confirmation]
Confirm with TJ. Run `./infra/clientportal/deploy.sh` (now deploys: data, auth, api, concierge, inbound, payments stacks). Run `setup-ses.sh` for concierge@. Place Stripe **test mode** keys in Secrets Manager via `aws secretsmanager put-secret-value` (TJ to provide; until then leave placeholder — webhook will fail signature check, intended). Update `apps/clientportal/.env.local`: add `VITE_APPSYNC_API_KEY`, `VITE_RECAPTCHA_SITE_KEY`, `VITE_STRIPE_CHECKOUT_API_URL`. Rebuild + deploy frontend via `apps/clientportal/deploy.sh`.
✓ DONE WHEN: `aws appsync list-graphql-apis` shows API key; `https://app.my4mlife.com/cart?contactId=test` returns 200; webhook endpoint reachable.

---

### [P9] Smoke test the full funnel  [sequential after P8, no-delegate: needs TJ to use Stripe test card]
model: sonnet  [no-delegate: requires real Stripe test-mode keys + manual interaction]
Manual smoke (or scripted with TJ): submit Discovery as anonymous → land on /cart → pay with Stripe test card 4242 4242 4242 4242 → confirm webhook fires (CloudWatch logs lead-router) → check inbox for AI-drafted email → reply to email → confirm Claude responds within 60s → check admin dashboard for contact + conversation thread + touchpoints + AdminQueue item.
✓ DONE WHEN: TJ confirms each step or screenshot of CloudWatch + DynamoDB rows captured in `docs/HANDOFF.md`.

---

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] `pnpm --dir apps/clientportal check` passes
- [ ] `pnpm --dir apps/clientportal test --run` green
- [ ] `pnpm --dir infra/clientportal/cdk test --run` green
- [ ] `pnpm --dir infra/clientportal/cdk exec cdk synth` clean (all stacks)
- [ ] No Stripe secrets / Anthropic API keys / reCAPTCHA secret committed (grep `git ls-files` and `git diff main`)
- [ ] Each new Lambda <100 lines and esbuild-bundled (NodejsFunction)
- [ ] Public `submitLead` mutation enforces reCAPTCHA + WAF rate limit (verify resolver pipeline + WebACL association)
- [ ] AI concierge prompt cached (verify `cache_control` on system block in lead-router + inbound-email)
- [ ] Conversations + Touchpoints written on every inbound/outbound event (grep handlers)
- [ ] No password flows reintroduced
- [ ] `docs/HANDOFF.md` updated with funnel description, env-var inventory, smoke-test screenshots, Stripe key TODO
- [ ] PR description written with summary + test plan + Loom-style end-to-end walkthrough

✓ DONE WHEN: all checklist items checked and PR opened against main.
