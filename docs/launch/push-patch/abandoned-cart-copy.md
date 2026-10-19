# Push Patch abandoned-intake nudge: copy for approval

**Status: APPROVED by TJ 2026-10-19 — LIVE.** Enabled via `ABANDONED_CART_ENABLED=true` in lambdas/push-patch-reminder/infra/deploy.sh (set false and redeploy to turn off).

## Subject

Your Push Patch is waiting

## Email (from support@my4mlife.com, sent via email-sender)

> Hi {first name},
>
> You started your Push Patch order but did not get through checkout. Picking it back up takes just a few minutes, and one of our network's licensed physicians reviews your order after that.
>
> [ Pick up where you left off ]
>
> Have a question first? Just reply to this email and a real person will get back to you.
>
> If you have already finished, you can ignore this note.
>
> The My4MLife team
>
> My4MLife

- Greeting falls back to "Hi there," when no first name is on file.
- Button link: `https://my4mlife.com/go/push-patch?sku=<skuId>&utm_source=email&utm_medium=lifecycle&utm_campaign=push-patch-abandoned` (the `sku` parameter is omitted if the saved intake has no SKU).
- No health details, no discount, no urgency language, no tagline.
- The link opens the Push Patch page; it does not restore the saved answers, so the person repeats the short screen and health form (the `sku` parameter is not read by the page yet). The copy deliberately does not promise saved answers.

## Timing

- One nudge per person, even if they clicked Buy several times and left several saved intakes (the intake is stamped `abandonedNudgeAt`, and any stamped intake for that person blocks further nudges).
- Sent about 60 minutes after the health form is signed, and only within 7 days of signing. The sweep runs every 15 minutes, so the actual send lands 60 to 75 minutes after signing.
- Not sent if the person has already paid (a Push Patch order marker exists for them).
- If the send fails, the stamp is removed and the next sweep retries.

## How to enable

1. Approve or edit the copy above (edits go in `lambdas/push-patch-reminder/src/abandoned-email.ts`).
2. In `lambdas/push-patch-reminder/infra/deploy.sh`, change `ABANDONED_CART_ENABLED=false` to `ABANDONED_CART_ENABLED=true`.
3. Run `lambdas/push-patch-reminder/infra/deploy.sh` to redeploy.

To turn it off again, set it back to `false` and redeploy.
