<script lang="ts">
  /**
   * Stage 1 — Discovery Basics + Consents.
   * Collects: name, email, phone, DOB, state.
   * Consent checkboxes: NPP, Patient Auth, AI Comm (required), Marketing (optional).
   * Each consent stored with timestamp + version + SHA-256 of document text.
   * Requires each required modal to have been opened at least once.
   * Persists basics to localStorage key `basics-v1`.
   * Consent keys: `consent-npp-v1`, `consent-phi-auth-v1`, `consent-ai-comm-v1`, `consent-marketing-v1`.
   */
  import { onMount } from 'svelte';
  import ConsentModal from './ConsentModal.svelte';
  import { NPP_DOC, PHI_AUTH_DOC, AI_COMM_DOC, sha256 } from '../../data/legalDocs';

  interface Basics {
    name: string;
    email: string;
    phone: string;
    dob: string;
    state: string;
  }

  interface ConsentRecord {
    acceptedAt: string;
    version: number;
    documentSha: string;
  }

  interface Props {
    onContinue: () => void;
  }
  let { onContinue }: Props = $props();

  const STORAGE_KEY = 'basics-v1';
  const CONSENT_KEYS = {
    npp: 'consent-npp-v1',
    phi: 'consent-phi-auth-v1',
    ai: 'consent-ai-comm-v1',
    mkt: 'consent-marketing-v1',
  } as const;

  function load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  }

  function save(key: string, val: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }

  /** Format a stored ISO timestamp as a relative time string, e.g. "2 days ago". */
  function relativeTime(isoString: string): string {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(ms / 60_000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
      const days = Math.floor(hrs / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } catch { return 'previously'; }
  }

  let basics = $state<Basics>(load(STORAGE_KEY, { name: '', email: '', phone: '', dob: '', state: '' }));

  // Stored consent records (may be null if not yet accepted).
  // Read from localStorage directly so initializers don't cross-reference $state variables.
  const _initNpp = load<ConsentRecord | null>(CONSENT_KEYS.npp, null);
  const _initPhi = load<ConsentRecord | null>(CONSENT_KEYS.phi, null);
  const _initAi  = load<ConsentRecord | null>(CONSENT_KEYS.ai,  null);
  const _initMkt = load<ConsentRecord | null>(CONSENT_KEYS.mkt, null);

  let storedNpp = $state<ConsentRecord | null>(_initNpp);
  let storedPhi = $state<ConsentRecord | null>(_initPhi);
  let storedAi  = $state<ConsentRecord | null>(_initAi);
  let storedMkt = $state<ConsentRecord | null>(_initMkt);

  // Consent checked state — starts true only if a record exists; validated against SHA after mount
  let consentNpp = $state<boolean>(!!_initNpp);
  let consentPhi = $state<boolean>(!!_initPhi);
  let consentAi  = $state<boolean>(!!_initAi);
  let consentMkt = $state<boolean>(!!_initMkt);

  // Whether stored consent SHA is stale (document changed since user accepted)
  let staleNpp = $state(false);
  let stalePhi = $state(false);
  let staleAi  = $state(false);

  // Track which modals have been opened (required before checkbox can be checked for first time)
  // Pre-set to true if there's a valid prior acceptance — user doesn't need to re-read
  let openedNpp = $state(!!_initNpp);
  let openedPhi = $state(!!_initPhi);
  let openedAi  = $state(!!_initAi);

  // Modal open state
  let activeModal = $state<'npp' | 'phi' | 'ai' | null>(null);

  // SHA hashes computed once on mount
  let nppSha = $state('');
  let phiSha = $state('');
  let aiSha = $state('');

  onMount(async () => {
    [nppSha, phiSha, aiSha] = await Promise.all([
      sha256(NPP_DOC.text),
      sha256(PHI_AUTH_DOC.text),
      sha256(AI_COMM_DOC.text),
    ]);

    // Validate stored consent SHAs against current document content.
    // If the doc changed, mark stale for a visible warning but DO NOT revoke the
    // prior acceptance — user is not forced to re-acknowledge work they already did.
    // consentNpp/Phi/Ai and openedNpp/Phi/Ai stay true so the flow can continue.
    if (storedNpp && nppSha && storedNpp.documentSha !== nppSha) {
      staleNpp = true;
    }
    if (storedPhi && phiSha && storedPhi.documentSha !== phiSha) {
      stalePhi = true;
    }
    if (storedAi && aiSha && storedAi.documentSha !== aiSha) {
      staleAi = true;
    }
  });

  function persistBasics(): void {
    save(STORAGE_KEY, basics);
  }

  async function setConsent(key: keyof typeof CONSENT_KEYS, checked: boolean, sha: string): Promise<void> {
    if (checked) {
      const record: ConsentRecord = {
        acceptedAt: new Date().toISOString(),
        version: 1,
        documentSha: sha,
      };
      save(CONSENT_KEYS[key], record);
      // Update stored state so the "Accepted X ago" label appears immediately
      if (key === 'npp') { storedNpp = record; staleNpp = false; }
      if (key === 'phi') { storedPhi = record; stalePhi = false; }
      if (key === 'ai')  { storedAi  = record; staleAi  = false; }
      if (key === 'mkt') { storedMkt = record; }
    } else {
      save(CONSENT_KEYS[key], null);
      if (key === 'npp') storedNpp = null;
      if (key === 'phi') storedPhi = null;
      if (key === 'ai')  storedAi  = null;
      if (key === 'mkt') storedMkt = null;
    }
  }

  function openModal(m: 'npp' | 'phi' | 'ai'): void {
    activeModal = m;
    if (m === 'npp') openedNpp = true;
    if (m === 'phi') openedPhi = true;
    if (m === 'ai') openedAi = true;
  }

  function closeModal(): void {
    activeModal = null;
  }

  const canContinue = $derived(
    basics.name.trim().length > 0 &&
    basics.email.trim().length > 0 &&
    openedNpp && openedPhi && openedAi &&
    consentNpp && consentPhi && consentAi
  );

  const US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
    'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
    'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  function modalDoc(m: 'npp' | 'phi' | 'ai') {
    if (m === 'npp') return NPP_DOC;
    if (m === 'phi') return PHI_AUTH_DOC;
    return AI_COMM_DOC;
  }
