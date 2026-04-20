<script lang="ts">
  interface Props {
    patientId: string;
  }

  let { patientId }: Props = $props();

  // Mock lookup — replace with server-side fetch once backend is live.
  interface PatientSummary {
    label: string;
    tier: string;
    currentMonth: number;
    currentWeek: number;
    protocols: string[];
    outcomeScores: { week: number; score: number }[];
    intakeSummary: string;
    nextCheckIn: string;
  }

  function mockLookup(id: string): PatientSummary {
    // De-identified label derived from id suffix only.
    const suffix = id.slice(-4).toUpperCase();
    return {
      label: `Patient #${suffix} · M1W3`,
      tier: 'Performance',
      currentMonth: 1,
      currentWeek: 3,
      protocols: ['sleep-optimisation', 'cold-exposure-b', 'hrt-cycle-1'],
      outcomeScores: [
        { week: 1, score: 6 },
        { week: 2, score: 7 },
        { week: 3, score: 7 },
      ],
      intakeSummary:
        'Patient presented with moderate sleep disruption, elevated resting HR, and sub-optimal recovery markers. No cardiovascular contraindications. Prioritised sleep and HRV stabilisation in Month 1 protocol assignment.',
      nextCheckIn: '2026-04-26',
    };
  }

  const data = $derived(mockLookup(patientId));
</script>

<div class="patient-overview">
  <div class="po-header">
    <span class="po-label">{data.label}</span>
    <span class="po-tier">{data.tier}</span>
  </div>

  <div class="po-cards">
    <div class="po-card">
      <div class="po-card-title">Progress</div>
      <div class="po-card-value">Month {data.currentMonth}, Week {data.currentWeek}</div>
    </div>

    <div class="po-card">
      <div class="po-card-title">Next Check-in</div>
      <div class="po-card-value">{data.nextCheckIn}</div>
    </div>

    <div class="po-card full">
      <div class="po-card-title">Active Protocols</div>
      <div class="protocol-list">
        {#each data.protocols as p}
          <span class="protocol-tag">{p}</span>
        {/each}
      </div>
    </div>

    <div class="po-card full">
      <div class="po-card-title">Outcome Scores (weekly subjective)</div>
      <div class="score-row">
        {#each data.outcomeScores as s}
          <div class="score-bar">
            <div class="score-fill" style="height:{s.score * 10}%"></div>
            <div class="score-label">W{s.week}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="po-card full">
      <div class="po-card-title">Intake Summary</div>
      <p class="po-intake">{data.intakeSummary}</p>
    </div>
  </div>
</div>

<style>
  .patient-overview { padding: 4px 0; }

  .po-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .po-label {
    font-size: 1rem;
    font-weight: 700;
    color: #cdd4e0;
    font-family: monospace;
  }

  .po-tier {
    background: rgba(74,158,255,0.15);
    color: #4a9eff;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 3px 9px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .po-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .po-card {
    background: #1a1f2a;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 14px 16px;
  }

  .po-card.full { grid-column: 1 / -1; }

  .po-card-title {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #7a8390;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .po-card-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #cdd4e0;
  }

  .protocol-list { display: flex; gap: 8px; flex-wrap: wrap; }

  .protocol-tag {
    background: rgba(80,200,120,0.12);
    color: #52c87e;
    font-size: 0.76rem;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: monospace;
  }

  .score-row { display: flex; align-items: flex-end; gap: 10px; height: 60px; }

  .score-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    width: 32px;
    height: 100%;
  }

  .score-fill {
    width: 20px;
    background: #4a9eff;
    border-radius: 3px 3px 0 0;
    min-height: 4px;
  }

  .score-label {
    font-size: 0.7rem;
    color: #7a8390;
    margin-top: 4px;
  }

  .po-intake {
    font-size: 0.86rem;
    color: #aab4c2;
    line-height: 1.6;
    margin: 0;
  }
</style>
