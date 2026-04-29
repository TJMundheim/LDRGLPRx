# Plan: Multi-user, API-driven Client Portal on AppSync + Cognito + DynamoDB

## Context
The Svelte 5 PWA in `apps/clientportal` is currently single-user with hardcoded content in `src/lib/data/schema.ts` and a localStorage adapter. We will provision Cognito (passwordless email-OTP user pool + identity pool with admin group), an AppSync GraphQL API backed by DynamoDB tables with owner-scoped resolvers, all via deploy scripts in `infra/clientportal/`, then wire the front end to authenticate with Cognito and read/write all program/4M/discovery/outcome data via AppSync.

## Identity model
- Cognito stores ONLY: `id` (sub/UUID) and `email` (primary, mutable, verified).
- All other profile fields (name, dob, phone, tier, prefs, **secondaryEmail**, etc.) live in DynamoDB `Users` table (`UserProfile` GraphQL type), owner-scoped by `sub`.
- Auth is **passwordless**: email → 6-digit code → tokens. No password UI, no SRP.
- Email delivery for now uses **Cognito's built-in email** (no SES). Switch to SES later.

## Execution rules
- Orchestrator delegates every task to a subagent (per global rules).
- All P1 tasks dispatch in parallel; wait for completion; then P2; etc.
- TDD: TEST tasks run before paired IMPL tasks.

---

## Tasks

### [P1] Audit current data shapes and storage seams  [parallel]
model: haiku
Read `apps/clientportal/src/lib/data/schema.ts`, `catalog.ts`, `intake.ts`, `adminQueue.ts`, `src/lib/storage/*`, `src/lib/renderer.ts`, `src/lib/integrations/auth.ts`, and `src/App.svelte`. Produce `docs/api-migration/inventory.md` listing every entity (User, Program, Tier, MonthPillar/4M week, DiscoveryResponse, Outcome, AdminQueueItem, IntakeForm), its fields, and every read/write call site (file:line). Note which are per-user vs global config.
✓ DONE WHEN: `docs/api-migration/inventory.md` exists with one section per entity and a callsite table.

### [P1] Draft GraphQL schema  [parallel]
model: opus
Create `infra/clientportal/appsync/schema.graphql` defining types: `UserProfile`, `Program`, `Tier`, `MonthPillar`, `WeeklyContent`, `DiscoveryResponse`, `Outcome`, `IntakeForm`, `AdminQueueItem`, `AppConfig`, `TierCatalog`. Default auth `@aws_cognito_user_pools`; `@aws_auth(cognito_groups:["Admins"])` for admin-only mutations. User-owned types carry `owner: ID!` (= cognito sub).
`UserProfile` fields: `id: ID!` (= sub), `primaryEmail: AWSEmail!` (mirror of Cognito email, reconciled on login), `secondaryEmail: AWSEmail`, plus all profile fields from P1 inventory (name, dob, phone, address, prefs, tier, etc.). `secondaryEmail` is DynamoDB-only — never written to Cognito.
Mutations: `upsertMyProfile`, `updateSecondaryEmail`, admin `adminGetProfile(userId)`, admin `adminListUsers`, admin `adminListOutcomes`. Resolver rule: on first authenticated call, auto-create `UserProfile` for `ctx.identity.sub` using the ID-token `email` claim if missing (fallback to PostConfirmation Lambda).
✓ DONE WHEN: `npx graphql-schema-linter infra/clientportal/appsync/schema.graphql` exits 0.

### [P1] Pick infra tool and scaffold  [parallel]
model: opus
Use **AWS CDK (TypeScript)**. Create `infra/clientportal/cdk/` with `package.json` (pnpm), `cdk.json`, `bin/clientportal.ts`, empty `lib/clientportal-stack.ts`. Add `infra/clientportal/deploy.sh` (executable) running `pnpm install && pnpm cdk deploy --require-approval never`. Do not deploy.
✓ DONE WHEN: `pnpm --dir infra/clientportal/cdk run build` exits 0 and `deploy.sh` is executable.

---

