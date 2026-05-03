<script lang="ts">
  /**
   * Stage 1 — Demographics + Lightweight Consent.
   * Collects: name, age, height (inches), weight (lbs).
   * Single consent checkbox: TOS + Privacy + AI Comm acknowledgement.
   * Stored as `consent-protege-v1`: { acceptedAt: ISO, version: 1 }.
   * Persists basics to localStorage key `basics-v1` as { name, age, height, weight, savedAt }.
   *
   * HIPAA-grade NPP + Patient Authorization are deferred to consult-booking time.
   * See ConsentModal.svelte + legalDocs.ts for those heavyweight gates.
   */

  interface Basics {
    name: string;
    age: string;
    height: string;
    weight: string;
  }

  interface Props {
    onContinue: () => void;
  }
  let { onContinue }: Props = $props();

  const STORAGE_KEY = 'basics-v1';
  const CONSENT_KEY = 'consent-protege-v1';

  function load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  }

  function save(key: string, val: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }

  let basics = $state<Basics>(load(STORAGE_KEY, { name: '', age: '', height: '', weight: '' }));

  const _storedConsent = load<{ acceptedAt: string; version: number } | null>(CONSENT_KEY, null);
  let consentAccepted = $state<boolean>(!!_storedConsent);

  function persistBasics(): void {
    save(STORAGE_KEY, { ...basics, savedAt: new Date().toISOString() });
  }

  function handleSimpleConsent(checked: boolean): void {
    consentAccepted = checked;
    if (checked) {
      save(CONSENT_KEY, { acceptedAt: new Date().toISOString(), version: 1 });
    } else {
      save(CONSENT_KEY, null);
    }
  }

  // Note: type="number" inputs bind values as number | null, not string.
  // Coerce to String() before checking, otherwise .trim() throws and the
  // $derived block fails silently — leaving Continue permanently disabled.
  const canContinue = $derived(
    String(basics.name ?? '').trim().length > 0 &&
    String(basics.age ?? '').trim().length > 0 &&
    String(basics.height ?? '').trim().length > 0 &&
    String(basics.weight ?? '').trim().length > 0 &&
    consentAccepted
  );
</script>

<section class="stage1" aria-labelledby="s1-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 1 OF 3</div>
    <h1 id="s1-title">Let's get to know you.</h1>
    <p class="sub">A few quick details so we can personalize your 4M protocol.</p>
  </div>

  <div class="form-body">
    <!-- Basic info -->
    <div class="field-group">
      <div class="field">
        <label for="s1-name">Full name <span class="req">*</span></label>
        <input id="s1-name" type="text" bind:value={basics.name} oninput={persistBasics} placeholder="First Last" autocomplete="name" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="s1-age">Age <span class="req">*</span></label>
          <input id="s1-age" type="number" bind:value={basics.age} oninput={persistBasics} placeholder="e.g. 45" min="18" max="100" />
        </div>
        <div class="field">
          <label for="s1-height">Height (inches) <span class="req">*</span></label>
          <input id="s1-height" type="number" bind:value={basics.height} oninput={persistBasics} placeholder="e.g. 70" min="48" max="96" />
        </div>
        <div class="field">
          <label for="s1-weight">Weight (lbs) <span class="req">*</span></label>
          <input id="s1-weight" type="number" bind:value={basics.weight} oninput={persistBasics} placeholder="e.g. 210" min="80" max="500" />
        </div>
      </div>
      <p class="field-note">Height and weight are used to auto-populate your Week 1 baseline. Other details (email, phone, state) will be collected at telemedicine booking.</p>
    </div>

    <!-- Single lightweight consent -->
    <div class="consent-block">
      <div class="consent-row simple-consent" class:checked={consentAccepted}>
        <input
          type="checkbox"
          id="cb-tos"
          checked={consentAccepted}
          onchange={(e) => handleSimpleConsent((e.target as HTMLInputElement).checked)}
        />
        <label for="cb-tos">
          I agree to the
          <a href="https://my4mlife.com/terms" target="_blank" rel="noopener">Terms of Service</a>,
          <a href="https://my4mlife.com/privacy" target="_blank" rel="noopener">Privacy Policy</a>,
          and to receive AI-generated communications from My4MLife. <span class="req">*</span>
        </label>
      </div>
    </div>

    <!-- Navigation -->
    <div class="nav-row">
      <span></span>
      <button class="btn-continue" disabled={!canContinue} onclick={onContinue}>
        Continue — Self-Assessment →
      </button>
    </div>
    {#if !canContinue}
      <p class="req-note">
        {#if !String(basics.name ?? '').trim() || !String(basics.age ?? '').trim() || !String(basics.height ?? '').trim() || !String(basics.weight ?? '').trim()}
          Enter all required fields
          {#if !consentAccepted}, then check{/if}
        {:else if !consentAccepted}
          Check
        {/if}
        {#if !consentAccepted}
          the agreement checkbox to continue.
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

  .field-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .field-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    margin: 0;
    line-height: 1.5;
  }

  label, .field > label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
  }

  input[type="text"],
  input[type="number"] {
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

  input:focus {
    outline: 2px solid #1D9E75;
    outline-offset: 1px;
  }

  .req {
    color: #f87171;
    margin-left: 2px;
  }

  /* Consent */
  .consent-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .consent-row {
    display: grid;
    grid-template-columns: 20px 1fr;
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

  .consent-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 2px;
    accent-color: #1D9E75;
    cursor: pointer;
  }

  .consent-row label {
    font-size: 0.88rem;
    color: inherit;
    cursor: pointer;
    line-height: 1.5;
    font-weight: 400;
  }

  .consent-row a {
    color: #1D9E75;
    text-underline-offset: 2px;
  }

  .consent-row a:hover {
    color: #27c48e;
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
