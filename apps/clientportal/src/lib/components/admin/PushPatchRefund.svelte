<script lang="ts">
  import { refundEncounterAdmin, type EncounterAdmin } from '../../api/operations.js';
  import { isPushPatch, canRefund, refundDueSoon, confirmText, refundStatusLabel } from './refund.js';

  let { contactId, enc, name, onrefunded }: {
    contactId: string; enc: EncounterAdmin; name: string; onrefunded: () => void | Promise<void>;
  } = $props();

  let confirming = $state(false);
  let busy = $state(false);
  let error = $state('');

  const amountLabel = $derived(typeof enc.amountCents === 'number' && enc.amountCents > 0 ? ` $${(enc.amountCents / 100).toFixed(2)}` : '');

  async function issue() {
    busy = true; error = '';
    try {
      const r = (await refundEncounterAdmin({ contactId, encounterId: enc.encounterId })).refundEncounterAdmin;
      if (r.ok) { confirming = false; await onrefunded(); }
      else error = r.error ?? r.code ?? 'Refund failed.';
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Network or server error. Please retry.';
    } finally { busy = false; }
  }
</script>

{#if isPushPatch(enc)}
  <div class="pp-refund">
    <div class="pp-row">
      <span class="pp-state">Push Patch · {enc.state}</span>
      {#if refundStatusLabel(enc.refundStatus)}<span class="pp-rs {enc.refundStatus}">{refundStatusLabel(enc.refundStatus)}</span>{/if}
      {#if enc.refundStatus === 'pending' && enc.refundDueBy}
        <span class="due" class:hot={refundDueSoon(enc.refundDueBy)}>Refund due by {enc.refundDueBy}</span>
      {/if}
    </div>
    {#if canRefund(enc)}
      {#if !confirming}
        <button class="obtn" onclick={() => (confirming = true)}>Issue refund</button>
      {:else}
        <div class="confirm">
          <p class="cl">{confirmText(enc.amountCents, name)}</p>
          <div class="cacts">
            <button class="gbtn" disabled={busy} onclick={issue}>{busy ? 'Refunding…' : `Refund${amountLabel}`}</button>
            <button class="obtn" disabled={busy} onclick={() => (confirming = false)}>Cancel</button>
          </div>
        </div>
      {/if}
    {/if}
    {#if error}<p class="err small">{error}</p>{/if}
  </div>
{/if}

<style>
  .pp-refund { margin: 8px 0 10px; display: flex; flex-direction: column; gap: 8px; }
  .pp-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 0.75rem; color: var(--mc-muted); }
  .pp-rs { font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.65rem; color: var(--mc-warn-bright); }
  .pp-rs.refunded { color: var(--mc-good-bright); }
  .due.hot { color: var(--mc-crit-bright); font-weight: 700; }
  .confirm { background: var(--mc-bg); border: 1px solid var(--mc-warn-bright); border-radius: 11px; padding: 13px 15px; }
  .cl { margin: 0; font-size: 0.8rem; color: var(--mc-ink); font-weight: 600; }
  .cacts { display: flex; gap: 8px; margin-top: 12px; }
  .gbtn { background: var(--mc-gold); border: none; border-radius: 8px; color: var(--mc-on-gold); padding: 8px 18px; font-size: 0.78rem; font-weight: 700; }
  .obtn { align-self: flex-start; background: transparent; border: 1px solid var(--mc-line); border-radius: 8px; color: var(--mc-muted); padding: 7px 14px; font-size: 0.75rem; font-weight: 600; }
  .gbtn:disabled, .obtn:disabled { opacity: 0.5; cursor: default; }
  .err { color: var(--mc-crit-bright); font-size: 0.75rem; margin: 0; }
</style>
