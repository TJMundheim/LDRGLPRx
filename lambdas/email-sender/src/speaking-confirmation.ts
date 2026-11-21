// Speaking inquiry confirmation (formId 'speaking-inquiry'), from Dr. TJ.
// Pure: fields in, {subject, html, text} out. No email address in the body (reply-to carries it).
import { esc } from './templates';

type Fields = Record<string, unknown>;
const SUBJECT = 'Your speaking request';
const ID_LINE = "Don't lose your identity and your dignity while you still have a choice.";
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function composeSpeakingConfirmation(f: Fields): { subject: string; html: string; text: string } {
  const first = str(f.name).split(/\s+/)[0] ?? '';
  const org = str(f.organization), dates = str(f.preferredDates).slice(0, 200).trim();
  const lines: Array<(e: (s: string) => string, em: (s: string) => string) => string | null> = [
    (e) => `Hi ${e(first)},`.replace('Hi ,', 'Hi,'),
    (e) => `Thank you for thinking of me${org ? ` for ${e(org)}` : ''}. I read every request myself and will reply within two business days to talk dates and details.`,
    (e) => dates ? `Dates you mentioned: ${e(dates)}.` : null,
    () => "In the meantime, you're welcome to take the free MindSpan assessment I'll be talking about: https://www.my4mlife.com/assessment",
    (_e, em) => em(ID_LINE),
    () => 'Dr. TJ',
  ];
  const build = (e: (s: string) => string, em: (s: string) => string) => lines.map((l) => l(e, em)).filter((l): l is string => !!l);
  const p = 'margin:0 0 14px;font-size:15px;line-height:1.6;color:#1A2E1E';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:28px">${build(esc, (s) => `<em>${esc(s)}</em>`)
    .map((l) => `<p style="${p}">${l}</p>`).join('')}</div>`;
  return { subject: SUBJECT, html, text: `${build((s) => s, (s) => s).join('\n\n')}\n` };
}
