// Patient shipping emails (pure composers; sending is the caller's job).
// Copy source: docs/launch/push-patch/async-visit-copy.md (section 2 how-to + safety lines) and emails.ts welcome.
// Never names the pharmacy partner, never carries a formula, dose, outcome claim or promo.
import { esc } from './blends';
import { FOOTER } from './emails';

export type Carrier = 'UPS' | 'FedEx';
export interface Composed { subject: string; html: string; text: string }

// Permanent how-to location. The owner's short walkthrough on getting the patch ready for its first
// application will be added at this anchor on the website; until then the page's wear steps serve.
export const HOWTO_URL = 'https://my4mlife.com/go/push-patch#wear';
const HOWTO_LABEL = 'See how to get your patch ready';
const SAFETY = 'Do not use the patch if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site. If any of these apply to you now, or change later, do not apply a patch and write to us first.';
const CONTACT = 'Questions? Reply to this email or write to support@my4mlife.com. A real person reads it.';
const SIGNOFF = 'Warmly,\nDr. TJ and the My4MLife team';
const BTN = 'display:inline-block;padding:10px 20px;background:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:4px;';

const link = (t: string): string => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`);
const para = (t: string): string => `<p>${link(t).replace(/\n/g, '<br>')}</p>`;
const list = (items: string[]): string => `<ul>${items.map((i) => `<li>${link(i)}</li>`).join('')}</ul>`;
const button = (url: string, label: string): string => `<p><a href="${esc(url)}" style="${BTN}">${esc(label)}</a></p>`;

export function composeWhileYouWait({ firstName, blendName }: { firstName: string; blendName: string }): Composed {
  const hello = `Hi ${firstName},`;
  const intro = `Thank you for your order, and welcome. We are excited for you to get started, and everyone here is already cheering you on. Your ${blendName} Push Patch set is being prepared. It ships soon, and we will send you a tracking email as soon as it does. Delivery typically lands within about a week of approval.`;
  const ease = 'Your first patch is easy, and we are with you for every step. A few small details make the first application smooth, so we gathered them in one spot:';
  const heading = 'While you wait';
  const items = [
    'Know the rhythm: one patch a week, worn for 12 hours, for six weeks. No needle at any step.',
    'When it is time, start on clean, dry skin.',
    'Have the step-by-step instructions, with a photo for each step, nearby.',
  ];
  const text = `${hello}\n\n${intro}\n\n${ease}\n${HOWTO_LABEL}: ${HOWTO_URL}\n\n${heading}\n${items.map((i) => `- ${i}`).join('\n')}\n\n` +
    `${SAFETY}\n\n${CONTACT}\n\n${SIGNOFF}\n\n${FOOTER}`;
  const html = para(hello) + para(intro) + para(ease) + button(HOWTO_URL, HOWTO_LABEL) + para(heading) + list(items) +
    para(SAFETY) + para(CONTACT) + para(SIGNOFF) + FOOTER.split('\n\n').map(para).join('');
  return { subject: 'Your Push Patch set is being prepared', text, html };
}

const trackUrl = (carrier: Carrier, n: string): string => {
  const e = encodeURIComponent(n);
  if (carrier === 'UPS') return `https://www.ups.com/track?tracknum=${e}`;
  if (carrier === 'FedEx') return `https://www.fedex.com/fedextrack/?trknbr=${e}`;
  throw new Error(`unsupported carrier: ${String(carrier)}`);
};

export function composeOnItsWay({ firstName, blendName, trackingNumber, carrier }: { firstName: string; blendName: string; trackingNumber: string; carrier: Carrier }): Composed {
  const url = trackUrl(carrier, trackingNumber);
  const hello = `Hi ${firstName},`;
  const intro = `Great news, your ${blendName} Push Patch set is on its way to you. We are so glad you are getting started, and we will be right here when you open the box.`;
  const numLine = `Your ${carrier} tracking number: ${trackingNumber}`;
  const before = 'Before your first patch, take a quick look at how to get it ready. It takes only a few minutes, and it makes that first application feel easy:';
  const heading = 'When your box arrives';
  const items = [
    'Follow the insert in your kit, along with the how-to above.',
    'One patch a week, worn for 12 hours. Start on clean, dry skin. No needle at any step.',
  ];
  const text = `${hello}\n\n${intro}\n\n${numLine}\nTrack your package: ${url}\n\n${before}\n${HOWTO_LABEL}: ${HOWTO_URL}\n\n${heading}\n${items.map((i) => `- ${i}`).join('\n')}\n\n` +
    `${SAFETY}\n\n${CONTACT}\n\n${SIGNOFF}\n\n${FOOTER}`;
  const track = `<p>Your ${esc(carrier)} tracking number: <strong>${esc(trackingNumber)}</strong></p>` + button(url, 'Track your package') +
    `<p>Or copy this link: <a href="${esc(url)}">${esc(url)}</a></p>`;
  const html = para(hello) + para(intro) + track + para(before) + button(HOWTO_URL, HOWTO_LABEL) + para(heading) + list(items) +
    para(SAFETY) + para(CONTACT) + para(SIGNOFF) + FOOTER.split('\n\n').map(para).join('');
  return { subject: 'Your Push Patch is on its way', text, html };
}
