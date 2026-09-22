// Pure validation for the submitted consent form.
export interface SignForm {
  nppAck: boolean;
  phiAuth: boolean;
  typedName: string;
}

export function parseForm(body: string, isBase64: boolean): SignForm {
  const raw = isBase64 ? Buffer.from(body ?? '', 'base64').toString('utf8') : (body ?? '');
  const p = new URLSearchParams(raw);
  return {
    nppAck: p.get('nppAck') === 'on' || p.get('nppAck') === 'true',
    phiAuth: p.get('phiAuth') === 'on' || p.get('phiAuth') === 'true',
    typedName: (p.get('typedName') ?? '').trim(),
  };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Returns an error message, or null when the form is valid. */
export function validateForm(
  form: SignForm,
  firstName?: string,
  lastName?: string,
): string | null {
  if (!form.nppAck) return 'Please acknowledge the Notice of Privacy Practices.';
  if (!form.phiAuth) return 'Please authorize the disclosure of your health information.';
  if (form.typedName.length < 3) return 'Please type your full legal name as your electronic signature.';

  const typed = norm(form.typedName);
  const first = norm(firstName ?? '');
  const last = norm(lastName ?? '');
  const targets = [first, last].filter((n) => n.length >= 2);
  if (targets.length && !targets.some((n) => typed.includes(n))) {
    return 'The name you typed does not match the name on file. Please type your full legal name.';
  }
  return null;
}
