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

  // 20 questions in audit.ts canonical order
  interface QuestionDef {
    id: string;
    prompt: string;
    context: string;
  }

  const QUESTIONS: QuestionDef[] = [
    {
      id: 'purpose-social',
      prompt: 'How much do you struggle with a clear sense of purpose, written goals, or daily meaning?',
      context: '0 = I have crystal-clear purpose and goals I\'m actively pursuing · 3 = I have some direction but it\'s fuzzy · 5 = I\'m drifting; nothing feels meaningful or motivating',
    },
    {
      id: 'morning-routine',
      prompt: 'How much do you struggle with an inconsistent or absent morning routine?',
      context: '0 = I have a consistent ritual I follow daily · 3 = I have a loose routine but skip it often · 5 = I have no routine; mornings feel chaotic',
    },
    {
      id: 'sleep',
      prompt: 'How much do sleep problems (poor quality, inconsistent timing, frequent waking, fatigue on waking) affect you?',
      context: '0 = Consistently great sleep, well-rested every morning · 3 = Hit-or-miss; some nights fine, some rough · 5 = Chronic insomnia, daily fatigue, inconsistent timing, frequent waking',
    },
    {
      id: 'gut-microbiome',
      prompt: 'How much do gut symptoms (bloating, gas, irregular stools, food sensitivities, brain fog after meals) affect you?',
      context: '0 = No notable gut symptoms · 3 = Occasional bloating or food reactions, manageable · 5 = Frequent bloating, irregular stools, brain fog after meals, multiple food sensitivities',
    },
    {
      id: 'weight-body-fat',
      prompt: 'How much excess body fat do you carry beyond your healthy target?',
      context: '0 = At my ideal weight and composition · 3 = Roughly 10–20 lbs above target · 5 = >30 lbs above target with visible visceral fat',
    },
    {
      id: 'hormone-balance',
      prompt: 'How often do you experience symptoms of hormone imbalance (persistent fatigue, low libido, brain fog, loss of muscle mass, mood swings, poor recovery)?',
      context: '0 = Energy, libido, mood, and recovery all feel optimal · 3 = Occasional symptoms, especially after stress · 5 = Multiple symptoms most days affecting daily function',
    },
    {
      id: 'dental-health',
      prompt: 'How would you rate your dental health concerns (gum bleeding, bad breath, missed professional cleanings (>6 months since last))?',
      context: '0 = Excellent oral hygiene, cleaning within 6 months · 3 = Some issues; overdue for cleaning · 5 = Gum issues, >1 year since cleaning, persistent bad breath',
    },
    {
      id: 'substance-use',
      prompt: 'How much do alcohol, tobacco, vaping, or recreational drug use affect your health goals?',
      context: '0 = None or occasional only (social) · 3 = Alcohol >7 drinks/week or daily nicotine use · 5 = Daily heavy use affecting sleep, energy, or relationships',
    },
    {
      id: 'nutrition',
      prompt: 'How often do you eat highly-processed, fast, or convenience foods?',
      context: '0 = Whole-foods diet, mostly home-cooked · 3 = Mix of whole foods and convenience; several times a week processed · 5 = Fast food or processed/convenience food daily',
    },
    {
      id: 'nutritional-supplements',
      prompt: "How likely is it that you're under-supplemented in essential nutrients (vitamin D, magnesium, omega-3, B-complex, etc.)?",
      context: '0=I get >15 min direct sun daily, eat well, and tested optimal across panels. 5=indoor work, no recent labs, no targeted supplementation.',
    },
    {
      id: 'environment',
      prompt: 'How much do environmental inputs (poor air, unfiltered water, blue light, EMF, fluorescent lighting) affect your daily exposure?',
      context: '0 = Clean air, filtered water, low artificial light exposure · 3 = Some exposure but managing it · 5 = Poor air quality at home/work, tap water, screens or fluorescents most of the day',
    },
    {
      id: 'pain-acute',
      prompt: 'How much does an acute injury or pain (within the past 4 weeks) limit your daily activity?',
      context: '0 = No acute injuries · 3 = Mild acute pain — present but not limiting major activities · 5 = Current acute injury significantly limiting movement or exercise',
    },
    {
      id: 'pain-chronic',
      prompt: 'How much does chronic pain (>3 months) limit your daily activity?',
      context: '0 = No chronic pain · 3 = Manageable chronic pain; present but functional · 5 = Daily chronic pain limiting most activities and affecting quality of life',
    },
    {
      id: 'allergies-immune',
      prompt: 'How much do allergies, food sensitivities, or immune symptoms (recurrent infections, autoimmune flares) affect you?',
      context: '0 = No notable allergy or immune symptoms · 3 = Seasonal allergies or occasional reactions, manageable · 5 = Multiple food sensitivities + recurrent infections + autoimmune diagnosis',
    },
    {
      id: 'stress',
      prompt: 'How would you rate your average stress level over the past month?',
      context: '0 = Calm, well-managed, resilient · 3 = Manageable but constant background stress · 5 = Overwhelming, unmanaged stress affecting sleep, focus, and daily decisions',
    },
    {
      id: 'cognitive',
      prompt: 'How much do you notice cognitive issues (memory lapses, difficulty focusing, word-finding trouble, mental fatigue)?',
      context: '0 = Sharp, focused, fast recall · 3 = Occasional brain fog or forgetfulness · 5 = Daily noticeable cognitive issues affecting work or relationships',
    },
    {
      id: 'access-knowledge',
      prompt: 'How limited is your access to trustworthy, current health information when you need it?',
      context: '0 = I have great resources and know who to ask · 3 = I manage but often feel uncertain about sources · 5 = I rely on Google, feel confused, and don\'t know who to trust',
    },
    {
      id: 'access-care',
      prompt: 'How limited is your access to a primary care doctor or telemedicine relationship you can reach quickly?',
      context: '0 = I have a doctor I can reach within a week · 3 = I have a provider but access is slow or inconvenient · 5 = No PCP, no telemedicine relationship; ER is my fallback',
    },
    {
      id: 'financial-stress',
      prompt: 'How often do health-related costs (food, supplements, care) influence your health decisions?',
      context: '0 = Cost is rarely a factor in health decisions · 3 = I sometimes delay or downgrade care due to cost · 5 = I regularly skip or delay needed care because of cost',
    },
    {
      id: 'self-image',
      prompt: 'How much does dissatisfaction with your appearance affect your day-to-day confidence?',
      context: '0=I feel confident and satisfied with how I look. 3=neutral. 5=appearance-related dissatisfaction affects my social or professional life daily.',
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
      <p class="sub">Rate each area honestly. 0 = no problem at all · 5 = severe / highly problematic. Your answers auto-populate the audit in Stage 3 — you can adjust any score there.</p>
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
        Continue — Review Audit →
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
    top: 0;
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
