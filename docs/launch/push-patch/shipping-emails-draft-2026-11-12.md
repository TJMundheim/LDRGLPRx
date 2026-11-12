# Push Patch shipping emails: DRAFT, NOT SENT

Status: DRAFT for owner approval. NOT SENT. Nothing is deployed or wired to send. Sample name "Ronda", blend "Enhanced Glow", sample UPS number. Composer: `lambdas/_shared/push-patch-decision-core/src/shipping-emails.ts`. Plan: `docs/plan/push-patch-shipping-emails-2026-11-12.md`.

Both emails send from support@my4mlife.com, sign "Dr. TJ and the My4MLife team", and carry the same transactional footer as the welcome email minus the tagline and brand line.

Both emails feature one permanent how-to button, "See how to get your patch ready", linking to `HOWTO_URL` (https://my4mlife.com/go/push-patch#wear). The owner's short walkthrough will be added at that location; the emails never name it separately and never use the word "video". HTML uses real links and a real bullet list; the text part uses plain URLs and dashes.

---

## Email 1: While you wait (sent about 2 days after approval)

**Subject:** Your Push Patch set is being prepared

Hi Ronda,

Thank you for your order, and welcome. We are excited for you to get started, and everyone here is already cheering you on. Your Enhanced Glow Push Patch set is being prepared. It ships soon, and we will send you a tracking email as soon as it does. Delivery typically lands within about a week of approval.

Your first patch is easy, and we are with you for every step. A few small details make the first application smooth, so we gathered them in one spot:
See how to get your patch ready: https://my4mlife.com/go/push-patch#wear

While you wait
- Know the rhythm: one patch a week, worn for 12 hours, for six weeks. No needle at any step.
- When it is time, start on clean, dry skin.
- Have the step-by-step instructions, with a photo for each step, nearby.

Do not use the patch if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site. If any of these apply to you now, or change later, do not apply a patch and write to us first.

Questions? Reply to this email or write to support@my4mlife.com. A real person reads it.

Warmly,
Dr. TJ and the My4MLife team

My4MLife

These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.

You received this email because you placed a Push Patch order at my4mlife.com. Your health information is handled under our Privacy Policy: https://my4mlife.com/privacy

---

## Email 2: On its way (sent when tracking is known)

**Subject:** Your Push Patch is on its way

The HTML shows a "Track your package" button, the copyable tracking link, and the tracking number as visible text. UPS link: https://www.ups.com/track?tracknum=<number>. FedEx link: https://www.fedex.com/fedextrack/?trknbr=<number>.

Hi Ronda,

Great news, your Enhanced Glow Push Patch set is on its way to you. We are so glad you are getting started, and we will be right here when you open the box.

Your UPS tracking number: 1Z999AA10123456784
Track your package: https://www.ups.com/track?tracknum=1Z999AA10123456784

Before your first patch, take a quick look at how to get it ready. It takes only a few minutes, and it makes that first application feel easy:
See how to get your patch ready: https://my4mlife.com/go/push-patch#wear

When your box arrives
- Follow the insert in your kit, along with the how-to above.
- One patch a week, worn for 12 hours. Start on clean, dry skin. No needle at any step.

Do not use the patch if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site. If any of these apply to you now, or change later, do not apply a patch and write to us first.

Questions? Reply to this email or write to support@my4mlife.com. A real person reads it.

Warmly,
Dr. TJ and the My4MLife team

My4MLife

These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.

You received this email because you placed a Push Patch order at my4mlife.com. Your health information is handled under our Privacy Policy: https://my4mlife.com/privacy

---

## Sources for each how-to line

All from `docs/launch/push-patch/async-visit-copy.md` section 2 (welcome email) and the welcome composer in `emails.ts`:

| Line in the new emails | Source |
|---|---|
| "one patch a week, worn for 12 hours, for six weeks" | Welcome step 3 "You apply it yourself" and "Wear" step |
| "No needle at any step" | Welcome "What happens next" step 3 |
| "start on clean, dry skin" | Welcome "How to apply", Prepare step |
| "step-by-step instructions, with a photo for each step" + link `/go/push-patch#wear` | Welcome, line after the apply steps |
| "Follow the insert in your kit" | Welcome, "Follow the insert in your kit for the exact amount of water" |
| Safety paragraph ("Do not use the patch if...") | Welcome safety paragraph, verbatim |
| "ships soon / tracking email follows" | Welcome step 1 ("You will get a shipping confirmation email with tracking") |
| "delivery within about a week of approval" | Owner brief (1-3 business days prep + 3-5 days ground, per the welcome email) |
| Support line | Welcome "Questions?" line |

## Left out for lack of a source

- Storage instructions (the copy file marks the storage line as an open TJ CONFIRM item).
- Mixing steps and water amounts (only the insert and photo page cover those; the emails point to them).
- Where on the body to place the patch (the manufacturer instructions name no site).
- Any claim about results or what the patch does.
