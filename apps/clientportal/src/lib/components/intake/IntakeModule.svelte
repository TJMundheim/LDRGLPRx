<script lang="ts">
  /**
   * IntakeModule — gated pre-program onboarding.
   * 3 stages:
   *   1 — Basics & Consents (Stage1Basics)
   *   2 — Self-Assessment  (Stage2Likert — 20 Likert questions)
   *   3 — Risk Factor Audit (Stage4Audit — reads audit-v1 populated by Stage 2)
   * Completion flag: `intake-complete-v1`.
   */
  import Stage1Basics from './Stage1Basics.svelte';
  import Stage2Likert from './Stage2Likert.svelte';
  import Stage4Audit from './Stage4Audit.svelte';
  import { onMount } from 'svelte';

  const STAGE_KEY = 'intake-stage-v1';
  const COMPLETE_KEY = 'intake-complete-v1';
  const TOTAL_STAGES = 3;

  interface Props {
    onComplete: () => void;
  }
  let { onComplete }: Props = $props();

  /** Read a JSON value from localStorage, returns null on any error. */
  function readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }

  /**
   * Check whether Stage 1 is already complete:
   * - basics-v1 has name + age + height + weight filled
   * - consent-protege-v1 is present (lightweight TOS/Privacy/AI-Comm acknowledgement)
   */
  function isStage1Complete(): boolean {
    const basics = readJson<{ name?: string; age?: string; height?: string; weight?: string }>(BASICS_KEY);
    if (!basics?.name?.trim() || !basics?.age?.trim() || !basics?.height?.trim() || !basics?.weight?.trim()) return false;
    const consent = readJson<{ acceptedAt?: string; version?: number }>('consent-protege-v1');
    return !!consent?.acceptedAt;
  }

  const BASICS_KEY = 'basics-v1';

  onMount(() => {
    // returning-completed: skip straight to audit review (stage 3)
    const complete = readJson<{ completedAt?: string }>(COMPLETE_KEY);
    if (complete?.completedAt && currentStage < 3) {
      goTo(3);
      return;
    }
    // Auto-advance past Stage 1 if basics + lightweight consent already saved
    if (currentStage === 1 && isStage1Complete()) {
      goTo(2);
    }
  });

  function loadStage(): number {
    try {
      const raw = localStorage.getItem(STAGE_KEY);
      if (raw) return (JSON.parse(raw) as { currentStage: number }).currentStage ?? 1;
    } catch { /* ignore */ }
    return 1;
  }

  function saveStage(n: number): void {
    try {
      localStorage.setItem(STAGE_KEY, JSON.stringify({ currentStage: n, lastUpdatedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
  }

  let currentStage = $state(loadStage());

  const stageLabels: Record<number, string> = {
    1: 'Basics & Consents',
    2: 'Self-Assessment',
    3: 'Risk Factor Audit',
  };

  function goTo(n: number): void {
    currentStage = n;
    saveStage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function next(): void {
    if (currentStage < TOTAL_STAGES) {
      goTo(currentStage + 1);
    }
  }

  function back(): void {
    if (currentStage > 1) {
      goTo(currentStage - 1);
    }
  }

  function complete(): void {
    try {
      localStorage.setItem(COMPLETE_KEY, JSON.stringify({ completedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
    onComplete();
  }
</script>

<div class="intake-module">
  <!-- Progress bar -->
  <div class="progress-shell" role="status" aria-live="polite">
    <div class="progress-label">
      Stage {currentStage} of {TOTAL_STAGES} — {stageLabels[currentStage]}
    </div>
    <div class="progress-track" aria-hidden="true">
      <div class="progress-fill" style="width:{Math.round((currentStage / TOTAL_STAGES) * 100)}%"></div>
    </div>
    <div class="stage-dots" aria-hidden="true">
      {#each { length: TOTAL_STAGES } as _, i}
        <button
          class="stage-dot"
          class:dot-done={i + 1 < currentStage}
          class:dot-active={i + 1 === currentStage}
          onclick={() => { if (i + 1 < currentStage) goTo(i + 1); }}
          title={stageLabels[i + 1]}
          aria-label="Stage {i + 1}: {stageLabels[i + 1]}{i + 1 < currentStage ? ' (completed)' : i + 1 === currentStage ? ' (current)' : ''}"
          disabled={i + 1 > currentStage}
        ></button>
      {/each}
    </div>
  </div>

  <!-- Stage content -->
  <div class="stage-body">
    {#if currentStage === 1}
      <Stage1Basics onContinue={next} />
    {:else if currentStage === 2}
      <Stage2Likert onBack={back} onContinue={next} />
    {:else if currentStage === 3}
      <Stage4Audit onBack={back} onComplete={complete} />
    {/if}
  </div>
</div>

<style>
  .intake-module {
    min-height: 100vh;
    background: var(--bg, #0f1117);
    color: var(--text, #e8eaf0);
    display: flex;
    flex-direction: column;
  }

  .progress-shell {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--bg, #0f1117);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 12px 24px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progress-label {
    font-size: 0.75rem;
    color: var(--text-muted, #9ba3b2);
    letter-spacing: 0.05em;
    font-weight: 600;
    text-transform: uppercase;
  }

  .progress-track {
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #1D9E75;
    border-radius: 4px;
    transition: width 0.35s ease;
  }

  .stage-dots {
    display: flex;
    gap: 8px;
  }

  .stage-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.2);
    background: transparent;
    cursor: default;
    padding: 0;
    transition: background 0.2s, border-color 0.2s;
  }

  .stage-dot.dot-done {
    background: #1D9E75;
    border-color: #1D9E75;
    cursor: pointer;
  }

  .stage-dot.dot-active {
    border-color: #1D9E75;
    background: rgba(29,158,117,0.3);
  }

  .stage-dot:disabled {
    opacity: 0.4;
  }

  .stage-body {
    flex: 1;
    padding: 0;
  }
</style>
