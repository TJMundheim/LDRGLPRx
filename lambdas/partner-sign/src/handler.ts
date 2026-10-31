// Lambda Function URL (payload v2) handler for the hosted partner-agreement e-sign page.
// Security: the URL is public (auth NONE); the gate is the HMAC token in ?t=.
import { verifyToken } from './token';
import { AGREEMENT_MD, parseVersion, fillAgreement, toHtml, sha256, longDate, esc, Vars } from './agreement';
import { getSigned, putSigned } from './store';
import { lookupPartner, Partner } from './partner';
import { parseForm, validateForm } from './validate';
import { sendMail, NOTIFY_TO } from './mail';
import { page, renderError, renderForm, renderSigned } from './render';

interface FnUrlEvent {
  queryStringParameters?: Record<string, string>;
  requestContext?: { http?: { method?: string; sourceIp?: string; userAgent?: string } };
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}
const html = (statusCode: number, body: string) => ({ statusCode, headers: { 'content-type': 'text/html; charset=utf-8' }, body });

const vars = (p: Partner, v: { name: string; title: string; business: string; at: string }): Vars => ({
  BUSINESS: v.business, SIGNER_NAME: v.name, SIGNER_TITLE: v.title, PARTNER_CODE: p.code,
  CLIENT_OFFER: `$${p.clientDiscount} off`, COMMISSION: `$${p.commission}`, EFFECTIVE_DATE: longDate(v.at),
});
const BLANK = '__________';

export const handler = async (event: FnUrlEvent) => {
  const t = event.queryStringParameters?.t ?? '';
  const claims = verifyToken(process.env.PARTNER_SIGN_SECRET ?? '', t);
  const partner = claims && await lookupPartner(claims.code, claims.email);
  if (!claims || !partner) return html(403, renderError('Not authorized', 'This link is invalid or has expired. Please ask Dr. TJ for a new one.'));

  const existing = await getSigned(claims.code);
  if (existing?.signedAt) return html(200, renderSigned('Already signed', longDate(existing.signedAt), partner.connectOnboardingUrl));

  const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase();
  const query = new URLSearchParams({ t }).toString();
  const at = new Date().toISOString();
  const preview = (name: string, title: string, business: string) =>
    toHtml(fillAgreement(AGREEMENT_MD, vars(partner, { name: name || BLANK, title: title || BLANK, business, at })));

  if (method !== 'POST') return html(200, renderForm({ docHtml: preview('', '', partner.business), business: partner.business, query }));

  const f = parseForm(event.body, event.isBase64Encoded === true);
  const error = validateForm(f);
  if (error) return html(400, renderForm({ docHtml: preview(f.legalName, f.title, f.business || partner.business), business: f.business, query, error, legalName: f.legalName, title: f.title }));

  const filled = fillAgreement(AGREEMENT_MD, vars(partner, { name: f.legalName, title: f.title, business: f.business, at }));
  const ok = await putSigned({
    code: claims.code, version: parseVersion(AGREEMENT_MD), docSha256: sha256(filled), legalName: f.legalName,
    title: f.title, business: f.business, email: partner.email, signedAt: at,
    ip: event.requestContext?.http?.sourceIp, userAgent: event.requestContext?.http?.userAgent ?? event.headers?.['user-agent'],
  });
  if (!ok) return html(200, renderSigned('Already signed', longDate((await getSigned(claims.code))?.signedAt ?? at), partner.connectOnboardingUrl));

  const copy = page('Signed partner agreement', `<div class="card"><p>Signed by ${esc(f.legalName)}, ${esc(f.title)} on ${longDate(at)} (${at}).</p><div class="doc">${toHtml(filled)}</div></div>`);
  await Promise.allSettled([
    sendMail(partner.email, 'Your signed My4MLife partner agreement', copy, `Signed by ${f.legalName} on ${at}. The full copy is in the HTML version of this email.`),
    sendMail(NOTIFY_TO, `[Partner agreement signed] ${f.business} (${claims.code})`, `<p>${esc(f.legalName)}, ${esc(f.title)} (${esc(partner.email)}) signed for ${esc(f.business)}, code ${esc(claims.code)}, on ${at}.</p>`, `${f.legalName} (${partner.email}) signed for ${f.business}, code ${claims.code}, on ${at}.`),
  ]);
  return html(200, renderSigned("You're signed", longDate(at), partner.connectOnboardingUrl));
};
