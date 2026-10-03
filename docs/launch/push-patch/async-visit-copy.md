# Push Patch async visit copy (draft for TJ review)

Task P1-C of `docs/plan/push-patch-async-visit-2026-10-01.md`. Status: DRAFT, not deployed. Consumed by P2-D (thank-you page becomes the intake form) and P2-C (reminder email), and by P2-B (welcome and decline emails).

How to read this file:
- `[TJ CONFIRM]` marks a sentence or fact TJ must approve before it ships.
- **Voice:** technical, plain, needle-free, standalone (same as `lp-copy.md`). Reviewers are always "our network's licensed physicians". No group or physician is ever named. Dr. TJ appears nowhere in this copy.
- **Hard rules applied:** no emoji; no disease-claim verbs (per the standing copy rule); no gendered-pair phrasing; no age ranges; no Amazon links; the identity/dignity tagline in the welcome email footer only (TJ 2026-10-03: removed from the not-cleared, refund-issued and reminder emails); no PHI in the reminder email; no product formula or dose in any email (blend name only).
- **Facts used:** the buyer has already paid; the intake takes about 2 minutes; review is by our network's licensed physicians; the result comes within an hour during business hours, 9 a.m. to 5 p.m. Central; approved means a welcome email and our pharmacy partner ships direct; not cleared means a full refund within 10 business days (queued for admin approval); one 12-hour patch a week for six weeks; setup steps follow the manufacturer IFU.
- **Template tokens** (filled by the lambdas): `{{firstName}}`, `{{blendName}}`, `{{refundAmount}}`, `{{intakeLink}}`. `{{intakeLink}}` is the thank-you URL with the buyer's `session_id`; it carries no health data.

Open questions are collected in section 13.

---

## 1. Intake page (`/go/push-patch/thank-you`, step 2 of the flow)

Shown after the "Payment received" line. Same standalone look as the landing page.

**Header (H1):** Two minutes to your physician review.

**Subhead:** Your payment is received. Answer a few health questions so one of our network's licensed physicians can review your order.

**Helper text (under the subhead):** About 2 minutes. You will hear back within an hour during business hours, 9 a.m. to 5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.

**Privacy helper (small, under the first field group):** Your answers go only to the reviewing physician and your care record. They are never sent by text message or shown on a receipt. [TJ CONFIRM: wording matches the HIPAA architecture; no PHI in SMS]

### 1.1 Field labels

| Field | Label | Helper text (small, under the field) |
|---|---|---|
| Date of birth | Date of birth | Month, day, year. |
| Sex | Sex | Used by the physician for screening. [TJ CONFIRM: wording] Options: Male, Female. |
| Phone | Mobile phone | Used only if the physician needs to reach you about this order. We never text health information. |
| Current medications | Current medications and supplements | List everything you take, including peptides and over-the-counter products. Write "None" if none. |
| Allergies | Allergies | Include medications, adhesives, tape, latex or metals. Write "None" if none. |
| Medical conditions | Medical conditions | Include anything a physician has diagnosed, and any past surgeries. Write "None" if none. |

Inline validation messages (short, plain):
- Missing field: `This field is required.`
- Phone not valid: `Enter a valid mobile number.`
- Date not valid: `Enter your date of birth as month, day, year.`

### 1.2 Five screening questions (from the manufacturer IFU contraindications)

Section label above the questions: **Safety check**

Section helper: Answer each question Yes or No. A Yes does not cancel your order automatically; the physician reviews it. [TJ CONFIRM: a Yes goes to the physician for a decision and is not an auto-decline; matches P1-A "[Screening flag]" behavior]

Each question has two radio options, `Yes` and `No`, no default selected.

1. Have you ever had epilepsy or seizures?
2. Do you have a pacemaker?
3. Do you have metal implants near where the patch would sit?
4. Are you pregnant? (Answer No if this does not apply to you.) [TJ CONFIRM: asked of everyone, with the "does not apply" clause, to avoid a sex-specific branch]
5. Do you have a recent wound, skin graft or scar at the spot where the patch would sit?

Mapping to the intake payload (P1-A): 1 `seizures`, 2 `pacemaker`, 3 `metalImplantNearSite`, 4 `pregnant`, 5 `woundAtSite`.

