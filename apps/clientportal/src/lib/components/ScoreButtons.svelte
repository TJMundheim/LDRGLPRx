<script lang="ts">
  interface Props {
    factorId: string;
    current: number;
    onScore: (factorId: string, score: number) => void;
  }
  let { factorId, current, onScore }: Props = $props();
  function color(n: number): string {
    if (n <= 2) return '#1D9E75';
    if (n === 3) return '#D4920A';
    return '#E05C2A';
  }
</script>

<div style="display:flex;gap:5px;align-items:center">
  {#each [1,2,3,4,5] as n}
    {@const active = current === n}
    {@const c = color(n)}
    <button
      class="score-btn"
      style:background={active ? c : '#FFFFFF'}
      style:color={active ? '#fff' : '#6A9A74'}
      style:border-color={active ? c : '#D8E8DC'}
      onclick={(e) => { e.stopPropagation(); onScore(factorId, n); }}
    >{n}</button>
  {/each}
</div>
