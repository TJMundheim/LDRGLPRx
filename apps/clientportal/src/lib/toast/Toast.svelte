<script lang="ts">
  import { toasts, dismissToast, retryToast } from './toast.svelte.js';
</script>

<div class="toast-stack" role="status" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.kind}">
      <div class="toast-body">
        <p class="toast-message">{toast.message}</p>
      </div>
      <div class="toast-actions">
        {#if toast.retry}
          <button type="button" class="toast-retry" onclick={() => retryToast(toast.id)}>
            Retry
          </button>
        {/if}
        <button
          type="button"
          class="toast-dismiss"
          aria-label="Dismiss"
          onclick={() => dismissToast(toast.id)}
        >
          &times;
        </button>
      </div>
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    left: 50%;
    bottom: max(16px, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: min(420px, calc(100vw - 32px));
    z-index: 1000;
    pointer-events: none;
  }

  .toast {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: var(--mc-panel);
    border: 1px solid var(--mc-line);
    border-left: 3px solid var(--mc-info);
    border-radius: var(--mc-r-md);
    box-shadow: var(--mc-shadow);
    padding: 14px 16px;
    font-family: var(--mc-font-ui);
    color: var(--mc-ink);
    pointer-events: auto;
  }

  .toast-error {
    border-left-color: var(--mc-crit-bright);
  }

  .toast-info {
    border-left-color: var(--mc-info);
  }

  .toast-body {
    flex: 1;
    min-width: 0;
  }

  .toast-message {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--mc-ink);
    word-break: break-word;
  }

  .toast-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .toast-retry {
    background: var(--mc-gold);
    color: var(--mc-on-gold);
    border: none;
    border-radius: var(--mc-r-sm);
    padding: 6px 12px;
    font-family: var(--mc-font-ui);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .toast-retry:hover {
    background: var(--mc-gold-soft);
  }

  .toast-dismiss {
    background: transparent;
    border: none;
    color: var(--mc-muted);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: var(--mc-r-sm);
  }

  .toast-dismiss:hover {
    color: var(--mc-ink);
  }
</style>