Source: manufacturer IFU "Handling Instructions for PushPatch Kits+", "Do not use this kit if you have" list (research doc `genesis-site-research-2026-10-01.md`, section 2). The IFU does not name a patch site, so the questions say "where the patch would sit".

### 1.3 Telehealth consent

**Section label:** Telehealth consent

**Consent paragraph (shown in a scrollable box above the signature):**

> By signing below, I consent to an asynchronous telehealth review of my order. This means a licensed physician in our network will review the health information I submit here, without a live video or phone visit, and decide whether the Push Patch is appropriate for me. I understand that this review cannot include a physical exam, that it depends on my answers being complete and truthful, and that the physician may decide I am not cleared. If I am not cleared before anything ships, my payment is refunded in full within 10 business days. Once my order has shipped, it cannot be returned or refunded. I agree to give accurate information about my medications, allergies, conditions and screening answers, and to tell my physician about any change in my health. I understand that telehealth is not for emergencies; if I have a medical emergency I will call 911. I may withdraw this consent at any time without affecting my right to future care. My health information is handled under the My4MLife Privacy Policy and applicable privacy law. I authorize My4MLife and our network's licensed physicians to share my name, shipping address and phone number with our pharmacy partner to fill and ship my order. I am of legal adult age and a resident of the United States. [TJ CONFIRM: legal wording; adapted from `website/src/pages/consent.astro` sections 1, 2, 5, 6, 7, 8 and the acknowledgment list, with the GLP-1 and compounded-medication sections removed because they do not apply to the patch]

**Link under the paragraph:** Read the full Medical & Telehealth Consent (`/consent`) and the Privacy Policy (`/privacy`). [TJ CONFIRM: `/consent` still carries GLP-1 and compounded-medication language; decide whether to link it or leave the link off]

**Typed-signature field label:** Type your full legal name to sign

**Typed-signature helper:** This works as your signature. Today's date is recorded automatically.

**Signature mismatch note (inline, shown if blank):** Type your full legal name to continue.

Consent record: `consent-telehealth-push-patch-v1`, name + timestamp (P1-A).

### 1.3b Shipping address confirmation (added 2026-10-02)

**Section label:** Shipping. **Shown above the telehealth consent.**

The page fetches the Stripe checkout address (`GET /api/push-patch-intake?session_id=`) and shows:

> Your patches will ship to: {name, street, apt, city, state ZIP}
> (•) Yes, ship here (default)  ( ) Ship somewhere else

"Ship somewhere else" reveals name, street, apt/suite (optional), city, state (US select) and ZIP. If the address cannot be loaded, the legend reads "Where should we ship your patches?" and the fields are shown empty. US addresses only.

**Shipping-time line (under the choice):** Prepared within 1–3 business days, then ground delivery in 3–5 business days.

Payload: `shipping: { confirmed: true }` or `shipping: { confirmed: false, address: {...} }`. The final address is stored on the encounter as `shipTo`.

### 1.4 Submit button

**Label:** Submit for physician review

**While sending:** Sending...

### 1.5 Success message (replaces the form)

**Heading:** Submitted.

**Body:** A licensed physician in our network will review it within an hour during business hours (9 a.m.–5 p.m. Central). Your welcome email follows. If you are not cleared, your payment is refunded within 10 business days.

**Shipping line (added 2026-10-02):** If cleared, your patches are prepared within 1–3 business days, then ground delivery in 3–5 business days.

**Small line:** Check your inbox, and your spam folder, for a message from My4MLife.

### 1.6 After-hours note

Shown under the success message when the page loads outside 9 a.m.–5 p.m. Central, Monday to Friday. Also placed as a line under the helper text on the intake page itself. [TJ CONFIRM: Monday to Friday business days; holidays]

> Submitted outside 9 a.m.–5 p.m. Central? You'll hear from us within the first hour of the next business day.

### 1.7 Inline errors (P2-D)

- 400: `Please complete every field and answer every question.`
- 402: `We could not match this page to a paid order. Check the link in your receipt email, or write to support@my4mlife.com.`
- Network or server error: `Something went wrong sending your answers. Your payment is safe. Please try again, or write to support@my4mlife.com.`
- Already submitted (200 `alreadySubmitted`): `We already have your answers for this order. Your welcome email follows once the review is done.`

