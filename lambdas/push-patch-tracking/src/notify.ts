// Emails to TJ (review links, parse failures). No PHI is logged by callers.
import { send } from '@my4mlife/push-patch-decision-core/mailer';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { buildLink } from './sign';
import type { Candidate } from './match';

const TJ = 'drtj@my4mlife.com';
const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
const tj = (subject: string, text: string, html = `<p>${esc(text).replace(/\n/g, '<br>')}</p>`) => send({ to: TJ, from: 'drtj', subject, text, html });

export const failureMail = (subject: string, reason: string) =>
  tj("Couldn't read a Novo tracking email", `Subject line: ${subject}\nReason: ${reason}`);

export async function reviewMail(p: { firstName: string; lastName: string; trackingNumber: string; carrier: string }, cands: Candidate[]) {
  const r = await ssm.send(new GetParameterCommand({ Name: process.env.HMAC_PARAM ?? 'push-patch-decision-hmac-key', WithDecryption: true }));
  const secret = r.Parameter?.Value ?? '';
  if (cands.length && !secret) throw new Error('hmac key missing');
  // Full route of push-patch-ship-admin, e.g. https://<api>.execute-api.us-east-2.amazonaws.com/api/push-patch-ship
  const base = process.env.SHIP_ADMIN_URL ?? '';
  if (cands.length && !/^https:\/\/.+\/api\/push-patch-ship$/.test(base)) throw new Error('SHIP_ADMIN_URL not configured');
  const lines = cands.map((c) => ({ label: `${c.firstName} ${c.lastName.charAt(0)}. (ordered ${c.decidedAt.slice(0, 10)})`, url: buildLink(base, { c: c.contactId, s: c.sk, t: p.trackingNumber, k: p.carrier }, secret) }));
  const head = `Tracking for ${p.firstName} ${p.lastName}: ${p.trackingNumber} (${p.carrier}).\n` + (lines.length ? 'Click the right order to send the on-its-way email:' : 'No matching unshipped order was found.');
  const text = [head, ...lines.map((l) => `${l.label}: ${l.url}`)].join('\n');
  const html = `<p>${esc(head).replace(/\n/g, '<br>')}</p>` + lines.map((l) => `<p><a href="${esc(l.url)}">${esc(l.label)}</a></p>`).join('');
  await tj('Tracking needs your click', text, html);
}
