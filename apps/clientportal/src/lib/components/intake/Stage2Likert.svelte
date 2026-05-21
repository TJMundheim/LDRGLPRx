<script lang="ts">
  /**
   * Stage 2 — 20-question Likert Self-Assessment.
   * One scrollable page. Each question scored 0-5 by the user.
   * Answers are persisted to `audit-v1` as { scores: { [categoryId]: 0-10 }, savedAt }.
   * NOTE: User input is 0-5; values are multiplied by 2 when stored so that the
   *       rest of the app (dashboard, top-3, risk band) operates on 0-10 per category / 0-200 total.
   */
  import { AUDIT_CATEGORIES } from '../../data/audit';

  interface Props {
    onBack: () => void;
    onContinue: () => void;
  }
  let { onBack, onContinue }: Props = $props();

  const AUDIT_KEY = 'audit-v1';

  // 8 questions — top-8 master taxonomy (locked 2026-05-12)
  interface QuestionDef {
    id: string;
    prompt: string;
    context: string;
  }

  const QUESTIONS: QuestionDef[] = [
    {
      id: 'gut-microbiome',
      prompt: "I deal with bloating, gas, irregular stools, food reactions, or brain fog after meals — my gut clearly isn't happy.",
      context: "0 = No gut issues at all · 3 = Occasional bloating or food reactions a few times a month · 5 = Daily bloating, irregular stools, multiple food sensitivities, foggy after most meals",
    },
    {
      id: 'sleep',
      prompt: "I don't sleep well — I have trouble falling asleep, wake up during the night, or drag through mornings even after a full night in bed.",
      context: '0 = Sleep is solid — I fall asleep fast, stay asleep, and wake rested · 3 = Some nights great, some rough · 5 = Most nights are bad, I wake up tired, and timing is all over the place',
    },
    {
      id: 'weight-body-fat',
      prompt: "I'm carrying more body fat than I should — clothes don't fit the way they used to and the scale has been creeping up.",
      context: '0 = At my ideal weight, body composition feels right · 3 = About 10-20 lbs heavier than I should be · 5 = More than 30 lbs over target with visible belly fat',
    },
    {
      id: 'nutrition',
      prompt: 'I rely on fast food, processed snacks, or convenience meals more often than I cook real whole-food meals at home.',
      context: '0 = Almost everything I eat is whole foods, mostly home-cooked · 3 = Mixed — some good days, some takeout / processed days · 5 = Fast food, packaged snacks, or convenience meals are my default',
    },
    {
      id: 'erectile-dysfunction',
      prompt: "My sex drive has dropped and erections aren't what they used to be — frequency, hardness, or both have declined noticeably in the past year or two.",
      context: '0 = Drive and function feel completely normal · 3 = Some noticeable off-weeks but not a steady pattern · 5 = Clear, sustained decline in drive, hardness, or morning erections',
    },
    {
      id: 'environment',
      prompt: "I don't get morning sunlight or any meaningful outdoor time during the day — I'm under artificial lighting most of my waking hours, drinking tap water, and surrounded by screens and EMF.",
      context: '0 = I get morning sun daily, filtered air and water, low artificial light · 3 = Some exposure issues, partially managing · 5 = No morning sun, indoors all day under fluorescents/screens, tap water, no air filtration, constant EMF',
    },
    {
      id: 'cognitive',
      prompt: "My mind isn't as sharp as it used to be — I forget words mid-sentence, lose focus, or feel mentally foggy more days than not.",
      context: '0 = Sharp, focused, fast recall every day · 3 = Occasional brain fog or forgetfulness · 5 = Daily noticeable cognitive issues that affect work or relationships',
    },
    {
      id: 'hormone-balance',
      prompt: 'I feel like my hormones are off — persistent fatigue, low drive, mood swings, poor recovery from workouts, or loss of muscle mass despite trying.',
      context: '0 = Energy, libido, mood, and recovery all feel optimal · 3 = Occasional symptoms, especially under stress · 5 = Multiple hormone-related symptoms most days affecting daily function',
    },
  ];

  // Map categoryId → user-selected 0-5 value (null = not yet answered)
  type Answers = Record<string, number | null>;

  function loadAnswers(): Answers {
    const result: Answers = {};
    for (const q of QUESTIONS) result[q.id] = null;
    try {
      const raw = localStorage.getItem(AUDIT_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as { scores?: Record<string, number> };
        if (stored.scores) {
          for (const q of QUESTIONS) {
            const v = stored.scores[q.id];
            if (typeof v === 'number' && v >= 0 && v <= 10) {
              // Convert stored 0-10 back to display 0-5
              result[q.id] = Math.round(v / 2);
            }
          }
        }
      }
    } catch { /* ignore */ }
    return result;
  }

  let answers = $state<Answers>(loadAnswers());

  // Track which "How to score" panels are open
  let openPanels = $state<Record<string, boolean>>({});

  function togglePanel(id: string): void {
    openPanels = { ...openPanels, [id]: !openPanels[id] };
  }

  function setAnswer(id: string, val: number): void {
    answers = { ...answers, [id]: val };
    persistAnswers({ ...answers, [id]: val });
  }

  function persistAnswers(a: Answers): void {
    try {
      // Multiply by 2: user 0-5 → stored 0-10 to keep rest of app on 0-10 / 0-200 scale
      const scores: Record<string, number> = {};
      for (const q of QUESTIONS) {
        const v = a[q.id];
        scores[q.id] = v !== null ? v * 2 : 0;
      }
      localStorage.setItem(AUDIT_KEY, JSON.stringify({ scores, savedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
  }

  const answeredCount = $derived(
    Object.values(answers).filter(v => v !== null).length
  );

  const allAnswered = $derived(answeredCount === QUESTIONS.length);

  function categoryLabel(id: string): string {
    const AUDIT_CATEGORIES_IMPORT = AUDIT_CATEGORIES;
    return AUDIT_CATEGORIES_IMPORT.find(c => c.id === id)?.label ?? id;
  }
</script>

<section class="stage2" aria-labelledby="s2-title">
  <!-- Sticky progress header -->
  <div class="sticky-header" role="status" aria-live="polite">
    <div class="header-inner">
      <div class="header-title">Risk Factor Self-Assessment — score each on a 0–5 scale</div>
      <div class="answered-count" class:all-done={allAnswered}>
        {answeredCount} of {QUESTIONS.length} answered
      </div>
    </div>
  </div>

  <div class="form-body">
    <div class="hero">
      <div class="badge">INTAKE — STAGE 2 OF 3</div>
      <h1 id="s2-title">How does this apply to you?</h1>
      <p class="sub">Rate each area honestly. 0 = no problem at all · 5 = severe / highly problematic. Your answers auto-populate the assessment in Stage 3 — you can adjust any score there.</p>
    </div>

    <div class="questions-list">
      {#each QUESTIONS as q, i (q.id)}
        {@const answered = answers[q.id] !== null}
        {@const selected = answers[q.id]}
        <div class="q-card" class:q-answered={answered} aria-label="Question {i + 1}: {q.prompt}">
          <div class="q-header">
            <span class="q-num">{String(i + 1).padStart(2, '0')}</span>
            <span class="q-category">{categoryLabel(q.id)}</span>
          </div>
          <p class="q-prompt">{q.prompt}</p>

          <!-- 0-5 button row -->
          <div class="likert-row" role="group" aria-label="Score for question {i + 1}">
            {#each [0, 1, 2, 3, 4, 5] as val}
              {@const isSelected = selected === val}
              {@const btnColor = val <= 1 ? '#1D9E75' : val <= 3 ? '#D4920A' : '#E05C2A'}
              <button
                class="likert-btn"
                class:likert-selected={isSelected}
                style={isSelected ? `background:${btnColor};border-color:${btnColor};color:#fff` : ''}
                onclick={() => setAnswer(q.id, val)}
                aria-pressed={isSelected}
                aria-label={String(val)}
              >{val}</button>
            {/each}
          </div>
          <div class="likert-labels">
            <span>No problem</span>
            <span>Severe</span>
          </div>

          <!-- Expandable context panel -->
          <button
            class="context-toggle"
            onclick={() => togglePanel(q.id)}
            aria-expanded={!!openPanels[q.id]}
          >
            {openPanels[q.id] ? '▲ Hide scoring guide' : '▼ How to score this'}
          </button>
          {#if openPanels[q.id]}
            <div class="context-panel" role="note">
              {q.context}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="nav-row">
      <button class="btn-back" onclick={onBack}>← Back</button>
      <button
        class="btn-continue"
        disabled={!allAnswered}
        onclick={onContinue}
      >
        Continue — Review Assessment →
      </button>
    </div>
    {#if !allAnswered}
      <p class="req-note">{QUESTIONS.length - answeredCount} question{QUESTIONS.length - answeredCount !== 1 ? 's' : ''} remaining — click 0 if it doesn't apply.</p>
    {/if}
  </div>
</section>

<style>
  .stage2 {
    max-width: 680px;
    margin: 0 auto;
    padding: 0 0 64px;
    display: flex;
    flex-direction: column;
  }

  .sticky-header {
    position: sticky;
    /* Offset by IntakeModule's progress-shell height to avoid stack overlap on mobile.
       IntakeModule progress-shell uses z-index:20 + top:0; this header sits below it. */
    top: var(--intake-progress-h, 52px);
    z-index: 10;
    background: var(--bg, #0f1117);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 10px 20px;
  }

  .header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    max-width: 640px;
    margin: 0 auto;
  }

  .header-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.4;
  }

  .answered-count {
    font-size: 0.8rem;
    font-weight: 700;
    color: #9ba3b2;
    white-space: nowrap;
    transition: color 0.2s;
  }

  .answered-count.all-done {
    color: #1D9E75;
  }

  .form-body {
    padding: 24px 20px 0;
    display: flex;
    flex-direction: column;
    gap: 28px;
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

  .questions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .q-card {
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.15s;
  }

  .q-card.q-answered {
    border-color: rgba(29,158,117,0.3);
  }

  .q-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .q-num {
    font-size: 0.68rem;
    font-weight: 700;
    color: #9ba3b2;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 5px;
    padding: 2px 7px;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .q-category {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9ba3b2;
  }

  .q-prompt {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
    line-height: 1.45;
    margin: 0;
  }

  .likert-row {
    display: flex;
    gap: 6px;
  }

  .likert-btn {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 10px 4px;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
  }

  .likert-btn:hover:not(.likert-selected) {
    border-color: rgba(255,255,255,0.35);
    color: var(--text, #e8eaf0);
  }

  .likert-btn.likert-selected {
    font-weight: 800;
  }

  .likert-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--text-muted, #9ba3b2);
    padding: 0 2px;
  }

  .context-toggle {
    background: transparent;
    border: none;
    color: #6A8A9E;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    padding: 0;
    font-family: inherit;
    transition: color 0.15s;
    align-self: flex-start;
  }

  .context-toggle:hover {
    color: #9ba3b2;
  }

  .context-panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.6;
    white-space: pre-wrap;
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
    font-family: inherit;
  }

  .btn-back:hover {
    border-color: rgba(255,255,255,0.3);
    color: var(--text, #e8eaf0);
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
    font-family: inherit;
    letter-spacing: 0.02em;
  }

  .btn-continue:hover:not(:disabled) {
    background: #17875F;
  }

  .btn-continue:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .req-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
