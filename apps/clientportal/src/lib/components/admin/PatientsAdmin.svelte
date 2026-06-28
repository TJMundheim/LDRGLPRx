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

  function getExportState(encounterId: string): ExportState {
    if (!exportStates[encounterId]) {
      exportStates = {
        ...exportStates,
        [encounterId]: { exporting: false, exportError: '', lastUrl: '' },
      };
    }
    return exportStates[encounterId];
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

  function getChargeForm(enc: EncounterAdmin): ChargeForm {
    if (!chargeForms[enc.encounterId]) {
      const defaults = CATEGORY_DEFAULTS[enc.category] ?? { dollars: '', billingType: 'one_time' as const };
      chargeForms = {
        ...chargeForms,
        [enc.encounterId]: {
          dollars: defaults.dollars,
          billingType: defaults.billingType,
          label: '',
          charging: false,
          chargeError: '',
          chargeSuccess: '',
        },
      };
    }
    return chargeForms[enc.encounterId];
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
</script>

<div class="patients-admin">
  <div class="panel-header">
    <h3 class="panel-title">
      Patients
      <span class="badge">{items.length}</span>
    </h3>
  </div>

  {#if loading && items.length === 0}
    <p class="loading">Loading…</p>
  {:else if error}
    <p class="err">{error}</p>
  {:else if items.length === 0}
    <p class="loading">No patient records found.</p>
  {:else}
    <ul class="patient-list">
      {#each items as p (p.contactId)}
        {@const name = patientName(p)}
        {@const email = patientEmail(p)}
        {@const enc = (p.encounters ?? [])[0]}

        <li class="patient-row" class:expanded={expandedId === p.contactId}>
          <!-- Summary row (clickable) -->
          <button class="row-summary" onclick={() => expand(p.contactId)}>
            <div class="row-identity">
              {#if name}
                <span class="patient-name">{name}</span>
                <span class="patient-email">{email}</span>
              {:else}
                <span class="patient-name">{email}</span>
              {/if}
            </div>

            <div class="row-meta">
              {#if enc}
                <span class="enc-cat">{enc.category}</span>
                <span class="state-chip state-{enc.state}">{enc.state}</span>
                {#if (p.encounters ?? []).length > 1}
                  <span class="more-enc">+{(p.encounters ?? []).length - 1} more</span>
                {/if}
              {:else}
                <span class="no-enc">No encounters</span>
              {/if}
              <span class="created-date">{fmtDate(p.createdAt)}</span>
              <span class="chevron">{expandedId === p.contactId ? '▲' : '▼'}</span>
            </div>
          </button>

          <!-- Detail panel -->
          {#if expandedId === p.contactId}
            <div class="detail-panel">
              {#if detailLoading}
                <p class="loading">Loading detail…</p>
              {:else if detailError}
                <p class="err">{detailError}</p>
              {:else if detail}

                <!-- Demographics -->
                <section class="detail-section">
                  <h4 class="section-label">Demographics</h4>
                  {#if detail.demographics && typeof detail.demographics === 'object'}
                    {@const demo = detail.demographics as Record<string, unknown>}
                    <dl class="dl-grid">
                      {#each Object.entries(demo) as [k, v]}
                        <dt>{k}</dt>
                        <dd>{stringify(v)}</dd>
                      {/each}
                    </dl>
                  {:else}
                    <p class="empty-field">{stringify(detail.demographics)}</p>
                  {/if}
                </section>

                <!-- History -->
                {#if detail.history}
                  <section class="detail-section">
                    <h4 class="section-label">Medical History</h4>
                    {#if typeof detail.history === 'object' && detail.history !== null}
                      {@const hist = detail.history as Record<string, unknown>}
                      <dl class="dl-grid">
                        {#each Object.entries(hist) as [k, v]}
                          <dt>{k}</dt>
                          <dd>{stringify(v)}</dd>
                        {/each}
                      </dl>
                    {:else}
                      <p class="empty-field">{stringify(detail.history)}</p>
                    {/if}
                  </section>
                {/if}

                <!-- Screening answers -->
                {#if detail.screeningAnswers}
                  <section class="detail-section">
                    <h4 class="section-label">Screening Answers</h4>
                    {#if Array.isArray(detail.screeningAnswers)}
                      <ul class="screening-list">
                        {#each detail.screeningAnswers as ans}
                          {@const a = ans as Record<string, unknown>}
                          <li>
                            <span class="q-id">{stringify(a.questionId ?? a.id ?? '')}</span>
                            <span class="q-val">{stringify(a.valueJson ?? a.value ?? a)}</span>
                          </li>
                        {/each}
                      </ul>
                    {:else if typeof detail.screeningAnswers === 'object'}
                      {@const sa = detail.screeningAnswers as Record<string, unknown>}
                      <dl class="dl-grid">
                        {#each Object.entries(sa) as [k, v]}
                          <dt>{k}</dt>
                          <dd>{stringify(v)}</dd>
                        {/each}
                      </dl>
                    {:else}
                      <p class="empty-field">{stringify(detail.screeningAnswers)}</p>
                    {/if}
                  </section>
                {/if}

                <!-- Consents -->
                {#if detail.consents}
                  <section class="detail-section">
                    <h4 class="section-label">Consents</h4>
                    {#if Array.isArray(detail.consents)}
                      <ul class="consent-list">
                        {#each detail.consents as c}
                          {@const consent = c as Record<string, unknown>}
                          <li class="consent-item">
                            <span class="consent-key">{stringify(consent.type ?? consent.key ?? consent.id ?? '')}</span>
                            <span class="consent-version">v{stringify(consent.version ?? '—')}</span>
                            <span class="consent-agreed {consent.agreed ? 'yes' : 'no'}">
                              {consent.agreed ? 'Agreed' : 'Not agreed'}
                            </span>
                            {#if consent.agreedAt ?? consent.timestamp}
                              <span class="consent-ts">{fmtDateTime(String(consent.agreedAt ?? consent.timestamp))}</span>
                            {/if}
                          </li>
                        {/each}
                      </ul>
                    {:else if typeof detail.consents === 'object'}
                      {@const cs = detail.consents as Record<string, unknown>}
                      <dl class="dl-grid">
                        {#each Object.entries(cs) as [k, v]}
                          <dt>{k}</dt>
                          <dd>{stringify(v)}</dd>
                        {/each}
                      </dl>
                    {:else}
                      <p class="empty-field">{stringify(detail.consents)}</p>
                    {/if}
                  </section>
                {/if}

                <!-- Card on file -->
                <section class="detail-section">
                  <h4 class="section-label">Payment</h4>
                  {#if detail.cardOnFile && typeof detail.cardOnFile === 'object'}
                    {@const cof = detail.cardOnFile as Record<string, unknown>}
                    {#if cof.paymentMethodId}
                      <p class="card-on-file present">Card on file</p>
                    {:else}
                      <p class="card-on-file absent">No card on file</p>
                    {/if}
                  {:else}
                    <p class="card-on-file absent">No card on file</p>
                  {/if}
                </section>

                <!-- Encounters + state machine -->
                {#if (detail.encounters ?? []).length > 0}
                  <section class="detail-section">
                    <h4 class="section-label">Encounters</h4>
                    <ul class="encounter-list">
                      {#each detail.encounters ?? [] as enc (enc.encounterId)}
                        {@const nexts = nextStates(enc.state)}
                        {@const cform = getChargeForm(enc)}
                        <li class="encounter-item">
                          <div class="enc-header">
                            <span class="enc-cat">{enc.category}</span>
                            <span class="state-chip state-{enc.state}">{enc.state}</span>
                            <span class="enc-visit">{enc.visitType}</span>
                            <span class="enc-date">{fmtDate(enc.createdAt)}</span>
                          </div>

                          {#if transitionError[enc.encounterId]}
                            <p class="err small">{transitionError[enc.encounterId]}</p>
                          {/if}

                          {#if nexts.length > 0}
                            <div class="transition-row">
                              <span class="transition-label">
                                {enc.state === 'declined' ? 'Actions:' : 'Advance to:'}
                              </span>
                              {#each nexts as toState}
                                <button
                                  class="transition-btn {toState === 'declined' ? 'decline-btn' : ''} {enc.state === 'declined' && toState === 'new' ? 'reopen-btn' : ''}"
                                  disabled={transitioningId === enc.encounterId}
                                  onclick={() => transition(p.contactId, enc, toState)}
                                >
                                  {transitioningId === enc.encounterId
                                    ? 'Saving…'
                                    : (enc.state === 'declined' && toState === 'new' ? 'Reopen' : toState)}
                                </button>
                              {/each}
                            </div>
                          {:else}
                            <p class="terminal-state">Terminal state — no further transitions.</p>
                          {/if}

                          <!-- Approve & charge panel — shown when script has been written -->
                          {#if enc.state === 'script-written'}
                            {#if cform.chargeSuccess}
                              <p class="charge-success">{cform.chargeSuccess}</p>
                            {:else}
                              <div class="charge-panel">
                                <p class="charge-panel-label">Approve &amp; charge</p>
                                <div class="charge-fields">
                                  <label class="charge-field">
                                    <span class="charge-field-label">Amount ($)</span>
                                    <input
                                      type="number"
                                      class="charge-input"
                                      min="0.01"
                                      step="0.01"
                                      placeholder="e.g. 129.00"
                                      value={cform.dollars}
                                      oninput={(e) => setChargeForm(enc.encounterId, { dollars: (e.target as HTMLInputElement).value })}
                                      disabled={cform.charging}
                                    />
                                  </label>

                                  <fieldset class="billing-toggle" disabled={cform.charging}>
                                    <legend class="charge-field-label">Billing</legend>
                                    <label class="toggle-option">
                                      <input
                                        type="radio"
                                        name="billing-{enc.encounterId}"
                                        value="one_time"
                                        checked={cform.billingType === 'one_time'}
                                        onchange={() => setChargeForm(enc.encounterId, { billingType: 'one_time' })}
                                      />
                                      One-time
                                    </label>
                                    <label class="toggle-option">
                                      <input
                                        type="radio"
                                        name="billing-{enc.encounterId}"
                                        value="subscription"
                                        checked={cform.billingType === 'subscription'}
                                        onchange={() => setChargeForm(enc.encounterId, { billingType: 'subscription' })}
                                      />
                                      Monthly subscription
                                    </label>
                                  </fieldset>

                                  <label class="charge-field charge-field-wide">
                                    <span class="charge-field-label">Description (optional)</span>
                                    <input
                                      type="text"
                                      class="charge-input"
                                      placeholder="e.g. GLP-1 protocol — month 1"
                                      value={cform.label}
                                      oninput={(e) => setChargeForm(enc.encounterId, { label: (e.target as HTMLInputElement).value })}
                                      disabled={cform.charging}
                                    />
                                  </label>
                                </div>

                                {#if cform.chargeError}
                                  <p class="err small charge-err">{cform.chargeError}</p>
                                {/if}

                                <button
                                  class="charge-btn"
                                  disabled={cform.charging}
                                  onclick={() => charge(p.contactId, enc)}
                                >
                                  {cform.charging ? 'Charging…' : 'Charge'}
                                </button>
                              </div>
                            {/if}
                          {/if}

                          <!-- Export clinical packet — available at any encounter state -->
                          {#if true}
                            {@const estate = getExportState(enc.encounterId)}
                            <div class="export-row">
                              <button
                                class="export-btn"
                                disabled={estate.exporting}
                                onclick={() => exportPacket(p.contactId, enc.encounterId)}
                              >
                                {estate.exporting ? 'Generating…' : 'Export clinical packet'}
                              </button>
                              {#if estate.exportError}
                                <p class="err small export-msg">{estate.exportError}</p>
                              {/if}
                              {#if estate.lastUrl}
                                <p class="export-msg export-hint">
                                  Opened in a new tab — use your browser's Print &rarr; Save as PDF to attach it to your email.
                                  If the tab was blocked, <a class="export-fallback-link" href={estate.lastUrl} target="_blank" rel="noopener">click here to open it manually</a>.
                                </p>
                              {/if}
                            </div>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  </section>
                {/if}

              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .patients-admin { padding: 0; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .panel-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2E1E;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    background: #1D9E75;
    border: 1px solid #1D9E75;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 0.75rem;
    color: #ffffff;
    font-weight: 600;
  }

  /* ── Patient list ─────────────────────────────────────────────────────────── */

  .patient-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .patient-row {
    background: #ffffff;
    border: 1px solid #d9e5d6;
    border-radius: 10px;
    overflow: hidden;
  }

  .patient-row.expanded {
    border-color: #1D9E75;
  }

  /* ── Summary row button ────────────────────────────────────────────────────── */

  .row-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    width: 100%;
    background: none;
    border: none;
    padding: 14px 18px;
    cursor: pointer;
    text-align: left;
    flex-wrap: wrap;
  }

  .row-summary:hover {
    background: #f5faf3;
  }

  .row-identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .patient-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: #0a0a0a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .patient-email {
    font-size: 0.78rem;
    color: #3A6A44;
    font-family: monospace;
  }

  .row-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .enc-cat {
    font-size: 0.78rem;
    color: #1A2E1E;
    font-weight: 600;
  }

  .no-enc {
    font-size: 0.78rem;
    color: #7a9a7e;
    font-style: italic;
  }

  .more-enc {
    font-size: 0.72rem;
    color: #3A6A44;
  }

  .created-date {
    font-size: 0.78rem;
    color: #3A6A44;
  }

  .chevron {
    font-size: 0.7rem;
    color: #1D9E75;
    margin-left: 4px;
  }

  /* ── State chips ─────────────────────────────────────────────────────────── */

  .state-chip {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 2px 9px;
    border-radius: 10px;
    border: 1px solid #c5d0c2;
    color: #1A2E1E;
    white-space: nowrap;
  }

  .state-chip.state-new { color: #1A2E1E; border-color: #c5d0c2; }
  .state-chip.state-coordinator-reviewed { color: #b07d00; border-color: #e0c060; }
  .state-chip.state-sent-to-provider { color: #1D9E75; border-color: #1D9E75; }
  .state-chip.state-script-written { color: #1677b5; border-color: #88bbdd; }
  .state-chip.state-fulfilled { color: #1D9E75; border-color: #1D9E75; font-weight: 800; }
  .state-chip.state-declined { color: #c81e1e; border-color: #e08080; }

  /* ── Detail panel ────────────────────────────────────────────────────────── */

  .detail-panel {
    border-top: 1px solid #d9e5d6;
    padding: 18px 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .detail-section {}

  .section-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2E1E;
    margin: 0 0 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #d9e5d6;
  }

  /* ── Definition list ────────────────────────────────────────────────────── */

  .dl-grid {
    display: grid;
    grid-template-columns: minmax(120px, max-content) 1fr;
    gap: 4px 16px;
    margin: 0;
    font-size: 0.83rem;
  }

  .dl-grid dt {
    font-weight: 600;
    color: #1A2E1E;
    padding: 3px 0;
  }

  .dl-grid dd {
    color: #0a0a0a;
    margin: 0;
    padding: 3px 0;
    word-break: break-word;
    font-family: monospace;
    font-size: 0.8rem;
  }

  /* ── Screening answers ─────────────────────────────────────────────────── */

  .screening-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .screening-list li {
    display: flex;
    gap: 10px;
    font-size: 0.82rem;
    padding: 4px 0;
    border-bottom: 1px solid #eef3ee;
  }

  .q-id {
    font-weight: 600;
    color: #1A2E1E;
    min-width: 120px;
    flex-shrink: 0;
  }

  .q-val {
    color: #0a0a0a;
    font-family: monospace;
    font-size: 0.78rem;
    word-break: break-word;
  }

  /* ── Consents ───────────────────────────────────────────────────────────── */

  .consent-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .consent-item {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 6px 0;
    border-bottom: 1px solid #eef3ee;
    font-size: 0.82rem;
  }

  .consent-key {
    font-weight: 600;
    color: #1A2E1E;
    flex: 1;
    min-width: 140px;
  }

  .consent-version {
    font-size: 0.75rem;
    color: #3A6A44;
  }

  .consent-agreed.yes { color: #1D9E75; font-weight: 700; }
  .consent-agreed.no  { color: #c81e1e; font-weight: 700; }

  .consent-ts {
    font-size: 0.75rem;
    color: #3A6A44;
  }

  /* ── Card on file ───────────────────────────────────────────────────────── */

  .card-on-file {
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0;
  }

  .card-on-file.present { color: #1D9E75; }
  .card-on-file.absent  { color: #7a9a7e; font-style: italic; font-weight: 400; }

  /* ── Encounter list ──────────────────────────────────────────────────────── */

  .encounter-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .encounter-item {
    background: #F0F5F0;
    border: 1px solid #d9e5d6;
    border-radius: 8px;
    padding: 12px 14px;
  }

  .enc-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .enc-visit {
    font-size: 0.75rem;
    color: #3A6A44;
    font-style: italic;
  }

  .enc-date {
    font-size: 0.75rem;
    color: #3A6A44;
    margin-left: auto;
  }

  /* ── Transition controls ──────────────────────────────────────────────────── */

  .transition-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .transition-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #1A2E1E;
  }

  .transition-btn {
    background: #1D9E75;
    border: 1px solid #1D9E75;
    border-radius: 6px;
    color: #ffffff;
    padding: 5px 14px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .transition-btn:hover:not(:disabled) { background: #178a63; }
  .transition-btn:disabled { opacity: 0.5; cursor: default; }

  .transition-btn.decline-btn {
    background: #ffffff;
    border-color: #c81e1e;
    color: #c81e1e;
  }

  .transition-btn.decline-btn:hover:not(:disabled) {
    background: #fff0f0;
  }

  .terminal-state {
    font-size: 0.78rem;
    color: #7a9a7e;
    font-style: italic;
    margin: 0;
  }

  /* ── Misc ─────────────────────────────────────────────────────────────────── */

  .empty-field {
    font-size: 0.82rem;
    color: #7a9a7e;
    margin: 0;
  }

  .loading, .err { color: #1A2E1E; padding: 14px 0; }
  .err { color: #c81e1e; }
  .err.small { font-size: 0.8rem; padding: 4px 0 0; }

  /* ── Reopen button ─────────────────────────────────────────────────────────── */

  .transition-btn.reopen-btn {
    background: #ffffff;
    border-color: #1D9E75;
    color: #1D9E75;
  }

  .transition-btn.reopen-btn:hover:not(:disabled) {
    background: #f0faf6;
  }

  /* ── Approve & charge panel ─────────────────────────────────────────────────── */

  .charge-panel {
    margin-top: 14px;
    background: #f8fcf9;
    border: 1px solid #b8d9c4;
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .charge-panel-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1677b5;
    margin: 0;
  }

  .charge-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-start;
  }

  .charge-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .charge-field-wide {
    flex: 1;
    min-width: 200px;
  }

  .charge-field-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1A2E1E;
  }

  .charge-input {
    background: #ffffff;
    border: 1px solid #c5d0c2;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 0.85rem;
    color: #0a0a0a;
    width: 120px;
  }

  .charge-field-wide .charge-input {
    width: 100%;
    box-sizing: border-box;
  }

  .charge-input:focus {
    outline: none;
    border-color: #1D9E75;
  }

  .billing-toggle {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .billing-toggle legend {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1A2E1E;
    margin-bottom: 4px;
    float: left;
    width: 100%;
  }

  .toggle-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    color: #1A2E1E;
    cursor: pointer;
  }

  .charge-btn {
    align-self: flex-start;
    background: #1677b5;
    border: 1px solid #1677b5;
    border-radius: 6px;
    color: #ffffff;
    padding: 6px 18px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .charge-btn:hover:not(:disabled) { background: #125d99; }
  .charge-btn:disabled { opacity: 0.5; cursor: default; }

  .charge-err {
    margin: 0;
  }

  .charge-success {
    margin: 10px 0 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: #1D9E75;
  }

  /* ── Export clinical packet ─────────────────────────────────────────────────── */

  .export-row {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .export-btn {
    align-self: flex-start;
    background: #ffffff;
    border: 1px solid #3A6A44;
    border-radius: 6px;
    color: #3A6A44;
    padding: 5px 14px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .export-btn:hover:not(:disabled) {
    background: #f0faf6;
    border-color: #1D9E75;
    color: #1D9E75;
  }

  .export-btn:disabled { opacity: 0.5; cursor: default; }

  .export-msg {
    font-size: 0.78rem;
    color: #3A6A44;
    margin: 0;
    line-height: 1.5;
  }

  .export-hint {
    font-style: italic;
  }

  .export-fallback-link {
    color: #1677b5;
    text-decoration: underline;
  }

  .export-fallback-link:hover {
    color: #125d99;
  }
</style>
