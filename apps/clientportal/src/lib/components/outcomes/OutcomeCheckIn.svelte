<script lang="ts">
  import type { OutcomeDomainKey } from '../../data/schema';
  import { getDomainsForProtocols, type OutcomeDomainMeta } from '../../content/outcomeQuestions';
  import { createOutcome } from '../../api/operations.js';
  import type { ProgramMonth } from '../../api/generated.js';

  interface Props {
    activeProductSlugs: string[];
    currentMonth: 1 | 2 | 3 | 4 | 'maintenance';
    currentWeek: number;
    weekISO: string;
    onSubmitted?: () => void;
  }

  let { activeProductSlugs, currentMonth, currentWeek, weekISO, onSubmitted }: Props = $props();

  const domains: OutcomeDomainMeta[] = $derived(getDomainsForProtocols(activeProductSlugs));

  let scores = $state<Partial<Record<OutcomeDomainKey, number>>>({});
  let freeText = $state('');
  let submitted = $state(false);
  let submitError = $state<string | null>(null);

  async function handleSubmit(): Promise<void> {
    submitError = null;
    // Map month to API ProgramMonth enum value
    const monthMap: Record<string | number, ProgramMonth> = {
      1: 'M1', 2: 'M2', 3: 'M3', 4: 'M4', maintenance: 'MAINTENANCE',
    };
    const month = monthMap[currentMonth] ?? 'M1';
    const scoreEntries = Object.entries(scores).map(([domain, score]) => ({
      domain,
      score: score ?? 0,
    }));
    try {
      await createOutcome({
        weekISO,
        month,
        week: currentWeek,
        scores: scoreEntries,
        freeText: freeText.trim() || undefined,
      });
      submitted = true;
      onSubmitted?.();
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Failed to save check-in. Try again.';
    }
  }

  function scoreFor(key: OutcomeDomainKey): number {
    return scores[key] ?? 5;
  }
</script>

<div class="checkin-card">
  <div class="checkin-header">
    <span class="checkin-badge">Week {currentWeek} · Month {currentMonth}</span>
    <h2 class="checkin-title">How are you feeling this week?</h2>
    <p class="checkin-sub">Honest numbers help us calibrate your protocol. Takes about 90 seconds.</p>
  </div>

  {#if submitted}
    <div class="checkin-thanks">
      <div class="thanks-icon">✓</div>
      <p>Logged. Keep going — consistency is the data.</p>
    </div>
  {:else}
    <form class="checkin-form" onsubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
      {#if submitError}<p class="submit-error">{submitError}</p>{/if}
      {#each domains as domain (domain.key)}
        <div class="slider-row">
          <div class="slider-label-row">
            <span class="slider-name">{domain.label}</span>
            <span class="slider-value">{scoreFor(domain.key)}/10</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={scoreFor(domain.key)}
            oninput={(e) => { scores[domain.key] = Number((e.target as HTMLInputElement).value); }}
            class="slider"
            aria-label={domain.label}
          />
          <div class="slider-ends">
            <span>{domain.lowLabel}</span>
            <span>{domain.highLabel}</span>
          </div>
        </div>
      {/each}

      <div class="freetext-row">
        <label class="freetext-label" for="outcome-freetext">Anything else worth noting?</label>
        <textarea
          id="outcome-freetext"
          class="freetext-input"
          rows="3"
          placeholder="Side effects, wins, patterns you noticed..."
          bind:value={freeText}
        ></textarea>
      </div>

      <button type="submit" class="submit-btn">Submit check-in</button>
    </form>
  {/if}
</div>

<style>
  .checkin-card {
    background: #1a1f2b;
    border: 1px solid rgba(74, 158, 255, 0.15);
    border-radius: 12px;
    padding: 28px 24px;
    max-width: 540px;
  }

  .checkin-badge {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #4a9eff;
    text-transform: uppercase;
  }

  .checkin-title {
    margin: 8px 0 4px;
    font-size: 1.15rem;
    font-weight: 700;
    color: #e8ecf4;
  }

  .checkin-sub {
    margin: 0 0 24px;
    font-size: 0.85rem;
    color: #7a8394;
  }

  .checkin-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .slider-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .slider-label-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .slider-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: #c8d0e0;
  }

  .slider-value {
    font-size: 0.8rem;
    font-weight: 700;
    color: #4a9eff;
    min-width: 36px;
    text-align: right;
  }

  .slider {
    width: 100%;
    accent-color: #4a9eff;
    cursor: pointer;
  }

  .slider-ends {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    color: #565e70;
  }

  .freetext-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #c8d0e0;
    margin-bottom: 6px;
  }

  .freetext-input {
    width: 100%;
    background: #131720;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: #e8ecf4;
    padding: 10px 12px;
    font-size: 0.88rem;
    resize: vertical;
    box-sizing: border-box;
  }

  .freetext-input::placeholder {
    color: #4a5060;
  }

  .submit-btn {
    align-self: flex-start;
    background: #4a9eff;
    color: #0d1117;
    border: none;
    border-radius: 8px;
    padding: 10px 22px;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .submit-btn:hover { background: #6ab4ff; }

  .submit-error {
    color: #ff6060;
    font-size: 0.84rem;
    margin: 0 0 8px;
  }

  .checkin-thanks {
    text-align: center;
    padding: 32px 0;
    color: #7a8394;
  }

  .thanks-icon {
    font-size: 2rem;
    color: #4a9eff;
    margin-bottom: 10px;
  }
</style>
