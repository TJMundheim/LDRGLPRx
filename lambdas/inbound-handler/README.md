# inbound-handler Lambda — concierge draft mode

SES inbound receiving on `concierge@inbox.my4mlife.com` (Google Workspace routing rule
forwards support@/info@my4mlife.com copies there) → S3 → this Lambda.

Flow: parse raw mail → loop guard → resolve contact (or `prospect#<email>`) → load
last 20 in/out history items → ask Claude (via **Bedrock**, per HIPAA architecture
decision — never direct Anthropic API) for a structured JSON reply → store a
**draft** in `Conversations` (nothing goes to the member automatically) → either
send TJ an approve-link notification, or — only in `CONCIERGE_MODE=auto` for safe,
high-confidence categories — send immediately.

## Files

- `handler.ts` — SES event loop, wires the pieces below together.
- `parse.ts` — raw mail parsing (mailparser) + loop guard (internal domains,
  `Auto-Submitted` header, our own `[Concierge` notification subjects).
- `store.ts` — DynamoDB helpers: Contact.byEmail lookup, Conversations read/write.
- `draft.ts` — Bedrock call + defensive JSON parse of the model's
  `{category, confidence, escalate, reply, internal_note}` response (strips code
  fences; falls back to `category:"other"`, `escalate:true`, `reply:<raw text>`
  on parse failure).
- `notify.ts` — builds and sends TJ's "[Concierge draft]" approve-link email.
- `token.ts` — HMAC-SHA256 signer/verifier for the approve link. **Copied
  verbatim** into `lambdas/concierge-approve/src/token.ts` (no cross-package
  imports between Lambdas) — keep both in sync by hand.
- `system-prompt.ts` — the concierge system prompt (owned separately).

## Env vars

- `CONTACT_TABLE` (default `Contact`), `CONVERSATIONS_TABLE` (default `Conversations`)
- `BEDROCK_MODEL` — default Haiku 4.5 inference profile
- `CONCIERGE_MODE` — `draft` (default) or `auto`. In `auto`, a draft with
  `escalate:false`, `confidence >= 0.85`, and `category` in
  `faq | fulfillment | sales` is sent immediately instead of queued for approval.
- `EMAIL_SENDER_FN` — Lambda function name to invoke for outbound mail, default
  `my4mlife-email-sender`. Invoked synchronously (`RequestResponse`) with payload
  `{kind:'info', to, subject, html, text}` — same shape `email-sender`'s direct-invoke
  path (`event.requestContext` absent) expects.
- `NOTIFY_TO` — where the approve-link notification goes, default `drtj@my4mlife.com`
- `APPROVE_URL` — base URL of the `concierge-approve` function URL
- `APPROVE_SECRET` — HMAC secret shared with `concierge-approve` (SSM/Secrets
  Manager in production; must match exactly on both sides)

## Conversations item shapes

- **in**: `{contactId, sk:'<ts>#in#<messageId>', direction:'in', channel:'email', subject, body, messageId, ts}`
- **draft**: `{contactId, sk:'<ts>#draft#<inboundMessageId>', direction:'draft', status:'pending'|'sent', channel:'email', toEmail, fromEmail, subject, body, category, confidence, escalate, internalNote, inReplyTo, claudeModel, ts}`
- **out** (draft mode, after approval — written by `concierge-approve`): `{contactId, sk:'<ts>#out#<sentMessageId>', direction:'out', channel:'email', subject, body, inReplyTo, approvedBy:'tj', ts}`
- **out** (auto mode, written here): `{contactId, sk:'<ts>#out#<inboundMessageId>', direction:'out', channel:'email', subject, body, inReplyTo, ts}`

## Open items

- No idempotency on the outbound send in auto mode (only the inbound record and
  the draft's status-transition in `concierge-approve` are guarded). Low risk —
  auto mode is off by default.
- SES inbound receipt rule set / S3 bucket / MX wiring is a separate infra step
  (see `docs/plan/concierge-email-draft-mode-2026-09-09.md`); this function is
  deployed but dormant until that's live.
