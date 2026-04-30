<script lang="ts">
  /**
   * Stage 2 — Gut Health Self-Assessment.
   * Reuses the same 10-question quiz that was in Week 1.
   * Scores and results persist to localStorage key `gut-assessment-v1`.
   * Continue is enabled once the quiz is submitted.
   */
  const GUT_KEY = 'gut-assessment-v1';

  interface GutState {
    answers: Record<number, boolean>;
    score: number | null;
    completedAt: string | null;
  }

  const GUT_QUESTIONS: string[] = [
    'I frequently feel bloated after meals.',
    'I have excess gas or flatulence on a regular basis.',
    'I experience abdominal discomfort, cramping, or pain.',
    'My stools are irregular — constipation, diarrhea, or both.',
    'I have multiple food sensitivities or reactions.',
    'I feel brain fog or fatigue after eating.',
    'I have skin issues — acne, eczema, rashes, or rosacea.',
    'I have joint pain without injury, or an autoimmune diagnosis.',
    "I've had 3+ courses of antibiotics in the past 5 years.",
    "I'm under chronic stress, or had a major stress event in the past year.",
  ];

  interface Props {
    onBack: () => void;
    onContinue: () => void;
  }
  let { onBack, onContinue }: Props = $props();

  function loadState(): GutState {
    try {
      const raw = localStorage.getItem(GUT_KEY);
      if (raw) return JSON.parse(raw) as GutState;
    } catch { /* ignore */ }
    return { answers: {}, score: null, completedAt: null };
  }

  function saveState(s: GutState): void {
    try { localStorage.setItem(GUT_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  let gutState = $state<GutState>(loadState());
  let showResult = $state(gutState.score !== null && gutState.completedAt !== null);

  const answeredCount = $derived(Object.keys(gutState.answers).length);
  const allAnswered = $derived(answeredCount === GUT_QUESTIONS.length);
  const canContinue = $derived(showResult);

  function answer(i: number, val: boolean): void {
    gutState.answers = { ...gutState.answers, [i]: val };
    saveState(gutState);
  }

  function submit(): void {
    if (!allAnswered) return;
    const score = Object.values(gutState.answers).filter(Boolean).length;
    gutState.score = score;
    gutState.completedAt = new Date().toISOString();
    saveState(gutState);
    showResult = true;
  }

  function retake(): void {
    gutState = { answers: {}, score: null, completedAt: null };
    saveState(gutState);
    showResult = false;
  }

  function bandInfo(score: number): { title: string; body: string; cta: string; color: string } {
    if (score <= 2) return {
      title: 'Your gut is in good shape.',
      body: "Stay consistent with Week 1's protocol — bone broth, fermented foods, and your foundational stack maintain what you've built.",
      cta: 'Anchor with BiomeAxisForge',
      color: '#1D9E75',
    };
    if (score <= 5) return {
      title: 'Clear gut-axis signals.',
      body: "Your gut is sending signals worth listening to. The gut-repair protocol plus BiomeAxisForge daily will drive measurable change in 30 days. Retake this assessment then.",
      cta: 'Start with BiomeAxisForge',
      color: '#D4920A',
    };
    return {
      title: 'Strong gut-repair indication.',
      body: 'These are the patterns BiomeAxisForge was built for. Anchor your entire Month 1 in gut repair: BiomeAxisForge daily, eliminate sugar/seed oils/alcohol immediately, prioritize bone broth and fermented foods. Retake in 30 days.',
      cta: 'Begin with BiomeAxisForge today',
      color: '#E05C2A',
    };
  }
</script>

<section class="stage2" aria-labelledby="s2-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 2 OF 6</div>
    <h1 id="s2-title">Gut Health Self-Assessment</h1>
    <p class="sub">How much of what's happening in your brain starts in your gut? Find out in 5 minutes.</p>
  </div>

  {#if showResult && gutState.score !== null}
    {@const band = bandInfo(gutState.score)}
    <div class="result-card" style="border-color:{band.color}44">
      <div class="score-row">
        <div class="score-circle" style="background:{band.color}20;border-color:{band.color}">
          <span class="score-num" style="color:{band.color}">{gutState.score}</span>
        </div>
        <div>
          <div class="band-title">{band.title}</div>
          <div class="band-meta">Score: {gutState.score}/10</div>
        </div>
      </div>
      <p class="band-body">{band.body}</p>
      <a href="/cart" class="cta-link" style="background:{band.color}">{band.cta} →</a>
      <button class="retake-btn" onclick={retake}>Retake assessment</button>
    </div>
  {:else}
    <div class="questions-block">
      {#each GUT_QUESTIONS as q, i}
        {@const ans = (gutState.answers as Record<string, boolean>)[String(i)]}
        <div class="q-row">
          <span class="q-text">{q}</span>
          <div class="q-btns">
            <button
              class="yn-btn"
              class:yes-active={ans === true}
              onclick={() => answer(i, true)}
              aria-pressed={ans === true}
            >Yes</button>
            <button
              class="yn-btn no-btn"
              class:no-active={ans === false}
              onclick={() => answer(i, false)}
              aria-pressed={ans === false}
            >No</button>
          </div>
        </div>
      {/each}

      <div class="submit-row">
        <button
          class="btn-submit"
          disabled={!allAnswered}
          onclick={submit}
        >
          See your result
        </button>
        {#if !allAnswered}
          <span class="answer-count">{answeredCount} / {GUT_QUESTIONS.length} answered</span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="nav-row">
    <button class="btn-back" onclick={onBack}>← Back</button>
    <button class="btn-continue" disabled={!canContinue} onclick={onContinue}>
      Continue — Connected Mind →
    </button>
  </div>
  {#if !canContinue}
    <p class="gate-note">Complete and submit the quiz to continue.</p>
  {/if}
</section>

<style>
  .stage2 {
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

  /* Questions */
  .questions-block {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(29,158,117,0.25);
    border-radius: 12px;
    padding: 16px;
  }

  .q-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(29,158,117,0.1);
  }

  .q-row:last-of-type {
    border-bottom: none;
  }

  .q-text {
    font-size: 0.88rem;
    color: var(--text, #e8eaf0);
    line-height: 1.5;
    flex: 1;
  }

  .q-btns {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .yn-btn {
    min-width: 48px;
    padding: 5px 10px;
    border: 1.5px solid #D8E8DC;
    border-radius: 6px;
    background: #fff;
    color: #5A8A64;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .yn-btn.yes-active {
    background: #1D9E75;
    color: #fff;
    border-color: #1D9E75;
  }

  .no-btn.no-active {
    background: #6B5ED4;
    color: #fff;
    border-color: #6B5ED4;
  }

  .submit-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding-top: 16px;
  }

  .btn-submit {
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
  }

  .btn-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .answer-count {
    font-size: 0.75rem;
    color: var(--text-muted, #9ba3b2);
  }

  /* Result card */
  .result-card {
    background: var(--card-bg, #161a26);
    border: 1px solid;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .score-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .score-circle {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .score-num {
    font-size: 1.4rem;
    font-weight: 800;
  }

  .band-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    line-height: 1.3;
  }

  .band-meta {
    font-size: 0.72rem;
    color: var(--text-muted, #9ba3b2);
    margin-top: 2px;
  }

  .band-body {
    font-size: 0.85rem;
    color: #A8D8C0;
    line-height: 1.7;
    margin: 0;
  }

  .cta-link {
    display: inline-block;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 700;
    padding: 10px 20px;
    border-radius: 8px;
    text-decoration: none;
    letter-spacing: 0.02em;
    align-self: flex-start;
  }

  .retake-btn {
    background: none;
    border: none;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.78rem;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
    align-self: flex-start;
  }

  /* Navigation */
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

  .btn-back:hover { border-color: #1D9E75; color: var(--text, #e8eaf0); }

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
  }

  .btn-continue:hover:not(:disabled) { background: #17875F; }
  .btn-continue:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-continue:focus-visible { outline: 2px solid #1D9E75; outline-offset: 3px; }

  .gate-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
