<script lang="ts">
  import type { IntakeSection, IntakeAnswer, IntakeQuestion } from '../../data/intake';

  interface Props {
    sections: IntakeSection[];
    userId: string;
    onComplete: (answers: IntakeAnswer[]) => void;
  }
  let { sections, userId, onComplete }: Props = $props();

  // ── State ──────────────────────────────────────────────────────────────────
  // Storage key derived from userId prop.
  const storageKey = $derived(`4m:intake:${userId}`);

  // Load saved answers from localStorage
  function loadSaved(key: string): Record<string, IntakeAnswer['value']> {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Record<string, IntakeAnswer['value']>) : {};
    } catch {
      return {};
    }
  }

  let answers = $state<Record<string, IntakeAnswer['value']>>(loadSaved(storageKey));
  let currentSectionIdx = $state(0);

  // ── Derived ────────────────────────────────────────────────────────────────

  /** Sex value from s1_sex for hormone section skipping */
  const sexAnswer = $derived(answers['s1_sex'] as string | undefined);

  /** Filter questions in a section based on sex answer */
  function visibleQuestions(section: IntakeSection): IntakeQuestion[] {
    return section.questions.filter(q => {
      // Skip male-specific hormone questions for female respondents
      if (q.id.startsWith('s6m_') && sexAnswer === 'female') return false;
      // Skip female-specific hormone questions for male respondents
      if (q.id.startsWith('s6f_') && sexAnswer === 'male') return false;
      return true;
    });
  }

  const currentSection = $derived(sections[currentSectionIdx]!);
  const questionsInSection = $derived(visibleQuestions(currentSection));

  // Total question count across all sections (respecting sex filter, but sex unknown at start so approximate)
  const totalQuestions = $derived(
    sections.reduce((sum, s) => sum + visibleQuestions(s).length, 0)
  );
  const questionsBeforeCurrentSection = $derived(
    sections.slice(0, currentSectionIdx).reduce((sum, s) => sum + visibleQuestions(s).length, 0)
  );
  const answeredTotal = $derived(Object.keys(answers).length);

  // ── Persistence ───────────────────────────────────────────────────────────
  function saveAnswers(): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // quota exceeded — silent
    }
  }

  // ── Answer setters ────────────────────────────────────────────────────────
  function setAnswer(qId: string, value: IntakeAnswer['value']): void {
    answers[qId] = value;
    saveAnswers();
  }

  function toggleMulti(qId: string, option: string): void {
    const current = (answers[qId] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option];
    answers[qId] = next;
    saveAnswers();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function nextSection(): void {
    if (currentSectionIdx < sections.length - 1) {
      currentSectionIdx += 1;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      submitIntake();
    }
  }

  function prevSection(): void {
    if (currentSectionIdx > 0) {
      currentSectionIdx -= 1;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function submitIntake(): void {
    const result: IntakeAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    onComplete(result);
  }

  // ── Section completeness check (soft — not blocking) ─────────────────────
  function sectionAnswered(): boolean {
    return questionsInSection.every(q => {
      if (q.type === 'text') return true; // optional
      return answers[q.id] !== undefined && answers[q.id] !== '';
    });
  }
</script>

<section class="intake" aria-labelledby="intake-section-title">

  <!-- Progress bar -->
  <div class="progress-header" role="status" aria-live="polite" aria-atomic="true">
    <div class="progress-label">
      Section {currentSectionIdx + 1} of {sections.length}
      &nbsp;·&nbsp;
      {answeredTotal}/{totalQuestions} questions answered
    </div>
    <div class="progress-track" aria-hidden="true">
      <div
        class="progress-fill"
        style="width: {Math.round((answeredTotal / Math.max(totalQuestions, 1)) * 100)}%"
      ></div>
    </div>
  </div>

  <!-- Section header -->
  <div class="section-header">
    <h2 id="intake-section-title" class="section-title">{currentSection.title}</h2>
    {#if currentSection.subtitle}
      <p class="section-subtitle">{currentSection.subtitle}</p>
    {/if}
  </div>

  <!-- Questions -->
  <div class="questions" role="list">
    {#each questionsInSection as q (q.id)}
      <div class="question-item" role="listitem">

        {#if q.type === 'severity'}
          <fieldset class="q-fieldset">
            <legend class="q-prompt">{q.prompt}</legend>
            {#if q.helpText}
              <p class="q-help">{q.helpText}</p>
            {/if}
            <div class="severity-buttons" role="group" aria-label="Score 0 to 3">
              {#each [0, 1, 2, 3] as score}
                <button
                  class="sev-btn"
                  class:sev-selected={answers[q.id] === score}
                  aria-pressed={answers[q.id] === score}
                  onclick={() => setAnswer(q.id, score)}
                  title={score === 0 ? 'Never' : score === 1 ? 'Mild / occasional' : score === 2 ? 'Moderate / frequent' : 'Severe / daily'}
                >
                  {score}
                </button>
              {/each}
            </div>
            <div class="severity-legend" aria-hidden="true">
              <span>0 = Never</span><span>3 = Daily/severe</span>
            </div>
          </fieldset>

        {:else if q.type === 'yesno'}
          <fieldset class="q-fieldset">
            <legend class="q-prompt">{q.prompt}</legend>
            {#if q.helpText}
              <p class="q-help">{q.helpText}</p>
            {/if}
            <div class="yesno-buttons" role="group">
              {#each [{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as opt}
                <button
                  class="yn-btn"
                  class:yn-selected={answers[q.id] === opt.val}
                  aria-pressed={answers[q.id] === opt.val}
                  onclick={() => setAnswer(q.id, opt.val)}
                >
                  {opt.label}
                </button>
              {/each}
            </div>
          </fieldset>

        {:else if q.type === 'multiselect'}
          <fieldset class="q-fieldset">
            <legend class="q-prompt">{q.prompt}</legend>
            <div class="multi-options">
              {#each q.options as opt}
                {@const selected = ((answers[q.id] as string[] | undefined) ?? []).includes(opt.value)}
                <label class="multi-option" class:multi-selected={selected}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onchange={() => toggleMulti(q.id, opt.value)}
                    aria-label={opt.label}
                  />
                  <span>{opt.label}</span>
                </label>
              {/each}
            </div>
          </fieldset>

        {:else if q.type === 'singleselect'}
          <fieldset class="q-fieldset">
            <legend class="q-prompt">{q.prompt}</legend>
            <div class="single-options">
              {#each q.options as opt}
                <label class="single-option" class:single-selected={answers[q.id] === opt.value}>
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.value}
                    checked={answers[q.id] === opt.value}
                    onchange={() => setAnswer(q.id, opt.value)}
                    aria-label={opt.label}
                  />
                  <span>{opt.label}</span>
                </label>
              {/each}
            </div>
          </fieldset>

        {:else if q.type === 'number'}
          <div class="q-field">
            <label class="q-label" for={`q-${q.id}`}>{q.prompt}</label>
            {#if 'helpText' in q && q.helpText}
              <p class="q-help">{q.helpText}</p>
            {/if}
            <div class="number-wrap">
              <input
                id={`q-${q.id}`}
                type="number"
                class="q-number"
                min={q.min}
                max={q.max}
                value={(answers[q.id] as number | undefined) ?? ''}
                oninput={(e) => {
                  const v = (e.currentTarget as HTMLInputElement).valueAsNumber;
                  if (!isNaN(v)) setAnswer(q.id, v);
                }}
                aria-describedby={q.unit ? `unit-${q.id}` : undefined}
              />
              {#if q.unit}
                <span class="q-unit" id={`unit-${q.id}`}>{q.unit}</span>
              {/if}
            </div>
          </div>

        {:else if q.type === 'text'}
          <div class="q-field">
            <label class="q-label" for={`q-${q.id}`}>{q.prompt}</label>
            {#if 'helpText' in q && q.helpText}
              <p class="q-help">{q.helpText}</p>
            {/if}
            <textarea
              id={`q-${q.id}`}
              class="q-textarea"
              rows="3"
              value={(answers[q.id] as string | undefined) ?? ''}
              oninput={(e) => setAnswer(q.id, (e.currentTarget as HTMLTextAreaElement).value)}
              placeholder="Optional"
            ></textarea>
          </div>
        {/if}

      </div>
    {/each}
  </div>

  <!-- Section navigation -->
  <div class="nav-row">
    {#if currentSectionIdx > 0}
      <button class="btn-back" onclick={prevSection}>← Back</button>
    {:else}
      <span></span>
    {/if}

    <button
      class="btn-next"
      onclick={nextSection}
    >
      {currentSectionIdx < sections.length - 1 ? 'Next section →' : 'See my results →'}
    </button>
  </div>

  {#if !sectionAnswered()}
    <p class="skip-note" aria-live="polite">
      Some questions in this section are unanswered — you can continue anyway.
    </p>
  {/if}

</section>

<style>
  .intake {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Progress */
  .progress-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progress-label {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    letter-spacing: 0.04em;
  }

  .progress-track {
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent, #4a9eff);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  /* Section header */
  .section-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .section-subtitle {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.88rem;
    margin: 0;
    line-height: 1.5;
  }

  /* Questions */
  .questions {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .question-item {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 10px;
    padding: 20px;
  }

  .q-fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  .q-prompt,
  .q-label {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
    margin-bottom: 10px;
    line-height: 1.5;
  }

  .q-help {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
    margin: 0 0 12px;
    line-height: 1.5;
  }

  /* Severity */
  .severity-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sev-btn {
    width: 48px;
    height: 48px;
    border: 2px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .sev-btn:hover {
    border-color: var(--accent, #4a9eff);
    color: var(--text, #e8eaf0);
  }

  .sev-btn.sev-selected {
    border-color: var(--accent, #4a9eff);
    background: rgba(74, 158, 255, 0.15);
    color: var(--accent, #4a9eff);
  }

  .sev-btn:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 2px;
  }

  .severity-legend {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    color: var(--text-muted, #9ba3b2);
    margin-top: 6px;
  }

  /* Yes/No */
  .yesno-buttons {
    display: flex;
    gap: 10px;
  }

  .yn-btn {
    flex: 1;
    padding: 10px;
    border: 2px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .yn-btn:hover {
    border-color: var(--accent, #4a9eff);
    color: var(--text, #e8eaf0);
  }

  .yn-btn.yn-selected {
    border-color: var(--accent, #4a9eff);
    background: rgba(74, 158, 255, 0.15);
    color: var(--accent, #4a9eff);
  }

  .yn-btn:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 2px;
  }

  /* Multi/Single select */
  .multi-options,
  .single-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .multi-option,
  .single-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-muted, #9ba3b2);
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }

  .multi-option:hover,
  .single-option:hover {
    border-color: var(--accent, #4a9eff);
    color: var(--text, #e8eaf0);
  }

  .multi-option.multi-selected,
  .single-option.single-selected {
    border-color: var(--accent, #4a9eff);
    background: rgba(74, 158, 255, 0.1);
    color: var(--text, #e8eaf0);
  }

  .multi-option input,
  .single-option input {
    accent-color: var(--accent, #4a9eff);
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Number */
  .q-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .number-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .q-number {
    width: 120px;
    padding: 8px 12px;
    background: var(--input-bg, rgba(255,255,255,0.05));
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 6px;
    color: var(--text, #e8eaf0);
    font-size: 0.95rem;
  }

  .q-number:focus {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 1px;
  }

  .q-unit {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
  }

  /* Textarea */
  .q-textarea {
    padding: 10px 14px;
    background: var(--input-bg, rgba(255,255,255,0.05));
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 6px;
    color: var(--text, #e8eaf0);
    font-size: 0.9rem;
    resize: vertical;
    line-height: 1.5;
    font-family: inherit;
  }

  .q-textarea:focus {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 1px;
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
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    color: var(--text-muted, #9ba3b2);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-back:hover {
    border-color: var(--accent, #4a9eff);
    color: var(--text, #e8eaf0);
  }

  .btn-back:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 2px;
  }

  .btn-next {
    background: var(--accent, #4a9eff);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-next:hover {
    background: #3a8fe8;
  }

  .btn-next:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 3px;
  }

  .skip-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: center;
    margin: 0;
  }
</style>
