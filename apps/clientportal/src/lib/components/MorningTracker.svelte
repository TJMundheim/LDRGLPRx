<script lang="ts">
  import { weekMeta } from '../content/weeks';
  import type { WeekLog } from '../data/schema';

  interface Props {
    week: 1 | 2 | 3 | 4;
    log: WeekLog;
    onToggle: (type: 'morn' | 'cold', week: 1 | 2 | 3 | 4, key: string) => void;
    onReflection: (week: 1 | 2 | 3 | 4, value: string) => void;
  }
  let { week, log, onToggle, onReflection }: Props = $props();
  const wc = $derived(weekMeta[week]);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const;
  const doneCt = $derived(days.filter((_, i) => log.morn[`w${week}d${i+1}`]).length);
</script>

<div class="card" style:border-color="{wc.ac}55">
  <div class="card-title"><span style="color:{wc.ac}">Week {week}</span> Morning Protocol Tracker</div>
  <div style="font-size:11px;color:#6A8A6E;margin-bottom:8px">Tap each day you completed all elements</div>
  <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">
    {#each days as d, i}
      {@const key = `w${week}d${i+1}`}
      {@const done = !!log.morn[key]}
      <button class="day-btn"
        style:background={done ? wc.ac : '#FFFFFF'}
        style:color={done ? '#fff' : '#5A8A64'}
        style:border-color={done ? wc.ac : '#D8E8DC'}
        onclick={() => onToggle('morn', week, key)}>
        <span style="font-size:10px;font-weight:700">{d.charAt(0)}</span>
        <span style="font-size:8px;opacity:.7">{i+1}</span>
      </button>
    {/each}
  </div>
  <div class="g2" style="margin-bottom:12px">
    <div>
      <label>Days completed</label>
      <div style="font-size:26px;font-weight:700;color:{wc.ac};margin-top:4px">{doneCt} / 7</div>
    </div>
    <div>
      <label>Cold showers</label>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
        {#each days as d, i}
          {@const key = `cw${week}d${i+1}`}
          {@const done = !!log.cold[key]}
          <button class="cold-btn"
            style:background={done ? '#2E7FD9' : '#FFFFFF'}
            style:color={done ? '#fff' : '#6A9A74'}
            style:border-color={done ? '#2E7FD9' : '#D8E8DC'}
            onclick={() => onToggle('cold', week, key)}>{d.charAt(0)}</button>
        {/each}
      </div>
    </div>
  </div>
  <label>Week {week} morning reflection</label>
  <textarea
    placeholder="How did the protocol feel? What improved? What was hard?"
    value={log.reflection}
    oninput={(e) => onReflection(week, (e.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
</div>
