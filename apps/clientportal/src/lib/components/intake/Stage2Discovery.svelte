<script lang="ts">
  /**
   * Stage 2 — Adaptive Discovery Questionnaire (20 categories + goals).
   * Persists per-category answers to `discovery-v1` immediately.
   * After all 20 categories, shows goals multi-select (→ `goals-v1`).
   */
  import { onMount } from 'svelte';
  import CategoryPage from './CategoryPage.svelte';
  import { DISCOVERY, migrateFromLegacy } from '../../data/discovery';
  import type { DiscoveryState } from '../../data/discovery';

  const DISCOVERY_KEY = 'discovery-v1';
  const GOALS_KEY = 'goals-v1';

  interface Props {
    onBack: () => void;
    onContinue: () => void;
  }
  let { onBack, onContinue }: Props = $props();

  const GOAL_OPTIONS = [
    { value: 'cognitive',   label: 'Cognitive performance & focus' },
    { value: 'sleep',       label: 'Sleep quality' },
    { value: 'body_comp',   label: 'Body composition (lean muscle / fat loss)' },
    { value: 'recovery',    label: 'Recovery & longevity' },
    { value: 'sexual',      label: 'Sexual wellness / libido' },
    { value: 'weight_loss', label: 'Weight loss (GLP-1 candidacy)' },
    { value: 'gut',         label: 'Gut health' },
    { value: 'mood',        label: 'Mood, anxiety, or stress' },
  ];

  function loadState(): DiscoveryState {
    try {
      const raw = localStorage.getItem(DISCOVERY_KEY);
      if (raw) return JSON.parse(raw) as DiscoveryState;
    } catch { /* ignore */ }
    return { answers: {}, currentCategoryIndex: 0, startedAt: new Date().toISOString() };
  }

  function saveState(s: DiscoveryState): void {
    try { localStorage.setItem(DISCOVERY_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  function loadGoals(): string[] {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (raw) return (JSON.parse(raw) as { selected: string[] }).selected ?? [];
    } catch { /* ignore */ }
    return [];
  }

  function saveGoals(sel: string[]): void {
    try { localStorage.setItem(GOALS_KEY, JSON.stringify({ selected: sel, setAt: new Date().toISOString() })); } catch { /* ignore */ }
  }

  let ds = $state<DiscoveryState>(loadState());
  let showGoals = $state(false);
  let selectedGoals = $state<string[]>(loadGoals());

  onMount(() => {
    migrateFromLegacy(localStorage);
    const migrated = loadState();
    ds = migrated;
    showGoals = migrated.currentCategoryIndex >= DISCOVERY.length;
    selectedGoals = loadGoals();
  });

  const currentCategory = $derived(DISCOVERY[ds.currentCategoryIndex]);
  const completedCount = $derived(Math.min(ds.currentCategoryIndex, DISCOVERY.length));
  const progressPct = $derived(Math.round((completedCount / DISCOVERY.length) * 100));

  function handleAnswered(categoryId: string, answers: Record<string, unknown>): void {
    ds = { ...ds, answers: { ...ds.answers, [categoryId]: answers } };
    saveState(ds);
  }

  function nextCategory(): void {
    const next = ds.currentCategoryIndex + 1;
    ds = { ...ds, currentCategoryIndex: next };
    saveState(ds);
    if (next >= DISCOVERY.length) {
      showGoals = true;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevCategory(): void {
    if (ds.currentCategoryIndex === 0) {
      onBack();
      return;
    }
    ds = { ...ds, currentCategoryIndex: ds.currentCategoryIndex - 1 };
    saveState(ds);
    showGoals = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function isCategoryAnswered(idx: number): boolean {
    const cat = DISCOVERY[idx];
    const ans = ds.answers[cat.id];
    if (!ans) return false;
    const anchorVal = ans[cat.anchorKey];
    return anchorVal !== undefined;
  }

  function toggleGoal(val: string): void {
    selectedGoals = selectedGoals.includes(val)
      ? selectedGoals.filter((v: string) => v !== val)
      : [...selectedGoals, val];
    saveGoals(selectedGoals);
  }

  function saveAndContinueLater(): void {
    saveState(ds);
    saveGoals(selectedGoals);
    onBack();
  }

  function completeDiscovery(): void {
    saveGoals(selectedGoals);
    onContinue();
  }
</script>

<section class="stage2" aria-labelledby="s2-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 2 OF 4</div>
    {#if !showGoals}
      <h1 id="s2-title">Discovery Questionnaire</h1>
      <p class="sub">We'll quickly assess 20 areas of your health. Most take 5–8 seconds per category.</p>
    {:else}
      <h1 id="s2-title">What are you here to optimize?</h1>
      <p class="sub">Pick all that apply. Your AI concierge uses this to personalize your protocol.</p>
    {/if}
  </div>

  {#if !showGoals}
    <!-- Category progress -->
    <div class="cat-progress" aria-label="{completedCount} of {DISCOVERY.length} categories complete">
      <div class="cat-progress-text">{completedCount} of {DISCOVERY.length} categories complete</div>
      <div class="cat-bar-track" aria-hidden="true">
        <div class="cat-bar-fill" style="width:{progressPct}%"></div>
      </div>
    </div>

    {#if currentCategory}
      <div class="cat-card">
        <CategoryPage
          category={currentCategory}
          savedAnswers={(ds.answers[currentCategory.id] ?? {}) as Record<string, unknown>}
          onAnswered={handleAnswered}
        />
      </div>

      <div class="nav-row">
        <button class="btn-back" onclick={prevCategory}>← Back</button>
        <button
          class="btn-next"
          disabled={!isCategoryAnswered(ds.currentCategoryIndex)}
          onclick={nextCategory}
        >
          {ds.currentCategoryIndex < DISCOVERY.length - 1 ? 'Next →' : 'Continue to Goals →'}
        </button>
      </div>
    {/if}
  {:else}
    <!-- Goals multiselect -->
    <div class="goals-grid" role="group" aria-labelledby="s2-title">
      {#each GOAL_OPTIONS as opt}
        {@const isSel = selectedGoals.includes(opt.value)}
        <button
          class="goal-btn"
          class:goal-selected={isSel}
          onclick={() => toggleGoal(opt.value)}
          aria-pressed={isSel}
          type="button"
        >
          <span class="check-icon" aria-hidden="true">{isSel ? '✓' : ''}</span>
          <span class="goal-label">{opt.label}</span>
        </button>
      {/each}
    </div>
    {#if selectedGoals.length > 0}
      <p class="selected-note">{selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected</p>
    {/if}
    <div class="nav-row">
      <button class="btn-back" onclick={() => { showGoals = false; ds = { ...ds, currentCategoryIndex: DISCOVERY.length - 1 }; }}>← Back</button>
      <button class="btn-next" disabled={selectedGoals.length === 0} onclick={completeDiscovery}>
        Continue — Risk Audit →
      </button>
    </div>
    {#if selectedGoals.length === 0}
      <p class="gate-note">Select at least one goal to continue.</p>
    {/if}
  {/if}

  <div class="save-later-row">
    <button class="btn-save-later" onclick={saveAndContinueLater}>Save and continue later</button>
  </div>
</section>

<style>
  .stage2 {
    max-width: 660px;
    margin: 0 auto;
    padding: 32px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .hero { display: flex; flex-direction: column; gap: 10px; }

  .badge {
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: #4a9eff;
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

  .cat-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cat-progress-text {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    font-weight: 600;
  }

  .cat-bar-track {
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 4px;
    overflow: hidden;
  }

  .cat-bar-fill {
    height: 100%;
    background: #1D9E75;
    border-radius: 4px;
    transition: width 0.35s ease;
  }

  .cat-card {
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 24px 20px;
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

  .goal-btn:hover { border-color: #D4920A; color: var(--text, #e8eaf0); }

  .goal-btn.goal-selected {
    border-color: #D4920A;
    background: rgba(212,146,10,0.1);
    color: var(--text, #e8eaf0);
  }

  .check-icon {
    width: 18px; height: 18px;
    border-radius: 4px;
    border: 2px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700;
    color: #D4920A; flex-shrink: 0;
  }

  .goal-selected .check-icon { border-color: #D4920A; background: rgba(212,146,10,0.2); }
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
    padding-top: 4px;
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
    font-family: inherit;
  }

  .btn-back:hover { border-color: #4a9eff; color: var(--text, #e8eaf0); }

  .btn-next {
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 26px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-next:hover:not(:disabled) { background: #17875F; }
  .btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-next:focus-visible { outline: 2px solid #1D9E75; outline-offset: 3px; }

  .save-later-row {
    display: flex;
    justify-content: center;
  }

  .btn-save-later {
    background: none;
    border: none;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.82rem;
    cursor: pointer;
    text-decoration: underline;
    font-family: inherit;
    padding: 4px 0;
  }

  .btn-save-later:hover { color: var(--text, #e8eaf0); }

  .gate-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
