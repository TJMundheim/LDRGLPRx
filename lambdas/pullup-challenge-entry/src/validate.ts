const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface Entry {
  name: string; email: string; phone: string; instagramUrl: string;
  round: 'start' | 'final'; smsOptIn: boolean; emailOptIn: boolean; consentVersion: string;
}

export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}

function validInstagram(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && (u.hostname === 'instagram.com' || u.hostname.endsWith('.instagram.com'));
  } catch { return false; }
}

// Windows are America/Chicago (CST, UTC-6, in Dec/Jan). Start closes Dec 15 11:59 PM CT; final is Jan 1-7.
const START_CLOSES = Date.parse('2026-12-16T06:00:00Z');
const FINAL_OPENS = Date.parse('2027-01-01T06:00:00Z');
const FINAL_CLOSES = Date.parse('2027-01-08T06:00:00Z');

function windowError(round: 'start' | 'final', now: Date): string | null {
  const t = now.getTime();
  if (round === 'start') {
    return t < START_CLOSES ? null : 'Day-one videos closed December 15, 2026. You can still post your January video January 1\u20137, 2027.';
  }
  return t >= FINAL_OPENS && t < FINAL_CLOSES ? null : 'January videos open January 1, 2027 and close January 7, 2027 at 11:59 PM CT.';
}

/** Returns an Entry, or a plain-language error message. */
export function validate(b: any, now: Date = new Date()): Entry | string {
  const name = s(b.name, 120), email = s(b.email, 254).toLowerCase();
  const instagramUrl = s(b.instagramUrl, 500), consentVersion = s(b.consentVersion, 60);
  if (!name || !email || !b.phone || !instagramUrl || !b.round || !consentVersion) return 'Please fill in every required field.';
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  const phone = normalizePhone(String(b.phone));
  if (!phone) return 'Please enter a 10-digit US phone number.';
  if (!validInstagram(instagramUrl)) return 'Please enter the https link to your public Instagram post.';
  if (b.round !== 'start' && b.round !== 'final') return 'Please choose start or final.';
  if (b.adult !== true) return 'You must be 18 or older to enter.';
  if (b.rulesAccepted !== true) return 'You must agree to the rules to enter.';
  const closed = windowError(b.round, now);
  if (closed) return closed;
  return { name, email, phone, instagramUrl, round: b.round, smsOptIn: b.smsOptIn === true, emailOptIn: b.emailOptIn === true, consentVersion };
}
