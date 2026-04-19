<script lang="ts">
  import type { Supplement } from '../content/supplements';

  interface Props {
    supplement: Supplement;
    suppKey: string;
    response: 'Yes' | 'No' | '';
    onToggle: (key: string, value: 'Yes' | 'No') => void;
  }
  let { supplement, suppKey, response, onToggle }: Props = $props();
</script>

<div class="supp-row">
  <div>
    <div class="supp-name">{supplement.n}</div>
    <div class="supp-why">{supplement.w}</div>
  </div>
  <div style="font-size:11px;color:#3A6A44">{supplement.d}</div>
  <div style="font-size:10px;color:#4A7A54">{supplement.t}</div>
  <div style="display:flex;gap:5px">
    {#each ['Yes','No'] as const as v}
      {@const active = response === v}
      <button class="btn xs"
        style:background={active ? (v === 'Yes' ? '#1D9E75' : '#E8E8E8') : '#FFFFFF'}
        style:color={active ? '#fff' : '#6A9A74'}
        style:border-color={active ? (v === 'Yes' ? '#1D9E75' : '#999') : '#D8E8DC'}
        onclick={() => onToggle(suppKey, v)}>{v}</button>
    {/each}
  </div>
</div>
