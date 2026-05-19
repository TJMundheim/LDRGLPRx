# inbound-handler Lambda

SES inbound receiving on `concierge@my4mlife.com` → S3 → this Lambda. Loads contact history from DynamoDB, asks Claude (via **Bedrock**, per HIPAA architecture decision — never direct Anthropic API), sends reply via SES.

Conversation threading via `In-Reply-To` headers + `Conversations` table keyed by contactId.

## Env vars

- `CONTACT_TABLE`, `CONVERSATIONS_TABLE`
- `CONCIERGE_FROM` — default `concierge@my4mlife.com`
- `BEDROCK_MODEL` — default Haiku 4.5 inference profile

## Open items

- 100-line ceiling: this is ~105. Acceptable as skeleton; trim by extracting `ses-send.ts` helper when promoting to production.
- No idempotency on the *outbound* SES send (only on the inbound record). If Lambda retries after a partial failure, we could double-send. Add a dedupe table keyed on inbound messageId before going live.
- Unknown senders dropped silently — add a deadletter Touchpoint write for ops visibility.
- Mailgun is NOT used. The earlier "Mailgun swap" item is replaced by this SES-native handler — same job, one fewer vendor.
