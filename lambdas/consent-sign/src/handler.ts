// Lambda Function URL (payload format v2) handler for the hosted Stage-2
// HIPAA consent e-sign page: Notice of Privacy Practices acknowledgment +
// Patient Authorization for disclosure to network telemedicine providers.
//
// Security note: the Function URL is public (auth NONE) — the gate is the
// HMAC token in the query string, not secrecy of the URL.
import { CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';
import { verifyToken } from './token';
import { getRecord, readConsents, writeConsents, writeAudit, SignedConsent } from './store';
import { parseForm, validateForm } from './validate';
import { sendMail, NOTIFY_TO } from './mail';
import { LEGAL_VERSION } from './legal';
import { renderForm, renderAlready, renderSuccess, renderError, copyEmailHtml } from './render';

const secret = () => process.env.CONSENT_SECRET ?? '';

interface FnUrlEvent {
  queryStringParameters?: Record<string, string>;
  requestContext?: { http?: { method?: string; sourceIp?: string; userAgent?: string } };
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}
interface FnUrlResult { statusCode: number; headers: Record<string, string>; body: string }

const html = (statusCode: number, body: string): FnUrlResult => ({
  statusCode, headers: { 'content-type': 'text/html; charset=utf-8' }, body,
});

export const handler = async (event: FnUrlEvent): Promise<FnUrlResult> => {
  const q = event.queryStringParameters ?? {};
  const c = q.c ?? '', e = q.e ?? '', t = q.t ?? '';
  if (!c || !e || !t || !verifyToken(secret(), c, e, t)) {
    return html(403, renderError('Not authorized', 'This link is invalid or has expired.'));
  }

  const record = await getRecord(c);
  if (!record) return html(404, renderError('Not found', 'We could not find your record.'));

  const demo = (record.demographics ?? {}) as Record<string, string>;
  const name = [demo.firstName, demo.lastName].filter(Boolean).join(' ') || 'Patient';
  const email = demo.email ?? '';
  const query = new URLSearchParams({ c, e, t }).toString();

  const existing = readConsents(record);
  if (existing.npp && existing.phi) {
    return html(200, renderAlready(existing.npp.at ?? existing.phi.at ?? 'an earlier visit'));
  }

  const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase();
  if (method !== 'POST') return html(200, renderForm({ name, email, query }));

  const form = parseForm(event.body ?? '', event.isBase64Encoded === true);
  const error = validateForm(form, demo.firstName, demo.lastName);
  if (error) {
    return html(400, renderForm({ name, email, query, error, typedName: form.typedName }));
  }

  const at = new Date().toISOString();
  const base = {
    legalVersion: LEGAL_VERSION,
    at,
    typedName: form.typedName,
    ip: event.requestContext?.http?.sourceIp,
    userAgent: event.requestContext?.http?.userAgent ?? event.headers?.['user-agent'],
  };
  const npp: SignedConsent = { version: CONSENT_NPP_V1, ...base };
  const phi: SignedConsent = { version: CONSENT_PHI_AUTH_V1, ...base };

  await writeConsents(c, npp, phi, at);
  await writeAudit(c, e, at);

  const body = copyEmailHtml(name, form.typedName, at);
  if (email) {
    await sendMail(email, 'Your signed My4MLife privacy notice and authorization', body,
      `Signed by ${form.typedName} on ${at}. A full copy is in the HTML version of this email.`);
  }
  await sendMail(NOTIFY_TO, `[Consent signed] ${name}`,
    `<p>${name} (${email}) signed the NPP + Patient Authorization on ${at}.</p><p>Encounter: ${e}</p>`,
    `${name} (${email}) signed the NPP + Patient Authorization on ${at}. Encounter: ${e}`);

  return html(200, renderSuccess());
};
