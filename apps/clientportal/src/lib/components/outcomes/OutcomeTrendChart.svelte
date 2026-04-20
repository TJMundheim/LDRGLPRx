<script lang="ts">
  import type { WeeklyOutcome, OutcomeDomainKey } from '../../data/schema';
  import { DOMAIN_META } from '../../content/outcomeQuestions';

  interface Props {
    outcomes: WeeklyOutcome[];
    domainKey: OutcomeDomainKey;
  }

  let { outcomes, domainKey }: Props = $props();

  const WIDTH = 300;
  const HEIGHT = 160;
  const PAD = { top: 12, right: 12, bottom: 28, left: 28 };
  const INNER_W = WIDTH - PAD.left - PAD.right;
  const INNER_H = HEIGHT - PAD.top - PAD.bottom;

  const points = $derived(
    outcomes
      .filter(o => o.scores[domainKey] !== undefined)
      .map((o, i, arr) => ({
        x: arr.length < 2 ? INNER_W / 2 : (i / (arr.length - 1)) * INNER_W,
        y: INNER_H - ((o.scores[domainKey]! / 10) * INNER_H),
        score: o.scores[domainKey]!,
        label: `W${o.week}`,
      }))
  );

  const polyline = $derived(
    points.map(p => `${p.x},${p.y}`).join(' ')
  );

  const meta = $derived(DOMAIN_META[domainKey]);
  const yTicks = [0, 5, 10];
</script>

<div class="chart-wrap">
  <div class="chart-title">{meta.label}</div>
  {#if points.length < 2}
    <div class="chart-empty">Not enough data yet</div>
  {:else}
    <svg
      viewBox="0 0 {WIDTH} {HEIGHT}"
      width={WIDTH}
      height={HEIGHT}
      aria-label="{meta.label} trend chart"
      role="img"
    >
      <g transform="translate({PAD.left},{PAD.top})">
        <!-- Y grid lines -->
        {#each yTicks as tick}
          {@const cy = INNER_H - (tick / 10) * INNER_H}
          <line x1="0" y1={cy} x2={INNER_W} y2={cy} stroke="rgba(255,255,255,0.06)" stroke-width="1" />
          <text x="-4" y={cy + 4} text-anchor="end" font-size="9" fill="#4a5060">{tick}</text>
        {/each}

        <!-- Trend line -->
        <polyline
          points={polyline}
          fill="none"
          stroke="#4a9eff"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Data points + x labels -->
        {#each points as p, i (i)}
          <circle cx={p.x} cy={p.y} r="3.5" fill="#4a9eff" />
          <text x={p.x} y={INNER_H + 14} text-anchor="middle" font-size="9" fill="#565e70">{p.label}</text>
        {/each}
      </g>
    </svg>
  {/if}
</div>

<style>
  .chart-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .chart-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #9ba3b2;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .chart-empty {
    font-size: 0.78rem;
    color: #4a5060;
    height: 60px;
    display: flex;
    align-items: center;
  }

  svg {
    overflow: visible;
  }
</style>
