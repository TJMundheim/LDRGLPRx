<script lang="ts">
  import { weekMeta } from '../content/weeks';
  interface Props { week: 1 | 2 | 3 | 4 }
  let { week }: Props = $props();
  const wc = $derived(weekMeta[week]);
</script>

<div class="week-banner" style="background:{wc.bg}CC;border:1px solid {wc.ac}55">
  <div class="week-tag" style="color:{wc.ac};margin-bottom:4px">WEEK {week} OF 4</div>
  <div class="week-name">{wc.label}</div>
  <div class="week-sub" style="margin-top:5px">{wc.sub}</div>
  <div style="margin-top:8px;display:inline-block;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:5px;font-size:10px;font-weight:700;letter-spacing:.06em;color:#fff">⭐ {wc.focus}</div>
</div>
