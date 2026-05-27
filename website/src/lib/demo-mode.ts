// Demo-mode helper — lets TJ run Stripe E2E tests on prod with test cards.
// Activated via ?demo=true&auth=<password> URL params; persisted in sessionStorage.
// Disabled via ?demo=false.

const SS_FLAG = 'my4m-demo-mode';
const SS_AUTH = 'my4m-demo-auth';

const LIVE_ENDPOINT = '/api/create-checkout-session';
const DEMO_ENDPOINT = '/api/admin/demo-checkout-session';

function safeSession(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function isDemoMode(): boolean {
  const ss = safeSession();
  return !!ss && ss.getItem(SS_FLAG) === '1';
}

export function getDemoAuthPassword(): string | null {
  const ss = safeSession();
  return ss ? ss.getItem(SS_AUTH) : null;
}

export function initDemoModeFromUrl(): void {
  if (typeof window === 'undefined') return;
  const ss = safeSession();
  if (!ss) return;

  const url = new URL(window.location.href);
  const demoParam = url.searchParams.get('demo');
  const authParam = url.searchParams.get('auth');

  let mutated = false;

  if (demoParam === 'true') {
    ss.setItem(SS_FLAG, '1');
    if (authParam) ss.setItem(SS_AUTH, authParam);
    url.searchParams.delete('demo');
    url.searchParams.delete('auth');
    mutated = true;
  } else if (demoParam === 'false') {
    ss.removeItem(SS_FLAG);
    ss.removeItem(SS_AUTH);
    url.searchParams.delete('demo');
    url.searchParams.delete('auth');
    mutated = true;
  } else if (authParam && isDemoMode()) {
    ss.setItem(SS_AUTH, authParam);
    url.searchParams.delete('auth');
    mutated = true;
  }

  if (mutated) {
    const newUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
    try { window.history.replaceState({}, '', newUrl); } catch { /* noop */ }
  }
}

export function getCheckoutEndpoint(): string {
  return isDemoMode() ? DEMO_ENDPOINT : LIVE_ENDPOINT;
}

export function getCheckoutAuthHeaders(): Record<string, string> {
  if (!isDemoMode()) return {};
  const pw = getDemoAuthPassword();
  if (!pw) return {};
  // Lambda accepts Basic base64("user:password") or base64("password").
  // Use "demo:<pw>" form for standards-compliance.
  const token = (typeof btoa !== 'undefined')
    ? btoa('demo:' + pw)
    : Buffer.from('demo:' + pw, 'utf-8').toString('base64');
  return { Authorization: 'Basic ' + token };
}
