<script lang="ts">
  import { weekMeta } from '../content/weeks';
  import { stepsForWeek } from '../content/morningProtocol';
  import type { WeekLog } from '../data/schema';

  interface Props {
    week: 1 | 2 | 3 | 4;
    log: WeekLog;
    onToggle: (type: 'morn' | 'cold', week: 1 | 2 | 3 | 4, key: string) => void;
    onReflection: (week: 1 | 2 | 3 | 4, value: string) => void;
    /** Adherence writer — same callback VoiceLog uses (App.svelte's toggle). */
    onLog?: (actionId: string, completed: boolean) => void | Promise<void>;
    /** Today, YYYY-MM-DD. Defaults to the device clock. */
    today?: string;
  }
  let { week, log, onToggle, onReflection, onLog, today }: Props = $props();

  // ── "Same as yesterday" ───────────────────────────────────────────────────
  // Reads the adherence cache (`adherence-cache-<date>-<actionId>`) for
  // yesterday and re-logs the same standing actions for today. Nothing is
  // mandatory — the button simply disables when yesterday is empty.
  const STANDING_IDS = ['biome-ns-ultra', 'eating-window', 'protein-breakfast', 'strength', 'fasted-walk'];

  function ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const todayStr = $derived(today ?? ymd(new Date()));
  const yesterdayStr = $derived.by(() => {
    const d = new Date(`${todayStr}T00:00:00`);
    d.setDate(d.getDate() - 1);
    return ymd(d);
  });

  function cachedIds(date: string): string[] {
    try {
      return STANDING_IDS.filter(id => !!localStorage.getItem(`adherence-cache-${date}-${id}`));
    } catch { return []; }
  }

  let copied = $state(false);
  const yesterdayIds = $derived.by(() => { copied; return cachedIds(yesterdayStr); });
  const canCopy = $derived(!!onLog && yesterdayIds.length > 0);

  async function copyYesterday(): Promise<void> {
    if (!onLog) return;
    const ids = yesterdayIds;
    for (const id of ids) {
      if (cachedIds(todayStr).includes(id)) continue;
      await onLog(id, true);
    }
    copied = true;
  }
  const wc = $derived(weekMeta[week]);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const;
  const doneCt = $derived(days.filter((_, i) => log.morn[`w${week}d${i+1}`]).length);
  const steps = $derived(stepsForWeek(week));
  const week4Note = $derived(week === 4 ? ' — with more focus and passion' : '');
</script>

<div class="card" style:border-color="{wc.ac}55">
  <div class="card-title"><span style="color:{wc.ac}">Week {week}</span> Morning Protocol Tracker</div>

  {#if steps.length > 0}
    <div class="steps-list" style="margin-bottom:12px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.07em;color:#6A8A6E;margin-bottom:6px;text-transform:uppercase">
        Active steps{week4Note}
      </div>
      <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">
        {#each steps as step}
          <li style="font-size:12px;color:#e8eaf0;line-height:1.4">
            <strong>{step.n}</strong> — <span style="color:#9ba3b2">{step.p}</span>
            {#if step.u}
              <a href={step.u} target="_blank" rel="noopener noreferrer" style="color:{wc.ac};font-size:10px;margin-left:4px">▶ video</a>
            {/if}
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  {#if onLog}
    <button class="same-yesterday" disabled={!canCopy} onclick={copyYesterday}>
      {copied ? 'Copied from yesterday' : 'Same as yesterday'}
      {#if !canCopy}<em>— nothing logged yesterday</em>{/if}
    </button>
  {/if}

  <div style="font-size:11px;color:#6A8A6E;margin-bottom:8px">Tap each day you completed all elements</div>
  <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">
    {#each days as d, i}
      {@const key = `w${week}d${i+1}`}
      {@const done = !!log.morn[key]}
      <button class="day-btn"
        style:background={done ? wc.ac : '#FFFFFF'}
        style:color={done ? '#fff' : 'var(--mc-muted)'}
        style:border-color={done ? wc.ac : 'var(--mc-line)'}
        onclick={() => onToggle('morn', week, key)}>
        <span style="font-size:10px;font-weight:700">{d.charAt(0)}</span>
        <span style="font-size:8px;opacity:.7">{i+1}</span>
      </button>
    {/each}
  </div>
  <div class="g2" style="margin-bottom:12px">
    <div>
      <span class="tracker-lbl">Days completed</span>
      <div style="font-size:26px;font-weight:700;color:{wc.ac};margin-top:4px">{doneCt} / 7</div>
    </div>
    <div>
      <span class="tracker-lbl">Cold showers</span>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
        {#each days as d, i}
          {@const key = `cw${week}d${i+1}`}
          {@const done = !!log.cold[key]}
          <button class="cold-btn"
            style:background={done ? 'var(--mc-info)' : '#FFFFFF'}
            style:color={done ? '#fff' : 'var(--mc-muted)'}
            style:border-color={done ? 'var(--mc-info)' : 'var(--mc-line)'}
            onclick={() => onToggle('cold', week, key)}>{d.charAt(0)}</button>
        {/each}
      </div>
    </div>
  </div>
  <label for="morn-reflection-svelte-w{week}">Week {week} morning reflection</label>
  <textarea
    id="morn-reflection-svelte-w{week}"
    placeholder="How did the protocol feel? What improved? What was hard?"
    value={log.reflection}
    oninput={(e) => onReflection(week, (e.currentTarget as HTMLTextAreaElement).value)}
  ></textarea>
</div>

<style>
  .same-yesterday {
    display: block;
    width: 100%;
    min-height: 48px;
    margin-bottom: 12px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid var(--mc-line);
    background: var(--mc-panel-2);
    color: var(--mc-ink);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .same-yesterday:disabled { opacity: .5; cursor: default; }
  .same-yesterday em {
    font-style: normal;
    font-weight: 600;
    font-size: 12px;
    color: var(--mc-muted);
    margin-left: 6px;
  }

  /* Display label for stat values (not form elements) */
  .tracker-lbl {
    display: block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--mc-muted);
    margin-bottom: 5px;
  }
</style>