### [P2] TEST: Passwordless Cognito stack synthesizes  [sequential after P1 scaffold]
model: sonnet
In `infra/clientportal/cdk/test/auth.test.ts` (vitest + `aws-cdk-lib/assertions`), assert template contains:
- `AWS::Cognito::UserPool` with `UsernameAttributes: [email]`, `AutoVerifiedAttributes: [email]`, schema with only `email` (no name/phone/custom profile attrs).
- `UserPoolClient` with `ExplicitAuthFlows` including `ALLOW_CUSTOM_AUTH` and NOT `ALLOW_USER_PASSWORD_AUTH`/SRP.
- Three Lambda triggers wired: `DefineAuthChallenge`, `CreateAuthChallenge`, `VerifyAuthChallengeResponse`.
- `PostConfirmation` and `PostAuthentication` Lambda triggers attached.
- `IdentityPool` and `Admins` Cognito group.
✓ DONE WHEN: `pnpm --dir infra/clientportal/cdk test auth` exits 0 after IMPL.

### [P2] IMPL: Passwordless Cognito + email-OTP triggers  [sequential after TEST above]
model: opus
In `lib/auth-stack.ts`: UserPool (`signInAliases: { email: true }`, `autoVerify: { email: true }`, mutable email, no other attributes). UserPoolClient with `authFlows: { custom: true }` only. IdentityPool wired to UserPool. IAM auth/unauth roles. `Admins` group.
Create three Node20 Lambdas under `infra/clientportal/cdk/lambdas/auth/` (esbuild-bundled, <100 lines each):
- `define-auth-challenge.ts` — issues one `CUSTOM_CHALLENGE`, succeeds on correct answer.
- `create-auth-challenge.ts` — generates 6-digit code, returns it in `privateChallengeParameters`. **No SES.** Cognito's built-in email channel handles delivery (use `CustomMessage_Authentication` trigger or default custom-auth email).
- `verify-auth-challenge.ts` — compares submitted answer to private param.
Outputs: `userPoolId`, `userPoolClientId`, `identityPoolId`.
✓ DONE WHEN: auth.test.ts green and `pnpm cdk synth` exits 0.

### [P2] TEST + IMPL: PostConfirmation + PostAuthentication profile sync  [sequential after auth IMPL]
model: sonnet
Lambdas under `lambdas/auth/` (<100 lines each):
- `post-confirmation.ts` — `PutItem` to DynamoDB `Users` with `id = event.userName`, `primaryEmail = event.request.userAttributes.email`.
- `post-authentication.ts` — if stored `primaryEmail` differs from token email, `UpdateItem` to reconcile.
Unit tests with mocked DynamoDB client assert correct `PutItem`/`UpdateItem` calls. Wire both as UserPool triggers in `auth-stack.ts`. auth.test.ts asserts both attached.
✓ DONE WHEN: lambda unit tests green; auth.test.ts assertions for both triggers pass.

### [P2] TEST: DynamoDB tables synthesize  [parallel with auth tests, sequential after P1 scaffold]
model: sonnet
Add `test/data.test.ts` asserting tables `Users`, `Programs`, `WeeklyContent`, `DiscoveryResponses`, `Outcomes`, `IntakeForms`, `AdminQueue`, `AppConfig` exist with PAY_PER_REQUEST billing and `byOwner` GSI on `owner` for user-owned tables.
✓ DONE WHEN: `pnpm test data` exits 0 after IMPL.

### [P2] IMPL: DynamoDB stack  [sequential after TEST above]
model: sonnet
In `lib/data-stack.ts` create the 8 tables. User-owned: PK `id`, GSI `byOwner` on `owner`. `AppConfig` PK `key`. Export ARNs.
✓ DONE WHEN: data.test.ts green.

