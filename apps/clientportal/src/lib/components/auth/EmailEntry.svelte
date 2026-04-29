<script lang="ts">
  import { requestEmailCode } from '../../auth/cognito.js';

  interface Props {
    onsuccess: (detail: { email: string; session: string }) => void;
  }

  const { onsuccess }: Props = $props();

  let email = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const session = await requestEmailCode(email.trim());
      onsuccess({ email: email.trim(), session });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to send code. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-card">
  <h2>Sign In</h2>
  <p class="subtitle">Enter your email to receive a one-time code.</p>
  <form onsubmit={handleSubmit}>
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
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus { border-color: #1D9E75; }
  .error { color: #c0392b; font-size: 0.85rem; margin: 8px 0 0; }
  button {
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
  button:disabled { background: #a0c8b8; cursor: not-allowed; }
  button:not(:disabled):hover { background: #17875f; }
</style>
