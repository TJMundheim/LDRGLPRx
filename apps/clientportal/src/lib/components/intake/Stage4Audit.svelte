<script lang="ts">
  /**
   * Stage 3 — 20-category Risk Factor Audit Review.
   * Reads audit-v1.scores (pre-populated by Stage2Likert; 0-10 scale per category, 0-200 total).
   * User can adjust any score +/- before submitting.
   * Shows Top-3 Priorities panel and 20 AuditCategoryRow cards.
   */
  import AuditCategoryRow from './AuditCategoryRow.svelte';
  import { AUDIT_CATEGORIES } from '../../data/audit';
  import { selectTop3 } from '../../data/selectTop3';
  import type { ScoredCategory } from '../../data/selectTop3';

  interface Props {
    onBack: () => void;
    onComplete: () => void;
  }
  let { onBack, onComplete }: Props = $props();

  const AUDIT_KEY = 'audit-v1';

  function readJson<T>(key: string): T | null {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : null; } catch { return null; }
  }

  function loadScores(): Record<string, number> {
    const saved = readJson<{ scores: Record<string, number> }>(AUDIT_KEY);
    const result: Record<string, number> = {};
    for (const cat of AUDIT_CATEGORIES) {
      result[cat.id] = saved?.scores?.[cat.id] ?? 0;
    }
    return result;
  }

  function saveScores(s: Record<string, number>): void {
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify({ scores: s, savedAt: new Date().toISOString() })); } catch { /* ignore */ }
  }

  let scores = $state<Record<string, number>>(loadScores());

  const scoredCategories = $derived(
    AUDIT_CATEGORIES.map(cat => ({
      id: cat.id,
      score: scores[cat.id] ?? 0,
      priorityTier: cat.priorityTier,
    } satisfies ScoredCategory))
  );

  const top3Ids = $derived(selectTop3(scoredCategories));

  function adjustScore(id: string, delta: number): void {
    const current = scores[id] ?? 0;
    const next = Math.max(0, Math.min(10, current + delta));
    scores = { ...scores, [id]: next };
    saveScores(scores);
  }

  function submit(): void {
    try {
      localStorage.setItem('intake-complete-v1', JSON.stringify({ completedAt: new Date().toISOString() }));
      // Sync to workbook factorScores for backward compat
      const wbRaw = localStorage.getItem('workbook-local-workbook');
      if (wbRaw) {
        const wb = JSON.parse(wbRaw) as { factorScores?: Record<string, number> };
        wb.factorScores = { ...(wb.factorScores ?? {}), ...scores };
        localStorage.setItem('workbook-local-workbook', JSON.stringify(wb));
      }
    } catch { /* non-fatal */ }
    onComplete();
  }

  function top3Labels(): { id: string; label: string; score: number }[] {
    return top3Ids.map(id => {
      const cat = AUDIT_CATEGORIES.find(c => c.id === id);
      return { id, label: cat?.label ?? id, score: scores[id] ?? 0 };
    });
  }
</script>

<section class="stage4" aria-labelledby="s4-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 3 OF 3</div>
    <h1 id="s4-title">Risk Factor Audit</h1>
    <p class="sub">Review your 20-area health snapshot. Adjust any score, then unlock your program.</p>
  </div>

  <div class="prefill-banner" role="status">
    <strong>Your audit was auto-populated from your self-assessment.</strong>
    Adjust any score before finalizing — you know your body best.
  </div>

  <!-- Top 3 priorities panel -->
  {#if top3Ids.length > 0}
    <div class="top3-panel" aria-label="Top 3 priorities">
      <div class="top3-heading">Your Top 3 Priorities</div>
      <div class="top3-list">
        {#each top3Labels() as item, i}
          <div class="top3-item">
            <span class="top3-rank">#{i + 1}</span>
            <span class="top3-label">{item.label}</span>
            <span class="top3-score" style="color:{item.score >= 7 ? '#E05C2A' : item.score >= 4 ? '#D4920A' : '#1D9E75'}">{item.score}/10</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 20 category rows -->
  <div class="rows-list">
    {#each AUDIT_CATEGORIES as cat, i (cat.id)}
      <AuditCategoryRow
        index={i + 1}
        label={cat.label}
        score={scores[cat.id] ?? 0}
        isTop3={top3Ids.includes(cat.id)}
        onScoreChange={(delta) => adjustScore(cat.id, delta)}
      />
    {/each}
  </div>

  <div class="nav-row">
    <button class="btn-back" onclick={onBack}>← Back</button>
    <button class="btn-complete" onclick={submit}>
      Complete Intake & Unlock Program →
    </button>
  </div>
</section>

<style>
  .stage4 {
    max-width: 680px;
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

  .prefill-banner {
    background: rgba(74,158,255,0.08);
    border: 1px solid rgba(74,158,255,0.3);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 0.85rem;
    color: #a8c8f0;
    line-height: 1.5;
  }

  .prefill-banner strong { color: #4a9eff; }

  .top3-panel {
    background: rgba(212,146,10,0.07);
    border: 1px solid rgba(212,146,10,0.35);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .top3-heading {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #D4920A;
  }

  .top3-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .top3-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .top3-rank {
    font-size: 0.8rem;
    font-weight: 700;
    color: #D4920A;
    min-width: 24px;
  }

  .top3-label {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
  }

  .top3-score {
    font-size: 0.82rem;
    font-weight: 700;
  }

  .rows-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
    font-family: inherit;
  }

  .btn-back:hover { border-color: #4a9eff; color: var(--text, #e8eaf0); }

  .btn-complete {
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
  }

  .btn-complete:hover { background: #17875F; }
  .btn-complete:focus-visible { outline: 2px solid #1D9E75; outline-offset: 3px; }
</style>
