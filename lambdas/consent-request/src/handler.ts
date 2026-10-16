// my4mlife-consent-request — AppSync direct Lambda data source.
// Builds a personal, HMAC-signed consent-sign link for a patient and emails
// it to them before their visit is confirmed. Never logs the URL/token.
// Also stamps the chosen treatment lane + price on the encounter so the
// e-sign page can name the product on its card step.
import { getRecord, writeConsentRequestedAudit, writeEncounterLane } from './store';
import { sendMail } from './mail';
import { approveToken } from './token';
import { findLane } from './lanes';
import { renderEmail, renderCardEmail } from './email';
import { consentState } from './signed';

export { renderEmail };

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
  alreadySigned?: boolean;
  cardOnly?: boolean;
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

  // Signed at /consult intake (or earlier): never ask for a second signature.
  const { signed, hasCard } = consentState(record);
  if (signed) {
    if (priceCents <= 0 || hasCard) return { ok: true, alreadySigned: true };
    const card = renderCardEmail(firstNameOf(record), url, lane?.label, priceCents);
    await sendMail(email, 'Save a card for your prescription', card.html, card.text);
    await writeConsentRequestedAudit(contactId, encounterId, email, ts, 'card.requested');
    return {
      ok: true, url, sentTo: email, lane: lane?.slug, laneLabel: lane?.label, priceCents,
      alreadySigned: true, cardOnly: true,
    };
  }
  const { html, text } = renderEmail(firstNameOf(record), url, lane?.label, priceCents);

  await sendMail(email, 'One step before your visit: privacy notice and authorization', html, text);
  await writeConsentRequestedAudit(contactId, encounterId, email, ts);

  return { ok: true, url, sentTo: email, lane: lane?.slug, laneLabel: lane?.label, priceCents };
};
