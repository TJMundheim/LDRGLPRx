// my4mlife-consent-request — AppSync direct Lambda data source.
// Builds a personal, HMAC-signed consent-sign link for a patient and emails
// it to them before their visit is confirmed. Never logs the URL/token.
// Also stamps the chosen treatment lane + price on the encounter so the
// e-sign page can name the product on its card step.
import { getRecord, writeConsentRequestedAudit, writeEncounterLane } from './store';
import { sendMail } from './mail';
import { approveToken } from './token';
import { findLane, formatPrice } from './lanes';

const CONSENT_SIGN_URL = process.env.CONSENT_SIGN_URL ?? '';
const HMAC_SECRET = process.env.CONSENT_SIGN_HMAC_KEY ?? '';

interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string; lane?: string; priceCents?: number };
  identity?: unknown;
}

interface ConsentRequestResult {
  ok: boolean;
  url?: string;
  sentTo?: string;
  lane?: string;
  laneLabel?: string;
  priceCents?: number;
  error?: string;
}

function firstNameOf(record: Record<string, unknown> | undefined): string | undefined {
  return (record?.['demographics'] as { firstName?: string } | undefined)?.firstName;
}

function emailOf(record: Record<string, unknown> | undefined): string | undefined {
  return (record?.['demographics'] as { email?: string } | undefined)?.email;
}

function buildSignUrl(contactId: string, encounterId: string): string {
  const token = approveToken(HMAC_SECRET, contactId, encounterId);
  const params = new URLSearchParams({ c: contactId, e: encounterId, t: token });
  return `${CONSENT_SIGN_URL}?${params.toString()}`;
}

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

export const handler = async (event: AppSyncEvent): Promise<ConsentRequestResult> => {
  const { contactId, encounterId } = event.arguments;

  const record = await getRecord(contactId);
  const email = emailOf(record);
  if (!email) return { ok: false, error: 'no patient email on file' };

  const lane = findLane(event.arguments.lane);
  const priceCents = typeof event.arguments.priceCents === 'number' && event.arguments.priceCents > 0
    ? Math.round(event.arguments.priceCents)
    : lane?.defaultPriceCents ?? 0;

  const ts = new Date().toISOString();
  if (lane) await writeEncounterLane(contactId, encounterId, lane.slug, lane.label, priceCents, ts);

  const url = buildSignUrl(contactId, encounterId);
  const { html, text } = renderEmail(firstNameOf(record), url, lane?.label, priceCents);

  await sendMail(email, 'One step before your visit: privacy notice and authorization', html, text);
  await writeConsentRequestedAudit(contactId, encounterId, email, ts);

  return { ok: true, url, sentTo: email, lane: lane?.slug, laneLabel: lane?.label, priceCents };
};
