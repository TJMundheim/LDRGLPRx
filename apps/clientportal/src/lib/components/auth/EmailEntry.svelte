<script lang="ts">
  import { onMount } from 'svelte';
  import { requestEmailCode } from '../../auth/cognito.js';

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
  let loading = $state(false);
  let error = $state('');

  async function requestCode(): Promise<void> {
    error = '';
    loading = true;
    try {
      const session = await requestEmailCode(email.trim(), firstName.trim() || undefined);
      onsuccess({ email: email.trim(), session });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to send code. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await requestCode();
  }

  // Fresh signup arriving from /become-protege → auto-send the code
  // and skip straight to the code-entry step. No second click required.
  //
  // Guard against double-send: sessionStorage flag prevents a second
  // requestCode() if the component remounts (Svelte re-mount race,
  // back/forward navigation, etc.). The flag is scoped to the email
  // so different users on the same browser get their own slot. Cleared
  // automatically on Cognito sign-in (full page reload via CodeEntry).
  onMount(() => {
    if (!isFreshSignup || !initialEmail) return;
    const guardKey = `my4m-otp-autosent-${initialEmail.toLowerCase()}`;
    try {
      if (sessionStorage.getItem(guardKey)) return; // already auto-sent in this session
      sessionStorage.setItem(guardKey, '1');
    } catch { /* sessionStorage unavailable — fall through */ }
    void requestCode();
  });
</script>

<div class="auth-card">
  <h2>{isFreshSignup ? "You're in. Sending your code…" : 'Sign In / Sign Up — Free Protégé'}</h2>
  <p class="subtitle">{isFreshSignup ? "We're emailing you a 6-digit code. The next screen will ask for it." : "Enter your email. New here? We'll create your free Protégé account automatically. Returning? You'll get a 6-digit code to sign in."}</p>
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
</style>
