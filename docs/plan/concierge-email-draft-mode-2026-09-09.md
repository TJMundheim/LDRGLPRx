# AI Concierge — email draft mode (focus session 2026-09-09)

**Goal:** every email to support@ / info@my4mlife.com gets an AI-drafted reply (Claude on Bedrock) that lands in TJ's inbox with a one-click Approve link. Nothing goes to a member without TJ's click. Auto-send for safe categories comes later by flipping `CONCIERGE_MODE=auto`.

## Facts that shaped the design
- MX for my4mlife.com → Google Workspace (stays). support@/info@ both route to drtj@ (verified 2026-09-03/05).
- Outbound member email = Mailgun via `my4mlife-email-sender` Lambda (kind `info` → from info@). SES is still SANDBOX (can't send to unverified addresses) → approve step sends through email-sender, never SES.
- `my4mlife-inbound-handler` Lambda exists (deployed, dormant), Bedrock Haiku 4.5, Contact.byEmail GSI + Conversations table exist.
- SES receiving APIs respond in us-east-2. Route53 hosted zone Z045463539AAKM7D8P48V.

## Architecture
```
member → support@my4mlife.com → Google (TJ inbox, unchanged)
                               └→ Google Admin routing rule: also deliver to concierge@inbox.my4mlife.com
inbox.my4mlife.com MX → SES inbound (us-east-2) → S3 my4mlife-inbound-mail → my4mlife-inbound-handler
handler: parse → loop-guard → resolve contact (or prospect#<email>) → history → Bedrock JSON
         {category, confidence, escalate, reply, internal_note}
         → store draft in Conversations (sk <ts>#draft#<msgId>, status pending)
         → notify TJ via email-sender (from info@ → drtj@my4mlife.com): original + draft + APPROVE link
TJ clicks → my4mlife-concierge-approve (Lambda function URL, HMAC token) → email-sender kind info → member
         → draft status sent, out record written
TJ wants to edit → replies to the member from Gmail as usual; draft stays pending (harmless)
```

## Tasks
A. Prompt sweep (`lambdas/inbound-handler/src/system-prompt.ts`) — align with locked rules (see task brief). Output = JSON contract.
B. Handler refactor to draft mode + new `lambdas/concierge-approve` Lambda. Each file <100 lines.
C. Infra: `lambdas/inbound-handler/infra/deploy-ses-receiving.sh` (MX + bucket + receipt rule set + Lambda permission), extend `deploy.sh` env/IAM, `lambdas/concierge-approve/infra/deploy.sh` (function URL, HMAC secret in SSM).
D. Deploy + end-to-end test (send to concierge@inbox.my4mlife.com, approve, confirm delivery).
E. TJ: Google Admin routing rule (instructions in HANDOFF).

## Categories (model output)
`faq | fulfillment | bug | clinical | refund | human | sales | other`. `escalate=true` for bug/clinical/refund/human → notification subject prefixed `[ESCALATE]`. Draft mode ignores confidence; auto mode (later) sends only faq/fulfillment/sales with confidence ≥ 0.85 and escalate=false.
