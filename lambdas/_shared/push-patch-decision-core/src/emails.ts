// Patient + fulfillment emails. Copy source: docs/launch/push-patch/async-visit-copy.md (sections 2 and 3).
// Customer copy never names the pharmacy/fulfillment partner and never carries a formula, dose or reason.
import { blendFor, esc } from './blends';
import { send } from './mailer';

const TAGLINE = "Don't lose your identity and your dignity while you still have a choice.";
const BRAND_URL = 'https://my4mlife.com/?utm_source=push-patch&utm_medium=email&utm_campaign=welcome';
// Welcome only: tagline stays, with the brand line directly under it. Decline (and refund/reminder emails) carry no tagline.
const BRAND_LINE = `Push Patch is brought to you by My4MLife (${BRAND_URL}), where we help you protect your mind for the long run.`;
const FOOTER_BODY =
  'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.\n\n' +
  'You received this email because you placed a Push Patch order at my4mlife.com. Your health information is handled under our Privacy Policy: https://my4mlife.com/privacy';
export const FOOTER = `My4MLife\n\n${FOOTER_BODY}`;
const WELCOME_FOOTER = `My4MLife\n${TAGLINE}\n${BRAND_LINE}\n\n${FOOTER_BODY}`;

// Welcome-only card inviting the buyer to the free assessment (copy: async-visit-copy.md, "Welcome email — assessment invitation").
const ASSESS_URL = 'https://my4mlife.com/assessment?src=push-patch-buyer';
const ASSESS_HEAD = 'Your free MindSpan assessment';
const ASSESS_BODY = "As a Push Patch customer, you're invited to take our free 20-question MindSpan assessment. It shows where your brain health stands today, and when you finish you get the book, the Logbook and our app, all free.";
const ASSESS_TEXT = `${ASSESS_HEAD}\n${ASSESS_BODY}\nTake the assessment: ${ASSESS_URL}`;
const ASSESS_HTML = `<p><strong>${esc(ASSESS_HEAD)}</strong><br>${esc(ASSESS_BODY)}</p>` +
  `<p><a href="${esc(ASSESS_URL)}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:4px;">Take the assessment</a></p>`;

const toHtml = (text: string): string => text.split('\n\n').map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const mail = (to: string, subject: string, text: string, html: string = toHtml(text)) => send({ to, subject, text, html, from: 'support' });

export function sendWelcome(to: string, firstName: string, sku: string): Promise<void> {
  const text = `Hi ${firstName},\n\nOne of our network's licensed physicians has reviewed your answers and cleared your ${blendFor(sku).name} Push Patch set. Your payment stands and there is nothing more to do today.\n\n` +
    `What happens next\n1. Your kit ships direct. Our pharmacy partner ships your six-patch set straight to the address you confirmed. Your kit is prepared within 1–3 business days and ships by ground; delivery typically takes 3–5 business days after it ships. You will get a shipping confirmation email with tracking.\n` +
    `2. Your set. Six single-use patches, one for each week of the six-week set, with the blend vials and sterile water that go with them.\n` +
    `3. You apply it yourself. No needle at any step. One patch a week, worn for 12 hours.\n\n` +
    `How to apply (from the manufacturer's instructions)\n1. Prepare. On clean, dry skin. Add the sterile water provided to the powder vial, cap it and shake to mix. Press the white pad of the patch against the open vial, turn it over, and wet the whole pad.\n` +
    `2. Apply. Peel the backing and press the patch down flat, like kinesiology tape. Pull the activation tab all the way out.\n` +
    `3. Wear. Wear it for 12 hours, then remove it: wet it with warm soapy water and peel slowly. Wait at least 24 hours before using the same spot again. Use one patch a week for six weeks.\n\n` +
    `Follow the insert in your kit for the exact amount of water. Full step-by-step instructions, with a photo for each step: https://my4mlife.com/go/push-patch#wear\n\n` +
    `Do not use the patch if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site. If any of these apply to you now, or change later, do not apply a patch and write to us first.\n\n` +
    `${ASSESS_TEXT}\n\n` +
    `Questions? Reply to this email or write to support@my4mlife.com. A real person reads it.\n\nWelcome aboard.\n\nThe My4MLife team\n\n${WELCOME_FOOTER}`;
  // HTML shows "My4MLife" as the link; plain text shows the URL.
  const html = toHtml(text.replace(`${ASSESS_TEXT}\n\n`, '')).replace('<p>Questions?', `${ASSESS_HTML}<p>Questions?`).replace(esc(`My4MLife (${BRAND_URL})`), `<a href="${esc(BRAND_URL)}">My4MLife</a>`);
  return mail(to, 'Welcome — your Push Patch is approved', text, html);
}

