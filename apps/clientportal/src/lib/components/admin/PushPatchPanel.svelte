<script lang="ts">
  import { decidePushPatchAdmin, type EncounterAdmin } from '../../api/operations.js';
  import PushPatchRefund from './PushPatchRefund.svelte';
  import { isPushPatch } from './refund.js';
  import { stateLabel, canDecide, paidLabel, decidedByLabel, when, CONFIRM } from './pushPatch.js';

  let { contactId, enc, name, onchanged }: {
    contactId: string; enc: EncounterAdmin; name: string; onchanged: () => void | Promise<void>;
  } = $props();

  let pending = $state<'approve' | 'decline' | null>(null);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');

  async function decide(action: 'approve' | 'decline') {
    busy = true; error = ''; notice = '';
    try {
      const r = (await decidePushPatchAdmin({ contactId, encounterId: enc.encounterId, action })).decidePushPatchAdmin;
      if (r.ok) {
        pending = null;
        if (r.mailOk === false) notice = 'Decision recorded, but an email failed to send. Notify the patient or coordinator.';
        await onchanged();
      } else if (r.code === 'already_decided') {
        pending = null; error = `Already decided (${r.state ? stateLabel(r.state) : 'see status'}). Refreshing.`;
        await onchanged();
      } else error = r.error ?? r.code ?? 'The decision failed.';
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Network or server error. Please retry.';
    } finally { busy = false; }
  }
</script>

{#if isPushPatch(enc)}
  <div class="pp-panel">
    <div class="pp-paid">{paidLabel(enc)}</div>
    <div class="pp-line">Status: <b>{stateLabel(enc.state)}</b></div>
    {#if enc.decidedAt || enc.decidedBy}
      <div class="pp-line muted">Decided{enc.decidedAt ? ` ${when(enc.decidedAt)}` : ''}{enc.decidedBy ? ` by ${decidedByLabel(enc.decidedBy)}` : ''}</div>
    {/if}
    {#if enc.genesisOrderSentAt}
      <div class="pp-line muted">Order sent to pharmacy: {when(enc.genesisOrderSentAt)}</div>
    {/if}

    {#if canDecide(enc)}
      {#if pending === null}
        <div class="pp-acts">
          <button class="gbtn" onclick={() => (pending = 'approve')}>Approve</button>
          <button class="obtn dec" onclick={() => (pending = 'decline')}>Decline</button>
        </div>
      {:else}
        <div class="confirm" class:warn={pending === 'decline'}>
          <p class="cl">{CONFIRM[pending]}</p>
          <div class="cacts">
            <button class="gbtn" disabled={busy} onclick={() => decide(pending!)}>
              {busy ? 'Saving…' : pending === 'approve' ? 'Confirm approve' : 'Confirm decline'}
            </button>
            <button class="obtn" disabled={busy} onclick={() => (pending = null)}>Cancel</button>
          </div>
        </div>
      {/if}
    {/if}
    {#if notice}<p class="warn-note">{notice}</p>{/if}
    {#if error}<p class="err">{error}</p>{/if}

    <PushPatchRefund {contactId} {enc} {name} onrefunded={onchanged} />
  </div>
{/if}

<style>
  .pp-panel { margin: 8px 0 10px; display: flex; flex-direction: column; gap: 6px; background: var(--mc-bg); border: 1px solid var(--mc-line); border-radius: 11px; padding: 12px 15px; }
  .pp-paid { font-size: 0.85rem; font-weight: 700; color: var(--mc-ink); }
  .pp-line { font-size: 0.78rem; color: var(--mc-ink); }
  .pp-line.muted { color: var(--mc-muted); font-size: 0.75rem; }
  .pp-acts, .cacts { display: flex; gap: 8px; margin-top: 6px; }
  .confirm { border: 1px solid var(--mc-gold); border-radius: 11px; padding: 12px 14px; }
  .confirm.warn { border-color: var(--mc-warn-bright); }
  .cl { margin: 0; font-size: 0.8rem; color: var(--mc-ink); font-weight: 600; }
  .gbtn { background: var(--mc-gold); border: none; border-radius: 8px; color: var(--mc-on-gold); padding: 8px 18px; font-size: 0.78rem; font-weight: 700; }
  .obtn { background: transparent; border: 1px solid var(--mc-line); border-radius: 8px; color: var(--mc-muted); padding: 7px 14px; font-size: 0.75rem; font-weight: 600; }
  .obtn.dec { color: var(--mc-crit-bright); border-color: var(--mc-crit-bright); }
  .gbtn:disabled, .obtn:disabled { opacity: 0.5; cursor: default; }
  .warn-note { margin: 0; font-size: 0.75rem; color: var(--mc-warn-bright); font-weight: 600; }
  .err { color: var(--mc-crit-bright); font-size: 0.75rem; margin: 0; }
</style>
