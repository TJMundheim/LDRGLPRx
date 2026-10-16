// Email copy for the consent-request flow. Pure — no AWS calls.
import { formatPrice } from './lanes';

export function renderEmail(
  firstName: string | undefined,
  url: string,
  laneLabel?: string,
  priceCents?: number,
): { html: string; text: string } {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const what = laneLabel ? `${laneLabel} prescription review` : 'prescription review';
  const price = formatPrice(priceCents);
  const card = price
    ? `After you sign, you'll save a card for your prescription (${price} per 30-day supply). Nothing is charged until the physician approves.`
    : `After you sign, you'll save a card for your prescription. Nothing is charged until the physician approves.`;
  const lead =
    `This is the one step between you and your ${what}. Please read and sign our privacy ` +
    `notice and the authorization that lets our network's licensed physician see your record. It takes ` +
    `two minutes. Once both are signed, your record goes to the physician for the asynchronous review ` +
    `and your prescription follows from there.`;
  const text = `${greeting}\n\n${lead}\n\n${card}\n\n${url}\n\nThis link is personal to you.\n\n— Dr. TJ`;
  const html =
    `<p>${greeting}</p><p>${lead}</p><p>${card}</p>` +
    `<p><a href="${url}">Read and sign your privacy notice and authorization</a></p>` +
    `<p>This link is personal to you.</p><p>— Dr. TJ</p>`;
  return { html, text };
}

/** Signed at intake, priced lane, no card yet: a card-only link (the sign page shows only the card step). */
export function renderCardEmail(
  firstName: string | undefined,
  url: string,
  laneLabel: string | undefined,
  priceCents: number,
): { html: string; text: string } {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const what = laneLabel ? `${laneLabel} prescription` : 'prescription';
  const lead =
    `your privacy notice and authorization are already signed. One quick step left: save a card for your ` +
    `${what} (${formatPrice(priceCents)} per 30-day supply). Nothing is charged until the physician approves.`;
  const text = `${greeting.replace(/,$/, '')}, ${lead}\n\n${url}\n\nThis link is personal to you. — Dr. TJ`;
  const html =
    `<p>${greeting.replace(/,$/, '')}, ${lead}</p><p><a href="${url}">Save my card</a></p>` +
    `<p>This link is personal to you. — Dr. TJ</p>`;
  return { html, text };
}
