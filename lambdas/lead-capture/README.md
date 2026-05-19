# lead-capture Lambda

Handles `POST /api/lead-capture`. Validates a 3-field intake (`firstName`, `email`, optional E.164 `phone`) and writes/updates a `Contact` row with `lifecycleStage: lead`.

## Behavior

1. Validates email (required, RFC-ish regex) and phone (optional, E.164).
2. Computes deterministic `contactId = uuidv5(lower(trim(email)), NAMESPACE)`.
3. `PutCommand` with `ConditionExpression: attribute_not_exists(contactId) OR lifecycleStage = :lead` — allows re-writing an existing lead, but never downgrades a `consult-paid` / `customer` row.
4. Returns `{ contactId }` 200, or `{ error }` 4xx.

## Namespace

`NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0'` (fixed UUIDv4, documented constant — do not change once leads exist).

## Env vars

- `CONTACT_TABLE` — DynamoDB table (default `Contact`)
- `AWS_REGION` — default `us-east-2`

## Consent

Writes `consent.protege = { v: 'consent-protege-v1', at: <ISO> }` per `project_consent_architecture.md`. Heavier HIPAA gates are captured later at consult booking.
