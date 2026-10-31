// Parse and validate the sign form.
export interface SignForm { legalName: string; title: string; business: string; typedSignature: string; agree: boolean }

export function parseForm(body: string | undefined, isBase64: boolean): SignForm {
  const p = new URLSearchParams(isBase64 ? Buffer.from(body ?? '', 'base64').toString('utf8') : (body ?? ''));
  const get = (k: string) => (p.get(k) ?? '').trim().slice(0, 200);
  return {
    legalName: get('legalName'), title: get('title'), business: get('business'),
    typedSignature: get('typedSignature'), agree: p.get('agree') === 'on' || p.get('agree') === 'true',
  };
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Returns an error message, or null when valid. The signature must equal the legal name (case-insensitive). */
export function validateForm(f: SignForm): string | null {
  if (f.legalName.length < 3) return 'Please enter your full legal name.';
  if (!f.title) return 'Please enter your title.';
  if (!f.business) return 'Please enter your business name.';
  if (norm(f.typedSignature) !== norm(f.legalName)) return 'Your typed signature must match your legal name.';
  if (!f.agree) return 'Please check the box to agree to sign electronically.';
  return null;
}
