<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listPatientRecordsAdmin,
    getPatientRecordAdmin,
    updateEncounterStateAdmin,
    chargeEncounterAdmin,
    exportClinicalPacketAdmin,
    type PatientRecordAdmin,
    type EncounterAdmin,
  } from '../../api/operations.js';

  // ─── State ────────────────────────────────────────────────────────────────────

  let items = $state<PatientRecordAdmin[]>([]);
  let loading = $state(false);
  let error = $state('');

  /** contactId of the currently-expanded patient row, or null */
  let expandedId = $state<string | null>(null);
  /** Full record fetched on row-click */
  let detail = $state<PatientRecordAdmin | null>(null);
  let detailLoading = $state(false);
  let detailError = $state('');

  /** encounterId currently being transitioned, or '' */
  let transitioningId = $state('');
  let transitionError = $state<Record<string, string>>({});

  // ─── Charge-form state (keyed by encounterId) ─────────────────────────────────

  type ChargeForm = {
    dollars: string;
    billingType: 'one_time' | 'subscription';
    label: string;
    charging: boolean;
    chargeError: string;
    chargeSuccess: string;
  };

  let chargeForms = $state<Record<string, ChargeForm>>({});

  // ─── Export-packet state (keyed by encounterId) ───────────────────────────────

  type ExportState = {
    exporting: boolean;
    exportError: string;
    lastUrl: string;
  };

  let exportStates = $state<Record<string, ExportState>>({});

  // Pure read — must NOT mutate $state during render (Svelte 5 forbids it; doing
  // so causes an infinite re-render loop). Entries are seeded in expand().
  function getExportState(encounterId: string): ExportState {
    return exportStates[encounterId] ?? { exporting: false, exportError: '', lastUrl: '' };
  }

  function setExportState(encounterId: string, patch: Partial<ExportState>) {
    const existing = exportStates[encounterId] ?? { exporting: false, exportError: '', lastUrl: '' };
    exportStates = { ...exportStates, [encounterId]: { ...existing, ...patch } };
  }

  async function exportPacket(contactId: string, encounterId: string) {
    setExportState(encounterId, { exporting: true, exportError: '', lastUrl: '' });
    try {
      const res = await exportClinicalPacketAdmin({ contactId, encounterId });
      const r = res.exportClinicalPacketAdmin;
      if (r.ok && r.summaryUrl) {
        window.open(r.summaryUrl, '_blank', 'noopener');
        setExportState(encounterId, { exporting: false, lastUrl: r.summaryUrl });
      } else {
        setExportState(encounterId, { exporting: false, exportError: r.error ?? 'Export failed. Please retry.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network or server error. Please retry.';
      setExportState(encounterId, { exporting: false, exportError: msg });
    }
  }

  /**
   * Convenience prefill by encounter category.
   * These are coordinator-editable defaults, not authoritative prices.
   */
  const CATEGORY_DEFAULTS: Record<string, { dollars: string; billingType: 'one_time' | 'subscription' }> = {
    'gut':              { dollars: '129.00', billingType: 'subscription' },
    'testosterone-ed':  { dollars: '249.00', billingType: 'one_time' },
    'sleep':            { dollars: '99.00',  billingType: 'subscription' },
    'weight':           { dollars: '199.00', billingType: 'subscription' },
    // glp1 / peptides / regenerative-medicine left blank — coordinator enters
  };

  function blankChargeForm(category: string): ChargeForm {
    const d = CATEGORY_DEFAULTS[category] ?? { dollars: '', billingType: 'one_time' as const };
    return { dollars: d.dollars, billingType: d.billingType, label: '', charging: false, chargeError: '', chargeSuccess: '' };
  }

  // Pure read — must NOT mutate $state during render. Entries are seeded in expand().
  function getChargeForm(enc: EncounterAdmin): ChargeForm {
    return chargeForms[enc.encounterId] ?? blankChargeForm(enc.category);
  }

  // Seed per-encounter form/export state once, off the render path, so the
  // template getters above can stay pure.
  function seedEncounterState(encounters: EncounterAdmin[]) {
    const cf = { ...chargeForms };
    const es = { ...exportStates };
    for (const e of encounters) {
      if (!cf[e.encounterId]) cf[e.encounterId] = blankChargeForm(e.category);
      if (!es[e.encounterId]) es[e.encounterId] = { exporting: false, exportError: '', lastUrl: '' };
    }
    chargeForms = cf;
    exportStates = es;
  }

  function setChargeForm(encounterId: string, patch: Partial<ChargeForm>) {
    const existing = chargeForms[encounterId];
    if (!existing) return;
    chargeForms = { ...chargeForms, [encounterId]: { ...existing, ...patch } };
  }

  async function charge(contactId: string, enc: EncounterAdmin) {
    const form = chargeForms[enc.encounterId];
    if (!form) return;
    const dollars = parseFloat(form.dollars);
    if (!form.dollars || isNaN(dollars) || dollars <= 0) {
      setChargeForm(enc.encounterId, { chargeError: 'Enter a valid amount greater than zero.' });
      return;
    }
    const amountCents = Math.round(dollars * 100);
    setChargeForm(enc.encounterId, { charging: true, chargeError: '', chargeSuccess: '' });
    try {
      const res = await chargeEncounterAdmin({
        contactId,
        encounterId: enc.encounterId,
        amountCents,
        billingType: form.billingType,
        interval: form.billingType === 'subscription' ? 'month' : undefined,
        label: form.label || undefined,
      });
      const r = res.chargeEncounterAdmin;
      if (r.ok) {
        const typeLabel = form.billingType === 'subscription' ? 'subscription' : 'one-time';
        const successMsg = `Charged $${dollars.toFixed(2)} (${typeLabel})`;
        // Update encounter state to fulfilled in both detail and summary list
        if (detail) {
          detail = {
            ...detail,
            encounters: (detail.encounters ?? []).map((e) =>
              e.encounterId === enc.encounterId ? { ...e, state: 'fulfilled' } : e,
            ),
          };
        }
        items = items.map((p) => {
          if (p.contactId !== contactId) return p;
          return {
            ...p,
            encounters: (p.encounters ?? []).map((e) =>
              e.encounterId === enc.encounterId ? { ...e, state: 'fulfilled' } : e,
            ),
          };
        });
        setChargeForm(enc.encounterId, { charging: false, chargeSuccess: successMsg });
      } else {
        setChargeForm(enc.encounterId, { charging: false, chargeError: r.error ?? r.code ?? 'Charge failed.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network or server error. Please retry.';
      setChargeForm(enc.encounterId, { charging: false, chargeError: msg });
    }
  }

  // ─── Legal state transitions ──────────────────────────────────────────────────

  const NEXT_STATES: Record<string, string[]> = {
    'new': ['coordinator-reviewed', 'declined'],
    'coordinator-reviewed': ['sent-to-provider', 'declined'],
    'sent-to-provider': ['script-written', 'declined'],
    'script-written': ['fulfilled', 'declined'],
    'fulfilled': [],
    'declined': ['new'],
  };

  function nextStates(current: string): string[] {
    return NEXT_STATES[current] ?? [];
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await listPatientRecordsAdmin(100);
      const list = [...(res.listPatientRecordsAdmin ?? [])].sort((a, b) =>
        (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
      );
      items = list;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load patient records';
    } finally {
      loading = false;
    }
  }

  async function expand(contactId: string) {
    if (expandedId === contactId) {
      expandedId = null;
      detail = null;
      return;
    }
    expandedId = contactId;
    detail = null;
    detailLoading = true;
    detailError = '';
    try {
      const res = await getPatientRecordAdmin(contactId);
      detail = res.getPatientRecordAdmin;
      if (detail?.encounters?.length) seedEncounterState(detail.encounters);
    } catch (e: unknown) {
      detailError = e instanceof Error ? e.message : 'Failed to load patient detail';
    } finally {
      detailLoading = false;
    }
  }

  async function transition(contactId: string, enc: EncounterAdmin, toState: string) {
    transitioningId = enc.encounterId;
    transitionError = { ...transitionError, [enc.encounterId]: '' };
    try {
      const res = await updateEncounterStateAdmin({ contactId, encounterId: enc.encounterId, toState });
      const updated = res.updateEncounterStateAdmin;
      if (updated && detail) {
        detail = {
          ...detail,
          encounters: (detail.encounters ?? []).map((e) =>
            e.encounterId === enc.encounterId ? updated : e,
          ),
        };
        // also update the summary row
        items = items.map((p) => {
          if (p.contactId !== contactId) return p;
          return {
            ...p,
            encounters: (p.encounters ?? []).map((e) =>
              e.encounterId === enc.encounterId ? updated : e,
            ),
          };
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transition failed';
      transitionError = { ...transitionError, [enc.encounterId]: msg };
      // On error (e.g. BadTransition from concurrent change) reload the full record
      try {
        const res = await getPatientRecordAdmin(contactId);
        if (res.getPatientRecordAdmin) detail = res.getPatientRecordAdmin;
      } catch {
        // ignore reload errors; the error message is already shown
      }
    } finally {
      transitioningId = '';
    }
  }

  // ─── Formatters ──────────────────────────────────────────────────────────────

  function fmtDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function fmtDateTime(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function patientEmail(p: PatientRecordAdmin): string {
    const d = p.demographics as Record<string, unknown> | null;
    return (d?.email as string) || (d?.primaryEmail as string) || p.contactId;
  }

  function patientName(p: PatientRecordAdmin): string {
    const d = p.demographics as Record<string, unknown> | null;
    if (!d) return '';
    const first = (d.firstName as string) ?? '';
    const last = (d.lastName as string) ?? '';
    return [first, last].filter(Boolean).join(' ');
  }

  function stringify(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'string') return val || '—';
    return JSON.stringify(val, null, 2);
  }

  onMount(() => load());

  // ─── Charge confirmation gate (Care Console) ────────────────────────────────
  /** encounterId whose confirm panel is open, or '' */
  let confirmingId = $state('');

  // ─── Triage lanes + waiting age ─────────────────────────────────────────────
  const HOURS_48 = 48 * 3600 * 1000;

  function allEncounters(list: PatientRecordAdmin[]): { p: PatientRecordAdmin; e: EncounterAdmin }[] {
    return list.flatMap((p) => (p.encounters ?? []).map((e) => ({ p, e })));
  }
  const laneNew = $derived(allEncounters(items).filter(({ e }) => e.state === 'new').length);
  const laneProvider = $derived(allEncounters(items).filter(({ e }) => e.state === 'sent-to-provider').length);
  const laneReady = $derived(allEncounters(items).filter(({ e }) => e.state === 'script-written').length);
  const laneStuck = $derived(allEncounters(items).filter(({ e }) =>
    (e.state === 'new' || e.state === 'coordinator-reviewed') &&
    e.createdAt && (Date.now() - new Date(e.createdAt).getTime()) > HOURS_48
  ).length);

  const TERMINAL = ['fulfilled'];
  function waitingAge(e: EncounterAdmin | undefined): { label: string; hot: boolean } {
    if (!e || TERMINAL.includes(e.state) || !e.createdAt) return { label: '—', hot: false };
    const ms = Date.now() - new Date(e.createdAt).getTime();
    const hot = ms > HOURS_48 && (e.state === 'new' || e.state === 'coordinator-reviewed');
    const d = Math.floor(ms / 86400000);
    if (d >= 1) return { label: `${d} d`, hot };
    return { label: `${Math.max(1, Math.floor(ms / 3600000))} h`, hot };
  }

  const STEP_STATES = ['new', 'coordinator-reviewed', 'sent-to-provider', 'script-written', 'fulfilled'];
  const STEP_LABELS = ['New', 'Reviewed', 'Provider', 'Script', 'Fulfilled'];
  function stepIndex(state: string): number {
    return STEP_STATES.indexOf(state);
  }

  function consentSummary(consents: unknown): string {
    if (Array.isArray(consents)) {
      const agreed = consents.filter((c) => (c as Record<string, unknown>).agreed).length;
      return `${agreed} of ${consents.length}`;
    }
    return '—';
  }

  function bmiOf(demo: Record<string, unknown> | null): string {
    if (!demo) return '—';
    const h = parseFloat(String(demo.heightIn ?? demo.height ?? ''));
    const w = parseFloat(String(demo.weightLb ?? demo.weight ?? ''));
    if (!h || !w || isNaN(h) || isNaN(w)) return '—';
    return (703 * w / (h * h)).toFixed(1);
  }

  function chipClass(state: string): string {
    if (state === 'script-written') return 'ready';
    if (state === 'sent-to-provider') return 'provider';
    if (state === 'fulfilled') return 'done';
    if (state === 'declined') return 'declined';
    if (state === 'coordinator-reviewed') return 'reviewed';
    return 'new';
  }
  function chipLabel(state: string): string {
    if (state === 'script-written') return 'Script written';
    if (state === 'sent-to-provider') return 'With provider';
    if (state === 'coordinator-reviewed') return 'Reviewed';
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

</script>

<div class="patients-admin">
  <div class="panel-header">
    <h3 class="panel-title">Care Console <span class="badge">{items.length}</span></h3>
    <p class="panel-sub">Async review · card charged only after provider approval</p>
  </div>

  {#if loading && items.length === 0}
    <p class="loading">Loading…</p>
  {:else if error}
    <p class="err">{error}</p>
  {:else if items.length === 0}
    <p class="loading">No patient records yet. New /rx intakes appear here automatically.</p>
  {:else}

    <div class="lanes">
      <div class="lane a1"><div class="ln">New intakes</div><div class="lv">{laneNew}</div><div class="ls">{laneNew > 0 ? 'Review today' : 'Clear'}</div></div>
      <div class="lane a2"><div class="ln">With provider</div><div class="lv">{laneProvider}</div><div class="ls">Awaiting review</div></div>
      <div class="lane a3"><div class="ln">Ready to charge</div><div class="lv">{laneReady}</div><div class="ls">{laneReady > 0 ? 'Script approved' : 'None pending'}</div></div>
      <div class="lane a4" class:alert={laneStuck > 0}><div class="ln">Stuck &gt; 48 h</div><div class="lv">{laneStuck}</div><div class="ls">{laneStuck > 0 ? 'Needs attention' : 'All clear'}</div></div>
    </div>

    <table class="ptable">
      <thead><tr><th>Patient</th><th>Category</th><th>Status</th><th>Waiting</th><th></th></tr></thead>
      <tbody>
        {#each items as p (p.contactId)}
          {@const name = patientName(p)}
          {@const email = patientEmail(p)}
          {@const enc = (p.encounters ?? [])[0]}
          {@const age = waitingAge(enc)}
          <tr class="prow" class:sel={expandedId === p.contactId} onclick={() => expand(p.contactId)}>
            <td>
              <div class="pname">{name || email}</div>
              {#if name}<div class="pmail">{email}</div>{/if}
            </td>
            <td class="pcat">{enc ? enc.category : '—'}
              {#if (p.encounters ?? []).length > 1}<span class="more-enc">+{(p.encounters ?? []).length - 1}</span>{/if}
            </td>
            <td>{#if enc}<span class="chip {chipClass(enc.state)}">{chipLabel(enc.state)}</span>{:else}<span class="no-enc">No encounters</span>{/if}</td>
            <td class="age" class:hot={age.hot}>{age.label}</td>
            <td class="chev">{expandedId === p.contactId ? '▴' : '▾'}</td>
          </tr>

          {#if expandedId === p.contactId}
            <tr class="drawer-row"><td colspan="5">
              <div class="drawer">
                {#if detailLoading}
                  <p class="loading">Loading detail…</p>
                {:else if detailError}
                  <p class="err">{detailError}</p>
                {:else if detail}
                  {@const demo = (detail.demographics && typeof detail.demographics === 'object') ? detail.demographics as Record<string, unknown> : null}

                  <div class="dhead">
                    <div>
                      <div class="dname">{patientName(detail) || patientEmail(detail)}</div>
                      <div class="dmeta">Received {fmtDate(detail.createdAt)} · {patientEmail(detail)}</div>
                    </div>
                  </div>

                  <div class="row3">
                    <div class="mini"><div class="fl2">BMI</div><div class="fv">{bmiOf(demo)}</div></div>
                    <div class="mini"><div class="fl2">Consents</div><div class="fv ok-v">{consentSummary(detail.consents)}</div></div>
                    <div class="mini"><div class="fl2">Card</div>
                      {#if detail.cardOnFile && typeof detail.cardOnFile === 'object' && (detail.cardOnFile as Record<string, unknown>).paymentMethodId}
                        <div class="fv ok-v">Saved</div>
                      {:else}
                        <div class="fv mut-v">None</div>
                      {/if}
                    </div>
                  </div>

                  <!-- Encounters -->
                  {#each detail.encounters ?? [] as enc2 (enc2.encounterId)}
                    {@const nexts = nextStates(enc2.state)}
                    {@const cform = getChargeForm(enc2)}
                    {@const estate = getExportState(enc2.encounterId)}
                    {@const si = stepIndex(enc2.state)}
                    <div class="encounter">
                      <div class="enc-head">
                        <span class="enc-cat">{enc2.category}</span>
                        <span class="chip {chipClass(enc2.state)}">{chipLabel(enc2.state)}</span>
                        <span class="enc-visit">{enc2.visitType}</span>
                        <span class="enc-date">{fmtDate(enc2.createdAt)}</span>
                      </div>

                      {#if enc2.state === 'declined'}
                        <div class="declined-band">Declined — reopen available below.</div>
                      {:else}
                        <div class="path">
                          {#each STEP_LABELS as _, i}
                            {#if i > 0}<span class="edge" class:done={si >= i}></span>{/if}
                            <span class="node" class:done={si > i || enc2.state === 'fulfilled'} class:on={si === i && enc2.state !== 'fulfilled'}></span>
                          {/each}
                        </div>
                        <div class="pathlbl">{#each STEP_LABELS as l}<span>{l}</span>{/each}</div>
                      {/if}

                      {#if transitionError[enc2.encounterId]}
                        <p class="err small">{transitionError[enc2.encounterId]}</p>
                      {/if}

                      {#if nexts.length > 0}
                        <div class="transition-row">
                          <span class="transition-label">{enc2.state === 'declined' ? 'Actions' : 'Advance'}</span>
                          {#each nexts as toState}
                            <button
                              class="tbtn {toState === 'declined' ? 'decline' : ''} {enc2.state === 'declined' && toState === 'new' ? 'reopen' : ''}"
                              disabled={transitioningId === enc2.encounterId}
                              onclick={() => transition(p.contactId, enc2, toState)}
                            >
                              {transitioningId === enc2.encounterId ? 'Saving…' : (enc2.state === 'declined' && toState === 'new' ? 'Reopen' : chipLabel(toState))}
                            </button>
                          {/each}
                        </div>
                      {:else}
                        <p class="terminal-state">Fulfilled — encounter closed.</p>
                      {/if}

                      <!-- Approve & charge with confirmation gate -->
                      {#if enc2.state === 'script-written'}
                        {#if cform.chargeSuccess}
                          <p class="charge-success">{cform.chargeSuccess} — encounter fulfilled.</p>
                        {:else}
                          <div class="chargebox">
                            <p class="cl">Approve &amp; charge</p>
                            <div class="charge-fields">
                              <label class="cfield">
                                <span class="cfl">Amount ($)</span>
                                <input type="number" class="cinput" min="0.01" step="0.01" placeholder="e.g. 129.00"
                                  value={cform.dollars}
                                  oninput={(e) => setChargeForm(enc2.encounterId, { dollars: (e.target as HTMLInputElement).value })}
                                  disabled={cform.charging} />
                              </label>
                              <fieldset class="billing" disabled={cform.charging}>
                                <legend class="cfl">Billing</legend>
                                <label class="opt"><input type="radio" name="billing-{enc2.encounterId}" value="one_time"
                                  checked={cform.billingType === 'one_time'}
                                  onchange={() => setChargeForm(enc2.encounterId, { billingType: 'one_time' })} /> One-time</label>
                                <label class="opt"><input type="radio" name="billing-{enc2.encounterId}" value="subscription"
                                  checked={cform.billingType === 'subscription'}
                                  onchange={() => setChargeForm(enc2.encounterId, { billingType: 'subscription' })} /> Monthly subscription</label>
                              </fieldset>
                              <label class="cfield wide">
                                <span class="cfl">Description (optional)</span>
                                <input type="text" class="cinput" placeholder="e.g. GLP-1 protocol — month 1"
                                  value={cform.label}
                                  oninput={(e) => setChargeForm(enc2.encounterId, { label: (e.target as HTMLInputElement).value })}
                                  disabled={cform.charging} />
                              </label>
                            </div>
                            {#if cform.chargeError}<p class="err small">{cform.chargeError}</p>{/if}
                            {#if confirmingId !== enc2.encounterId}
                              <button class="gbtn" disabled={cform.charging} onclick={() => confirmingId = enc2.encounterId}>
                                Review &amp; charge
                              </button>
                            {/if}
                          </div>

                          {#if confirmingId === enc2.encounterId}
                            <div class="confirm">
                              <p class="cl warn-cl">Confirm charge</p>
                              <div class="cline"><span>Patient</span><b>{patientName(detail) || patientEmail(detail)}</b></div>
                              <div class="cline"><span>Amount</span><b>${cform.dollars || '0.00'} · {cform.billingType === 'subscription' ? 'monthly subscription' : 'one-time'}</b></div>
                              <div class="cline"><span>Card</span>
                                {#if detail.cardOnFile && typeof detail.cardOnFile === 'object' && (detail.cardOnFile as Record<string, unknown>).paymentMethodId}
                                  <b>Saved card on file</b>
                                {:else}
                                  <b class="crit-v">No card on file</b>
                                {/if}
                              </div>
                              <p class="warntxt">This charges the saved card immediately and marks the encounter fulfilled. It cannot be un-clicked — only refunded.</p>
                              <div class="cacts">
                                <button class="gbtn" disabled={cform.charging}
                                  onclick={async () => { await charge(p.contactId, enc2); confirmingId = ''; }}>
                                  {cform.charging ? 'Charging…' : `Charge $${cform.dollars || '0.00'}`}
                                </button>
                                <button class="obtn" disabled={cform.charging} onclick={() => confirmingId = ''}>Cancel</button>
                              </div>
                            </div>
                          {/if}
                        {/if}
                      {/if}

                      <!-- Export clinical packet -->
                      <div class="export-row">
                        <button class="obtn" disabled={estate.exporting} onclick={() => exportPacket(p.contactId, enc2.encounterId)}>
                          {estate.exporting ? 'Generating…' : 'Export clinical packet'}
                        </button>
                        {#if estate.exportError}<p class="err small">{estate.exportError}</p>{/if}
                        {#if estate.lastUrl}
                          <p class="export-msg">Opened in a new tab — Print → Save as PDF to attach it.
                            <a class="ilink" href={estate.lastUrl} target="_blank" rel="noopener">Open again</a></p>
                        {/if}
                      </div>
                    </div>
                  {/each}

                  <!-- Clinical record sections -->
                  {#if demo}
                    <section class="dsection">
                      <h4 class="dsec">Demographics</h4>
                      <dl class="dl-grid">
                        {#each Object.entries(demo) as [k, v]}<dt>{k}</dt><dd>{stringify(v)}</dd>{/each}
                      </dl>
                    </section>
                  {/if}

                  {#if detail.history && typeof detail.history === 'object'}
                    <section class="dsection">
                      <h4 class="dsec">Medical history</h4>
                      <dl class="dl-grid">
                        {#each Object.entries(detail.history as Record<string, unknown>) as [k, v]}<dt>{k}</dt><dd>{stringify(v)}</dd>{/each}
                      </dl>
                    </section>
                  {/if}

                  {#if detail.screeningAnswers}
                    <section class="dsection">
                      <h4 class="dsec">Screening answers</h4>
                      {#if Array.isArray(detail.screeningAnswers)}
                        <ul class="slist">
                          {#each detail.screeningAnswers as ans}
                            {@const a = ans as Record<string, unknown>}
                            <li><span class="q-id">{stringify(a.questionId ?? a.id ?? '')}</span><span class="q-val">{stringify(a.valueJson ?? a.value ?? a)}</span></li>
                          {/each}
                        </ul>
                      {:else if typeof detail.screeningAnswers === 'object'}
                        <dl class="dl-grid">
                          {#each Object.entries(detail.screeningAnswers as Record<string, unknown>) as [k, v]}<dt>{k}</dt><dd>{stringify(v)}</dd>{/each}
                        </dl>
                      {/if}
                    </section>
                  {/if}

                  {#if Array.isArray(detail.consents)}
                    <section class="dsection">
                      <h4 class="dsec">Consents</h4>
                      <ul class="clist">
                        {#each detail.consents as c}
                          {@const consent = c as Record<string, unknown>}
                          <li>
                            <span class="ckey">{stringify(consent.type ?? consent.key ?? consent.id ?? '')}</span>
                            <span class="cver">v{stringify(consent.version ?? '—')}</span>
                            <span class="cagreed" class:yes={!!consent.agreed}>{consent.agreed ? 'Agreed' : 'Not agreed'}</span>
                            {#if consent.agreedAt ?? consent.timestamp}<span class="cts">{fmtDateTime(String(consent.agreedAt ?? consent.timestamp))}</span>{/if}
                          </li>
                        {/each}
                      </ul>
                    </section>
                  {/if}

                  {#if Array.isArray((detail as unknown as Record<string, unknown>).audit) && ((detail as unknown as Record<string, unknown>).audit as unknown[]).length > 0}
                    <section class="dsection">
                      <h4 class="dsec">Audit trail</h4>
                      <div class="audit">
                        {#each [...((detail as unknown as Record<string, unknown>).audit as Record<string, unknown>[])].reverse() as a}
                          <div class="aline">{fmtDateTime(String(a.at ?? ''))} — <b>{stringify(a.action)}</b>{#if a.detail}&nbsp;· {stringify(a.detail)}{/if}{#if a.actor}&nbsp;· {stringify(a.actor)}{/if}</div>
                        {/each}
                      </div>
                    </section>
                  {/if}

                {/if}
              </div>
            </td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .patients-admin { padding: 0; }
  .panel-header { margin-bottom: 16px; }
  .panel-title { font-family: var(--mc-font-display); font-size: 1.25rem; font-weight: 700; color: var(--mc-ink); margin: 0; display: flex; align-items: center; gap: 10px; }
  .panel-sub { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mc-muted); margin: 4px 0 0; }
  .badge { background: var(--mc-gold); border-radius: var(--mc-r-pill); padding: 2px 10px; font-size: 0.72rem; color: var(--mc-on-gold); font-weight: 600; font-family: var(--mc-font-ui); }

  /* lanes */
  .lanes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .lane { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 12px 14px; }
  .lane .ln { font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mc-muted); }
  .lane .lv { font-size: 1.6rem; font-weight: 600; margin-top: 3px; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
  .lane .ls { font-size: 0.66rem; margin-top: 2px; color: var(--mc-muted); }
  .lane.a1 .lv, .lane.a1 .ls { color: var(--mc-gold); }
  .lane.a2 .lv { color: var(--mc-info); }
  .lane.a3 .lv, .lane.a3 .ls { color: var(--mc-good-bright); }
  .lane.a4.alert .lv, .lane.a4.alert .ls { color: var(--mc-warn-bright); }
  @media (max-width: 700px) { .lanes { grid-template-columns: 1fr 1fr; } }

  /* table */
  .ptable { width: 100%; border-collapse: collapse; background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); overflow: hidden; }
  .ptable th { font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mc-muted); text-align: left; padding: 10px 13px; border-bottom: 1px solid var(--mc-line); background: var(--mc-panel-2); }
  .ptable td { padding: 12px 13px; border-bottom: 1px solid var(--mc-line-soft); font-size: 0.82rem; font-variant-numeric: tabular-nums; color: var(--mc-ink); vertical-align: middle; }
  .prow { cursor: pointer; }
  .prow:hover td { background: rgba(212, 175, 90, 0.05); }
  .prow.sel td { background: var(--mc-gold-tint); }
  .pname { font-weight: 600; }
  .pmail { font-size: 0.68rem; color: var(--mc-muted); }
  .pcat { color: var(--mc-ink); }
  .more-enc { font-size: 0.65rem; color: var(--mc-muted); margin-left: 6px; }
  .no-enc { font-size: 0.72rem; color: var(--mc-faint); font-style: italic; }
  .age { color: var(--mc-muted); }
  .age.hot { color: var(--mc-warn-bright); font-weight: 600; }
  .chev { color: var(--mc-gold); font-size: 0.7rem; text-align: right; }

  .chip { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; border-radius: var(--mc-r-pill); white-space: nowrap; }
  .chip.new { color: #a9b4cc; background: #182849; }
  .chip.reviewed { color: var(--mc-gold-soft); background: var(--mc-gold-tint); }
  .chip.provider { color: var(--mc-info); background: var(--mc-info-tint); }
  .chip.ready { color: var(--mc-good-bright); background: var(--mc-good-tint); }
  .chip.done { color: var(--mc-muted); background: #121e38; }
  .chip.declined { color: var(--mc-crit-bright); background: var(--mc-crit-tint); }

  /* drawer */
  .drawer-row td { padding: 0; background: var(--mc-panel-2); }
  .drawer { padding: 18px 20px 22px; display: flex; flex-direction: column; gap: 16px; }
  .dname { font-family: var(--mc-font-display); font-size: 1.15rem; color: var(--mc-ink); }
  .dmeta { font-size: 0.7rem; color: var(--mc-muted); margin-top: 3px; }
  .row3 { display: grid; grid-template-columns: repeat(3, minmax(0, 220px)); gap: 8px; }
  .mini { background: var(--mc-bg); border: 1px solid var(--mc-line); border-radius: 9px; padding: 8px 11px; }
  .mini .fl2 { font-size: 0.55rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mc-muted); }
  .mini .fv { font-size: 0.85rem; font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
  .fv.ok-v { color: var(--mc-good-bright); }
  .fv.mut-v { color: var(--mc-faint); font-weight: 400; }

  /* encounter card */
  .encounter { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 14px 16px; }
  .enc-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .enc-cat { font-size: 0.78rem; font-weight: 600; color: var(--mc-ink); }
  .enc-visit { font-size: 0.68rem; color: var(--mc-muted); font-style: italic; }
  .enc-date { font-size: 0.68rem; color: var(--mc-muted); margin-left: auto; font-variant-numeric: tabular-nums; }

  .declined-band { background: var(--mc-crit-tint); border: 1px solid var(--mc-crit-bright); border-radius: 8px; color: var(--mc-crit-bright); font-size: 0.75rem; font-weight: 600; padding: 8px 12px; margin-bottom: 10px; }

  .path { display: flex; align-items: center; margin: 4px 0 2px; }
  .node { width: 10px; height: 10px; border-radius: 50%; background: #223458; flex-shrink: 0; }
  .node.done { background: var(--mc-good); }
  .node.on { background: var(--mc-gold); box-shadow: 0 0 0 4px rgba(212, 175, 90, 0.18); }
  .edge { height: 2px; flex: 1; background: #223458; }
  .edge.done { background: var(--mc-good); }
  .pathlbl { display: flex; justify-content: space-between; font-size: 0.55rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--mc-muted); margin: 6px 0 12px; }

  .transition-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .transition-label { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mc-muted); }
  .tbtn { background: var(--mc-gold); border: 1px solid var(--mc-gold); border-radius: 8px; color: var(--mc-on-gold); padding: 6px 14px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
  .tbtn:hover:not(:disabled) { background: var(--mc-gold-soft); }
  .tbtn:disabled { opacity: 0.5; cursor: default; }
  .tbtn.decline { background: transparent; border-color: var(--mc-crit-bright); color: var(--mc-crit-bright); }
  .tbtn.decline:hover:not(:disabled) { background: var(--mc-crit-tint); }
  .tbtn.reopen { background: transparent; border-color: var(--mc-gold); color: var(--mc-gold); }
  .tbtn.reopen:hover:not(:disabled) { background: var(--mc-gold-tint); }
  .terminal-state { font-size: 0.72rem; color: var(--mc-faint); font-style: italic; margin: 0; }

  /* charge */
  .chargebox { margin-top: 12px; background: var(--mc-panel-2); border: 1px solid var(--mc-gold-line); border-radius: 11px; padding: 13px 15px; display: flex; flex-direction: column; gap: 10px; }
  .cl { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mc-gold); margin: 0; font-weight: 600; }
  .warn-cl { color: var(--mc-warn-bright); }
  .charge-fields { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  .cfield { display: flex; flex-direction: column; gap: 4px; }
  .cfield.wide { flex: 1; min-width: 200px; }
  .cfl { font-size: 0.58rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mc-muted); }
  .cinput { background: var(--mc-bg); border: 1px solid var(--mc-line); border-radius: 7px; padding: 7px 10px; font-size: 0.82rem; color: var(--mc-ink); width: 130px; font-variant-numeric: tabular-nums; }
  .cfield.wide .cinput { width: 100%; box-sizing: border-box; }
  .cinput:focus { outline: none; border-color: var(--mc-gold); }
  .billing { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .billing legend { margin-bottom: 4px; float: left; width: 100%; }
  .opt { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--mc-ink); cursor: pointer; }
  .gbtn { align-self: flex-start; background: var(--mc-gold); border: none; border-radius: 8px; color: var(--mc-on-gold); padding: 8px 18px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
  .gbtn:hover:not(:disabled) { background: var(--mc-gold-soft); }
  .gbtn:disabled { opacity: 0.5; cursor: default; }
  .obtn { align-self: flex-start; background: transparent; border: 1px solid var(--mc-line); border-radius: 8px; color: var(--mc-muted); padding: 7px 14px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
  .obtn:hover:not(:disabled) { border-color: var(--mc-gold-line); color: var(--mc-ink); }
  .obtn:disabled { opacity: 0.5; cursor: default; }

  .confirm { margin-top: 10px; background: var(--mc-bg); border: 1px solid var(--mc-warn-bright); border-radius: 11px; padding: 13px 15px; }
  .cline { display: flex; justify-content: space-between; font-size: 0.8rem; padding: 6px 0; border-bottom: 1px solid var(--mc-line-soft); font-variant-numeric: tabular-nums; color: var(--mc-muted); }
  .cline b { color: var(--mc-ink); font-weight: 600; }
  .crit-v { color: var(--mc-crit-bright); }
  .warntxt { font-size: 0.7rem; color: var(--mc-warn-bright); margin: 10px 0 0; line-height: 1.5; }
  .cacts { display: flex; gap: 8px; margin-top: 12px; }
  .charge-success { margin: 10px 0 0; font-size: 0.82rem; font-weight: 600; color: var(--mc-good-bright); }

  .export-row { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .export-msg { font-size: 0.72rem; color: var(--mc-muted); margin: 0; line-height: 1.5; font-style: italic; }
  .ilink { color: var(--mc-info); text-decoration: underline; }

  /* record sections */
  .dsection {}
  .dsec { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mc-gold); margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--mc-line); }
  .dl-grid { display: grid; grid-template-columns: minmax(120px, max-content) 1fr; gap: 3px 16px; margin: 0; font-size: 0.78rem; }
  .dl-grid dt { font-weight: 600; color: var(--mc-muted); padding: 3px 0; }
  .dl-grid dd { color: var(--mc-ink); margin: 0; padding: 3px 0; word-break: break-word; font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; }
  .slist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .slist li { display: flex; gap: 10px; font-size: 0.78rem; padding: 4px 0; border-bottom: 1px solid var(--mc-line-soft); }
  .q-id { font-weight: 600; color: var(--mc-muted); min-width: 120px; flex-shrink: 0; }
  .q-val { color: var(--mc-ink); font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; word-break: break-word; }
  .clist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .clist li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 5px 0; border-bottom: 1px solid var(--mc-line-soft); font-size: 0.78rem; }
  .ckey { font-weight: 600; color: var(--mc-ink); flex: 1; min-width: 140px; }
  .cver { font-size: 0.68rem; color: var(--mc-muted); }
  .cagreed { color: var(--mc-crit-bright); font-weight: 600; }
  .cagreed.yes { color: var(--mc-good-bright); }
  .cts { font-size: 0.68rem; color: var(--mc-muted); font-variant-numeric: tabular-nums; }

  .audit { font-size: 0.7rem; color: var(--mc-muted); line-height: 1.9; font-variant-numeric: tabular-nums; }
  .aline b { color: var(--mc-ink); font-weight: 600; }

  .loading, .err { color: var(--mc-muted); padding: 14px 0; }
  .err { color: var(--mc-crit-bright); }
  .err.small { font-size: 0.75rem; padding: 4px 0 0; }
</style>