### [P2] TEST: AppSync API + resolvers synthesize  [sequential after P1 scaffold]
model: sonnet
Add `test/api.test.ts` asserting `AWS::AppSync::GraphQLApi` with `AMAZON_COGNITO_USER_POOLS` default auth, `AWS_IAM` additional auth, and resolvers attached for `getMyProfile`, `upsertMyProfile`, `updateSecondaryEmail`, `listMyOutcomes`, `createOutcome`, `getAppConfig`, `adminListUsers`, `adminGetProfile`.
✓ DONE WHEN: `pnpm test api` exits 0 after IMPL.

### [P2] IMPL: AppSync stack with owner-scoped resolvers  [sequential after TEST above]
model: opus
In `lib/api-stack.ts` create GraphqlApi from `appsync/schema.graphql`. DynamoDB data sources per table. JS resolvers (APPSYNC_JS) under `infra/clientportal/cdk/resolvers/`:
- User-owned mutations stamp `owner = ctx.identity.sub`.
- Queries filter by `owner` via `byOwner` GSI.
- Admin fields gated by `ctx.identity.groups` containing `Admins`.
- `AppConfig` mutations Admins-only; queries open to authenticated users.
- `getMyProfile` auto-creates row if missing (defense-in-depth alongside PostConfirmation).
✓ DONE WHEN: api.test.ts green and `pnpm cdk synth` exits 0.

---

### [P3] Seed script for AppConfig + Tier catalog  [sequential after P2]
model: sonnet
Create `infra/clientportal/seed/seed.ts` reading hardcoded content from `apps/clientportal/src/lib/data/schema.ts` and `catalog.ts`, transforming into GraphQL mutations, posting to AppSync via IAM-signed requests (`@aws-sdk/client-appsync` or `aws4fetch`). Wrapper `infra/clientportal/seed.sh`.
✓ DONE WHEN: `./infra/clientportal/seed.sh --dry-run` prints planned mutations and exits 0.

### [P3] TEST: Passwordless auth client  [parallel, sequential after P2]
model: sonnet
`apps/clientportal/src/lib/auth/cognito.test.ts` with mocked `@aws-sdk/client-cognito-identity-provider`. Assert: `requestEmailCode(email)` calls `InitiateAuth` with `AuthFlow: CUSTOM_AUTH`; `submitEmailCode(email, code)` calls `RespondToAuthChallenge` with `ChallengeName: CUSTOM_CHALLENGE` and persists tokens; `getIdToken`, `getCurrentUser`, `signOut` behave; `updatePrimaryEmail(newEmail)` calls `UpdateUserAttributes` then `VerifyUserAttribute`. No password methods exist.
✓ DONE WHEN: `pnpm --dir apps/clientportal test auth` exits 0 after IMPL.

### [P3] IMPL: Passwordless auth client  [sequential after TEST]
model: sonnet
`pnpm --dir apps/clientportal add @aws-sdk/client-cognito-identity-provider`. Implement `src/lib/auth/cognito.ts` exposing `requestEmailCode`, `submitEmailCode`, `signOut`, `getIdToken`, `updatePrimaryEmail`, `getCurrentUser`. Replace `src/lib/integrations/auth.ts` to delegate. Read `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`, `VITE_COGNITO_REGION` from env.
✓ DONE WHEN: cognito.test.ts green; `pnpm --dir apps/clientportal check` exits 0; no `password` references in `src/lib/auth/`.

### [P3] TEST: AppSync GraphQL client  [parallel, sequential after P2]
model: sonnet
`src/lib/api/client.test.ts` asserts the client attaches `Authorization: <idToken>` header and that a `listMyOutcomes` call POSTs to `VITE_APPSYNC_URL` with the correct query (vi.fn fetch mock).
✓ DONE WHEN: `pnpm test api/client` exits 0 after IMPL.

### [P3] IMPL: AppSync client + typed operations  [sequential after TEST]
model: sonnet
`src/lib/api/client.ts` (small fetch wrapper, no Amplify). `src/lib/api/operations.ts` with typed functions: `getAppConfig`, `listTiers`, `getProgram`, `listWeeklyContent`, `getMyProfile`, `upsertMyProfile`, `updateSecondaryEmail`, `submitDiscovery`, `createOutcome`, `listMyOutcomes`, plus admin variants. TS types from `schema.graphql` via `graphql-codegen` (`apps/clientportal/codegen.yml`).
✓ DONE WHEN: api/client tests green and `pnpm check` exits 0.

