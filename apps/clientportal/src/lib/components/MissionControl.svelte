<script lang="ts">
  /**
   * MissionControl — single-surface rework (TJ 2026-07-06 shakedown).
   *
   * ONE page, no click-outs: score hero → this week's Move + tappable 7-day
   * tape grid (backfillable for the whole current week) → measurements trends →
   * month dots → 12-week bars → cohort call/attest → Move ladder.
   *
   * One source of truth: the Adherence table. Legacy workbook pages carry
   * curriculum/reflections/strength-testing only.
   */
  import { onMount } from 'svelte';
  import {
    listMyAdherence,
    recordAdherence,
    upcomingEvents,
    upsertMyProfile,
    getMyProfile,
  } from '../api/operations.js';
  import type { AdherenceEntry, Event, UserProfile } from '../api/generated.js';
  import { riskLoadFromScores, adherencePctForWindow } from '../mindspan.js';
  import {
    MOVES, PROGRAM_WEEKS, moveForWeek, programAnchor, calendarWeek, startOfWeekMon,
    moveProgress, movesCompleted, programCumulativePct,
    programMindspanScore, weeklyPctSeries,
  } from '../program.js';
  import { pushToast } from '../toast/toast.svelte.js';

  type Props = { firstName?: string };
  const { firstName = '' }: Props = $props();

  function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function addDays(d: Date, n: number): Date { const c = new Date(d); c.setDate(c.getDate() + n); return c; }

  const now = new Date();
  const today = ymd(now);
  const weekStartDate = startOfWeekMon(now);

  let loading = $state(true);
  let entries = $state<AdherenceEntry[]>([]);
  let profile = $state<Partial<UserProfile> | null>(null);
  let weeklyEvent = $state<Event | null>(null);
  let saving = $state<Record<string, boolean>>({});

  // Program clock anchors to the SIGNUP week (can't drift on early attests);
  // weekUnlocked (Zoom attest) gates progression, the calendar paces it.
  const anchor = $derived(programAnchor(profile?.createdAt ?? null, now));
  const currentWeek = $derived(Math.min(
    calendarWeek(anchor, now),
    Math.max(1, profile?.weekUnlocked ?? 1),
  ));
  const move = $derived(moveForWeek(currentWeek));
  function weekStartOf(w: number): Date { return addDays(anchor, (w - 1) * 7); }

  function entryDate(e: AdherenceEntry): string { return e.dateActionId.slice(0, 10); }
  function entryAction(e: AdherenceEntry): string {
    const h = e.dateActionId.indexOf('#');
    return h > 0 ? e.dateActionId.slice(h + 1) : '';
  }
  function hasOn(actionId: string, dateStr: string): boolean {
    return entries.some(e => entryAction(e) === actionId && entryDate(e) === dateStr);
  }

  // ── risk (audit factor scores) ──
  const FACTOR_LABELS: Record<string, string> = {
    gut: 'Gut', 'gut-microbiome': 'Gut', sleep: 'Sleep', weight: 'Weight',
    'weight-body-fat': 'Weight', nutrition: 'Nutrition', ed: 'ED', hormones: 'Hormones',
    environment: 'Environment', cognitive: 'Cognitive', 'already-diagnosed': 'Diagnosis',
    alcohol: 'Alcohol', stress: 'Stress',
  };
  const auditScores: Record<string, number> | null = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('audit-v1') : null;
      if (!raw) return null;
      const outer = JSON.parse(raw) as { scores?: Record<string, number> };
      return outer.scores ?? (outer as unknown as Record<string, number>);
    } catch { return null; }
  })();
  const riskLoad = riskLoadFromScores(auditScores);
  const riskPills = (() => {
    if (!auditScores) return [];
    return Object.entries(auditScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => ({
        label: FACTOR_LABELS[k] ?? k.replace(/-/g, ' '),
        hot: v >= 3,
        status: v >= 3 ? 'highest priority' : v >= 2 ? 'working on it' : 'on track',
      }));
  })();

  // ── MindSpan v2 ──
  const ROLLING_IDS = ['biome-ns-ultra', 'eating-window', 'protein-breakfast'];
  const cumulativePct = $derived(programCumulativePct(entries, now, currentWeek, anchor));
  const rollingPct = $derived(adherencePctForWindow(entries, now, 7, ROLLING_IDS));
  const movesDone = $derived(movesCompleted(entries, now, currentWeek, anchor));
  const msScore = $derived(programMindspanScore({ cumulativePct, rollingPct, riskLoad, movesDone }));

  const RING_R = 72;
  const RING_C = 2 * Math.PI * RING_R;
  const ringDash = $derived(`${(RING_C * msScore / 100).toFixed(1)} ${(RING_C * (1 - msScore / 100)).toFixed(1)}`);

  // ── week grid (tappable for the whole current week — backfill allowed) ──
  const GRID_ROWS = $derived.by(() => {
    const rows: Array<{ id: string; label: string; cap: number; isMove: boolean }> = [
      { id: 'biome-ns-ultra', label: 'Biome NS Ultra', cap: 7, isMove: move.actionId === 'biome-ns-ultra' },
      { id: 'eating-window', label: 'Eating window', cap: 5, isMove: move.actionId === 'eating-window' },
      { id: 'protein-breakfast', label: 'Protein-first', cap: 7, isMove: move.actionId === 'protein-breakfast' },
      { id: 'fasted-walk', label: 'Fasted walk', cap: 2, isMove: move.actionId === 'fasted-walk' },
      { id: 'strength', label: 'Strength', cap: 4, isMove: move.actionId === 'strength' },
    ];
    if (!move.standing) rows.push({ id: move.actionId, label: 'The Move', cap: move.target, isMove: true });
    return rows;
  });
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekDates = $derived.by(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) out.push(ymd(addDays(weekStartDate, i)));
    return out;
  });
  const mvProgress = $derived(moveProgress(entries, move, weekStartDate));
  const mvRingDeg = $derived(Math.round((mvProgress.done / Math.max(1, mvProgress.target)) * 360));

  const weeklyZoomAttested = $derived(!!profile?.weeklyZoomAttestedAt
    && new Date(profile.weeklyZoomAttestedAt).getTime() >= weekStartDate.getTime());

  // ── trends ──
  const DOT_BEHAVIORS: Array<[string, string]> = [
    ['biome-ns-ultra', 'Gut protocol'],
    ['eating-window', 'Eating window'],
    ['protein-breakfast', 'Protein-first'],
    ['fasted-walk', 'Walks'],
  ];
  const DOT_DAYS = 28;
  function dotRow(actionId: string): boolean[] {
    const out: boolean[] = [];
    for (let o = DOT_DAYS - 1; o >= 0; o--) out.push(hasOn(actionId, ymd(addDays(now, -o))));
    return out;
  }
  function dotCount(actionId: string): number {
    return dotRow(actionId).filter(Boolean).length;
  }
  const weekBars = $derived(weeklyPctSeries(entries, now, currentWeek, anchor));
  function pastMove(w: number) { return moveProgress(entries, MOVES[w - 1], weekStartOf(w)); }

  // ── weekly measurements: read-only trends here; the entry table (Weekly
  //    Measurements card) renders directly below on this same page ──
  const VITAL_METRICS: Array<[string, string, string]> = [
    ['weight', 'Weight', 'lbs'],
    ['waist', 'Waist', 'in'],
    ['sys', 'Systolic', 'mmHg'],
    ['dia', 'Diastolic', 'mmHg'],
    ['pulse', 'Pulse', 'bpm'],
    ['spo2', 'SpO₂', '%'],
  ];
  const vitalsLog: Record<string, string> = (() => {
    try {
      if (typeof localStorage === 'undefined') return {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('4m:workbook:')) {
          const wb = JSON.parse(localStorage.getItem(k) || '{}');
          if (wb && typeof wb === 'object' && wb.vitalsLog) return wb.vitalsLog as Record<string, string>;
        }
      }
    } catch { /* ignore */ }
    return {};
  })();
  function vitalSeries(metric: string): Array<{ label: string; v: number }> {
    const cols = ['base', ...Array.from({ length: 12 }, (_, i) => `w${i + 1}`)];
    const out: Array<{ label: string; v: number }> = [];
    cols.forEach((c, i) => {
      const raw = vitalsLog[`${c}_${metric}`];
      const n = raw !== undefined && raw !== '' ? Number(raw) : NaN;
      if (!Number.isNaN(n)) out.push({ label: i === 0 ? 'Base' : `W${i}`, v: n });
    });
    return out;
  }
  function vitalSpark(series: Array<{ v: number }>): string {
    if (series.length < 2) return '';
    const vals = series.map(s2 => s2.v);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = Math.max(1e-6, max - min);
    return vals.map((v, i) => `${((i / (vals.length - 1)) * 110).toFixed(1)},${(26 - ((v - min) / span) * 20).toFixed(1)}`).join(' ');
  }
  const trackedVitals = $derived(VITAL_METRICS.map(([id, label, unit]) => {
    const series = vitalSeries(id);
    const latest = series.length ? series[series.length - 1] : null;
    const delta = series.length >= 2 ? Math.round((series[series.length - 1].v - series[0].v) * 10) / 10 : null;
    return { id, label, unit, series, latest, delta, spark: vitalSpark(series) };
  }));

  // ── mutations ──
  async function logAction(actionId: string, dateStr: string): Promise<void> {
    const saveKey = `${dateStr}#${actionId}`;
    if (saving[saveKey] || hasOn(actionId, dateStr)) return;
    saving[saveKey] = true;
    const optimistic = {
      userId: '', dateActionId: saveKey, completedAt: new Date().toISOString(),
    } as AdherenceEntry;
    entries = [...entries, optimistic];
    try {
      const res = await recordAdherence({ date: dateStr, actionId, completed: true });
      const data = (res as any)?.data?.recordAdherence ?? (res as any)?.recordAdherence;
      if (data) entries = [...entries.filter(e => e !== optimistic), data as AdherenceEntry];
    } catch (err) {
      console.error('[MissionControl] recordAdherence failed', err);
      entries = entries.filter(e => e !== optimistic);
      pushToast({ message: 'Could not save that action — check your connection.', retry: () => logAction(actionId, dateStr) });
    } finally {
      saving[saveKey] = false;
    }
  }

  async function attestZoom(): Promise<void> {
    if (saving['__zoom']) return;
    saving['__zoom'] = true;
    try {
      const res = await upsertMyProfile({
        weeklyZoomAttestedAt: new Date().toISOString(),
        weeklyZoomAttestedEventId: weeklyEvent?.eventId ?? null,
        weekUnlocked: Math.min(PROGRAM_WEEKS, currentWeek + 1),
      } as any);
      const data = (res as any)?.data?.upsertMyProfile ?? (res as any)?.upsertMyProfile;
      if (data) profile = data;
    } catch (err) {
      console.error('[MissionControl] attest failed', err);
      pushToast({ message: 'Could not record your attestation — check your connection.', retry: () => attestZoom() });
    } finally {
      saving['__zoom'] = false;
    }
  }

  onMount(async () => {
    try {
      const prof = await getMyProfile();
      profile = ((prof as any)?.data?.getMyProfile ?? (prof as any)?.getMyProfile ?? null) as UserProfile | null;
      const from = programAnchor((profile as any)?.createdAt ?? null, new Date());
      const [adh, evs] = await Promise.all([
        listMyAdherence(ymd(from), ymd(addDays(weekStartDate, 6))),
        upcomingEvents(20),
      ]);
      entries = ((adh as any)?.data?.listMyAdherence ?? (adh as any)?.listMyAdherence ?? []) as AdherenceEntry[];
      const evList = ((evs as any)?.data?.upcomingEvents ?? (evs as any)?.upcomingEvents ?? []) as Event[];
      weeklyEvent = evList.find(e => {
        if (e.type !== 'zoom-weekly') return false;
        const t = new Date(e.startsAt).getTime();
        return t >= weekStartDate.getTime() && t <= addDays(weekStartDate, 6).getTime() + 86399999;
      }) ?? null;
    } catch (err) {
      console.error('[MissionControl] load failed', err);
    } finally {
      loading = false;
    }
  });

  const headerDate = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  function fmtEvent(e: Event): string {
    return new Date(e.startsAt).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }
