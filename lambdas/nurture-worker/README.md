# nurture-worker Lambda

SQS-triggered. Fires ~30 min after `audit-complete` enqueues a message. Sends the
intro-Zoom email + SMS to leads who have not yet purchased a consult.

## Trigger

SQS `my4mlife-nurture-queue`. Message body: `{ "contactId": "<uuid>" }`. The enqueue
side (audit-complete) sets `DelaySeconds: 1800`.

## Behavior

1. `GetCommand` Contact.
2. If missing, `banned`, or already `nurtureSent: true` → noop.
3. If `lifecycleStage != lead` (e.g. `consult-paid`) → noop.
4. Else: send email via Mailgun + SMS via SNS (each containing `INTRO_ZOOM_URL`),
   append two Touchpoints rows (`email-out`, `sms-out`), set `nurtureSent: true`.

If a channel's env vars or the phone number are missing, that channel is skipped
gracefully but `nurtureSent` is still set so SQS retries don't loop.

## Env vars

- `CONTACT_TABLE` — DynamoDB Contact table (default `Contact`)
- `TOUCHPOINTS_TABLE` — DynamoDB Touchpoints table (default `Touchpoints`)
- `MAILGUN_DOMAIN` — e.g. `mg.my4mlife.com`
- `MAILGUN_API_KEY` — Mailgun private API key
- `MAILGUN_FROM` — default `concierge@my4mlife.com`
- `INTRO_ZOOM_URL` — prerecorded intro Zoom link
- `AWS_REGION` — default `us-east-2`
