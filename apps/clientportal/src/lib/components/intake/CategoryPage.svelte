<script lang="ts">
  /**
   * CategoryPage — renders a single Discovery category's anchor + follow-up questions.
   * yes/no = two pill buttons; likert5 = 5-button row.
   * Emits onAnswered with the complete answer record for this category.
   */
  import type { CategoryDiscovery } from '../../data/discovery';

  interface Props {
    category: CategoryDiscovery;
    savedAnswers: Record<string, unknown>;
    onAnswered: (categoryId: string, answers: Record<string, unknown>) => void;
  }

  let { category, savedAnswers, onAnswered }: Props = $props();

  let answers = $state<Record<string, unknown>>({ ...savedAnswers });

  function anchorValue(): unknown {
    return answers[category.anchorKey];
  }

  function isAnchorProblem(): boolean {
    const v = anchorValue();
    const a = category.anchor;
    if (a.type === 'yesno') {
      return a.problemAnchor === 'yes' ? v === true : v === false;
    }
    if (a.type === 'likert5' && a.problemThreshold !== undefined) {
      const n = Number(v);
      if (!n) return false;
      return a.problemDirection === 'lte' ? n <= a.problemThreshold : n >= a.problemThreshold;
    }
    return false;
  }

  const showFollows = $derived(isAnchorProblem() || category.alwaysAsk);

  const anchorAnswered = $derived(anchorValue() !== undefined);
  const followsAnswered = $derived(
    !showFollows || category.follows.every(f => answers[f.id] !== undefined)
  );
  const canContinue = $derived(anchorAnswered && followsAnswered);

  function setAnchor(val: boolean | number): void {
    answers = { ...answers, [category.anchorKey]: val };
    onAnswered(category.id, answers);
  }

  function setFollow(id: string, val: boolean | number): void {
    answers = { ...answers, [id]: val };
    onAnswered(category.id, answers);
  }

  const LIKERT_LABELS = ['1', '2', '3', '4', '5'];
</script>

<div class="cat-page">
  <div class="cat-label">{category.label}</div>

  <!-- Anchor question -->
  <div class="question-block">
    <p class="question-text">{category.anchor.text}</p>
    {#if category.anchor.type === 'yesno'}
      <div class="pill-row" role="group" aria-label={category.anchor.text}>
        <button
          class="pill"
          class:pill-active={anchorValue() === true}
          onclick={() => setAnchor(true)}
          aria-pressed={anchorValue() === true}
        >Yes</button>
        <button
          class="pill"
          class:pill-active={anchorValue() === false}
          onclick={() => setAnchor(false)}
          aria-pressed={anchorValue() === false}
        >No</button>
      </div>
    {:else}
      <div class="likert-row" role="group" aria-label={category.anchor.text}>
        {#each LIKERT_LABELS as label, i}
          <button
            class="likert-btn"
            class:likert-active={anchorValue() === i + 1}
            onclick={() => setAnchor(i + 1)}
            aria-pressed={anchorValue() === i + 1}
            aria-label={`${i + 1} of 5`}
          >{label}</button>
        {/each}
      </div>
      <div class="likert-scale-labels" aria-hidden="true">
        <span>Low / Never</span>
        <span>High / Always</span>
      </div>
    {/if}
  </div>

  <!-- Follow-up questions -->
  {#if showFollows && category.follows.length > 0}
    <div class="follows">
      {#each category.follows as follow}
        <div class="question-block follow-block">
          <p class="question-text follow-text">{follow.text}</p>
          {#if follow.type === 'yesno'}
            <div class="pill-row" role="group" aria-label={follow.text}>
              <button
                class="pill pill-sm"
                class:pill-active={answers[follow.id] === true}
                onclick={() => setFollow(follow.id, true)}
                aria-pressed={answers[follow.id] === true}
              >Yes</button>
              <button
                class="pill pill-sm"
                class:pill-active={answers[follow.id] === false}
                onclick={() => setFollow(follow.id, false)}
                aria-pressed={answers[follow.id] === false}
              >No</button>
            </div>
          {:else}
            <div class="likert-row" role="group" aria-label={follow.text}>
              {#each LIKERT_LABELS as label, i}
                <button
                  class="likert-btn"
                  class:likert-active={answers[follow.id] === i + 1}
                  onclick={() => setFollow(follow.id, i + 1)}
                  aria-pressed={answers[follow.id] === i + 1}
                  aria-label={`${i + 1} of 5`}
                >{label}</button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if !canContinue}
    <p class="gate-hint">Answer all questions above to continue.</p>
  {/if}
</div>

<style>
  .cat-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .cat-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4a9eff;
  }

  .question-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .question-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
    line-height: 1.55;
    margin: 0;
  }

  .follow-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-muted, #9ba3b2);
  }

  .pill-row {
    display: flex;
    gap: 10px;
  }

  .pill {
    padding: 10px 28px;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 50px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.92rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    font-family: inherit;
  }

  .pill:hover {
    border-color: #1D9E75;
    color: var(--text, #e8eaf0);
  }

  .pill.pill-active {
    border-color: #1D9E75;
    background: rgba(29,158,117,0.15);
    color: #1D9E75;
    font-weight: 700;
  }

  .pill.pill-sm {
    padding: 7px 20px;
    font-size: 0.85rem;
  }

  .likert-row {
    display: flex;
    gap: 8px;
  }

  .likert-btn {
    flex: 1;
    padding: 10px 4px;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    font-family: inherit;
  }

  .likert-btn:hover {
    border-color: #1D9E75;
    color: var(--text, #e8eaf0);
  }

  .likert-btn.likert-active {
    border-color: #1D9E75;
    background: rgba(29,158,117,0.15);
    color: #1D9E75;
    font-weight: 700;
  }

  .likert-scale-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--text-muted, #9ba3b2);
    padding: 0 2px;
  }

  .follows {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.07);
  }

  .follow-block {
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .follow-block:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .gate-hint {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    margin: 0;
    text-align: center;
  }
</style>
