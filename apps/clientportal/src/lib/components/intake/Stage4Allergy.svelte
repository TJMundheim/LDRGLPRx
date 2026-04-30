<script lang="ts">
  /**
   * Stage 4 — Allergy & Sensitivity Questionnaire.
   * 10 yes/no questions. Score → band → CTA.
   * localStorage key: `allergy-assessment-v1`.
   */
  const ALLERGY_KEY = 'allergy-assessment-v1';

  interface AllergyState {
    answers: Record<number, boolean>;
    score: number | null;
    completedAt: string | null;
  }

  const ALLERGY_QUESTIONS: string[] = [
    'I react to gluten or wheat (bloating, fatigue, brain fog, digestive issues).',
    'I react to dairy (acne, congestion, GI issues, headaches).',
    'I have noticeable reactions to eggs, soy, corn, or peanuts.',
    'I have seasonal allergies (pollen, grass, ragweed, mold).',
    'I have year-round nasal congestion or post-nasal drip.',
    'I have unexplained skin rashes, hives, or eczema.',
    'I get migraines or recurring headaches.',
    "I've been told I have asthma or use an inhaler.",
    'I have a history of recurrent sinus infections, ear infections, or strep.',
    'Certain foods reliably crash my energy or worsen my mood.',
  ];

  interface Props {
    onBack: () => void;
    onContinue: () => void;
  }
  let { onBack, onContinue }: Props = $props();

  function loadState(): AllergyState {
    try {
      const raw = localStorage.getItem(ALLERGY_KEY);
      if (raw) return JSON.parse(raw) as AllergyState;
    } catch { /* ignore */ }
    return { answers: {}, score: null, completedAt: null };
  }

  function saveState(s: AllergyState): void {
    try { localStorage.setItem(ALLERGY_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  let allergyState = $state<AllergyState>(loadState());
  let showResult = $state(allergyState.score !== null && allergyState.completedAt !== null);

  const answeredCount = $derived(Object.keys(allergyState.answers).length);
  const allAnswered = $derived(answeredCount === ALLERGY_QUESTIONS.length);
  const canContinue = $derived(showResult);

  function answer(i: number, val: boolean): void {
    allergyState.answers = { ...allergyState.answers, [i]: val };
    saveState(allergyState);
  }

  function submit(): void {
    if (!allAnswered) return;
    const score = Object.values(allergyState.answers).filter(Boolean).length;
    allergyState.score = score;
    allergyState.completedAt = new Date().toISOString();
    saveState(allergyState);
    showResult = true;
  }

  function retake(): void {
    allergyState = { answers: {}, score: null, completedAt: null };
    saveState(allergyState);
    showResult = false;
  }

  function bandInfo(score: number): { title: string; body: string; color: string } {
    if (score <= 2) return {
      title: 'Low allergy/sensitivity load.',
      body: 'Minimal allergy/sensitivity burden detected. Maintain your current protocol and continue monitoring.',
      color: '#1D9E75',
    };
    if (score <= 5) return {
      title: 'Notable allergy/sensitivity signals.',
      body: 'Start with BiomeAxisForge to support your gut-immune barrier and consider a 30-day elimination protocol to identify your specific triggers.',
      color: '#D4920A',
    };
    return {
      title: 'Significant allergy/sensitivity load.',
      body: 'Strong indication for an elimination diet combined with BiomeAxisForge. Flag for a telemedicine consult to discuss IgG/IgE testing options.',
      color: '#E05C2A',
    };
  }
</script>

<section class="stage4" aria-labelledby="s4-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 4 OF 6</div>
    <h1 id="s4-title">Allergy & Sensitivity Questionnaire</h1>
    <p class="sub">10 questions to assess your immune and sensitivity burden — a key driver of inflammation.</p>
  </div>

  {#if showResult && allergyState.score !== null}
    {@const band = bandInfo(allergyState.score)}
    <div class="result-card" style="border-color:{band.color}44">
      <div class="score-row">
        <div class="score-circle" style="background:{band.color}20;border-color:{band.color}">
          <span class="score-num" style="color:{band.color}">{allergyState.score}</span>
        </div>
        <div>
          <div class="band-title">{band.title}</div>
          <div class="band-meta">Score: {allergyState.score}/10</div>
        </div>
      </div>
      <p class="band-body">{band.body}</p>
      <button class="retake-btn" onclick={retake}>Retake assessment</button>
    </div>
  {:else}
    <div class="questions-block">
      {#each ALLERGY_QUESTIONS as q, i}
        {@const ans = (allergyState.answers as Record<string, boolean>)[String(i)]}
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
        <button class="btn-submit" disabled={!allAnswered} onclick={submit}>
          See your result
        </button>
        {#if !allAnswered}
          <span class="answer-count">{answeredCount} / {ALLERGY_QUESTIONS.length} answered</span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="nav-row">
    <button class="btn-back" onclick={onBack}>← Back</button>
    <button class="btn-continue" disabled={!canContinue} onclick={onContinue}>
      Continue — Goals →
    </button>
  </div>
  {#if !canContinue}
    <p class="gate-note">Complete and submit the quiz to continue.</p>
  {/if}
</section>

<style>
  .stage4 {
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
    color: #9B4D8A;
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

  .questions-block {
    display: flex;
    flex-direction: column;
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(155,77,138,0.25);
    border-radius: 12px;
    padding: 16px;
  }

  .q-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(155,77,138,0.1);
  }

  .q-row:last-of-type { border-bottom: none; }

  .q-text {
    font-size: 0.88rem;
    color: var(--text, #e8eaf0);
    line-height: 1.5;
    flex: 1;
  }

  .q-btns { display: flex; gap: 6px; flex-shrink: 0; }

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

  .yn-btn.yes-active { background: #9B4D8A; color: #fff; border-color: #9B4D8A; }
  .no-btn.no-active { background: #6B5ED4; color: #fff; border-color: #6B5ED4; }

  .submit-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding-top: 16px;
  }

  .btn-submit {
    background: #9B4D8A;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }

  .answer-count { font-size: 0.75rem; color: var(--text-muted, #9ba3b2); }

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

  .score-row { display: flex; align-items: center; gap: 14px; }

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

  .score-num { font-size: 1.4rem; font-weight: 800; }

  .band-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    line-height: 1.3;
  }

  .band-meta { font-size: 0.72rem; color: var(--text-muted, #9ba3b2); margin-top: 2px; }

  .band-body {
    font-size: 0.85rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.7;
    margin: 0;
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

  /* Nav */
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

  .btn-back:hover { border-color: #9B4D8A; color: var(--text, #e8eaf0); }

  .btn-continue {
    background: #9B4D8A;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 13px 28px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-continue:hover:not(:disabled) { background: #7a3a6e; }
  .btn-continue:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-continue:focus-visible { outline: 2px solid #9B4D8A; outline-offset: 3px; }

  .gate-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