---

### [P4] TEST: AuthGate UI flow  [sequential after P3 auth IMPL]
model: sonnet
`src/lib/components/auth/AuthGate.test.ts` (vitest + @testing-library/svelte): unauthenticated user sees `EmailEntry`; submitting email moves to `CodeEntry`; submitting valid code (mock resolves) renders the slot. No signup screen exists.
✓ DONE WHEN: `pnpm test AuthGate` exits 0 after IMPL.

### [P4] IMPL: AuthGate + email/code/profile screens  [sequential after TEST]
model: sonnet
Components: `AuthGate.svelte`, `EmailEntry.svelte` (calls `requestEmailCode`), `CodeEntry.svelte` (6-digit input → `submitEmailCode`), `Profile.svelte` (shows primary email with change flow; secondary email field persists via `updateSecondaryEmail` to DynamoDB only). Wrap `App.svelte` in `<AuthGate>`. Expose `currentUser` store at `src/lib/auth/store.ts`.
✓ DONE WHEN: AuthGate test green; manual `pnpm dev` shows email→code→app flow.

### [P4] IMPL: Replace hardcoded data reads with API calls  [sequential after P3 api IMPL]
model: sonnet
Refactor callsites identified in P1 inventory (`renderer.ts`, `data/schema.ts`, `catalog.ts`, `adminQueue.ts`, `intake.ts`) to fetch via `src/lib/api/operations.ts`. Keep TS types (codegen target). Remove `localStorageAdapter` writes for server-owned entities; retain only for true client-only state (UI prefs).
✓ DONE WHEN: `pnpm --dir apps/clientportal check` exits 0 and `grep -R "userAttributes\." apps/clientportal/src` returns only the auth client itself.

### [P4] IMPL: Admin view gated by Cognito group  [sequential after P3 auth + api IMPL]
model: sonnet
Update admin view to call `adminListUsers`/`adminListOutcomes`; render only when `currentUser.groups.includes('Admins')`. Non-admin sees 403 component. Unit test asserts gating.
✓ DONE WHEN: admin route renders gated component; unit test green.

---

### [P5] Deploy infra to dev account  [sequential after P2 + P3 seed]
model: sonnet  [no-delegate: requires user AWS credential confirmation]
Confirm with user before running. Execute `./infra/clientportal/deploy.sh` against configured AWS profile. Then `./infra/clientportal/seed.sh` to populate `AppConfig` and tier catalog. Write outputs to `apps/clientportal/.env.local`: `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`, `VITE_IDENTITY_POOL_ID`, `VITE_APPSYNC_URL`, `VITE_COGNITO_REGION`, `VITE_AWS_REGION`. No client secret.
✓ DONE WHEN: `aws appsync list-graphql-apis` shows the new API and `.env.local` populated.

---

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] `pnpm --dir apps/clientportal check` passes
- [ ] `pnpm --dir apps/clientportal test` green
- [ ] `pnpm --dir infra/clientportal/cdk test` green and `cdk synth` clean
- [ ] No password flows anywhere (no `ALLOW_USER_PASSWORD_AUTH`, no password UI, no SRP)
- [ ] Cognito UserPool has only `email` attribute; all profile data lives in DynamoDB `Users`
- [ ] PostConfirmation creates DynamoDB profile; PostAuthentication reconciles primary email
- [ ] `secondaryEmail` is DynamoDB-only, never written to Cognito
- [ ] Each auth Lambda <100 lines and esbuild-bundled
- [ ] All resolvers stamp/enforce `owner` and admin gates correctly
- [ ] No AWS secrets, account IDs, or `.env.local` committed
- [ ] No leftover hardcoded user data in `src/lib/data/`
- [ ] Deploy scripts are the only path to AWS (no console steps in docs)
- [ ] PR description written with summary and test plan
✓ DONE WHEN: all checklist items checked and PR opened.
