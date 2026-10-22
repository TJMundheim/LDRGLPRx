# Plan: Provider roster + "Signing as" for Push Patch approvals (queue 6b)

## Context
Today every Push Patch approval fills the Genesis order form's clinician field and the "Electronically signed — <clinician> · <date>" line from one value: `clinician` in SSM `/my4mlife/genesis/practice` (Oscar Molina). When a second physician approves, the form names the wrong doctor. This plan adds a provider roster and a "Signing as" picker on the physician confirm page and the admin Approve button. The chosen provider fills both the clinician field and the signature line, and is stamped on the encounter. **Build only: no deploy, no SSM write, no CDK deploy until TJ reviews.** The provider review inbox stays a single address (out of scope).

Contract (shared by every task):
- SSM String `/my4mlife/providers` = `{"providers":[{"id":"molina","name":"Oscar Molina","credentials":"MD","inbox":"drtj@mdspecialtygroup.com","default":true}]}`.
- Package `@my4mlife/provider-roster` (lambdas/_shared/provider-roster) exports:
  - `type Provider = {id,name,credentials,inbox,default?}`
  - `loadRoster(ssm?): Promise<Provider[]>`: cached per container; on a missing or invalid param it falls back to `[{id:'default', name: practice.clinician, ...}]` read from `/my4mlife/genesis/practice`, so nothing changes until the param exists.
  - `resolveProvider(roster, id?): Provider`: an unknown or empty id gives the default; `validateRoster(json)` checks for unique ids, exactly one default, and non-empty names.
  - `resetRosterCache()`.
- `DecideArgs` gains an optional `providerId`. Approve resolves the provider and passes `clinicianName` to `sendGenesisOrder` → `buildFields` uses it for `clinician`, so the signature line follows. The encounter gets `signedByProviderId` and `signedByName`.

## Tasks

### [P1] TEST+IMPL: provider-roster package  [parallel]
model: sonnet
In lambdas/_shared/provider-roster (scaffolded), write `src/roster.test.ts` first for the contract above: parse, validation errors, cache, fallback to the practice clinician when the param is missing, and resolveProvider default/unknown. Then implement `src/index.ts` plus modules, each < 100 lines. SSM is read with `@aws-sdk/client-ssm` GetParameter in us-east-2.
✓ DONE WHEN: `pnpm --filter @my4mlife/provider-roster test` exits 0

### [P1] TEST+IMPL: decision-core uses the chosen provider  [parallel]
model: sonnet
In lambdas/_shared/push-patch-decision-core: tests first.
- `decide({..., providerId})` on approve calls the roster, and the Genesis PDF fields `clinician` plus the signature line carry the chosen provider's name.
- No providerId gives the default.
- The encounter UpdateExpression sets `signedByProviderId` and `signedByName`.
- Decline is unchanged.
Mock `@my4mlife/provider-roster`. Implement it in `decide.ts`, `genesis-order.ts` and `genesis-form.ts` (an optional `clinicianName` overrides `practice.clinician`), keeping every file < 100 lines.
✓ DONE WHEN: `pnpm --filter @my4mlife/push-patch-decision-core test` exits 0

### [P1] TEST+IMPL: physician confirm page picker  [parallel]
model: sonnet
In lambdas/push-patch-decision:
- The approve confirm page shows a "Signing as" `<select name="provider">` with each roster entry formatted as "Name, Credentials". The default is preselected, and an escaped id is the option value.
- Decline shows no picker.
- POST reads `provider`, rejects an id not in the roster with 400, and passes `providerId` to `decide`.
- With a single-provider roster, show a read-only line "Signing as: Name, Credentials" with a hidden input in place of the select.
The token and HMAC stay unchanged. Tests first in `handler.test.ts`, mocking the roster. Keep `pages.ts` and `handler.ts` < 100 lines.
✓ DONE WHEN: `pnpm --filter @ldrglprx/push-patch-decision test` exits 0

### [P1] TEST+IMPL: admin API (decide-admin + schema + resolver)  [parallel]
model: sonnet
In lambdas/push-patch-decide-admin:
- Dispatch on `info.fieldName`. `decidePushPatchAdmin` accepts an optional `providerId` and passes it to `decide`.
- The new `pushPatchProviders` query returns `[{id,name,credentials,default}]`, Admins only and never the inbox.
In infra/clientportal:
- Add `providerId: ID` to the mutation in appsync/schema.graphql, plus a `PushPatchProvider` type and a `pushPatchProviders` query (`@aws_auth` Admins).
- Add a resolver JS for the query, mirroring decidePushPatchAdmin.js.
- Wire it in cdk/lib/api-stack.ts on the same Lambda data source.
Tests first, in handler.test.ts and the CDK tests if they assert resolvers. Do not deploy.
✓ DONE WHEN: `pnpm --filter @ldrglprx/push-patch-decide-admin test` exits 0 and `pnpm --filter <clientportal cdk pkg> test` exits 0

### [P1] TEST+IMPL: admin panel picker  [parallel]
model: sonnet
In apps/clientportal:
- `operations.ts` adds `listPushPatchProviders()` and an optional `providerId` on `decidePushPatchAdmin`.
- In `PushPatchPanel.svelte`, the approve confirm step shows a "Signing as" select (default preselected; read-only text when there is only one provider) and passes `providerId`.
Tests first in `PushPatchPanel.test.ts`. Svelte 5 runes, matching the existing style. Do not deploy.
✓ DONE WHEN: `pnpm --filter <clientportal pkg> test -- PushPatchPanel` exits 0 and `pnpm --filter <clientportal pkg> check` reports no new errors

### [P1] Roster config script  [parallel]
model: haiku
Create `infra/scripts/provider-roster-config.sh`, mirroring `infra/scripts/genesis-practice-config.sh`: a heredoc with the single Molina entry from the contract, python3 validation (unique ids, exactly one default), dry run by default, and `--apply` running `put-parameter --type String --overwrite`. In both decision lambdas' deploy.sh, add IAM `ssm:GetParameter` on `parameter/my4mlife/providers`. Do not run `--apply`.
✓ DONE WHEN: `bash infra/scripts/provider-roster-config.sh` (dry run) prints valid JSON and exits 0, and `grep my4mlife/providers` matches in both deploy scripts

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] All touched packages' tests green; svelte check shows no new errors
- [ ] Every lambda module < 100 lines; no dead imports
- [ ] The token/HMAC is unchanged; an unknown providerId is rejected on the physician page and falls back safely on admin
- [ ] With no `/my4mlife/providers` param, behavior is byte-identical to today (signature = practice clinician)
- [ ] No secrets committed; the provider inbox is never exposed to the admin query
- [ ] Commit message with summary, test plan and deploy order for HANDOFF: roster script --apply → push-patch-decision + push-patch-decide-admin → clientportal CDK (diff first) → apps/clientportal/deploy.sh
✓ DONE WHEN: all checklist items checked and the commit is pushed to origin/main (main-only repo, no PR)
