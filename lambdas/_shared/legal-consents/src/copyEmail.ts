// The signed-copy email body sent to the patient after e-signing.
import { NPP_HTML, PATIENT_AUTH_HTML, LEGAL_EFFECTIVE } from './legal';
import { esc, DISCLOSE_TO, ESIGN_LINE, TAGLINE } from './text';

export const copyEmailHtml = (name: string, typedName: string, at: string) =>
  `<p>Hello ${esc(name)},</p><p>Here is your signed copy. Effective ${esc(LEGAL_EFFECTIVE)}.</p>
<h2>Notice of Privacy Practices</h2>${NPP_HTML}
<h2>Authorization for Use and Disclosure of PHI</h2>
<p><strong>Disclose to:</strong> ${esc(DISCLOSE_TO)}</p>${PATIENT_AUTH_HTML}
<h2>Signature</h2><p>Electronically signed by <strong>${esc(typedName)}</strong> on ${esc(at)}.</p>
<p>${ESIGN_LINE}</p><p>${TAGLINE}</p>`;
