<script lang="ts">
  /**
   * Chips — tap-to-pick numeric input. Replaces <input type="number"> anywhere
   * a member has to enter a number one-handed on a phone (TJ 2026-09-15).
   * 48px touch targets, wraps, tapping the selected chip clears it.
   */
  interface Props {
    label: string;
    unit?: string;
    options: number[];
    value?: number | null;
    onChange: (v: number | null) => void;
  }
  let { label, unit = '', options, value = null, onChange }: Props = $props();

  function fmt(n: number): string {
    return Number.isInteger(n) ? String(n) : String(n);
  }
  function pick(n: number): void {
    onChange(value === n ? null : n);
  }
</script>

<div class="chips-field">
  <div class="chips-label">{label}{#if unit}<em>{unit}</em>{/if}</div>
  <div class="chips-row" role="group" aria-label={label}>
    {#each options as opt}
      <button
        type="button"
        class="chip"
        class:on={value === opt}
        aria-pressed={value === opt}
        onclick={() => pick(opt)}
      >{fmt(opt)}</button>
    {/each}
  </div>
</div>

<style>
  .chips-field { display: flex; flex-direction: column; gap: 8px; }
  .chips-label {
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--mc-muted);
  }
  .chips-label em {
    font-style: normal; margin-left: 5px; letter-spacing: .04em;
    text-transform: none; font-weight: 600; opacity: .75;
  }
  .chips-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    min-width: 48px; min-height: 48px; padding: 0 12px;
    border-radius: 12px;
    border: 1px solid var(--mc-line);
    background: var(--mc-panel-2);
    color: var(--mc-ink);
    font-size: 15px; font-weight: 700;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
  }
  .chip:hover { border-color: var(--mc-gold); }
  .chip.on {
    background: var(--mc-gold);
    border-color: var(--mc-gold);
    color: var(--mc-on-gold);
  }
  .chip:focus-visible { outline: 2px solid var(--mc-gold); outline-offset: 2px; }
</style>