---

## 2. Welcome email (sent on physician approval)

**From:** My4MLife `<support@my4mlife.com>` [TJ CONFIRM: sender address; plan says "from a my4mlife.com address", support@ is the most-used inbox in the repo]

**Subject:** Welcome. Your Push Patch is approved

**Preheader:** A licensed physician in our network cleared your order. Here is what happens next.

**Body:**

Hi {{firstName}},

One of our network's licensed physicians has reviewed your answers and cleared your {{blendName}} Push Patch set. Your payment stands and there is nothing more to do today.

**What happens next**

1. **Your kit ships direct.** Our pharmacy partner ships your six-patch set straight to the address you confirmed. Your kit is prepared within 1–3 business days and ships by ground; delivery typically takes 3–5 business days after it ships. You will get a shipping confirmation email with tracking.
2. **Your set.** Six single-use patches, one for each week of the six-week set, with the blend vials and sterile water that go with them. [TJ CONFIRM: kit counts, same open item as `lp-copy.md` section 8]
3. **You apply it yourself. No needle at any step.** One patch a week, worn for 12 hours.

**How to apply (from the manufacturer's instructions)**

1. **Prepare.** On clean, dry skin. Add the sterile water provided to the powder vial, cap it and shake to mix. Press the white pad of the patch against the open vial, turn it over, and wet the whole pad.
2. **Apply.** Peel the backing and press the patch down flat, like kinesiology tape. Pull the activation tab all the way out.
3. **Wear.** Wear it for 12 hours, then remove it: wet it with warm soapy water and peel slowly. Wait at least 24 hours before using the same spot again. Use one patch a week for six weeks.

Follow the insert in your kit for the exact amount of water. Full step-by-step instructions, with a photo for each step: https://my4mlife.com/go/push-patch#wear [TJ CONFIRM: the only link in the email; anchor `#wear` exists on the landing page]

**Do not use the patch** if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site. If any of these apply to you now, or change later, do not apply a patch and write to us first.

**Questions?** Reply to this email or write to support@my4mlife.com. A real person reads it. [TJ CONFIRM: support@ inbox is monitored for this lane; reply-to behavior]

Welcome aboard.

The My4MLife team

**Footer (welcome email; the other patient emails use the same footer without the tagline and brand line):**

My4MLife
Don't lose your identity and your dignity while you still have a choice.
Push Patch is brought to you by My4MLife, where we help you protect your mind for the long run.

(Welcome email only. "My4MLife" in the last line links to https://my4mlife.com/?utm_source=push-patch&utm_medium=email&utm_campaign=welcome in HTML; the plain-text version shows the URL in parentheses after the name. The tagline and this line are removed from every other patient email; those footers keep the "My4MLife" line, the disclaimer and the support contact.)

*These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.* [TJ CONFIRM: same patch disclaimer as `lp-copy.md` section 11]

You received this email because you placed a Push Patch order at my4mlife.com. Your health information is handled under our Privacy Policy: https://my4mlife.com/privacy

Notes for P2-B:
- Welcome email carries blend name only, no formula or dose.
- The IFU storage line ("at or below 77 F, in original amber vials and foil bags, dry") is optional. [TJ CONFIRM: add one line on storage?]
- Shipping time (TJ 2026-10-02): "Prepared within 1–3 business days, then ground delivery in 3–5 business days." In the welcome email (step 1) the line reads: "Your kit is prepared within 1–3 business days and ships by ground; delivery typically takes 3–5 business days after it ships."

---

## 3. Decline / refund email (sent when the physician does not clear the order)

Updated 2026-10-02: Decline no longer refunds automatically. The order goes to `declined` with `refundStatus: pending` and an admin approves the refund, so this email promises a window, not an issued refund.

**From:** My4MLife `<support@my4mlife.com>`

**Subject:** You weren't cleared for the Push Patch. Refund within 10 business days

**Preheader:** The physician review is complete. Your refund will be processed within 10 business days.

**Body:**

Hi {{firstName}},

You weren't cleared for the Push Patch. Your refund will be processed within 10 business days.

One of our network's licensed physicians reviewed your {{blendName}} Push Patch order. Nothing has shipped. The refund returns to the card or wallet you paid with. Your bank may take a few more days to show it.

This is not a judgment about you. The review is a safety check. If your health changes, you are welcome to order again.

**Questions about the refund?** Reply to this email or write to support@my4mlife.com. We cannot discuss health details by email or text; if we need to, we will ask you to call. [TJ CONFIRM: wording; no PHI over email, and the decline email carries no reason]

Thank you for trusting us with the order.

The My4MLife team

**Footer:** same footer as section 2, without the identity/dignity tagline and without the "brought to you by" line (TJ 2026-10-03).

Notes for P2-B:
- The email states the outcome only, never the reason or the screening answer that triggered it (no PHI in email). It carries no refund amount.
- The refund is NOT issued when this email sends. The decision handler never calls Stripe on decline; it sets `refundStatus: pending`, `declinedAt` and `refundDueBy` (declinedAt + 10 business days, Mon-Fri). Nothing is sent to the pharmacy partner on decline.
- Physician confirmation page after Decline: "Declined. A refund is queued for admin approval."
- `{{refundAmount}}` is no longer used by this email.

---

## 4. Intake reminder email ("intake not finished", no PHI)

Sent by `push-patch-reminder` (P2-C): at most 2, the first about 30 minutes after payment with no intake, the second at 24 hours. Both use the same template; the second swaps the subject and opening line.

**From:** My4MLife `<support@my4mlife.com>`

**Subject (reminder 1, 30 minutes):** One step left on your Push Patch order

**Subject (reminder 2, 24 hours):** Your Push Patch order is waiting on 2 minutes

**Preheader:** Your payment is in. A short health questionnaire starts the physician review.

**Body (reminder 1):**

Hi {{firstName}},

Your Push Patch order is paid, and one step is left before it can ship: a short health questionnaire so one of our network's licensed physicians can review your order. It takes about 2 minutes.

**Finish your questionnaire:** {{intakeLink}}

Review happens within an hour during business hours, 9 a.m.–5 p.m. Central. If you are not cleared, your payment is refunded within 10 business days.

If you have already finished, you can ignore this email. Questions? Reply here or write to support@my4mlife.com.

The My4MLife team

**Opening line swap (reminder 2):** It has been a day and your Push Patch order is still waiting on the 2-minute questionnaire. Your payment is safe, and nothing ships until it is done. Finish it here: {{intakeLink}}

**Footer:** same footer as section 2, without the identity/dignity tagline and without the "brought to you by" line (TJ 2026-10-03).

No-PHI check for P2-C: the email contains only first name, blend name, a link and generic process text. It does not state any medication, condition, screening result or DOB.

---

## 5. Single source of truth for process wording

Reuse these exact lines everywhere to keep the promise consistent:

- Review window: "within an hour during business hours (9 a.m.–5 p.m. Central)".
- Reviewer: "our network's licensed physicians" or "one of our network's licensed physicians". Never a group or personal name.
- Not cleared: "refunded within 10 business days" (admin-approved).
- After hours: "Submitted outside 9 a.m.–5 p.m. Central? You'll hear from us within the first hour of the next business day."
- Pharmacy partner: "our pharmacy partner" (never a company name).
- Time-to-door (TJ 2026-10-02): "Prepared within 1–3 business days, then ground delivery in 3–5 business days." Use this line wherever shipping time appears.

---

## 13. Open questions for TJ

1. ~~Shipping time~~ Resolved 2026-10-02: "Prepared within 1–3 business days, then ground delivery in 3–5 business days."
2. **Sender address.** support@my4mlife.com proposed; confirm, or give another my4mlife.com alias (the plan says "a my4mlife.com address").
3. **Consent text** (section 1.3): legal review of the adapted paragraph, and whether to link the full `/consent` page, which still carries GLP-1 and compounded-medication sections.
4. **Screening "Yes" handling:** goes to the physician (proposed) versus an automatic decline.
5. **Pregnancy question** asked of everyone, with a "does not apply" clause.
6. **Refund timing line** (5 to 10 business days) and the optional storage line in the welcome email.
7. **Business-day definition** (Monday to Friday, holidays) for the after-hours note.
8. **Kit counts** (6 patches, 6 vials, 6 ampules): same open item as the landing page.
