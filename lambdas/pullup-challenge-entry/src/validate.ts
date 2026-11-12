const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface Entry {
  name: string; email: string; phone: string; age: number; bodyweightLb: number; instagramUrl: string;
  round: 'start' | 'final'; division: 'men' | 'women'; smsOptIn: boolean; emailOptIn: boolean; consentVersion: string;
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

/** Returns an Entry, or a plain-language error message. */
export function validate(b: any): Entry | string {
  const name = s(b.name, 120), email = s(b.email, 254).toLowerCase();
  const instagramUrl = s(b.instagramUrl, 500), consentVersion = s(b.consentVersion, 60);
  if (!name || !email || !b.phone || b.age == null || b.bodyweightLb == null || !instagramUrl || !b.round || !consentVersion) {
    return 'Please fill in every required field.';
  }
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  const phone = normalizePhone(String(b.phone));
  if (!phone) return 'Please enter a 10-digit US phone number.';
  const age = Number(b.age);
  if (!Number.isInteger(age)) return 'Please enter your age in whole years.';
  if (age < 18 || age > 120) return 'You must be 18 or older to enter.';
  const bodyweightLb = Number(b.bodyweightLb);
  if (!Number.isFinite(bodyweightLb) || bodyweightLb < 60 || bodyweightLb > 600) return 'Please enter your bodyweight in pounds (60-600).';
  if (!validInstagram(instagramUrl)) return 'Please enter the https link to your public Instagram post.';
  if (b.round !== 'start' && b.round !== 'final') return 'Please choose start or final.';
  if (b.division !== 'men' && b.division !== 'women') return "Please choose your division, men's or women's.";
  if (b.rulesAccepted !== true) return 'You must agree to the rules to enter.';
  return { name, email, phone, age, bodyweightLb, instagramUrl, round: b.round, division: b.division, smsOptIn: b.smsOptIn === true, emailOptIn: b.emailOptIn === true, consentVersion };
}
