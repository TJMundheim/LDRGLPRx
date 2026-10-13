// Shared client for POST /api/lead-capture (stores Contact.newsletter=true).
// Same endpoint and request shape as components/EmailCapture.astro.

const API_BASE: string =
  (import.meta as any).env?.PUBLIC_LEAD_CAPTURE_API_URL ??
  'https://v9svm8ds74.execute-api.us-east-2.amazonaws.com';

export const LEAD_CAPTURE_ERROR = "That didn't go through. Please try again.";

/** POST the email. Resolves true only on a 2xx response. */
export async function submitLead(email: string, source: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/lead-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
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

/**
 * Wires window.handleNewsletter(form) for the blog newsletter forms.
 * Source is `blog-newsletter:<slug>`.
 */
export function bindNewsletter(slug: string): void {
  (window as any).handleNewsletter = async (form: HTMLFormElement) => {
    const input = form.querySelector<HTMLInputElement>('input[type="email"]')!;
    const button = form.querySelector<HTMLButtonElement>('button')!;
    const email = input.value.trim();
    if (!email) return;
    const label = button.textContent;
    button.disabled = true;
    setFormError(form, null);
    const ok = await submitLead(email, `blog-newsletter:${slug}`);
    button.disabled = false;
    if (!ok) {
      setFormError(form, LEAD_CAPTURE_ERROR);
      return; // keep the typed email
    }
    button.textContent = 'Subscribed!';
    button.style.background = 'var(--primary)';
    input.value = '';
    setTimeout(() => {
      button.textContent = label;
      button.style.background = '';
    }, 3000);
  };
}
