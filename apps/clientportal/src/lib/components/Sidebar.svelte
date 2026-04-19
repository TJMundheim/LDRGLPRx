<script lang="ts">
  interface Props {
    navHtml: string;
    name: string;
    stats: { audit: string; score: string; morn: string; cold: string };
  }
  let { navHtml, name, stats }: Props = $props();
</script>

<div class="sidebar" id="sidebar">
  <div class="logo">
    <div class="logo-title">4M PROGRAM</div>
    <div class="logo-sub">MONTH 1 WORKBOOK</div>
    <div class="logo-name">{name}</div>
  </div>
  <div id="nav-items">{@html navHtml}</div>
  <div class="sb-stats" style="margin-top:8px">
    <div class="sb-stats-title">PROGRESS</div>
    <div class="sb-stat">{stats.audit}</div>
    <div class="sb-stat">{stats.score}</div>
    <div class="sb-stat">{stats.morn}</div>
    <div class="sb-stat">{stats.cold}</div>
  </div>
</div>
