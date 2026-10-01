// Owns SSM reads (provider email, HMAC key), the export-clinical-packet invoke
// and the email-sender invoke. PHI discipline: subject/body carry first initial
// + last name, the blend name and screening flag names only; everything
// clinical (DOB, phone, meds) lives behind the presigned packet link.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { signToken } from './sign';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PACKET_FN = process.env.EXPORT_PACKET_FN ?? 'my4mlife-export-clinical-packet';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const PROVIDER_EMAIL_PARAM = process.env.PROVIDER_EMAIL_PARAM ?? '/my4mlife/provider/email';
const HMAC_PARAM = process.env.HMAC_PARAM ?? 'push-patch-decision-hmac-key';
const BASE_URL = process.env.DECISION_BASE_URL ?? 'https://my4mlife.com';

const lambda = new LambdaClient({ region: REGION });
const ssm = new SSMClient({ region: REGION });

// Names only (no formulas). Keep in step with website/src/data/pushPatch.ts.
const BLEND_NAMES: Record<string, string> = {
  'push-patch-nad-ghk': 'NAD+ Restore',
  'push-patch-bpc-nad-ghk': 'Repair',
  'push-patch-kpv-nad-ghk': 'Calm Gut',
  'push-patch-nad-motsc-ghk': 'Metabolic',
  'push-patch-enhanced-glow': 'Enhanced Glow',
  'push-patch-wolverine': 'Wolverine',
  'push-patch-glutathione-ghk': 'Glutathione Radiance',
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

async function param(Name: string): Promise<string> {
  const r = await ssm.send(new GetParameterCommand({ Name, WithDecryption: true }));
  if (!r.Parameter?.Value) throw new Error(`SSM parameter ${Name} is empty`);
  return r.Parameter.Value;
}

/** Invoke my4mlife-export-clinical-packet (AppSync-shaped event); returns the presigned summaryUrl. */
export async function generatePacket(contactId: string, encounterId: string): Promise<string> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: PACKET_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ arguments: { contactId, encounterId }, identity: { groups: ['Admins'] } })),
  }));
  if (res.FunctionError) throw new Error('packet generation failed');
  let parsed: { ok?: boolean; summaryUrl?: string } = {};
  try { parsed = JSON.parse(Buffer.from(res.Payload ?? '').toString('utf8')); } catch { /* handled below */ }
  if (!parsed.ok || !parsed.summaryUrl) throw new Error('packet generation failed');
  return parsed.summaryUrl;
}

const button = (href: string, label: string, bg: string) =>
  `<a href="${esc(href)}" style="display:block;margin:14px 0;padding:20px 16px;background:${bg};color:#fff;`
  + `font:700 20px Arial,sans-serif;text-align:center;text-decoration:none;border-radius:10px">${label}</a>`;

/** Exactly ONE email-sender invoke ({ kind:'info', to, subject, html, text }). */
export async function sendProviderReview(a: {
  contactId: string; encounterId: string; patientName: string; sku: string; flags: string[]; packetUrl: string;
}): Promise<void> {
  const [to, secret] = await Promise.all([param(PROVIDER_EMAIL_PARAM), param(HMAC_PARAM)]);
  const [first = '', ...rest] = a.patientName.trim().split(/\s+/);
  const who = `${first.charAt(0).toUpperCase()}. ${rest.join(' ')}`.trim();
  const blend = BLEND_NAMES[a.sku] ?? 'Push Patch';
  const flagged = a.flags.length > 0;
  const subject = `${flagged ? '[Screening flag] ' : ''}[Provider review] Push Patch — ${blend} — ${who}`;
  const url = (action: 'approve' | 'decline') =>
    `${BASE_URL}/api/push-patch-decision?t=${signToken(a.contactId, a.encounterId, action, secret)}`;
  const approve = url('approve');
  const decline = url('decline');

  const flagHtml = flagged
    ? `<p style="color:#b00020"><strong>Screening flags (answered yes):</strong> ${a.flags.map(esc).join(', ')}</p>`
    : '<p>Screening: no flags.</p>';
  const html = `<div style="max-width:560px;font:16px Arial,sans-serif">`
    + `<p>${esc(who)} is ready for your review: Push Patch, ${esc(blend)}. Asynchronous review.</p>`
    + flagHtml
    + `<p><a href="${esc(a.packetUrl)}">Open the clinical packet</a> (link expires in 7 days).</p>`
    + button(approve, 'Approve', '#1b7f3b') + button(decline, 'Decline (full refund)', '#b00020')
    + `<p>Reply-all for questions.</p></div>`;
  const text = `${who} is ready for your review: Push Patch, ${blend}.\n`
    + `${flagged ? `Screening flags (yes): ${a.flags.join(', ')}` : 'Screening: no flags.'}\n\n`
    + `Packet: ${a.packetUrl}\nApprove: ${approve}\nDecline (full refund): ${decline}\n\nReply-all for questions.`;

  const res = await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to, subject, html, text })),
  }));
  if (res.FunctionError) throw new Error('provider email could not be sent');
}
