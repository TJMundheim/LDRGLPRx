<script lang="ts">
  import type { Factor } from '../content/factors';
  import ScoreButtons from './ScoreButtons.svelte';

  interface Props {
    factor: Factor;
    score: number;
    open: boolean;
    onToggle: (id: string) => void;
    onScore: (id: string, score: number) => void;
  }
  let { factor, score, open, onToggle, onScore }: Props = $props();
</script>

<div class="factor-card" style:border-color={factor.cm ? '#2E7FD955' : undefined}>
  <div class="factor-header" onclick={() => onToggle(factor.n)}>
    <span class="factor-num">{factor.n}</span>
    <div style="flex:1">
      <div class="factor-name">
        {factor.name}
        {#if factor.tag}
          <span class="pill" style="background:{factor.tc || '#1D9E75'}20;color:{factor.tc || '#1D9E75'};margin-left:8px;font-size:9px">{factor.tag}</span>
        {/if}
      </div>
      <div class="factor-sub">{factor.sub ?? ''}</div>
    </div>
    <ScoreButtons factorId={factor.n} current={score} {onScore} />
    <span style="color:#6A8A6E;margin-left:8px;font-size:13px">{open ? '▲' : '▼'}</span>
  </div>
</div>
