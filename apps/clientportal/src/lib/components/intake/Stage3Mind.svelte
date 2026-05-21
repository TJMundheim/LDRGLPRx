<script lang="ts">
  /**
   * Stage 3 — Connected Mind neurocognitive screen.
   * Provides link to Connected Mind external assessment.
   * Stores completion or skip to localStorage key `connected-mind-v1`.
   *
   * // TODO(TJ): replace Connected Mind URL when provided
   * // Current placeholder: https://connectedmind.example.com/4mlife-CHANGE-ME
   */

  // TODO(TJ): replace Connected Mind URL when provided
  const CONNECTED_MIND_URL = 'https://connectedmind.example.com/4mlife-CHANGE-ME';

  const STORAGE_KEY = 'connected-mind-v1';

  interface CMState {
    completedAt?: string;
    skippedAt?: string;
  }

  interface Props {
    onBack: () => void;
    onContinue: () => void;
  }
  let { onBack, onContinue }: Props = $props();

  function loadState(): CMState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CMState) : {};
    } catch { return {}; }
  }

  function saveState(s: CMState): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  let cmState = $state<CMState>(loadState());
  let completed = $state(!!cmState.completedAt);

  function onCompletedChange(checked: boolean): void {
    completed = checked;
    if (checked) {
      cmState = { completedAt: new Date().toISOString() };
    } else {
      const { completedAt: _, ...rest } = cmState;
      cmState = rest;
    }
    saveState(cmState);
  }

  function skip(): void {
    cmState = { skippedAt: new Date().toISOString() };
    saveState(cmState);
    onContinue();
  }

  const canContinue = $derived(completed);
</script>

<section class="stage3" aria-labelledby="s3-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 3 OF 6</div>
    <h1 id="s3-title">Connected Mind</h1>
    <p class="tagline">Validated Cognitive Screen — Free for 4M Life patients</p>
    <p class="sub">
      A 15-minute neurocognitive assessment that produces a layperson-friendly report.
      Bring your results back and we'll auto-fill your cognitive assessment factor.
    </p>
  </div>

  <div class="cta-card">
    <div class="cta-icon" aria-hidden="true">🧠</div>
    <h2 class="cta-title">Take the Connected Mind Assessment</h2>
    <p class="cta-body">
      This validated screen measures cognitive performance across multiple domains.
      Results give you an objective baseline and help your AI concierge personalize
      your protocol recommendations.
    </p>
    <a
      href={CONNECTED_MIND_URL}
      target="_blank"
      rel="noopener noreferrer"
      class="btn-external"
      aria-label="Open Connected Mind assessment in new tab"
    >
      Open Connected Mind Assessment ↗
    </a>
    <p class="cta-note">Opens in a new tab. Return here when done.</p>
  </div>

  <div class="confirm-block">
    <label class="confirm-row" class:checked={completed}>
      <input
        type="checkbox"
        checked={completed}
        onchange={(e) => onCompletedChange((e.currentTarget as HTMLInputElement).checked)}
      />
      <span>I've completed the Connected Mind assessment and have my results.</span>
    </label>
  </div>

  <div class="nav-row">
    <button class="btn-back" onclick={onBack}>← Back</button>
    <div class="nav-right">
      <button class="btn-skip" onclick={skip}>Skip for now</button>
      <button class="btn-continue" disabled={!canContinue} onclick={onContinue}>
        Continue — Allergy Check →
      </button>
    </div>
  </div>

  <p class="skip-note">
    Skipping flags your record so the AI concierge can remind you later.
    You can always return and complete it before submitting your assessment.
  </p>
</section>

<style>
  .stage3 {
    max-width: 600px;
    margin: 0 auto;
    padding: 32px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .hero { display: flex; flex-direction: column; gap: 10px; }

  .badge {
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #2E7FD9;
    font-weight: 700;
  }

  h1 {
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .tagline {
    font-size: 0.88rem;
    font-weight: 600;
    color: #2E7FD9;
    margin: 0;
  }

  .sub {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 0;
  }

  .cta-card {
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(46,127,217,0.35);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .cta-icon {
    font-size: 2rem;
  }

  .cta-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .cta-body {
    font-size: 0.88rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.6;
    margin: 0;
  }

  .btn-external {
    display: inline-block;
    background: #2E7FD9;
    color: #fff;
    font-size: 0.92rem;
    font-weight: 700;
    padding: 12px 22px;
    border-radius: 8px;
    text-decoration: none;
    letter-spacing: 0.02em;
    align-self: flex-start;
    transition: background 0.15s;
  }

  .btn-external:hover { background: #2268b8; }
  .btn-external:focus-visible { outline: 2px solid #2E7FD9; outline-offset: 3px; }

  .cta-note {
    font-size: 0.75rem;
    color: var(--text-muted, #9ba3b2);
    margin: 0;
  }

  .confirm-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .confirm-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.88rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.5;
    transition: border-color 0.15s, background 0.15s;
  }

  .confirm-row.checked {
    border-color: #2E7FD9;
    background: rgba(46,127,217,0.07);
    color: var(--text, #e8eaf0);
  }

  .confirm-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 2px;
    accent-color: #2E7FD9;
    cursor: pointer;
  }

  .nav-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .nav-right {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .btn-back {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    color: var(--text-muted, #9ba3b2);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-back:hover { border-color: #2E7FD9; color: var(--text, #e8eaf0); }

  .btn-skip {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    color: var(--text-muted, #9ba3b2);
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-skip:hover { border-color: rgba(255,255,255,0.3); color: var(--text, #e8eaf0); }
  .btn-skip:focus-visible { outline: 2px solid #2E7FD9; outline-offset: 2px; }

  .btn-continue {
    background: #2E7FD9;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 13px 28px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-continue:hover:not(:disabled) { background: #2268b8; }
  .btn-continue:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-continue:focus-visible { outline: 2px solid #2E7FD9; outline-offset: 3px; }

  .skip-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.5;
    margin: 0;
  }
</style>
