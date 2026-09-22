// my4mlife-consent-request — AppSync direct Lambda data source.
// Builds a personal, HMAC-signed consent-sign link for a patient and emails
// it to them before their visit is confirmed. Never logs the URL/token.
import { getRecord, writeConsentRequestedAudit } from './store';
import { sendMail } from './mail';
import { approveToken } from './token';

const CONSENT_SIGN_URL = process.env.CONSENT_SIGN_URL ?? '';
const HMAC_SECRET = process.env.CONSENT_SIGN_HMAC_KEY ?? '';

interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string };
  identity?: unknown;
}

interface ConsentRequestResult {
  ok: boolean;
  url?: string;
  sentTo?: string;
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

function renderEmail(firstName: string | undefined, url: string): { html: string; text: string } {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const body =
    `${greeting}\n\n` +
    `Before your care coordinator confirms your visit, please read and sign our privacy notice ` +
    `and the authorization that lets our network's licensed physicians see your intake. It takes ` +
    `two minutes.\n\n${url}\n\nThis link is personal to you.\n\n— Dr. TJ`;
  const html =
    `<p>${greeting}</p>` +
    `<p>Before your care coordinator confirms your visit, please read and sign our privacy notice ` +
    `and the authorization that lets our network's licensed physicians see your intake. It takes ` +
    `two minutes.</p>` +
    `<p><a href="${url}">Read and sign your privacy notice and authorization</a></p>` +
    `<p>This link is personal to you.</p><p>— Dr. TJ</p>`;
  return { html, text: body };
}

export const handler = async (event: AppSyncEvent): Promise<ConsentRequestResult> => {
  const { contactId, encounterId } = event.arguments;

  const record = await getRecord(contactId);
  const email = emailOf(record);
  if (!email) return { ok: false, error: 'no patient email on file' };

  const url = buildSignUrl(contactId, encounterId);
  const { html, text } = renderEmail(firstNameOf(record), url);

  await sendMail(
    email,
    'One step before your visit: privacy notice and authorization',
    html,
    text,
  );

  const ts = new Date().toISOString();
  await writeConsentRequestedAudit(contactId, encounterId, email, ts);

  return { ok: true, url, sentTo: email };
};
