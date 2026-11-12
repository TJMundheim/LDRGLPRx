# Google Workspace routing: copy Novo tracking emails to the tracking inbox

One-time manual step in the Google Admin console. It tells Google: "when an email arrives
from orders@novobioalliance.com for info@ or drtj@my4mlife.com, deliver it as usual AND
send a copy to tracking@inbox.my4mlife.com." That copy is what reads the tracking number
and emails the patient that their Push Patch is on its way. Your own inbox is untouched.

Time: about 5 minutes of clicking, then up to an hour for Google to apply it.

## Before you start

- Sign in as the Google Workspace **admin** for my4mlife.com. If admin.google.com shows a
  normal mailbox, you are on the wrong account, so switch accounts.
- Have this exact address ready to paste: `tracking@inbox.my4mlife.com`
- Ask Claude Code to confirm the AWS side is deployed first (the SES rule
  `push-patch-tracking`). Without it, copies sent now would land with the AI concierge.

## Click-by-click

1. **Open the Admin console.** Go to https://admin.google.com. You should see a dashboard
   with a left-hand menu (Home, Directory, Devices, Apps, ...).

2. **Open Gmail settings.** In the left menu click **Apps**, then **Google Workspace**,
   then **Gmail**. (If the menu is collapsed, click the three-line icon at top left.)

3. **Open Routing.** Scroll down to the row titled **Routing** and click it.

4. **Start a new rule.** In the first **Routing** section click **Configure** (or **Add
   another rule** if rules already exist). A tall panel opens on the right. Do not edit
   any existing rule, including "Concierge copy".

5. **Name it.** In the top text box type: `Novo tracking copy`

6. **Section "1. Email messages to affect".** Tick **Inbound** only. Leave Outbound,
   Internal-sending and Internal-receiving unticked.

7. **Section "2. For the above types of messages, do the following".**
   - Leave the dropdown on **Modify message**.
   - Scroll down in the panel to **Also deliver to**. Tick **Add more recipients**.
   - Click **Add**. In the dialog, leave the dropdown on **Basic**, paste
     `tracking@inbox.my4mlife.com`, and click **Save**. The address should now be listed.
   - Leave every other option in section 2 unchanged.

8. **Section "3. Options", only copy mail from Novo.** (Routing has no "Add expression";
   that lives in Content compliance. Corrected 2026-11-12 from TJ's live walkthrough.)
   Click **Show options** if section 3 is collapsed, then find **Envelope filter**:
   - Tick **Only affect specific envelope senders**.
   - Choose **Single email address** and type `orders@novobioalliance.com`.
   Novo's envelope sender (Return-Path) is exactly that address, checked on a real
   2026-11-10 tracking email. Do not skip this, or every inbound email gets copied.

9. **Leave "Only affect specific envelope recipients" unticked.** The sender filter is
   enough; if Novo copies both info@ and drtj@, the tracking Lambda ignores the duplicate.

10. **Save the rule.** Click the blue **Save** button at the bottom. You should land back on
    the Routing page with "Novo tracking copy" listed as "Enabled" or "Locally applied".

Wait up to an hour before testing.

## How to check it worked

1. When the next real Novo tracking email arrives (subject like "TRACKING - First Last"),
   confirm it still lands in your normal inbox.
2. Within a couple of minutes, one of two things should reach drtj@my4mlife.com or the
   patient: the patient gets the "on its way" email (you will not see it unless you were
   copied), or you receive a review email with one-click buttons if the match was unclear.
3. To test earlier without waiting for Novo, ask Claude Code to run a test: it will send a
   non-patient test email straight to the tracking address and check the logs.
4. In the Admin console, **Reports, then Email Log Search**, search for the message. The log
   shows whether "Novo tracking copy" fired and whether delivery to
   tracking@inbox.my4mlife.com succeeded.

## If the copy never shows up

- Check the rule is **Enabled** and the sender text exactly matches
  `orders@novobioalliance.com`. Replies Novo forwards through another address (for
  example one forwarded by a person at Novo) may show a different sender; tell Claude
  Code the exact "From" on the email and the condition can be widened.
- Google does not copy mail it classified as spam. Check the Spam folder.
- If the rule fired but nothing happened, tell Claude Code. The SES side can be checked in
  the `my4mlife-inbound-mail` S3 bucket under `push-patch-tracking/` and the
  `/aws/lambda/my4mlife-push-patch-tracking` log group.

## Notes

- This is a copy, not a redirect. Mail still lands in your normal inbox.
- The root my4mlife.com MX stays on Google. The tracking address uses the
  `inbox.my4mlife.com` subdomain (SES receiving), ahead of the concierge rule, so the AI
  concierge never reads these emails.
