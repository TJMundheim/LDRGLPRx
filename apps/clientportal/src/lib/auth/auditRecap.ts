/**
 * Audit recap carry-over from marketing site (/assessment) → app.
 *
 * The marketing site appends `?audit=<base64-json>` to the "Continue in
 * My4MLife app" CTA. On first app load we decode it and persist the top-3
 * priorities to localStorage under `app-audit-recap-v1`. The LockedGate
 * reads from there.
 *
 * Payload shape:
 *   { top3: [{ slug: string, label: string, score: number, description?: string }, ...] }
 */

export const APP_AUDIT_RECAP_KEY = 'app-audit-recap-v1';

export interface AuditPriority {
  slug: string;
  label: string;
  score: number;
  description?: string;
}

export interface AuditRecap {
  top3: AuditPriority[];
  capturedAt?: string;
}

export function consumeAuditParam(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get('audit');
    if (!raw) return;
    // base64-decode and parse
    const decoded = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded) as AuditRecap;
    if (parsed && Array.isArray(parsed.top3) && parsed.top3.length > 0) {
      parsed.capturedAt = new Date().toISOString();
      localStorage.setItem(APP_AUDIT_RECAP_KEY, JSON.stringify(parsed));
    }
    url.searchParams.delete('audit');
    window.history.replaceState({}, '', url.toString());
  } catch (err) {
    console.warn('[auditRecap] failed to consume ?audit param', err);
  }
}

export function readAuditRecap(): AuditRecap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(APP_AUDIT_RECAP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuditRecap;
  } catch {
    return null;
  }
}
