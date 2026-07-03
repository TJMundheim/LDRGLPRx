<script lang="ts">
  interface Props { num: string | number; label: string; color?: string }
  let { num, label, color = 'var(--mc-good-bright)' }: Props = $props();
</script>

<div class="stat-card">
  <div class="stat-num" style="color:{color}">{num}</div>
  <div class="stat-lbl">{label}</div>
</div>
