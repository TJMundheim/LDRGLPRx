<script lang="ts">
  import { onDestroy } from 'svelte';
  import { submitEmailCode, getCurrentUser, requestEmailCode, RateLimitError } from '../../auth/cognito.js';
  import { setUser } from '../../auth/store.svelte.js';

  interface Props {
    email: string;
    session: string;
    onsuccess: () => void;
    onback: () => void;
  }

  const { email, session, onsuccess, onback }: Props = $props();

  let code = $state('');
  let loading = $state(false);
  let error = $state('');

  // The session can be refreshed by "Resend code", so track it locally rather
  // than verifying against the (now-stale) prop.
  let activeSession = $state(session);
  let resending = $state(false);
  let resendCooldown = $state(0); // seconds left before resend is allowed again
  let notice = $state('');
  let cooldownTimer: ReturnType<typeof setInterval> | undefined;

  function startCooldown(seconds: number): void {
    resendCooldown = seconds;
    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      resendCooldown -= 1;
      if (resendCooldown <= 0) { clearInterval(cooldownTimer); resendCooldown = 0; }
    }, 1000);
  }

  onDestroy(() => clearInterval(cooldownTimer));

  async function handleResend(): Promise<void> {
    if (resending || resendCooldown > 0) return;
    resending = true; error = ''; notice = '';
    try {
      const cleanEmail = email.trim();
      const newSession = await requestEmailCode(cleanEmail);
      activeSession = newSession;
      // Keep EmailEntry's cooldown cache in sync so a back/forward round-trip
      // reuses this fresh session instead of firing yet another OTP.
      try {
        sessionStorage.setItem(
          `my4m-otp-sent-${cleanEmail.toLowerCase()}`,
          JSON.stringify({ session: newSession, sentAt: Date.now() }),
        );
      } catch { /* ignore */ }
      code = '';
      notice = 'New code sent. Check your email (and spam folder).';
      startCooldown(30);
    } catch (err) {
      error = err instanceof RateLimitError
        ? err.message
        : (err instanceof Error ? err.message : 'Could not resend the code. Try again in a moment.');
    } finally {
      resending = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    notice = '';
    loading = true;
    try {
      await submitEmailCode(email, code.trim(), activeSession);
      const user = getCurrentUser();
      if (user) setUser(user);
      onsuccess();
      // Force a full page reload after sign-in. App.svelte's first-mount
      // hydration races with Svelte 5's reactive render so the dashboard
      // sometimes shows an empty workbook until a reload. Forcing it here
      // guarantees the post-auth render has the workbook + audit data ready.
      // Cheap (tokens are already in localStorage; reload is instant).
      try {
        // Drop any post-auth query params the URL still carries (?new=1&email=).
        const u = new URL(window.location.href);
        u.searchParams.delete('new');
        u.searchParams.delete('email');
        window.location.replace(u.toString());
      } catch {
        window.location.reload();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Invalid code. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-card">
  <h2>Enter Code</h2>
  <p class="subtitle">A 6-digit code was sent to <strong>{email}</strong>.</p>
  <form onsubmit={handleSubmit}>
    <label for="code-input">One-time code</label>
    <input
      id="code-input"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      placeholder="123456"
      maxlength={6}
      bind:value={code}
      required
      disabled={loading}
    />
    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
    {#if notice}
      <p class="notice" role="status">{notice}</p>
    {/if}
    <button type="submit" disabled={loading || code.trim().length < 6}>
      {loading ? 'Verifying…' : 'Verify'}
    </button>
  </form>
  <button type="button" class="resend-btn" onclick={handleResend} disabled={resending || resendCooldown > 0}>
    {resending ? 'Sending…' : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Didn't get the code? Resend it"}
  </button>
  <button type="button" class="back-btn" onclick={onback}>← Use a different email</button>
</div>

<style>
  .auth-card {
    max-width: 380px;
    margin: 80px auto;
    padding: 36px 32px;
    background: var(--mc-panel-2);
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  h2 { margin: 0 0 6px; font-size: 1.4rem; color: var(--mc-ink);; font-family: var(--mc-font-display); }
  .subtitle { margin: 0 0 24px; color: var(--mc-muted); font-size: 0.9rem; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: var(--mc-ink); }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    font-size: 1.4rem;
    letter-spacing: 0.3em;
    text-align: center;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus { border-color: var(--mc-good-bright); }
  .error { color: var(--mc-crit-bright); font-size: 0.85rem; margin: 8px 0 0; }
  .notice { color: #17875f; font-size: 0.85rem; margin: 8px 0 0; }
  .resend-btn {
    display: block;
    width: 100%;
    margin-top: 16px;
    padding: 9px;
    background: none;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    color: var(--mc-good-bright);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .resend-btn:not(:disabled):hover { background: #f0faf5; border-color: var(--mc-good-bright); }
  .resend-btn:disabled { color: #9aa5a0; cursor: not-allowed; }
  button[type="submit"] {
    width: 100%;
    margin-top: 20px;
    padding: 11px;
    background: var(--mc-good-bright);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  button[type="submit"]:disabled { background: var(--mc-gold-dim); cursor: not-allowed; }
  button[type="submit"]:not(:disabled):hover { background: #17875f; }
  .back-btn {
    display: block;
    width: 100%;
    margin-top: 14px;
    padding: 8px;
    background: none;
    border: none;
    color: var(--mc-muted);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: center;
  }
  .back-btn:hover { color: var(--mc-good-bright); }
</style>
