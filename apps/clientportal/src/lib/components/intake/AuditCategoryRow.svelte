<script lang="ts">
  /**
   * AuditCategoryRow — single row card for the 20-category risk audit.
   * Score bar band-colored: 0–3 green, 4–6 amber, 7–10 red.
   * Priority star badge when isTop3. +/- buttons to adjust score (0–10).
   */
  interface Props {
    index: number;
    label: string;
    score: number;
    isTop3: boolean;
    onScoreChange: (delta: number) => void;
  }

  let { index, label, score, isTop3, onScoreChange }: Props = $props();

  function bandColor(s: number): string {
    if (s <= 3) return '#1D9E75';
    if (s <= 6) return '#D4920A';
    return '#E05C2A';
  }

  function bandLabel(s: number): string {
    if (s <= 3) return 'Low';
    if (s <= 6) return 'Moderate';
    return 'Elevated';
  }

  const color = $derived(bandColor(score));
  const band = $derived(bandLabel(score));
  const barWidth = $derived(Math.round((score / 10) * 100));
</script>

<div class="row-card" class:row-top3={isTop3} aria-label="Category {index}: {label}, score {score}">
  <div class="row-header">
    <div class="row-meta">
      <span class="num-badge" style="background:{color}22;color:{color};border-color:{color}44">{String(index).padStart(2, '0')}</span>
      <span class="row-label">{label}</span>
    </div>
    <div class="row-right">
      {#if isTop3}
        <span class="star-badge" title="Top 3 priority">★ Priority</span>
      {/if}
      <span class="band-label" style="color:{color}">{band}</span>
    </div>
  </div>

  <div class="bar-track" aria-hidden="true">
    <div class="bar-fill" style="width:{barWidth}%;background:{color}"></div>
  </div>

  <div class="score-row">
    <div class="adj-btns" role="group" aria-label="Adjust score for {label}">
      <button
        class="adj-btn"
        onclick={() => onScoreChange(-1)}
        disabled={score <= 0}
        aria-label="Decrease score"
      >−</button>
      <span class="score-value" style="color:{color}">{score}</span>
      <button
        class="adj-btn"
        onclick={() => onScoreChange(1)}
        disabled={score >= 10}
        aria-label="Increase score"
      >+</button>
    </div>
    <span class="score-denom">/10</span>
  </div>
</div>

<style>
  .row-card {
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.15s;
  }

  .row-card.row-top3 {
    border-color: rgba(212,146,10,0.4);
    background: rgba(212,146,10,0.04);
  }

  .row-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .row-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .num-badge {
    font-size: 0.68rem;
    font-weight: 700;
    border: 1px solid;
    border-radius: 5px;
    padding: 2px 7px;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .row-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .star-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #D4920A;
    background: rgba(212,146,10,0.12);
    border: 1px solid rgba(212,146,10,0.3);
    border-radius: 4px;
    padding: 2px 7px;
  }

  .band-label {
    font-size: 0.75rem;
    font-weight: 700;
  }

  .bar-track {
    height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 5px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.25s ease, background 0.25s;
  }

  .score-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .adj-btns {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .adj-btn {
    width: 30px;
    height: 30px;
    border: 1.5px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.12s, color 0.12s;
    line-height: 1;
  }

  .adj-btn:hover:not(:disabled) {
    border-color: #1D9E75;
    color: #1D9E75;
  }

  .adj-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .score-value {
    font-size: 1.1rem;
    font-weight: 800;
    min-width: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .score-denom {
    font-size: 0.75rem;
    color: var(--text-muted, #9ba3b2);
  }
</style>
