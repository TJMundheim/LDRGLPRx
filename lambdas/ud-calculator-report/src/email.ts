import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { UdReport } from '../../../website/src/lib/uninsured-decade-report';
import { money } from '../../../website/src/lib/uninsured-decade-report';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
const LINK = 'https://www.my4mlife.com/assessment?src=ud-report-email';
const TAGLINE = 'Don\'t lose your identity and your dignity while you still have a choice.';
const ADVISOR_LINE = '{n} asked us to copy you, their financial advisor, on this. It is a planning input for your next conversation together, and the figures are illustrative.';
const FOOTER = 'You received this because you requested your report at my4mlife.com/go/uninsured-decade.';

/** Subject, HTML and plain text, built only from the server-computed report and the validated first name. */
export function buildEmail(r: UdReport, firstName: string, withAdvisor: boolean) {
  const paras = [
    `Hi {n},`,
    `Your Uninsured Decade report is attached. For ${r.stateName}, the illustrative 10-year cost of care, in ${r.onsetYear} dollars, comes to ${money(r.bill)}. The PDF shows how that number is built, line by line.`,
    'Please review it with your financial advisor, estate attorney, or CPA. Your plan, your policies, your powers of attorney, and your health-care directives are theirs to get right, and you need them. This report is only one more input for that conversation.',
    "If you'd like to look at the part that is in your control, you can start here:",
  ];
  const lead = withAdvisor ? [ADVISOR_LINE] : [];
  const text = [...lead, ...paras].map((p) => p.replace(/\{n\}/g, firstName)).join('\n\n')
    + `\n\nGet your free MindSpan assessment\n${LINK}\n\n${TAGLINE}\n\nDr. TJ\n\n${FOOTER}`;
  const p = (s: string) => `<p style="margin:0 0 14px">${esc(s.replace(/\{n\}/g, firstName))}</p>`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:560px">`
    + [...lead, ...paras].map(p).join('')
    + `<p style="margin:0 0 14px"><a href="${LINK}" style="color:#0b5d4a;font-weight:bold">Get your free MindSpan assessment</a></p>`
    + `<p style="margin:0 0 14px">${esc(TAGLINE)}</p><p style="margin:0 0 22px">Dr. TJ</p>`
    + `<p style="margin:0;font-size:12px;color:#666">${esc(FOOTER)}</p></div>`;
  return { subject: `${firstName}, your Uninsured Decade report`, html, text };
}

export async function sendReportEmail(to: string, cc: string | undefined, mail: ReturnType<typeof buildEmail>, filename: string, pdf: Uint8Array): Promise<void> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender',
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({
      kind: 'info', from: 'drtj', to, ...(cc ? { cc } : {}), ...mail,
      attachments: [{ filename, contentBase64: Buffer.from(pdf).toString('base64'), contentType: 'application/pdf' }],
    })),
  }));
  if (res.FunctionError) throw new Error('email-sender failed');
}
