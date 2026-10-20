// Shared client for POST /api/lead-capture (Contact upsert, opted-in marketing consent).
// Sends hp (honeypot) + t (ms since render) for the server bot check.

const API_BASE: string =
  (import.meta as any).env?.PUBLIC_LEAD_CAPTURE_API_URL ??
  'https://v9svm8ds74.execute-api.us-east-2.amazonaws.com';

// Page-render time, for the server's too-fast-to-be-human check.
const renderedAt = Date.now();
const HP_NAME = 'hp_field_x';

/** Add the off-screen honeypot input to a form (idempotent). Humans never see or fill it. */
export function attachHoneypot(form: HTMLElement | null): void {
  if (!form || form.querySelector(`input[name="${HP_NAME}"]`)) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.name = HP_NAME;
  input.tabIndex = -1;
  input.autocomplete = 'off';
  input.setAttribute('aria-hidden', 'true');
  input.setAttribute('data-1p-ignore', '');
  input.setAttribute('data-lpignore', 'true');
  input.setAttribute('data-bwignore', '');
  input.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;opacity:0;';
  form.appendChild(input);
}

/** Bot-check fields sent with every lead POST: honeypot value + ms since render. */
export function botFields(form?: HTMLElement | null): { hp: string; t: number } {
  const hp = form?.querySelector<HTMLInputElement>(`input[name="${HP_NAME}"]`)?.value ?? '';
  return { hp, t: Date.now() - renderedAt };
}

export const LEAD_CAPTURE_ERROR = "That didn't go through. Please try again.";

/** POST the email. Resolves true only on a 2xx response. */
export async function submitLead(email: string, source: string, form?: HTMLElement | null): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/lead-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source, ...botFields(form) }),
    });
    return res.ok;
  } catch (_) {
    return false;
  }
}

/** Show or clear a plain error line directly after the given form. */
export function setFormError(form: HTMLElement, message: string | null): void {
  let el = form.parentElement?.querySelector<HTMLElement>(':scope > .lead-capture-error') ?? null;
  if (!message) {
    if (el) el.hidden = true;
    return;
  }
  if (!el) {
    el = document.createElement('p');
    el.className = 'lead-capture-error';
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'color:#e74c3c;font-size:0.85rem;margin:0.5rem 0 0;';
    form.insertAdjacentElement('afterend', el);
  }
  el.textContent = message;
  el.hidden = false;
}