</script>

<div class="mc">
  {#if loading}
    <p class="meta">Loading…</p>
  {:else}
    <h1 class="head">Good morning{firstName ? `, ${firstName}` : ''}.</h1>
    <p class="sub">{headerDate} · Week {currentWeek} of {PROGRAM_WEEKS} · {move.theme} month</p>

    <div class="dash-grid">
      <div class="hero">
        <div class="klabel">MindSpan Score</div>
        <svg class="ring" width="168" height="168" viewBox="0 0 168 168" role="img" aria-label="MindSpan score {msScore} of 100">
          <defs><linearGradient id="msg2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e3c98b"/><stop offset="1" stop-color="#d4af5a"/>
          </linearGradient></defs>
          <circle cx="84" cy="84" r={RING_R} fill="none" stroke="#16244a" stroke-width="9"/>
          <circle cx="84" cy="84" r={RING_R} fill="none" stroke="url(#msg2)" stroke-width="9" stroke-linecap="round"
            stroke-dasharray={ringDash} transform="rotate(-90 84 84)"/>
          <text class="ring-num" x="84" y="95" text-anchor="middle">{msScore}</text>
          <text class="ring-unit" x="84" y="114" text-anchor="middle">of 100</text>
        </svg>
        <div class="caption">The ring fills as you complete the 12-week program. 100 means you finished — and lowered your risk.</div>
        <div class="drivers">
          <div class="drv"><div class="dl">Program completed</div><div class="dv">{cumulativePct}%</div></div>
          <div class="drv"><div class="dl">Moves done</div><div class="dv" class:g={movesDone >= currentWeek - 1}>{movesDone} of {PROGRAM_WEEKS}</div></div>
          <div class="drv"><div class="dl">Last 7 days</div><div class="dv" class:g={rollingPct >= 70}>{rollingPct}%</div></div>
          <div class="drv"><div class="dl">Risk load</div><div class="dv">{Math.round(riskLoad)} of 100</div></div>
        </div>
        <div class="drivers-note">These four numbers make up your score.</div>
        {#if riskPills.length}
          <div class="pills">
            {#each riskPills as p}
              <div class="pill" class:hot={p.hot}><b>{p.label}</b>{p.status}</div>
            {/each}
          </div>
          <div class="drivers-note">Your top risk areas, from your assessment. You retest in Week 12.</div>
        {/if}
      </div>

      <div>
        <div class="movebanner">
          <div class="mring" style="background: conic-gradient(var(--mc-gold) {mvRingDeg}deg, #1d3a6e 0)"><b>{mvProgress.done}/{mvProgress.target}</b></div>
          <div>
            <div class="mtag">Week {currentWeek} · The Move</div>
            <div class="mtitle2">{move.title}</div>
            <div class="mco">Your whole cohort is on this Move this week — it comes up on Wednesday's call.</div>
          </div>
        </div>

        <div class="gridcard">
          <table>
            <thead>
              <tr><th></th>{#each dayLetters as d, i}<th class:tod={weekDates[i] === today}>{d}</th>{/each}<th class="goal">Goal</th></tr>
            </thead>
            <tbody>
              {#each GRID_ROWS as row}
                <tr class:mv={row.isMove}>
                  <td>{row.label}{#if row.isMove}<em class="mvtag">Move</em>{/if}</td>
                  {#each weekDates as d}
                    <td>
                      {#if d <= today}
                        <button class="cell tappable" class:f={hasOn(row.id, d)} class:tod={d === today}
                          aria-label="Log {row.label} for {d}"
                          disabled={hasOn(row.id, d) || !!saving[`${d}#${row.id}`]}
                          onclick={() => logAction(row.id, d)}>{hasOn(row.id, d) ? '✓' : ''}</button>
                      {:else}
                        <span class="cell future"></span>
                      {/if}
                    </td>
                  {/each}
                  <td class="goal">{row.cap === 7 ? 'daily' : `${row.cap}×`}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <p class="gridhint">Tap any day this week you completed it — missed logging yesterday? Tap yesterday. Window goal is 5 of 7 (up to two off-days: breakfast with the kids or grandkids, then walk 30 minutes after).</p>
        </div>

        <h2 class="sec">Measurements <span class="secnote">weekly trend — log them in the table below</span></h2>
        <div class="vitals">
          {#each trackedVitals as vm}
            <div class="vit" class:empty={!vm.latest}>
              <div class="vl">{vm.label}</div>
              {#if vm.latest}
                <div class="vv">{vm.latest.v}<small> {vm.unit}</small></div>
                {#if vm.spark}
                  <svg width="110" height="28" viewBox="0 0 110 28" aria-label="{vm.label} trend">
                    <polyline points={vm.spark} fill="none" stroke="var(--mc-gold)" stroke-width="1.8"/>
                  </svg>
                {/if}
                {#if vm.delta !== null}
                  <div class="vd">{vm.delta > 0 ? '+' : ''}{vm.delta} since baseline</div>
                {/if}
              {:else}
                <div class="vv vv-empty">—</div>
                <div class="vd">no entries yet</div>
              {/if}
            </div>
          {/each}
        </div>

        <h2 class="sec">This month <span class="secnote">one dot per day · gold = done</span></h2>
        <div class="strips">
          {#each DOT_BEHAVIORS as [id, label]}
            <div class="strip">
              <div class="shead"><b>{label}</b><span>{dotCount(id)} of {DOT_DAYS} days</span></div>
              <div class="dots">
                {#each dotRow(id) as f}<i class="dt" class:f={f}></i>{/each}
              </div>
            </div>
          {/each}
        </div>

        <h2 class="sec">Program arc <span class="secnote">each bar = one week's adherence</span></h2>
        <div class="strip">
          <div class="shead"><b>Weekly adherence</b><span>week {currentWeek} of {PROGRAM_WEEKS}</span></div>
          <div class="bars">
            {#each weekBars as pct, i}
              <div class="bar" class:f={i < currentWeek - 1} class:now={i === currentWeek - 1}
                style="height:{Math.max(8, pct)}%" title="W{i + 1}: {pct}%"></div>
            {/each}
          </div>
        </div>
      </div>
    </div>

    {#if move.actionId === 'move-retake-assessment'}
      <div class="zoomcard">
        <div class="zt">Close the loop</div>
        <div class="zm">Retake the assessment, then tap the Move — your new score against Week 1 is the whole point.</div>
        <a class="zbtn" href="https://my4mlife.com/assessment" target="_blank" rel="noreferrer">Retake the assessment</a>
      </div>
    {/if}

    <div class="zoomcard">
      <div class="zt">{weeklyEvent ? weeklyEvent.title : "This week's cohort call"}</div>
      {#if weeklyEvent}
        <div class="zm">{fmtEvent(weeklyEvent)}{(weeklyEvent as any).recordingUrl ? ' · recording available' : ''}</div>
        {#if (weeklyEvent as any).recordingUrl}
          <a class="zbtn" href={(weeklyEvent as any).recordingUrl} target="_blank" rel="noreferrer">Watch recording</a>
        {/if}
      {:else}
        <div class="zm">Wednesday evening — link arrives by email</div>
      {/if}
      {#if weeklyZoomAttested}
        <div class="attested">✓ Attended. Week {Math.min(PROGRAM_WEEKS, currentWeek + 1)}'s Move appears here Monday morning — same tape, one new Move.</div>
      {:else}
        <label class="attest-row">
          <input type="checkbox" onchange={attestZoom} disabled={!!saving['__zoom']} />
          I attended live or watched the recording <span class="attest-why">(this is what advances you to Week {Math.min(PROGRAM_WEEKS, currentWeek + 1)})</span>
        </label>
      {/if}
    </div>

    <h2 class="sec">The 12 Moves <span class="secnote">one per week, whole cohort together</span></h2>
    <div class="wkcards">
      {#each MOVES as m}
        <div class="wkcard" class:locked={m.week > currentWeek} class:current={m.week === currentWeek}>
          <span class="wn">W{m.week}</span>
          <span class="wt">{m.title}<small>{m.theme}{m.week === currentWeek ? ' · this week' : ''}</small></span>
          <span class="pc">
            {#if m.week < currentWeek}{pastMove(m.week).complete ? '✓ done' : `${pastMove(m.week).done}/${pastMove(m.week).target}`}
            {:else if m.week === currentWeek}{mvProgress.done}/{mvProgress.target}
            {:else}—{/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .mc { max-width: 980px; padding: 8px 4px 24px; }
  .head { font-family: var(--mc-font-display); font-size: 26px; font-weight: 700; color: var(--mc-ink); margin: 4px 0 2px; letter-spacing: -.01em; }
  .sub { font-size: 11.5px; color: var(--mc-muted); margin: 0 0 20px; letter-spacing: .08em; text-transform: uppercase; }
  .sec { font-size: 11px; font-weight: 600; color: var(--mc-muted); letter-spacing: .2em; text-transform: uppercase; margin: 22px 0 10px; }
  .secnote { font-weight: 400; color: var(--mc-faint); text-transform: none; letter-spacing: 0; font-size: 11px; margin-left: 6px; }
  .meta { font-size: 11.5px; color: var(--mc-muted); margin: 6px 0 4px; }

  .dash-grid { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }

  .hero { background: radial-gradient(130% 130% at 50% 0%, var(--mc-panel-raised) 0%, var(--mc-panel) 58%); border: 1px solid var(--mc-line); border-radius: var(--mc-r-lg); padding: 24px 20px; text-align: center; }
  .klabel { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--mc-gold); }
  .ring { display: block; margin: 14px auto 4px; }
  .ring-num { font-family: var(--mc-font-display); font-weight: 700; font-size: 46px; fill: var(--mc-ink); }
  .ring-unit { font-size: 10px; letter-spacing: .14em; fill: var(--mc-muted); text-transform: uppercase; }
  .caption { font-size: 11px; color: var(--mc-muted); margin-top: 8px; max-width: 32ch; margin-inline: auto; line-height: 1.5; }
  .drivers { margin-top: 16px; border-top: 1px solid var(--mc-line); padding-top: 13px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 6px; }
  .drv .dl { font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--mc-faint); }
  .drv .dv { font-size: 15px; font-weight: 600; margin-top: 3px; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
  .drv .dv.g { color: var(--mc-good-bright); }
  .drivers-note { font-size: 10px; color: var(--mc-faint); margin-top: 9px; }
  .pills { display: flex; gap: 7px; margin-top: 12px; }
  .pill { flex: 1; background: transparent; border: 1px dashed var(--mc-line); border-radius: 9px; padding: 7px 4px; font-size: 10px; color: var(--mc-muted); }
  .pill b { display: block; font-size: 12.5px; color: var(--mc-ink); font-weight: 600; }
  .pill.hot { border-color: rgba(224, 92, 42, .55); }
  .pill.hot b { color: #e05c2a; }

  .movebanner { display: flex; gap: 14px; align-items: center; background: linear-gradient(135deg, var(--mc-panel-raised), var(--mc-panel)); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-lg); padding: 15px 16px; margin-bottom: 12px; }
  .mring { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
  .mring b { background: var(--mc-panel); width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; color: var(--mc-gold); font-variant-numeric: tabular-nums; }
  .mtag { font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--mc-gold); font-weight: 700; }
  .mtitle2 { font-size: 15px; font-weight: 600; color: var(--mc-ink); margin: 3px 0 2px; }
  .mco { font-size: 11.5px; color: var(--mc-muted); }

  .gridcard { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-lg); padding: 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10.5px; color: var(--mc-muted); font-weight: 600; padding: 4px 2px; text-align: center; }
  th.tod { color: var(--mc-gold); }
  th.goal, td.goal { font-size: 9.5px; color: var(--mc-faint); text-align: right; padding-right: 4px; white-space: nowrap; }
  td { text-align: center; padding: 5px 2px; }
  td:first-child { text-align: left; font-size: 12.5px; color: var(--mc-ink); white-space: nowrap; padding-right: 8px; }
  tr.mv td:first-child { color: var(--mc-gold); }
  .mvtag { font-style: normal; font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--mc-gold); margin-left: 6px; }
  .cell { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: #16305f; border: none; font-size: 12px; color: var(--mc-on-gold); }
  .cell.f { background: var(--mc-gold); font-weight: 800; }
  .cell.future { background: #101c38; opacity: .5; }
  button.cell.tappable { cursor: pointer; border: 1px solid var(--mc-gold-line); }
  button.cell.tappable.tod { outline: 1.5px solid #e9cf96; }
  button.cell.tappable:disabled { cursor: default; border-color: transparent; }
  .gridhint { font-size: 11px; color: var(--mc-faint); margin: 10px 2px 0; line-height: 1.5; }

  .vitals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media (max-width: 640px) { .vitals { grid-template-columns: repeat(2, 1fr); } }
  .vit { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 11px 12px; }
  .vit.empty { opacity: .55; }
  .vit .vl { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--mc-muted); }
  .vit .vv { font-size: 19px; font-weight: 600; color: var(--mc-ink); margin-top: 4px; font-variant-numeric: tabular-nums; }
  .vit .vv small { font-size: 10px; color: var(--mc-muted); font-weight: 400; }
  .vit .vv-empty { color: var(--mc-faint); }
  .vit svg { display: block; margin-top: 4px; }
  .vit .vd { font-size: 10px; color: var(--mc-muted); margin-top: 3px; }

  .strips { display: flex; flex-direction: column; gap: 10px; }
  .strip { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 11px 13px; }
  .shead { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
  .shead b { color: var(--mc-ink); font-weight: 600; }
  .shead span { color: var(--mc-muted); font-variant-numeric: tabular-nums; }
  .dots { display: grid; grid-template-columns: repeat(28, 1fr); gap: 3px; }
  .dt { aspect-ratio: 1; border-radius: 3px; background: #16305f; }
  .dt.f { background: var(--mc-gold); }
  .bars { display: flex; gap: 5px; align-items: flex-end; height: 44px; }
  .bar { flex: 1; background: #16305f; border-radius: 2px 2px 0 0; }
  .bar.f { background: var(--mc-gold); }
  .bar.now { background: #e9cf96; outline: 1px solid var(--mc-gold); }

  .wkcards { display: flex; flex-direction: column; gap: 8px; max-width: 640px; }
  .wkcard { display: flex; align-items: center; gap: 12px; background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 10px 14px; }
  .wkcard.current { border-color: var(--mc-gold-line); }
  .wkcard.locked { opacity: .45; }
  .wkcard .wn { font-family: var(--mc-font-display); color: var(--mc-gold); font-size: 15px; width: 36px; flex-shrink: 0; }
  .wkcard .wt { flex: 1; font-size: 12.5px; color: var(--mc-ink); }
  .wkcard .wt small { display: block; color: var(--mc-muted); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; }
  .wkcard .pc { font-size: 12px; color: var(--mc-good-bright); font-variant-numeric: tabular-nums; }
  .wkcard.locked .pc { color: var(--mc-muted); }

  .zoomcard { background: var(--mc-panel); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-md); padding: 15px 16px; margin-top: 14px; max-width: 640px; }
  .zt { font-family: var(--mc-font-display); font-size: 15px; font-weight: 600; color: var(--mc-ink); }
  .zm { font-size: 11.5px; color: var(--mc-muted); margin-top: 4px; }
  .zbtn { display: inline-block; margin-top: 11px; font-size: 11.5px; font-weight: 700; letter-spacing: .05em; color: var(--mc-on-gold); background: var(--mc-gold); border-radius: 8px; padding: 8px 16px; text-decoration: none; }
  .zbtn:hover { background: var(--mc-gold-soft); }
  .attest-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--mc-muted); padding: 10px 2px 0; cursor: pointer; flex-wrap: wrap; }
  .attest-why { color: var(--mc-faint); font-size: 11px; }
  .attested { font-size: 12px; color: var(--mc-good-bright); font-weight: 600; margin-top: 10px; line-height: 1.5; }

  @media (max-width: 480px) {
    .dots { grid-template-columns: repeat(14, 1fr); }
  }
</style>
