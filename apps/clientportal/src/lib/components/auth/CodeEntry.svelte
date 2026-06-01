<script lang="ts">
  import { submitEmailCode, getCurrentUser } from '../../auth/cognito.js';
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

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      await submitEmailCode(email, code.trim(), session);
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
    <button type="submit" disabled={loading || code.trim().length < 6}>
      {loading ? 'Verifying…' : 'Verify'}
    </button>
  </form>
  <button type="button" class="back-btn" onclick={onback}>← Use a different email</button>
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
  input:focus { border-color: #1D9E75; }
  .error { color: #c0392b; font-size: 0.85rem; margin: 8px 0 0; }
  button[type="submit"] {
    width: 100%;
    margin-top: 20px;
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
  button[type="submit"]:disabled { background: #a0c8b8; cursor: not-allowed; }
  button[type="submit"]:not(:disabled):hover { background: #17875f; }
  .back-btn {
    display: block;
    width: 100%;
    margin-top: 14px;
    padding: 8px;
    background: none;
    border: none;
    color: #555;
    font-size: 0.85rem;
    cursor: pointer;
    text-align: center;
  }
  .back-btn:hover { color: #1D9E75; }
</style>
