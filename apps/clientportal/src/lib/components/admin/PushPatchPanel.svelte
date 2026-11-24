<script lang="ts">
  import { decidePushPatchAdmin, listPushPatchProviders, type EncounterAdmin, type PushPatchProvider } from '../../api/operations.js';
  import PushPatchRefund from './PushPatchRefund.svelte';
  import { isPushPatch } from './refund.js';
  import { stateLabel, canDecide, isGlp1Order, glp1Name, GLP1_DOSES, GLP1_REFILL_NOTE, paidLabel, decidedByLabel, when, providerLabel, CONFIRM } from './pushPatch.js';

  let { contactId, enc, name, onchanged }: {
    contactId: string; enc: EncounterAdmin; name: string; onchanged: () => void | Promise<void>;
  } = $props();

  let pending = $state<'approve' | 'decline' | null>(null);
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');
  let providers = $state<PushPatchProvider[]>([]);
  let providerId = $state('');
  let loading: Promise<void> | null = null;
  const glp1 = $derived(isGlp1Order(enc));
  // Unknown sku: offer every list (the server stays the gate); known sku: only its own.
  const doseGroups = $derived(
    enc.skuId && GLP1_DOSES[enc.skuId] ? [[null, GLP1_DOSES[enc.skuId]!]] as [string | null, string[]][]
      : Object.entries(GLP1_DOSES).map(([k, v]) => [glp1Name(k), v] as [string | null, string[]]),
  );
  let doseChoice = $state('');
  let doseOther = $state('');
  const dose = $derived((doseChoice === 'other' ? doseOther : doseChoice).trim().slice(0, 60));
  const needDose = $derived(glp1 && pending === 'approve' && !dose);

  // Roster is best-effort: on any failure the picker is simply absent and the server default signs.
  function loadProviders(): Promise<void> {
    return (loading ??= (async () => {
      try {
        const list = (await listPushPatchProviders()).pushPatchProviders ?? [];
        providers = list;
        providerId = (list.find((p) => p.default) ?? list[0])?.id ?? '';
      } catch { providers = []; providerId = ''; }
    })());
  }

  function startApprove() { pending = 'approve'; void loadProviders(); }

  async function decide(action: 'approve' | 'decline') {
    busy = true; error = ''; notice = '';
    try {
      if (action === 'approve') await loadProviders();
      const withProvider = action === 'approve' && providerId ? { providerId } : {};
      const r = (await decidePushPatchAdmin({ contactId, encounterId: enc.encounterId, action, ...withProvider, ...(action === 'approve' && glp1 ? { dose } : {}) })).decidePushPatchAdmin;
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

{#if isPushPatch(enc) || glp1}
  <div class="pp-panel">
    {#if glp1}
      <div class="pp-line"><b>{glp1Name(enc.skuId)}</b></div>
      <div class="pp-line muted">{GLP1_REFILL_NOTE}</div>
    {/if}
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
          <button class="gbtn" onclick={startApprove}>Approve</button>
          <button class="obtn dec" onclick={() => (pending = 'decline')}>Decline</button>
        </div>
      {:else}
        <div class="confirm" class:warn={pending === 'decline'}>
          <p class="cl">{CONFIRM[pending]}</p>
          {#if pending === 'approve' && providers.length === 1}
            <p class="signing">Signing as: {providerLabel(providers[0])}</p>
          {:else if pending === 'approve' && providers.length > 1}
            <label class="signing" for="pp-signing-{enc.encounterId}">Signing as</label>
            <select id="pp-signing-{enc.encounterId}" class="psel" bind:value={providerId} disabled={busy}>
              {#each providers as p (p.id)}<option value={p.id}>{providerLabel(p)}</option>{/each}
            </select>
          {/if}
          {#if glp1 && pending === 'approve'}
            <label class="signing" for="pp-dose-{enc.encounterId}">Weekly dose</label>
            <select id="pp-dose-{enc.encounterId}" class="psel" bind:value={doseChoice} disabled={busy}>
              <option value="">Choose a dose</option>
              {#each doseGroups as [label, list] (label ?? 'one')}
                {#if label}<optgroup {label}>{#each list as d (d)}<option value="{d} mg">{d} mg</option>{/each}</optgroup>
                {:else}{#each list as d (d)}<option value="{d} mg">{d} mg</option>{/each}{/if}
              {/each}
              <option value="other">Other (type it)</option>
            </select>
            {#if doseChoice === 'other'}
              <label class="signing" for="pp-dose-other-{enc.encounterId}">Type the dose</label>
              <input id="pp-dose-other-{enc.encounterId}" class="psel" type="text" maxlength="60" bind:value={doseOther} disabled={busy} />
            {/if}
          {/if}
          <div class="cacts">
            <button class="gbtn" disabled={busy || needDose} onclick={() => decide(pending!)}>
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
  .signing { display: block; margin: 8px 0 0; font-size: 0.78rem; color: var(--mc-ink); }
  .psel { margin-top: 4px; padding: 6px 8px; font-size: 0.78rem; border: 1px solid var(--mc-line); border-radius: 8px; background: var(--mc-bg); color: var(--mc-ink); }
  .gbtn { background: var(--mc-gold); border: none; border-radius: 8px; color: var(--mc-on-gold); padding: 8px 18px; font-size: 0.78rem; font-weight: 700; }
  .obtn { background: transparent; border: 1px solid var(--mc-line); border-radius: 8px; color: var(--mc-muted); padding: 7px 14px; font-size: 0.75rem; font-weight: 600; }
  .obtn.dec { color: var(--mc-crit-bright); border-color: var(--mc-crit-bright); }
  .gbtn:disabled, .obtn:disabled { opacity: 0.5; cursor: default; }
  .warn-note { margin: 0; font-size: 0.75rem; color: var(--mc-warn-bright); font-weight: 600; }
  .err { color: var(--mc-crit-bright); font-size: 0.75rem; margin: 0; }
</style>
