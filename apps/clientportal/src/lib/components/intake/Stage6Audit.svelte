<script lang="ts">
  /**
   * Stage 6 — Risk Factor Audit.
   * Wraps the 15-factor scoring system. Auto-prefills from Stages 2, 3, 4, 5.
   * Submitting sets `intake-complete-v1` and calls onComplete.
   */
  import { factors } from '../../content/factors';

  interface Props {
    onBack: () => void;
    onComplete: () => void;
  }
  let { onBack, onComplete }: Props = $props();

  // ── Read prior-stage data ────────────────────────────────────────────────
  function readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }

  interface GutState { score: number | null }
  interface AllergyState { score: number | null }
  interface CMState { completedAt?: string }

  const gutData = readJson<GutState>('gut-assessment-v1');
  const allergyData = readJson<AllergyState>('allergy-assessment-v1');
  const cmData = readJson<CMState>('connected-mind-v1');

  /** Map gut score (0-10) band → factor rating 1-5. High score = high risk = high number. */
  function gutBandToRating(score: number): number {
    if (score <= 2) return 4; // Low → 4-5
    if (score <= 5) return 3; // Moderate → 2-3
    return 1;                 // Elevated → 0-1 (use 1 as minimum)
  }

  /** Map allergy score (0-10) band → factor rating 1-5. */
  function allergyBandToRating(score: number): number {
    if (score <= 2) return 4;
    if (score <= 5) return 3;
    return 1;
  }

  // Factor IDs from factors.ts:
  // n:'00' = Allergies & immune reactivity
  // n:'01' = Mental health & mental wellness (Connected Mind)
  // n:'02' = Gut microbiome health
  const GUT_FACTOR_ID = '02';
  const ALLERGY_FACTOR_ID = '00';
  const COGNITION_FACTOR_ID = '01';

  type Prefilled = Record<string, { rating: number; reason: string }>;

  const prefilled: Prefilled = {};

  if (gutData?.score !== null && gutData?.score !== undefined) {
    prefilled[GUT_FACTOR_ID] = {
      rating: gutBandToRating(gutData.score),
      reason: `Auto-filled from gut assessment (score ${gutData.score}/10)`,
    };
  }

  if (allergyData?.score !== null && allergyData?.score !== undefined) {
    prefilled[ALLERGY_FACTOR_ID] = {
      rating: allergyBandToRating(allergyData.score),
      reason: `Auto-filled from allergy assessment (score ${allergyData.score}/10)`,
    };
  }

  if (cmData?.completedAt) {
    prefilled[COGNITION_FACTOR_ID] = {
      rating: 3,
      reason: 'Auto-filled from Connected Mind completion — review and adjust based on your report.',
    };
  }

  // ── Scores state ─────────────────────────────────────────────────────────
  const SCORES_KEY = 'intake-audit-scores-v1';

  function loadScores(): Record<string, number> {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      const saved = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      // Seed prefilled values where no saved value exists
      const merged: Record<string, number> = { ...saved };
      for (const [fId, pf] of Object.entries(prefilled)) {
        if (merged[fId] === undefined || merged[fId] === 0) {
          merged[fId] = pf.rating;
        }
      }
      return merged;
    } catch { return {}; }
  }

  function saveScores(s: Record<string, number>): void {
    try { localStorage.setItem(SCORES_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  let scores = $state<Record<string, number>>(loadScores());

  function setScore(fId: string, n: number): void {
    scores = { ...scores, [fId]: n };
    saveScores(scores);
  }

  const FACTOR_COUNT = factors.length;
  const scoredCount = $derived(Object.values(scores).filter(v => (v ?? 0) > 0).length);
  const allScored = $derived(scoredCount >= FACTOR_COUNT);

  function scoreColor(n: number): string {
    if (n <= 2) return '#1D9E75';
    if (n === 3) return '#D4920A';
    return '#E05C2A';
  }

  function submit(): void {
    // Persist audit scores to workbook-compatible factorScores key so
    // the weekly workbook picks them up automatically.
    try {
      const wbRaw = localStorage.getItem('workbook-local-workbook');
      if (wbRaw) {
        const wb = JSON.parse(wbRaw) as { factorScores?: Record<string, number> };
        wb.factorScores = { ...(wb.factorScores ?? {}), ...scores };
        localStorage.setItem('workbook-local-workbook', JSON.stringify(wb));
      }
    } catch { /* non-fatal */ }
    onComplete();
  }
</script>

<section class="stage6" aria-labelledby="s6-title">
  <div class="hero">
    <div class="badge">INTAKE — STAGE 6 OF 6</div>
    <h1 id="s6-title">Personal Risk Assessment</h1>
    <p class="sub">
      Score each of the {FACTOR_COUNT} factors honestly 1–5.
      High score = most opportunity for rapid improvement.
    </p>
  </div>

  {#if Object.keys(prefilled).length > 0}
    <div class="prefill-banner" role="status">
      <strong>We've prefilled some answers from your earlier responses.</strong>
      Review and adjust each before submitting — prefilled fields are highlighted.
    </div>
  {/if}

  <div class="factors-list">
    {#each factors as f (f.n)}
      {@const sc = scores[f.n] ?? 0}
      {@const isPrefilled = !!prefilled[f.n] && (scores[f.n] === prefilled[f.n]?.rating || scores[f.n] === undefined || scores[f.n] === 0)}
      <div class="factor-card" class:prefilled-card={isPrefilled} aria-label="Factor {f.n}: {f.name}">
        <div class="factor-header">
          <div class="factor-meta">
            {#if f.tag}
              <span class="factor-tag" style="color:{f.tc ?? '#9ba3b2'};border-color:{f.tc ?? '#9ba3b2'}44">{f.tag}</span>
            {/if}
            <span class="factor-name">{f.name}</span>
          </div>
          {#if isPrefilled}
            <span class="prefill-badge" title={prefilled[f.n]?.reason}>auto-filled</span>
          {/if}
        </div>
        {#if f.sub}
          <p class="factor-sub">{f.sub}</p>
        {/if}
        <div class="score-btns" role="group" aria-label="Score for {f.name}">
          {#each [1,2,3,4,5] as n}
            {@const active = sc === n}
            <button
              class="score-btn"
              class:score-active={active}
              style="--c:{scoreColor(n)}"
              onclick={() => setScore(f.n, n)}
              aria-pressed={active}
              aria-label="Score {n}"
            >{n}</button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="audit-progress">
    <span class="audit-count">{scoredCount} / {FACTOR_COUNT} factors scored</span>
    <div class="audit-bar-track" aria-hidden="true">
      <div class="audit-bar-fill" style="width:{Math.round((scoredCount / FACTOR_COUNT) * 100)}%"></div>
    </div>
  </div>

  <div class="nav-row">
    <button class="btn-back" onclick={onBack}>← Back</button>
    <button
      class="btn-complete"
      disabled={!allScored}
      onclick={submit}
    >
      Complete Intake & Unlock Program →
    </button>
  </div>
  {#if !allScored}
    <p class="gate-note">Score all {FACTOR_COUNT} factors to complete your intake.</p>
  {/if}
</section>

<style>
  .stage6 {
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

  .factors-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .factor-card {
    background: var(--card-bg, #161a26);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }

  .factor-card.prefilled-card {
    border-color: rgba(74,158,255,0.35);
    background: rgba(74,158,255,0.04);
  }

  .factor-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }

  .factor-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    flex-wrap: wrap;
  }

  .factor-tag {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid;
    border-radius: 4px;
    padding: 1px 6px;
    flex-shrink: 0;
  }

  .factor-name {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
    line-height: 1.4;
  }

  .prefill-badge {
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    font-weight: 700;
    text-transform: uppercase;
    color: #4a9eff;
    background: rgba(74,158,255,0.12);
    border: 1px solid rgba(74,158,255,0.3);
    border-radius: 4px;
    padding: 2px 7px;
    flex-shrink: 0;
    cursor: help;
  }

  .factor-sub {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.5;
    margin: 0;
  }

  .score-btns {
    display: flex;
    gap: 6px;
  }

  .score-btn {
    width: 40px;
    height: 40px;
    border: 1.5px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted, #9ba3b2);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, color 0.12s;
  }

  .score-btn:hover {
    border-color: var(--c);
    color: var(--c);
  }

  .score-btn.score-active {
    background: var(--c);
    border-color: var(--c);
    color: #fff;
  }

  .score-btn:focus-visible {
    outline: 2px solid var(--c);
    outline-offset: 2px;
  }

  .audit-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .audit-count {
    font-size: 0.8rem;
    color: var(--text-muted, #9ba3b2);
    font-weight: 600;
  }

  .audit-bar-track {
    height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 5px;
    overflow: hidden;
  }

  .audit-bar-fill {
    height: 100%;
    background: #1D9E75;
    border-radius: 5px;
    transition: width 0.3s ease;
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
    letter-spacing: 0.01em;
  }

  .btn-complete:hover:not(:disabled) { background: #17875F; }
  .btn-complete:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-complete:focus-visible { outline: 2px solid #1D9E75; outline-offset: 3px; }

  .gate-note {
    font-size: 0.78rem;
    color: var(--text-muted, #9ba3b2);
    text-align: right;
    margin: 0;
  }
</style>