</script>

{#if activeModal}
  <ConsentModal
    title={modalDoc(activeModal).title}
    text={modalDoc(activeModal).text}
    onClose={closeModal}
  />
{/if}

<section class="stage1" aria-labelledby="s1-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 1 OF 6</div>
    <h1 id="s1-title">Let's get to know you.</h1>
    <p class="sub">A few quick details so we can personalize your 4M protocol and keep your information secure.</p>
  </div>

  <div class="form-body">
    <!-- Basic info -->
    <div class="field-group">
      <div class="field">
        <label for="s1-name">Full name <span class="req">*</span></label>
        <input id="s1-name" type="text" bind:value={basics.name} oninput={persistBasics} placeholder="First Last" autocomplete="name" />
      </div>
      <div class="field">
        <label for="s1-email">Email <span class="req">*</span></label>
        <input id="s1-email" type="email" bind:value={basics.email} oninput={persistBasics} placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="field">
        <label for="s1-phone">Phone</label>
        <input id="s1-phone" type="tel" bind:value={basics.phone} oninput={persistBasics} placeholder="(555) 000-0000" autocomplete="tel" />
      </div>
      <div class="field">
        <label for="s1-dob">Date of birth</label>
        <input id="s1-dob" type="date" bind:value={basics.dob} oninput={persistBasics} />
      </div>
      <div class="field">
        <label for="s1-state">State of residence</label>
        <select id="s1-state" bind:value={basics.state} onchange={persistBasics}>
          <option value="">— Select state —</option>
          {#each US_STATES as st}
            <option value={st}>{st}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Consents -->
    <div class="consent-block">
      <h2 class="consent-heading">Authorization & Consent</h2>
      <p class="consent-sub">
        Please review each document (click the link), then check to acknowledge.
        The first three are required to continue.
      </p>

      <!-- NPP -->
      <div class="consent-row" class:checked={consentNpp}>
        <input
          type="checkbox"
          id="cb-npp"
          bind:checked={consentNpp}
          disabled={!openedNpp || (consentNpp && !!storedNpp && !staleNpp)}
          onchange={() => setConsent('npp', consentNpp, nppSha)}
        />
        <label for="cb-npp" class="consent-label">
          I have reviewed the Notice of Privacy Practices.
          <span class="req">*</span>
          {#if consentNpp && storedNpp && !staleNpp}
            <span class="accepted-note">Accepted {relativeTime(storedNpp.acceptedAt)}</span>
          {/if}
        </label>
        <button type="button" class="doc-link" onclick={() => openModal('npp')}>
          {openedNpp ? 'Review again' : 'Read document'} ↗
        </button>
      </div>
      {#if staleNpp}
        <p class="stale-note">The Notice of Privacy Practices has been updated since your last acknowledgement. Your prior acceptance remains on file — <button type="button" class="re-ack-link" onclick={() => openModal('npp')}>review updated version ↗</button></p>
      {:else if !openedNpp}
        <p class="must-read-note">Read the document above before checking.</p>
      {/if}

      <!-- PHI Auth -->
      <div class="consent-row" class:checked={consentPhi}>
        <input
          type="checkbox"
          id="cb-phi"
          bind:checked={consentPhi}
          disabled={!openedPhi || (consentPhi && !!storedPhi && !stalePhi)}
          onchange={() => setConsent('phi', consentPhi, phiSha)}
        />
        <label for="cb-phi" class="consent-label">
          I authorize My4MLife and its contracted care team to share my health information.
          <span class="req">*</span>
          {#if consentPhi && storedPhi && !stalePhi}
            <span class="accepted-note">Accepted {relativeTime(storedPhi.acceptedAt)}</span>
          {/if}
        </label>
        <button type="button" class="doc-link" onclick={() => openModal('phi')}>
          {openedPhi ? 'Review again' : 'Read document'} ↗
        </button>
      </div>
      {#if stalePhi}
        <p class="stale-note">The Patient Authorization has been updated since your last acknowledgement. Your prior acceptance remains on file — <button type="button" class="re-ack-link" onclick={() => openModal('phi')}>review updated version ↗</button></p>
      {:else if !openedPhi}
        <p class="must-read-note">Read the document above before checking.</p>
      {/if}

      <!-- AI Communication Consent -->
      <div class="consent-row" class:checked={consentAi}>
        <input
          type="checkbox"
          id="cb-ai"
          bind:checked={consentAi}
          disabled={!openedAi || (consentAi && !!storedAi && !staleAi)}
          onchange={() => setConsent('ai', consentAi, aiSha)}
        />
        <label for="cb-ai" class="consent-label">
          I consent to receive AI-generated email and SMS communications about my care.
          <span class="req">*</span>
          {#if consentAi && storedAi && !staleAi}
            <span class="accepted-note">Accepted {relativeTime(storedAi.acceptedAt)}</span>
          {/if}
        </label>
        <button type="button" class="doc-link" onclick={() => openModal('ai')}>
          {openedAi ? 'Review again' : 'Read document'} ↗
        </button>
      </div>
      {#if staleAi}
        <p class="stale-note">The AI Communication Consent has been updated since your last acknowledgement. Your prior acceptance remains on file — <button type="button" class="re-ack-link" onclick={() => openModal('ai')}>review updated version ↗</button></p>
      {:else if !openedAi}
        <p class="must-read-note">Read the document above before checking.</p>
      {/if}

      <!-- Marketing (optional) -->
      <div class="consent-row optional-row" class:checked={consentMkt}>
        <input
          type="checkbox"
          id="cb-mkt"
          bind:checked={consentMkt}
          onchange={() => setConsent('mkt', consentMkt, '')}
        />
        <label for="cb-mkt" class="consent-label">
          I authorize use of my de-identified data for marketing purposes
          <span class="optional-tag">(optional)</span>
        </label>
      </div>
    </div>

    <!-- Navigation -->
    <div class="nav-row">
      <span></span>
      <button class="btn-continue" disabled={!canContinue} onclick={onContinue}>
        Continue — Gut Assessment →
      </button>
    </div>
    {#if !canContinue}
      <p class="req-note">
        {#if !basics.name.trim() || !basics.email.trim()}
          Enter your name and email, then
        {/if}
        {#if !openedNpp || !openedPhi || !openedAi}
          read and acknowledge all required documents to continue.
        {:else if !consentNpp || !consentPhi || !consentAi}
          Check all three required consents to continue.
        {/if}
      </p>
    {/if}
  </div>
</section>

<style>
  .stage1 {
    max-width: 600px;
    margin: 0 auto;
    padding: 32px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .hero {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .badge {
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #1D9E75;
    font-weight: 700;
  }

  h1 {
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .sub {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 0;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  label, .field > label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
  }

  input[type="text"],
  input[type="email"],
  input[type="tel"],
  input[type="date"],
  select {
    padding: 10px 14px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    color: var(--text, #e8eaf0);
    font-size: 0.92rem;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  input:focus, select:focus {
    outline: 2px solid #1D9E75;
    outline-offset: 1px;
  }

  select option {
    background: #1a1f2e;
    color: #e8eaf0;
  }

  .req {
    color: #f87171;
    margin-left: 2px;
  }

  /* Consents */
  .consent-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .consent-heading {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .consent-sub {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
    margin: 0;
    line-height: 1.5;
  }

  .consent-row {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    gap: 10px;
    align-items: start;
    padding: 14px 16px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    cursor: default;
    font-size: 0.88rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.5;
    transition: border-color 0.15s, background 0.15s;
  }

  .consent-row.checked {
    border-color: #1D9E75;
    background: rgba(29,158,117,0.07);
    color: var(--text, #e8eaf0);
  }

  .optional-row {
    opacity: 0.8;
  }

  .consent-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 2px;
    accent-color: #1D9E75;
    cursor: pointer;
  }

  .consent-row input[type="checkbox"]:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .consent-label {
    font-size: 0.88rem;
    color: inherit;
    cursor: pointer;
    line-height: 1.5;
  }

  .optional-tag {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    margin-left: 4px;
  }

  .doc-link {
    background: transparent;
    border: 1px solid rgba(29,158,117,0.4);
    color: #1D9E75;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
    align-self: center;
    transition: background 0.15s, color 0.15s;
    font-family: inherit;
  }

  .doc-link:hover {
    background: rgba(29,158,117,0.12);
    color: #27c48e;
  }

  .doc-link:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 2px;
  }

  .must-read-note {
    font-size: 0.75rem;
    color: #f87171;
    margin: -4px 0 2px 30px;
    line-height: 1.4;
  }

  .stale-note {
    font-size: 0.75rem;
    color: #fbbf24;
    margin: -4px 0 2px 30px;
    line-height: 1.4;
  }

  .re-ack-link {
    background: none;
    border: none;
    padding: 0;
    color: #fbbf24;
    font-size: inherit;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .re-ack-link:hover {
    color: #fde68a;
  }

  .accepted-note {
    display: block;
    font-size: 0.72rem;
    color: #1D9E75;
    margin-top: 2px;
    font-weight: 500;
  }

  /* Navigation */
  .nav-row {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
  }

  .btn-continue {
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 13px 28px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
    letter-spacing: 0.02em;
  }

  .btn-continue:hover:not(:disabled) {
    background: #17875F;
  }

  .btn-continue:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-continue:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 3px;
  }

  .req-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
