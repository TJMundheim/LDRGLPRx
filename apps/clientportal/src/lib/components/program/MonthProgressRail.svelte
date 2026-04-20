<script lang="ts">
  import type { MonthDefinition } from '../../content/monthProgression';

  interface Props {
    currentMonth: MonthDefinition['month'];
  }

  const { currentMonth }: Props = $props();

  interface Stop {
    month: MonthDefinition['month'];
    label: string;
    short: string;
  }

  const stops: Stop[] = [
    { month: 1,             label: 'Month 1',      short: 'M1' },
    { month: 2,             label: 'Month 2',      short: 'M2' },
    { month: 3,             label: 'Month 3',      short: 'M3' },
    { month: 4,             label: 'Month 4',      short: 'M4' },
    { month: 'maintenance', label: 'Maintenance',  short: 'MX' },
  ];

  function isActive(stop: Stop): boolean {
    return stop.month === currentMonth;
  }

  function isPast(stop: Stop, index: number): boolean {
    const order = [1, 2, 3, 4, 'maintenance'];
    const currentIdx = order.indexOf(currentMonth);
    return index < currentIdx;
  }
</script>

<div class="rail-wrapper" role="navigation" aria-label="Program progression">
  {#each stops as stop, i}
    <div
      class="stop"
      class:active={isActive(stop)}
      class:past={isPast(stop, i)}
      aria-current={isActive(stop) ? 'step' : undefined}
    >
      <div class="dot"></div>
      <span class="stop-label">{stop.label}</span>
    </div>
    {#if i < stops.length - 1}
      <div class="connector" class:filled={isPast(stop, i) || isActive(stop)}></div>
    {/if}
  {/each}
</div>

<style>
  .rail-wrapper {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0.75rem 1rem;
    background: #0d1117;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    overflow-x: auto;
  }

  .stop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #333;
    border: 2px solid #555;
    transition: background 0.2s, border-color 0.2s;
  }

  .stop.past .dot {
    background: #1D9E75;
    border-color: #1D9E75;
  }

  .stop.active .dot {
    background: #fff;
    border-color: #1D9E75;
    box-shadow: 0 0 0 3px rgba(29, 158, 117, 0.35);
  }

  .stop-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #555;
    white-space: nowrap;
  }

  .stop.past .stop-label {
    color: #1D9E75;
  }

  .stop.active .stop-label {
    color: #fff;
  }

  .connector {
    flex: 1;
    min-width: 2rem;
    height: 2px;
    background: #333;
    margin-bottom: 1.2rem;
    transition: background 0.2s;
  }

  .connector.filled {
    background: #1D9E75;
  }
</style>
