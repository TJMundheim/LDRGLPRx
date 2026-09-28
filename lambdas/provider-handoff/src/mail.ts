// Provider cover note + delivery through the shared email-sender Lambda.
//
// PHI discipline: the body carries the patient's name, the treatment lane and
// the price only. Everything clinical lives behind the presigned packet link.
// Never name a formula or active ingredient here — lane labels only.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
export const COORDINATOR_CC = process.env.COORDINATOR_EMAIL ?? 'drtj@my4mlife.com';

const lambda = new LambdaClient({ region: REGION });

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function subjectFor(patientName: string, laneLabel: string): string {
  return `[Provider review] ${patientName} — ${laneLabel}`;
}

export function renderCoverNote(args: {
  patientName: string;
  laneLabel: string;
  packetUrl: string;
  resend: boolean;
}): { html: string; text: string } {
  const { patientName, laneLabel, packetUrl, resend } = args;
  const lead = resend
    ? `Resending ${patientName} for your review — ${laneLabel}. Asynchronous review requested.`
    : `${patientName} is ready for your review — ${laneLabel}. Asynchronous review requested.`;
  const link = 'The clinical packet is here (the link expires in 7 days):';
  const ask =
    'Reply to this email with approved / declined / needs info; the coordinator will handle the patient and the charge.';

  const text = `${lead}\n\n${link}\n${packetUrl}\n\n${ask}\n\n— Dr. TJ`;
  const html =
    `<p>${esc(lead)}</p>` +
    `<p>${esc(link)}</p>` +
    `<p><a href="${esc(packetUrl)}">Open the clinical packet</a></p>` +
    `<p>${esc(ask)}</p>` +
    `<p>— Dr. TJ</p>`;
  return { html, text };
}

export async function sendMail(args: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({
      kind: 'info',
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      html: args.html,
      text: args.text,
    })),
  }));
  if (res.FunctionError) throw new Error('provider email could not be sent');
}
