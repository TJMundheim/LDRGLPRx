# Google Workspace routing — copy support@/info@ to the AI concierge

One-time manual step in the Google Admin console. It tells Google: "whenever mail
arrives for support@my4mlife.com or info@my4mlife.com, deliver it as usual AND send a
copy to concierge@inbox.my4mlife.com." That copy is what the AI concierge reads.
Your own inbox is untouched.

Time: about 5 minutes of clicking, then up to an hour for Google to apply it.

## Before you start

- You must be signed in as the Google Workspace **admin** for my4mlife.com (the account
  you used to set up the domain). If you only see a normal Gmail screen at
  admin.google.com, you're on the wrong account — switch accounts.
- Have this exact address ready to paste: `concierge@inbox.my4mlife.com`

## Click-by-click

1. **Open the Admin console.** Go to https://admin.google.com in a browser. You should see
   a dashboard with a left-hand menu (Home, Directory, Devices, Apps, ...), not a mailbox.

2. **Open Gmail settings.** In the left menu click **Apps**, then **Google Workspace**,
   then click **Gmail** in the list of services. (If the left menu is collapsed, click the
   three-line icon at the top left first.)

3. **Open Routing.** Scroll down the Gmail settings page until you see a row titled
   **Routing** (its description mentions "Routing, Inbound gateway, Outbound gateway...").
   Click anywhere on that row.

4. **Start a new rule.** On the Routing page, find the section also called **Routing**
   (the first one). Hover over it and click **Configure** (if there are already rules
   listed you'll see **Add another rule** instead; click that). A tall settings panel
   opens on the right. Do not edit any existing rule.

5. **Name it.** In the top text box type: `Concierge copy`

6. **Section "1. Email messages to affect".** Tick the **Inbound** checkbox only. Leave
   Outbound, Internal-sending and Internal-receiving unticked.

7. **Section "2. For the above types of messages, do the following".**
   - Leave the dropdown on **Modify message**.
   - Scroll down inside the panel to **Also deliver to**. Tick **Add more recipients**.
   - Click **Add**. In the small dialog that appears, leave the dropdown on **Basic**,
     paste `concierge@inbox.my4mlife.com` into the email box, and click **Save**.
     You should now see that address listed under "Add more recipients".
   - Leave every other option in section 2 unchanged (no subject prefix, no header
     changes, no route change, no spam bypass).

8. **Section "3. Options".** Nothing needed here.

9. **Envelope recipients — restrict the rule to two addresses.** Still in the same panel,
   scroll back up (or down) to find **Envelope recipient** (in some layouts it's called
   "Only affect specific envelope recipients"). Tick that box, then:
   - Choose **Single recipient**, type `support@my4mlife.com`, click **Add** / **Save**.
   - Click **Add** again, choose **Single recipient**, type `info@my4mlife.com`, save.
   You should see both addresses listed. If you skip this step the rule copies EVERY
   email to the domain, including drtj@ — so don't skip it.

10. **Save the rule.** Click the blue **Save** button at the bottom of the panel. You
    should land back on the Routing page with "Concierge copy" listed and a status of
    "Enabled" or "Locally applied".

That's it. Wait up to an hour before testing.

## Test (after the hour)

1. From an outside mailbox (personal Gmail, your phone carrier email, anything NOT at
   my4mlife.com), send an email to `support@my4mlife.com`. Subject: `concierge test`.
   Body: `Testing — my logbook link gives an error.`
2. Confirm it arrives in your drtj@ inbox as usual.
3. Within about 2 minutes, confirm a second email arrives at drtj@ with a subject beginning
   `[ESCALATE][Concierge draft] bug`. It shows the original message, the draft reply, and a
   green **Approve & send** button.
4. Click the button. A small "Sent to <address>" page opens, and the outside mailbox
   receives the reply from info@my4mlife.com.

## If the copy never shows up

- Check the Admin console **Reports → Email Log Search** for the test message; the log
  shows whether the "Concierge copy" rule fired and whether delivery to
  concierge@inbox.my4mlife.com succeeded.
- Google does not copy messages it classified as spam. Send the test from a normal,
  established mailbox.
- If the rule shows as fired but nothing arrives, tell Claude Code: the SES side can be
  checked in the `my4mlife-inbound-mail` S3 bucket and the
  `/aws/lambda/my4mlife-inbound-handler` log group.
- Fallback if Admin routing refuses to work: in the drtj@ Gmail account, Settings →
  Forwarding → add `concierge@inbox.my4mlife.com`, then create a filter "To: support@ OR
  To: info@ → Forward to concierge@...". Gmail will send a confirmation code to the
  concierge address; Claude Code can read it out of the S3 bucket for you.

## Notes

- This is a copy, not a redirect. Mail to support@/info@ still lands in your normal inbox.
- Root my4mlife.com MX stays on Google (`1 SMTP.GOOGLE.COM`). The concierge uses its own
  subdomain `inbox.my4mlife.com` (SES receiving, wired by
  `lambdas/inbound-handler/infra/deploy-ses-receiving.sh`).
