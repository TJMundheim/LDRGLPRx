// Patient + fulfillment emails. Copy source: docs/launch/push-patch/async-visit-copy.md (sections 2 and 3).
// Customer copy never names the pharmacy/fulfillment partner and never carries a formula, dose or reason.
import { blendFor, esc } from './blends';
import { send } from './mailer';

const FOOTER =
  'My4MLife\nDon\'t lose your identity and your dignity while you still have a choice.\n\n' +
  'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.\n\n' +
  'You received this email because you placed a Push Patch order at my4mlife.com. Your health information is handled under our Privacy Policy: https://my4mlife.com/privacy';

const toHtml = (text: string): string => text.split('\n\n').map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const mail = (to: string, subject: string, text: string) => send({ to, subject, text, html: toHtml(text) });

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
    `Questions? Reply to this email or write to support@my4mlife.com. A real person reads it.\n\nWelcome aboard.\n\nThe My4MLife team\n\n${FOOTER}`;
  return mail(to, 'Welcome — your Push Patch is approved', text);
}

export function sendDeclined(to: string, firstName: string, sku: string, amountCents?: number): Promise<void> {
  const refund = typeof amountCents === 'number' ? `We have refunded your payment in full: $${(amountCents / 100).toFixed(2)}.` : 'We have refunded your payment in full.';
  const text = `Hi ${firstName},\n\nOne of our network's licensed physicians reviewed your answers and did not clear your ${blendFor(sku).name} Push Patch order. Nothing has shipped.\n\n` +
    `${refund} It returns to the card or wallet you paid with. Most banks show it within 5 to 10 business days.\n\n` +
    `This is not a judgment about you. The review is a safety check, and the answers you gave this time did not meet it. If your health or your answers change, you are welcome to order again.\n\n` +
    `Questions about the review or the refund? Reply to this email or write to support@my4mlife.com. We will point you to the right person. We cannot discuss health details by email or text; if we need to, we will ask you to call.\n\n` +
    `Thank you for trusting us with the order.\n\nThe My4MLife team\n\n${FOOTER}`;
  return mail(to, 'Your Push Patch order was not cleared. Full refund issued', text);
}
