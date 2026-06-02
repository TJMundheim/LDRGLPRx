<script lang="ts">
  import { onMount } from 'svelte';
  import { requestEmailCode, RateLimitError } from '../../auth/cognito.js';

  // Cooldown window during which we will NOT re-call InitiateAuth for the same
  // email. The cached session is reused — the user proceeds directly to code
  // entry instead of triggering Cognito to send a second OTP.
  const OTP_COOLDOWN_MS = 90_000;

  type CachedSend = { session: string; sentAt: number };

  function readCachedSend(email: string): CachedSend | null {
    try {
      const raw = sessionStorage.getItem(`my4m-otp-sent-${email.toLowerCase()}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedSend;
      if (!parsed.session || typeof parsed.sentAt !== 'number') return null;
      if (Date.now() - parsed.sentAt > OTP_COOLDOWN_MS) return null;
      return parsed;
    } catch { return null; }
  }

  function writeCachedSend(email: string, session: string): void {
    try {
      sessionStorage.setItem(
        `my4m-otp-sent-${email.toLowerCase()}`,
        JSON.stringify({ session, sentAt: Date.now() }),
      );
    } catch { /* ignore */ }
  }

  interface Props {
    onsuccess: (detail: { email: string; session: string }) => void;
  }

  const { onsuccess }: Props = $props();

  // Pre-fill from URL params (e.g. when arriving from /become-protege).
  // ?email=foo@bar.com pre-fills the email input.
  // ?new=1 indicates a fresh signup — hide the firstName field AND auto-send
  // the code (so the user skips straight to the "enter code" screen).
  function readUrlParam(key: string): string {
    if (typeof window === 'undefined') return '';
    try { return new URLSearchParams(window.location.search).get(key) ?? ''; } catch { return ''; }
  }
  const initialEmail = readUrlParam('email');
  const isFreshSignup = readUrlParam('new') === '1';

  let firstName = $state('');
  let email = $state(initialEmail);
  // When isFreshSignup is true we want loading=true from the FIRST paint so
  // the form is hidden and the user can't double-fire by clicking 'Send Code'
  // before the auto-fire's request hits the server. The onMount handler kicks
  // off the real send. If the auto-fire is skipped (guard hit), we flip
  // loading back to false so the manual form re-appears.
  let loading = $state(isFreshSignup && !!initialEmail);
  let error = $state('');

  // Module-level in-flight guard. Prevents two requestCode() calls in the
  // same browser tab from racing (e.g. user double-clicks Send Code, or
  // auto-fire runs while a manual click is also queued).
  let requestInFlight = false;

  async function requestCode(): Promise<void> {
    if (requestInFlight) {
      console.info('[auth] requestCode blocked — already in flight');
      return;
    }
    const cleanEmail = email.trim();

    // If we sent a code to this email recently, reuse the cached session
    // instead of calling Cognito again. This is the primary defense against
    // duplicate OTPs from SW reloads, remounts, or accidental double-fires.
    const cached = readCachedSend(cleanEmail);
    if (cached) {
      console.info('[auth] requestCode reusing cached session within cooldown');
      onsuccess({ email: cleanEmail, session: cached.session });
      return;
    }

    requestInFlight = true;
    error = '';
    loading = true;
    console.info('[auth] requestCode firing for', cleanEmail);
    try {
      const session = await requestEmailCode(cleanEmail, firstName.trim() || undefined);
      writeCachedSend(cleanEmail, session);
      console.info('[auth] requestCode succeeded — calling onsuccess');
      onsuccess({ email: cleanEmail, session });
      // Parent unmounts us via step='code'. Leave loading=true so manual form
      // doesn't flash during transition.
      return;
    } catch (err) {
      if (err instanceof RateLimitError) {
        error = err.message;
      } else {
        error = err instanceof Error ? err.message : 'Failed to send code. Please try again.';
      }
      console.warn('[auth] requestCode failed:', err);
      loading = false;
    } finally {
      // Always reset in-flight so a deliberate retry (e.g. after a rate-limit
      // notice clears) can re-arm. Success path has already navigated away.
      requestInFlight = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await requestCode();
  }

  // Fresh signup arriving from /become-protege → auto-send the code (or reuse
  // the cached session if one was recently issued within the cooldown window)
  // and skip straight to the code-entry step. The requestCode() short-circuit
  // on cached session is what prevents a second Cognito InitiateAuth call when
  // the component remounts (SW reload, back/forward, hydration race, etc.).
  onMount(() => {
    if (!isFreshSignup || !initialEmail) {
      loading = false;
      return;
    }
    void requestCode();
  });
</script>

<div class="auth-card">
  <h2>{isFreshSignup && loading ? "You're in. Sending your code…" : isFreshSignup ? "You're in. Let's sign you in." : 'Sign In / Sign Up — Free Protégé'}</h2>
  <p class="subtitle">{isFreshSignup && loading ? "We're emailing you a 6-digit code. The next screen will ask for it — no need to click anything." : isFreshSignup ? "Tap below to send your 6-digit sign-in code." : "Enter your email. New here? We'll create your free Protégé account automatically. Returning? You'll get a 6-digit code to sign in."}</p>
  {#if isFreshSignup && loading}
    <!-- Auto-send in flight: no form. The next screen appears on success. -->
    <div class="autosend-spinner" aria-hidden="true"></div>
  {:else}
    <form onsubmit={handleSubmit}>
      {#if !isFreshSignup}
        <label for="firstname-input">First name <span class="optional">(optional — new accounts only)</span></label>
        <input
          id="firstname-input"
          type="text"
          autocomplete="given-name"
          placeholder="e.g. Alex"
          bind:value={firstName}
          disabled={loading}
        />
      {/if}
      <label for="email-input">Email address</label>
      <input
        id="email-input"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        bind:value={email}
        required
        disabled={loading}
      />
      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}
      <button type="submit" disabled={loading || !email.trim()}>
        {loading ? 'Sending…' : 'Send Code'}
      </button>
    </form>
  {/if}
</div>

<style>
  .auth-card {
    max-width: 380px;
    margin: 80px auto;
    padding: 36px 32px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  h2 { margin: 0 0 6px; font-size: 1.4rem; color: #1a1a1a; }
  .subtitle { margin: 0 0 24px; color: #666; font-size: 0.9rem; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #333; }
  .optional { font-weight: 400; color: #999; font-size: 0.8rem; }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.15s;
    margin-bottom: 16px;
  }
  input:focus { border-color: #1D9E75; }
  .error { color: #c0392b; font-size: 0.85rem; margin: 8px 0 0; }
  button {
    width: 100%;
    margin-top: 4px;
    padding: 11px;
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:disabled { background: #a0c8b8; cursor: not-allowed; }
  button:not(:disabled):hover { background: #17875f; }
  .autosend-spinner {
    width: 36px;
    height: 36px;
    margin: 8px auto 0;
    border: 3px solid #d8e8dc;
    border-top-color: #1D9E75;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
