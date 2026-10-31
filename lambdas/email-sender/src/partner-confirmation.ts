// Push Patch partner application confirmation (formId 'partner-application'), from Dr. TJ.
// Pure: fields in, {subject, html, text} out. No identity tagline on Push Patch surfaces.
import { esc } from './templates';

type Fields = Record<string, unknown>;
const SUBJECT = 'Your Push Patch partner application';
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const discountOf = (v: unknown) => {
  const n = str(v).replace(/[^0-9]/g, '');
  return n === '50' || n === '100' ? `$${n}` : '';
};

export function composePartnerConfirmation(f: Fields): { subject: string; html: string; text: string } {
  const first = str(f.name).split(/\s+/)[0] ?? '';
  const biz = str(f.businessName), off = discountOf(f.discount);
  const lines: Array<(e: (s: string) => string) => string | null> = [
    (e) => `Hi ${e(first)},`.replace('Hi ,', 'Hi,'),
    (e) => `Thank you for applying to offer the Push Patch${biz ? ` at ${e(biz)}` : ''}. I review every partner application personally.`,
    () => off ? `You chose ${off} off for your clients, so you earn ${off === '$50' ? '$150' : '$100'} on every approved, paid order.` : 'You earn $100 or $150 on every approved, paid order, depending on the offer you choose.',
    () => "Within two business days you'll get your link, your code, a counter card and a one-page guide.",
    () => 'Dr. TJ',
  ];
  const build = (e: (s: string) => string) => lines.map((l) => l(e)).filter((l): l is string => !!l);
  const p = 'margin:0 0 14px;font-size:15px;line-height:1.6;color:#1A2E1E';
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:28px">${build(esc)
    .map((l) => `<p style="${p}">${l}</p>`).join('')}</div>`;
  return { subject: SUBJECT, html, text: `${build((s) => s).join('\n\n')}\n` };
}
