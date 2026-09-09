# Google Workspace routing — copy support@/info@ to the AI concierge

One-time manual step (TJ, in Google Admin console). This copies inbound mail
sent to support@my4mlife.com and info@my4mlife.com to
concierge@inbox.my4mlife.com (SES inbound → my4mlife-inbound-handler) without
changing where TJ's own mail lands.

## Steps

1. Go to **Admin console → Apps → Google Workspace → Gmail → Routing**.
2. In the **Routing** section, click **Configure** (to add a new rule — do
   not edit an existing one).
3. Name it **"Concierge copy"**.
4. **Messages to affect:** choose **Inbound**.
5. **Envelope recipients:** choose **Only affect specific envelope
   recipients**, then add two single-recipient rows:
   - `support@my4mlife.com`
   - `info@my4mlife.com`
6. Under **Also deliver to**, click **Add more recipients**, choose
   **Basic**, and enter:
   - `concierge@inbox.my4mlife.com`
7. Click **Save**.

## Notes

- This is a copy, not a redirect — mail to support@/info@ still lands in
  TJ's normal inbox unchanged. The AI concierge pipeline gets its own copy
  via the inbox.my4mlife.com subdomain (SES inbound receiving, wired by
  `lambdas/inbound-handler/infra/deploy-ses-receiving.sh`).
- Google routing changes can take **up to an hour** to apply across the
  organization.
- The root my4mlife.com MX record stays pointed at Google Workspace
  (`1 SMTP.GOOGLE.COM`) — this rule does not touch it.

## Test procedure (after the SES infra scripts have run and DNS has propagated)

1. From any mailbox, send a test email to `support@my4mlife.com` (or
   `info@my4mlife.com`) with a simple subject like "concierge test".
2. Confirm it still arrives normally in TJ's Google inbox (unchanged
   behavior).
3. Within a few minutes, confirm a draft-reply notification email arrives at
   `drtj@my4mlife.com` (sent by `my4mlife-email-sender`) containing the
   original message, the AI-drafted reply, and an Approve link.
