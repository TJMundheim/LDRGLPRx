<script lang="ts">
  /**
   * Stage 5 — Goals multi-select.
   * "What are you here to optimize?"
   * localStorage key: `goals-v1`.
   */
  const GOALS_KEY = 'goals-v1';

  interface GoalsState {
    selected: string[];
    setAt: string;
  }

  const GOAL_OPTIONS = [
    { value: 'cognitive',     label: 'Cognitive performance & focus' },
    { value: 'sleep',         label: 'Sleep quality' },
    { value: 'body_comp',     label: 'Body composition (lean muscle / fat loss)' },
    { value: 'recovery',      label: 'Recovery & longevity' },
    { value: 'sexual',        label: 'Sexual wellness / libido' },
    { value: 'weight_loss',   label: 'Weight loss (GLP-1 candidacy)' },
    { value: 'gut',           label: 'Gut health' },
    { value: 'mood',          label: 'Mood, anxiety, or stress' },
  ] as const;

  interface Props {
    onBack: () => void;
    onContinue: () => void;
  }
  let { onBack, onContinue }: Props = $props();

  function loadSelected(): string[] {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (raw) return (JSON.parse(raw) as GoalsState).selected ?? [];
    } catch { /* ignore */ }
    return [];
  }

  function saveSelected(sel: string[]): void {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify({ selected: sel, setAt: new Date().toISOString() }));
    } catch { /* ignore */ }
  }

  let selected = $state<string[]>(loadSelected());

  function toggle(val: string): void {
    selected = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val];
    saveSelected(selected);
  }

  const canContinue = $derived(selected.length > 0);
</script>

<section class="stage5" aria-labelledby="s5-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 5 OF 6</div>
    <h1 id="s5-title">What are you here to optimize?</h1>
    <p class="sub">
      Pick all that apply. Your AI concierge uses this to personalize your protocol and surface relevant consults.
    </p>
  </div>

  <div class="goals-grid" role="group" aria-labelledby="s5-title">
    {#each GOAL_OPTIONS as opt}
      {@const isSelected = selected.includes(opt.value)}
      <button
        class="goal-btn"
        class:goal-selected={isSelected}
        onclick={() => toggle(opt.value)}
        aria-pressed={isSelected}
        type="button"
      >
        <span class="check-icon" aria-hidden="true">{isSelected ? '✓' : ''}</span>
        <span class="goal-label">{opt.label}</span>
      </button>
    {/each}
  </div>

  {#if selected.length > 0}
    <p class="selected-note">{selected.length} goal{selected.length !== 1 ? 's' : ''} selected</p>
  {/if}

  <div class="nav-row">
    <button class="btn-back" onclick={onBack}>← Back</button>
    <button class="btn-continue" disabled={!canContinue} onclick={onContinue}>
      Continue — Risk Audit →
    </button>
  </div>
  {#if !canContinue}
    <p class="gate-note">Select at least one goal to continue.</p>
  {/if}
</section>

<style>
  .stage5 {
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
    color: #D4920A;
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

  .goals-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  @media (max-width: 480px) {
    .goals-grid { grid-template-columns: 1fr; }
  }

  .goal-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    background: var(--card-bg, #161a26);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-muted, #9ba3b2);
    text-align: left;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    font-family: inherit;
  }

  .goal-btn:hover {
    border-color: #D4920A;
    color: var(--text, #e8eaf0);
  }

  .goal-btn.goal-selected {
    border-color: #D4920A;
    background: rgba(212,146,10,0.1);
    color: var(--text, #e8eaf0);
  }

  .goal-btn:focus-visible {
    outline: 2px solid #D4920A;
    outline-offset: 2px;
  }

  .check-icon {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.2);
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #D4920A;
    flex-shrink: 0;
    transition: border-color 0.15s, background 0.15s;
  }

  .goal-selected .check-icon {
    border-color: #D4920A;
    background: rgba(212,146,10,0.2);
  }

  .goal-label { flex: 1; line-height: 1.4; }

  .selected-note {
    font-size: 0.78rem;
    color: #D4920A;
    font-weight: 600;
    margin: 0;
  }

  .nav-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-top: 8px;
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

  .btn-back:hover { border-color: #D4920A; color: var(--text, #e8eaf0); }

  .btn-continue {
    background: #D4920A;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 13px 28px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-continue:hover:not(:disabled) { background: #b87a08; }
  .btn-continue:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-continue:focus-visible { outline: 2px solid #D4920A; outline-offset: 3px; }

  .gate-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