// Decline no longer refunds inline: the refund is queued for admin approval (refundStatus 'pending'),
// so this email states the outcome and the 10-business-day promise only. No reason, no PHI, no amount.
export function sendDeclined(to: string, firstName: string, sku: string): Promise<void> {
  const text = `Hi ${firstName},\n\nYou weren't cleared for the Push Patch. Your refund will be processed within 10 business days.\n\n` +
    `One of our network's licensed physicians reviewed your ${blendFor(sku).name} Push Patch order. Nothing has shipped. The refund returns to the card or wallet you paid with. Your bank may take a few more days to show it.\n\n` +
    `This is not a judgment about you. The review is a safety check. If your health changes, you are welcome to order again.\n\n` +
    `Questions about the refund? Reply to this email or write to support@my4mlife.com. We cannot discuss health details by email or text; if we need to, we will ask you to call.\n\n` +
    `Thank you for trusting us with the order.\n\nThe My4MLife team\n\n${FOOTER}`;
  return mail(to, "You weren't cleared for the Push Patch. Refund within 10 business days", text);
}

// ---- Refills (Phase 1: change/cancel by replying or writing support) ----
const TJ = 'drtj@my4mlife.com';
const tjMail = (subject: string, text: string) => send({ to: TJ, subject, text, html: toHtml(text) });

export function sendRefillShipped(a: { to: string; firstName: string; blendName: string; refillNumber: number; refillsAuthorized: number; nextChargeDate?: string }): Promise<void> {
  const text = `Hi ${a.firstName},\n\nYour next ${a.blendName} Push Patch box is on its way. This is refill ${a.refillNumber} of ${a.refillsAuthorized} on your plan. Our pharmacy partner ships it straight to the address on your first order, and you will get a shipping confirmation email with tracking.\n\n` +
    `Same routine as before: one patch a week for six weeks, worn for 12 hours. Follow the insert in your box.\n\n` +
    (a.nextChargeDate ? `Your next charge is on ${a.nextChargeDate}.\n\n` : '') +
    `Want to change or cancel? Reply to this email or write to support@my4mlife.com and we will take care of it. A real person reads it.\n\nThe My4MLife team\n\n${FOOTER}`;
  return mail(a.to, 'Your next Push Patch box is on its way', text);
}

export function sendRefillNotice(a: { name: string; blendName: string; refillNumber: number; refillsAuthorized: number; ref: string }): Promise<void> {
  return tjMail(`Push Patch refill: ${a.name}`, `Refill sent: ${a.name}, ${a.blendName}, refill ${a.refillNumber} of ${a.refillsAuthorized} (${a.ref}).`);
}

export function sendRefillPaymentFailed(a: { to: string; firstName: string; hostedInvoiceUrl: string }): Promise<void> {
  const text = `Hi ${a.firstName},\n\nWe could not process the payment for your next Push Patch box, so it has not shipped yet. You can update your card and pay here: ${a.hostedInvoiceUrl}\n\n` +
    `Once the payment goes through, your box ships right away. Questions? Reply to this email or write to support@my4mlife.com.\n\nThe My4MLife team\n\n${FOOTER}`;
  return mail(a.to, "We couldn't process your Push Patch payment", text);
}

// Ids only: no health detail in email. TJ routes this to the provider.
export function sendRefillChangeReported(a: { contactId: string; encounterId: string }): Promise<void> {
  return tjMail('Push Patch refill: patient reported a change',
    `A patient answered "Yes, something changed" on the refill page. No refill was charged or shipped.\n\nContact: ${a.contactId}\nEncounter: ${a.encounterId}\n\nPlease route this to the provider for review.`);
}

// Reorder reminders (n = 1 about 5 weeks after shipping, n = 2 about 6 weeks). Link = signed one-click reorder link.
// No PHI beyond first name + blend name.
export function sendRefillReminder(a: { to: string; firstName: string; blendName: string; link: string; n: 1 | 2 }): Promise<void> {
  const intro = a.n === 1
    ? `Your last box shipped about 5 weeks ago, so you're about a week from running out.`
    : `Just a reminder: your last box shipped about 6 weeks ago, so your ${a.blendName} Push Patch set should be about used up.`;
  const tail = `No health questions to repeat. Just confirm nothing has changed and check out. Prefer it automatic? Choose auto-ship on the next screen.`;
  const text = `Hi ${a.firstName},\n\n${intro}\n\nReorder in one click: ${a.link}\n\n${tail}\n\nQuestions? Reply to this email or write to support@my4mlife.com. A real person reads it.\n\nThe My4MLife team\n\n${FOOTER}`;
  const button = `<p><a href="${esc(a.link)}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:4px;">Reorder in one click</a></p>`;
  const html = toHtml(text.replace(`Reorder in one click: ${a.link}\n\n`, '')).replace(`<p>${esc(tail)}`, `${button}<p>${esc(tail)}`);
  return mail(a.to, a.n === 1 ? 'Time to reorder your Push Patch' : 'Reminder: reorder your Push Patch', text, html);
}

// Refills used up or expired: a quick re-review through the normal order flow. Sent once.
export function sendRefillReReview(a: { to: string; firstName: string }): Promise<void> {
  const text = `Hi ${a.firstName},\n\nIt's time for a quick re-review. Your current refill plan has run its course, so before your next box one of our network's physicians needs to take a fresh look. It only takes a few minutes: https://my4mlife.com/go/push-patch\n\n` +
    `Questions? Reply to this email or write to support@my4mlife.com. A real person reads it.\n\nThe My4MLife team\n\n${FOOTER}`;
  return mail(a.to, 'Time for a quick re-review of your Push Patch', text);
}
