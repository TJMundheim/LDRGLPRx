<script lang="ts">
  interface Props { num: string | number; label: string; color?: string }
  let { num, label, color = '#1D9E75' }: Props = $props();
</script>

<div class="stat-card">
  <div class="stat-num" style="color:{color}">{num}</div>
  <div class="stat-lbl">{label}</div>
</div>
