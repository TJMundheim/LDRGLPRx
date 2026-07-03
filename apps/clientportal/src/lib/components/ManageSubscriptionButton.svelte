<script lang="ts">
  import { getIdToken } from '../auth/cognito.js';

  interface Props {
    hasActiveSubscription: boolean;
    stripeCustomerId: string | null | undefined;
  }
  let { hasActiveSubscription, stripeCustomerId }: Props = $props();

  let loading = $state(false);
  let errorMsg = $state('');
  let errorVisible = $state(false);

  const API_BASE = (import.meta.env.VITE_LEAD_CAPTURE_API_URL as string | undefined) ?? '';

  async function handleClick() {
    if (!stripeCustomerId) return;
    errorVisible = false;
    loading = true;
    try {
      const token = getIdToken();
      const res = await fetch(`${API_BASE}/api/customer-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      errorMsg = e.message ?? 'Unable to open billing portal. Please try again.';
      errorVisible = true;
    } finally {
      loading = false;
    }
  }
</script>

{#if hasActiveSubscription && stripeCustomerId}
  <div class="manage-sub-wrap">
    <button class="manage-sub-btn" onclick={handleClick} disabled={loading}>
      {loading ? 'Opening…' : 'Manage subscription'}
    </button>
    {#if errorVisible}
      <p class="manage-sub-error" role="alert">{errorMsg}</p>
    {/if}
  </div>
{/if}

<style>
  .manage-sub-wrap { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }

  .manage-sub-btn {
    background: transparent;
    border: 1px solid rgba(212,175,90, 0.4);
    color: var(--mc-good-bright);
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    min-height: 36px;
  }
  .manage-sub-btn:hover:not(:disabled) { background: rgba(212,175,90,0.1); border-color: var(--mc-good-bright); }
  .manage-sub-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .manage-sub-error {
    font-size: 0.75rem;
    color: #ff6b6b;
    margin: 0;
    padding: 4px 0;
  }
</style>
