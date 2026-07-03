<script lang="ts">
  interface Props {
    factorId: string;
    current: number;
    onScore: (factorId: string, score: number) => void;
  }
  let { factorId, current, onScore }: Props = $props();
  function color(n: number): string {
    if (n <= 2) return 'var(--mc-good-bright)';
    if (n === 3) return 'var(--mc-warn-b)';
    return 'var(--mc-crit-b)';
  }
</script>

<div style="display:flex;gap:5px;align-items:center">
  {#each [1,2,3,4,5] as n}
    {@const active = current === n}
    {@const c = color(n)}
    <button
      class="score-btn"
      style:background={active ? c : '#FFFFFF'}
      style:color={active ? '#fff' : 'var(--mc-muted)'}
      style:border-color={active ? c : 'var(--mc-line)'}
      onclick={(e) => { e.stopPropagation(); onScore(factorId, n); }}
    >{n}</button>
  {/each}
</div>
