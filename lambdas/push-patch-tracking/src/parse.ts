import { simpleParser } from 'mailparser';

export type TrackingResult =
  | { ok: true; firstName: string; lastName: string; trackingNumber: string; carrier: 'UPS' | 'FedEx'; fromSupplier: true }
  | { ok: false; reason: string };

const SUPPLIER = /novobioalliance\.com|regenerativekits\.com/i;
const PREFIX = /^\s*(?:(?:fw|fwd|re)\s*:\s*)*/i;
const SUBJECT = /^TRACKING\s*[-–—]\s*(.+)$/i;
const UPS = /\b1Z[0-9A-Z]{16}\b/i;
const FEDEX = /\b(\d{15}|\d{12})\b/g;

function stripHtml(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');
}

function parseName(subject: string): { firstName: string; lastName: string } | null {
  const m = SUBJECT.exec(subject.replace(PREFIX, '').trim());
  const tokens = m?.[1].trim().split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length < 2) return null;
  return { firstName: tokens[0], lastName: tokens[tokens.length - 1] };
}

function findTracking(text: string): { trackingNumber: string; carrier: 'UPS' | 'FedEx' } | null {
  const ups = UPS.exec(text);
  if (ups) return { trackingNumber: ups[0].toUpperCase(), carrier: 'UPS' };
  for (const m of text.matchAll(FEDEX)) {
    const i = m.index ?? 0;
    if (/fedex/i.test(text.slice(Math.max(0, i - 80), i + 80))) return { trackingNumber: m[1], carrier: 'FedEx' };
  }
  return null;
}

export async function parseTrackingEmail(raw: string): Promise<TrackingResult> {
  const mail = await simpleParser(raw);
  const text = mail.text?.trim() ? mail.text : stripHtml(typeof mail.html === 'string' ? mail.html : '');
  const from = mail.from?.text ?? '';
  if (!SUPPLIER.test(from) && !SUPPLIER.test(text)) return { ok: false, reason: 'not-supplier' };
  const name = parseName(mail.subject ?? '');
  if (!name) return { ok: false, reason: 'no-name' };
  const tracking = findTracking(text);
  if (!tracking) return { ok: false, reason: 'no-tracking' };
  return { ok: true, ...name, ...tracking, fromSupplier: true };
}
