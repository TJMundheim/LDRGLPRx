// Customized Captain's Table application confirmation (formId 'coaching-application').
// Pure: fields in, {subject, html, text} out. Blank source -> sentence omitted.
import { esc } from './templates';

type Fields = Record<string, unknown>;
const SUBJECT = "Your application for The Captain's Table";
const FOOTER = "Don't lose your identity and your dignity while you still have a choice.";
const CALL = "I'll reach out personally within two business days";
const START: Record<string, string> = {
  'next month': `${CALL} to set up a private call. You mentioned starting next month, so we'll talk dates on that call.`,
  'within 3 months': `${CALL} to set up a private call. You mentioned starting within the next three months, so we'll talk dates on that call.`,
};
const START_DEFAULT = `${CALL}. No pressure on timing. We'll start with a conversation.`;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(str).filter(Boolean);
const join = (a: string[]) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

export function composeCoachingConfirmation(f: Fields): { subject: string; html: string; text: string } {
  const name = str(f.firstName), whoFor = str(f.whoFor);
  const goals = list(f.goals).slice(0, 3).map((g) => g.toLowerCase());
  const spaces = list(f.homeSpaces).filter((s) => s.toLowerCase() !== 'none of these yet').map((s) => s.toLowerCase());
  const lines: Array<(e: (s: string) => string) => string | null> = [
    (e) => `Hi ${e(name)},`.replace('Hi ,', 'Hi,'),
    () => "Thank you for applying for a seat at The Captain's Table. I read every application myself.",
    (e) => whoFor ? `You told me you're doing this for ${e(whoFor)}. Keep that face in mind. That's where we'll start.` : null,
    (e) => goals.length ? `You said ${e(join(goals))} matter most to you right now. Those are exactly what the first four days in your home are built to change.` : null,
    (e) => spaces.length ? `And you have ${e(join(spaces))} at home. We'll put ${spaces.length === 1 ? 'it' : 'them'} to work.` : null,
    () => START[str(f.start).toLowerCase()] ?? START_DEFAULT,
    () => 'Dr. TJ',
  ];
  const build = (e: (s: string) => string) => lines.map((l) => l(e)).filter((l): l is string => !!l);
  const p = 'margin:0 0 14px;font-size:15px;line-height:1.6;color:#1A2E1E';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:28px">${build(esc)
    .map((l) => `<p style="${p}">${l}</p>`).join('')}<p style="margin:22px 0 0;font-size:13px;color:#5A8A64"><em>${FOOTER}</em></p></div>`;
  return { subject: SUBJECT, html, text: `${build((s) => s).join('\n\n')}\n\n${FOOTER}\n` };
}
