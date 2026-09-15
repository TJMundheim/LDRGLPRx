<script lang="ts">
  import { onMount } from 'svelte';
  import type { WeeklyOutcome, OutcomeDomainKey } from '../../data/schema';
  import { getDomainsForProtocols } from '../../content/outcomeQuestions';
  import { listMyOutcomes } from '../../api/operations.js';
  import OutcomeCheckIn from './OutcomeCheckIn.svelte';
  import OutcomeTrendChart from './OutcomeTrendChart.svelte';

  interface Props {
    activeProductSlugs: string[];
    currentMonth: 1 | 2 | 3 | 4 | 'maintenance';
    currentWeek: number;
  }

  let { activeProductSlugs, currentMonth, currentWeek }: Props = $props();

  function currentWeekISO(): string {
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const week = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  const weekISO = currentWeekISO();

  let outcomes = $state<WeeklyOutcome[]>([]);
  let loadingOutcomes = $state(true);

  const submittedThisWeek = $derived(
    outcomes.some(o => o.weekISO === weekISO)
  );

  onMount(async () => {
    try {
      const result = await listMyOutcomes(100);
      // Map API Outcome shape to local WeeklyOutcome shape
      outcomes = (result.listMyOutcomes?.items ?? []).map((o) => ({
        weekISO: o.weekISO,
        month: mapMonth(o.month),
        week: o.week,
        scores: Object.fromEntries((o.scores ?? []).map((s) => [s.domain, s.score])) as Partial<Record<OutcomeDomainKey, number>>,
        freeText: o.freeText ?? undefined,
        submittedAt: typeof o.submittedAt === 'number' ? o.submittedAt : Date.parse(o.submittedAt as unknown as string),
      }));
    } catch {
      // API unavailable — start with empty list; user can still submit
    } finally {
      loadingOutcomes = false;
    }
  });

  function mapMonth(m: string): 1 | 2 | 3 | 4 | 'maintenance' {
    const map: Record<string, 1 | 2 | 3 | 4 | 'maintenance'> = {
      M1: 1, M2: 2, M3: 3, M4: 4, MAINTENANCE: 'maintenance',
    };
    return map[m] ?? 1;
  }

  function handleOutcomeSubmitted(): void {
    // Re-fetch outcomes after a new one is submitted
    void listMyOutcomes(100).then((result) => {
      outcomes = (result.listMyOutcomes?.items ?? []).map((o) => ({
        weekISO: o.weekISO,
        month: mapMonth(o.month),
        week: o.week,
        scores: Object.fromEntries((o.scores ?? []).map((s) => [s.domain, s.score])) as Partial<Record<OutcomeDomainKey, number>>,
        freeText: o.freeText ?? undefined,
        submittedAt: typeof o.submittedAt === 'number' ? o.submittedAt : Date.parse(o.submittedAt as unknown as string),
      }));
    }).catch(() => {
      // ignore
    });
    forceShow = false;
  }

  const domains = $derived(getDomainsForProtocols(activeProductSlugs));

  // Days until next Sunday (start of next ISO week)
  function daysUntilNextCheckin(): number {
    const now = new Date();
    return 7 - now.getDay() || 7;
  }

  let forceShow = $state(false);
</script>

<div class="outcome-panel">
  <div class="panel-header">
    <h2 class="panel-title">Weekly Check-In</h2>
    {#if submittedThisWeek && !forceShow}
      <span class="status-pill done">Done this week</span>
    {:else}
      <span class="status-pill due">Due</span>
    {/if}
  </div>

  {#if !submittedThisWeek || forceShow}
    <OutcomeCheckIn
      {activeProductSlugs}
      {currentMonth}
      {currentWeek}
      {weekISO}
      onSubmitted={handleOutcomeSubmitted}
    />
  {:else}
    <p class="next-checkin">Next check-in in {daysUntilNextCheckin()} day{daysUntilNextCheckin() === 1 ? '' : 's'}.</p>

    {#if outcomes.length >= 2}
      <div class="charts-grid">
        {#each domains as domain (domain.key)}
          <OutcomeTrendChart
            {outcomes}
            domainKey={domain.key as OutcomeDomainKey}
          />
        {/each}
      </div>
    {:else}
      <p class="chart-hint">Trend charts appear after two or more check-ins.</p>
    {/if}

    <button class="reopen-btn" onclick={() => { forceShow = true; }}>
      Edit this week's check-in
    </button>
  {/if}
</div>

<style>
  .outcome-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 600px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .panel-title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--mc-ink);
  }

  .status-pill {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 3px 9px;
    border-radius: 20px;
    text-transform: uppercase;
  }

  .status-pill.done {
    background: var(--mc-good-tint);
    color: var(--mc-good);
  }

  .status-pill.due {
    background: var(--mc-info-tint);
    color: var(--mc-info);
  }

  .next-checkin {
    margin: 0;
    font-size: 0.85rem;
    color: var(--mc-muted);
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
  }

  .chart-hint {
    margin: 0;
    font-size: 0.82rem;
    color: var(--mc-faint);
  }

  .reopen-btn {
    align-self: flex-start;
    background: transparent;
    border: 1px solid var(--mc-line);
    border-radius: 6px;
    color: var(--mc-muted);
    font-size: 0.8rem;
    padding: 6px 14px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .reopen-btn:hover {
    border-color: var(--mc-info);
    color: var(--mc-info);
  }
</style>
