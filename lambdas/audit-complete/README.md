# audit-complete Lambda

Marks the Contact row as having completed the 4M audit. Called by the audit results page
after `scoreToTop3` runs.

## Request

`POST /api/audit-complete`

```json
{ "contactId": "uuid-v5", "scores": { "gut": 4, "weight": 2, ... }, "top3": ["gut","weight","hormones"] }
```

## Behavior

`UpdateCommand` on `Contact`:

- `auditCompletedAt = <ISO ts>`
- `intakeAnswers = scores`
- `auditTop3 = top3`
- `updatedAt = <ISO ts>`

No condition expression — idempotent rewrite is intentional (per
`docs/plan/contact-schema-spec.md`). Downstream nurture worker dedups via `nurtureSent`.

The Contact row is expected to already exist (created by `lead-capture` upstream).

## Env vars

- `CONTACT_TABLE` — DynamoDB table (default `Contact`)
- `AWS_REGION` — default `us-east-2`

## Eventual P2 addition

After the Contact update, a follow-up task will call `SendMessageCommand` against an SQS
queue (`my4mlife-nurture-queue`) with `DelaySeconds: 1800` and body `{ contactId }`.
That triggers `nurture-worker` 30 minutes later to send the intro-Zoom email+SMS to
leads who have not yet purchased. See the `TODO` in `src/handler.ts`.
