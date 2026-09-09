# concierge-approve Lambda

Lambda **function URL** (payload format v2) behind TJ's "Approve & send" button
in the concierge draft notification email. One click sends the AI-drafted reply
to the member — nothing else in the system sends member email without this
click (outside `CONCIERGE_MODE=auto`, which bypasses approval for a narrow
safe/high-confidence slice).

## Flow

1. Read `c` (contactId), `s` (sk), `t` (token) from the query string.
2. Verify `t` with a timing-safe compare against `HMAC-SHA256(APPROVE_SECRET, "<c>|<s>")`.
   403 on mismatch or missing params.
3. `GetItem` the draft from `Conversations`. 404 if missing. If `status === 'sent'`,
   return a 200 "Already sent" page (idempotent for repeat clicks / email link
   prefetchers).
4. Send via `email-sender` (`kind:'info'`, HTML built from the draft body,
   plain-text `text` = the raw body).
5. Conditionally update the draft to `status:'sent'` (condition: `status = pending`).
   If the condition fails (a concurrent request already flipped it), treat as
   already-sent rather than double-writing the `out` record.
6. Write an `out` record and return a small "Sent ✓" HTML page with the reply
   text shown back.

## Files

- `handler.ts` — function URL handler: token check → fetch → send → mark sent → render page.
- `send.ts` — DynamoDB get/conditional-update/put + the `email-sender` invoke.
- `token.ts` — HMAC-SHA256 verifier. **Copied verbatim** from
  `lambdas/inbound-handler/src/token.ts` (no cross-package imports between
  Lambdas) — keep both in sync by hand.

## Env vars

- `CONVERSATIONS_TABLE` — default `Conversations`
- `EMAIL_SENDER_FN` — default `my4mlife-email-sender`. Invoked synchronously
  (`RequestResponse`) with payload `{kind:'info', to, subject, html, text}` —
  identical shape to what `inbound-handler` uses and what `email-sender`'s
  direct-invoke path (`event.requestContext` absent) expects.
- `APPROVE_SECRET` — HMAC secret shared with `inbound-handler`; must match exactly.

## IAM the deploy script needs to grant

- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:PutItem` on the
  `Conversations` table (and no index access needed — direct key reads/writes only).
- `lambda:InvokeFunction` on the `my4mlife-email-sender` function.
- Function URL with `AuthType: NONE` (the HMAC token *is* the auth) —
  restrict abuse via the token's short, unguessable value; consider rate limiting
  at the function URL / CloudFront layer if this becomes a target.

`infra/` is intentionally empty — deploy script to be added separately (function
URL + IAM role + `APPROVE_SECRET` in SSM/Secrets Manager, shared with
`inbound-handler`'s deploy).
