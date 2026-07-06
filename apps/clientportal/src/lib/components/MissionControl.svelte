<script lang="ts">
  /**
   * MissionControl — Direction 2 ("Instruments First"), approved TJ 2026-07-06.
   *
   * Two surfaces, one component:
   *   DASHBOARD (landing) — results only. Gold ring fills toward 100 over the
   *     12-week program (MindSpan v2, lib/program.ts), risk pills, month dots,
   *     12-week bars, program (Move ladder) list. One gold CTA into the week.
   *   WEEK — where work is logged. The week's Move + cohort line, the 7-day
   *     tape grid (tap today's column), Zoom attest (unlocks next week).
   *
   * Mockup source: docs/design/app-week-mockups.html (Direction 2 + parts of 3).
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
    MOVES, PROGRAM_WEEKS, moveForWeek, programStart, startOfWeekMon,
    daysHitInWeek, moveProgress, movesCompleted, programCumulativePct,
    programMindspanScore, weeklyPctSeries,
  } from '../program.js';
  import { pushToast } from '../toast/toast.svelte.js';

  type Props = { firstName?: string };
  const { firstName = '' }: Props = $props();

  // ── date helpers ──
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

  // ── state ──
  let surface = $state<'dash' | 'week'>('dash');
  let loading = $state(true);
  let entries = $state<AdherenceEntry[]>([]);
  let profile = $state<Partial<UserProfile> | null>(null);
  let weeklyEvent = $state<Event | null>(null);
  let saving = $state<Record<string, boolean>>({});

  const currentWeek = $derived(Math.min(PROGRAM_WEEKS, Math.max(1, profile?.weekUnlocked ?? 1)));
  const move = $derived(moveForWeek(currentWeek));
  const progStart = $derived(programStart(now, currentWeek));

  // ── adherence helpers ──
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
        status: v >= 3 ? 'watch' : v >= 2 ? 'working' : 'on track',
      }));
  })();

  // ── MindSpan v2 ──
  const cumulativePct = $derived(programCumulativePct(entries, now, currentWeek));
  const rollingPct = $derived(adherencePctForWindow(entries, now));
  const movesDone = $derived(movesCompleted(entries, now, currentWeek));
  const msScore = $derived(programMindspanScore({ cumulativePct, rollingPct, riskLoad, movesDone }));

  const RING_R = 72;
  const RING_C = 2 * Math.PI * RING_R;
  const ringDash = $derived(`${(RING_C * msScore / 100).toFixed(1)} ${(RING_C * (1 - msScore / 100)).toFixed(1)}`);

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
  const weekBars = $derived(weeklyPctSeries(entries, now, currentWeek));

  // ── week grid ──
  const GRID_ROWS = $derived.by(() => {
    const rows: Array<{ id: string; label: string; daily: boolean; cap: number; isMove: boolean }> = [
      { id: 'biome-ns-ultra', label: 'Biome NS Ultra', daily: true, cap: 7, isMove: move.actionId === 'biome-ns-ultra' },
      { id: 'eating-window', label: 'Eating window', daily: false, cap: 5, isMove: move.actionId === 'eating-window' },
      { id: 'protein-breakfast', label: 'Protein-first', daily: true, cap: 7, isMove: move.actionId === 'protein-breakfast' },
      { id: 'fasted-walk', label: 'Fasted walk', daily: false, cap: 2, isMove: move.actionId === 'fasted-walk' },
      { id: 'strength', label: 'Strength', daily: false, cap: 4, isMove: move.actionId === 'strength' },
    ];
    if (!move.standing) rows.push({ id: move.actionId, label: 'The Move', daily: false, cap: move.target, isMove: true });
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

  // ── mutations ──
  async function logAction(actionId: string): Promise<void> {
    if (saving[actionId] || hasOn(actionId, today)) return;
    saving[actionId] = true;
    const optimistic = {
      userId: '', dateActionId: `${today}#${actionId}`, completedAt: new Date().toISOString(),
    } as AdherenceEntry;
    entries = [...entries, optimistic];
    try {
      const res = await recordAdherence({ date: today, actionId, completed: true });
      const data = (res as any)?.data?.recordAdherence ?? (res as any)?.recordAdherence;
      if (data) entries = [...entries.filter(e => e !== optimistic), data as AdherenceEntry];
    } catch (err) {
      console.error('[MissionControl] recordAdherence failed', err);
      entries = entries.filter(e => e !== optimistic);
      pushToast({ message: 'Could not save that action — check your connection.', retry: () => logAction(actionId) });
    } finally {
      saving[actionId] = false;
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

  // ── load ──
  onMount(async () => {
    try {
      const prof = await getMyProfile();
      profile = ((prof as any)?.data?.getMyProfile ?? (prof as any)?.getMyProfile ?? null) as UserProfile | null;
      const week = Math.min(PROGRAM_WEEKS, Math.max(1, profile?.weekUnlocked ?? 1));
      const from = programStart(new Date(), week);
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
  const todayDone = $derived(GRID_ROWS.filter(r => r.daily || r.isMove).every(r => hasOn(r.id, today)));
</script>

<div class="mc">
  {#if loading}
    <p class="meta">Loading…</p>
  {:else if surface === 'dash'}
    <!-- ══ DASHBOARD — results only ══ -->
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
        <div class="caption">The ring fills as you complete the 12-week program</div>
        <div class="drivers">
          <div class="drv"><div class="dl">Program</div><div class="dv">{cumulativePct}%</div></div>
          <div class="drv"><div class="dl">Moves</div><div class="dv" class:g={movesDone >= currentWeek - 1}>{movesDone}/{PROGRAM_WEEKS}</div></div>
          <div class="drv"><div class="dl">7-day</div><div class="dv" class:g={rollingPct >= 70}>{rollingPct}%</div></div>
          <div class="drv"><div class="dl">Risk</div><div class="dv">{Math.round(riskLoad)}</div></div>
        </div>
        {#if riskPills.length}
          <div class="pills">
            {#each riskPills as p}
              <div class="pill" class:hot={p.hot}><b>{p.label}</b>{p.status}</div>
            {/each}
          </div>
        {/if}
      </div>

      <div>
        <button class="cta" onclick={() => (surface = 'week')}>
          {todayDone ? 'Today is logged — review your week →' : "Log today's protocol →"}
        </button>

        <div class="movechip">
          <span class="mtag">Week {currentWeek} Move</span>
          <span class="mtitle">{move.title}</span>
          <span class="mprog">{mvProgress.done}/{mvProgress.target}{mvProgress.complete ? ' · complete' : ''}</span>
        </div>

        <h2 class="sec">This month</h2>
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

        <h2 class="sec">Program arc</h2>
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

    <h2 class="sec">The 12 Moves</h2>
    <div class="wkcards">
      {#each MOVES as m}
        <div class="wkcard" class:locked={m.week > currentWeek} class:current={m.week === currentWeek}>
          <span class="wn">W{m.week}</span>
          <span class="wt">{m.title}<small>{m.theme}{m.week === currentWeek ? ' · this week' : ''}</small></span>
          <span class="pc">
            {#if m.week < currentWeek}{weekBars[m.week - 1]}%
            {:else if m.week === currentWeek}{mvProgress.done}/{mvProgress.target}
            {:else}—{/if}
          </span>
        </div>
      {/each}
    </div>
  {:else}
    <!-- ══ WEEK — the work ══ -->
    <button class="back" onclick={() => (surface = 'dash')}>← Dashboard</button>
    <h1 class="head">Week {currentWeek} of {PROGRAM_WEEKS}</h1>
    <p class="sub">{move.theme} month · {headerDate}</p>

    <div class="movebanner">
      <div class="mring" style="background: conic-gradient(var(--mc-gold) {mvRingDeg}deg, #1d3a6e 0)"><b>{mvProgress.done}/{mvProgress.target}</b></div>
      <div>
        <div class="mtag">The Move</div>
        <div class="mtitle2">{move.title}</div>
        <div class="mco">Your whole cohort is on this Move this week — it comes up on Wednesday's call.</div>
      </div>
    </div>

    <div class="gridcard">
      <table>
        <thead>
          <tr><th></th>{#each dayLetters as d, i}<th class:tod={weekDates[i] === today}>{d}</th>{/each}</tr>
        </thead>
        <tbody>
          {#each GRID_ROWS as row}
            <tr class:mv={row.isMove}>
              <td>{row.label}{#if row.isMove}<em class="mvtag">Move</em>{/if}</td>
              {#each weekDates as d}
                <td>
                  {#if d === today}
                    <button class="cell today" class:f={hasOn(row.id, d)}
                      aria-label="Log {row.label} for today"
                      disabled={hasOn(row.id, d) || !!saving[row.id]}
                      onclick={() => logAction(row.id)}>{hasOn(row.id, d) ? '✓' : ''}</button>
                  {:else}
                    <span class="cell" class:f={hasOn(row.id, d)} class:past={d < today}>{hasOn(row.id, d) ? '✓' : ''}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="gridhint">Tap today's column as you go. Window 5 days (up to two off-days — breakfast with the grandkids, then walk 30 minutes after), walks 2, strength 3–4, the Move {mvProgress.target}.</p>
    </div>

    {#if move.actionId === 'move-retake-assessment'}
      <div class="zoomcard">
        <div class="zt">Close the loop</div>
        <div class="zm">Retake the assessment, then log the Move — your new baseline against Week 1 is the whole point.</div>
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
        <div class="attested">Attested — Week {Math.min(PROGRAM_WEEKS, currentWeek + 1)} unlocks Monday</div>
      {:else}
        <label class="attest-row">
          <input type="checkbox" onchange={attestZoom} disabled={!!saving['__zoom']} />
          I attended live or watched the recording
        </label>
      {/if}
    </div>
  {/if}
</div>

<style>
  .mc { max-width: 980px; padding: 8px 4px 64px; }
  .head { font-family: var(--mc-font-display); font-size: 26px; font-weight: 700; color: var(--mc-ink); margin: 4px 0 2px; letter-spacing: -.01em; }
  .sub { font-size: 11.5px; color: var(--mc-muted); margin: 0 0 20px; letter-spacing: .08em; text-transform: uppercase; }
  .sec { font-size: 11px; font-weight: 600; color: var(--mc-muted); letter-spacing: .2em; text-transform: uppercase; margin: 22px 0 10px; }
  .meta { font-size: 11.5px; color: var(--mc-muted); margin: 6px 0 4px; }

  .dash-grid { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }

  .hero { background: radial-gradient(130% 130% at 50% 0%, var(--mc-panel-raised) 0%, var(--mc-panel) 58%); border: 1px solid var(--mc-line); border-radius: var(--mc-r-lg); padding: 24px 20px; text-align: center; }
  .klabel { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--mc-gold); }
  .ring { display: block; margin: 14px auto 4px; }
  .ring-num { font-family: var(--mc-font-display); font-weight: 700; font-size: 46px; fill: var(--mc-ink); }
  .ring-unit { font-size: 10px; letter-spacing: .14em; fill: var(--mc-muted); text-transform: uppercase; }
  .caption { font-size: 11px; color: var(--mc-muted); margin-top: 8px; max-width: 30ch; margin-inline: auto; }
  .drivers { margin-top: 16px; border-top: 1px solid var(--mc-line); padding-top: 13px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .drv .dl { font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--mc-faint); }
  .drv .dv { font-size: 15px; font-weight: 600; margin-top: 3px; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
  .drv .dv.g { color: var(--mc-good-bright); }
  .pills { display: flex; gap: 7px; margin-top: 14px; }
  .pill { flex: 1; background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: 9px; padding: 7px 4px; font-size: 10px; color: var(--mc-muted); }
  .pill b { display: block; font-size: 12.5px; color: var(--mc-ink); font-weight: 600; }
  .pill.hot { border-color: rgba(224, 92, 42, .55); }
  .pill.hot b { color: #e05c2a; }

  .cta { display: block; width: 100%; border: none; cursor: pointer; background: var(--mc-gold); color: var(--mc-on-gold); border-radius: var(--mc-r-md); padding: 15px; font-size: 14.5px; font-weight: 700; }
  .cta:hover { background: var(--mc-gold-soft); }
  .movechip { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; background: var(--mc-panel); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-md); padding: 12px 14px; margin-top: 10px; }
  .mtag { font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--mc-gold); font-weight: 700; white-space: nowrap; }
  .mtitle { font-size: 13px; color: var(--mc-ink); font-weight: 600; flex: 1; min-width: 180px; }
  .mprog { font-size: 11.5px; color: var(--mc-muted); font-variant-numeric: tabular-nums; }

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

  /* week surface */
  .back { background: none; border: none; color: var(--mc-gold); font-size: 12px; cursor: pointer; padding: 0 0 8px; text-align: left; }
  .movebanner { display: flex; gap: 14px; align-items: center; background: linear-gradient(135deg, var(--mc-panel-raised), var(--mc-panel)); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-lg); padding: 15px 16px; margin-bottom: 14px; }
  .mring { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
  .mring b { background: var(--mc-panel); width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; color: var(--mc-gold); font-variant-numeric: tabular-nums; }
  .mtitle2 { font-size: 15px; font-weight: 600; color: var(--mc-ink); margin: 3px 0 2px; }
  .mco { font-size: 11.5px; color: var(--mc-muted); }

  .gridcard { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-lg); padding: 14px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10.5px; color: var(--mc-muted); font-weight: 600; padding: 4px 2px; text-align: center; }
  th.tod { color: var(--mc-gold); }
  td { text-align: center; padding: 5px 2px; }
  td:first-child { text-align: left; font-size: 12.5px; color: var(--mc-ink); white-space: nowrap; padding-right: 8px; }
  tr.mv td:first-child { color: var(--mc-gold); }
  .mvtag { font-style: normal; font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--mc-gold); margin-left: 6px; }
  .cell { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; background: #16305f; border: none; font-size: 12px; color: var(--mc-on-gold); }
  .cell.f { background: var(--mc-gold); font-weight: 800; }
  .cell.past:not(.f) { background: #221d2b; }
  button.cell.today { cursor: pointer; outline: 1.5px solid #e9cf96; }
  button.cell.today:disabled { cursor: default; }
  .gridhint { font-size: 11px; color: var(--mc-faint); margin: 10px 2px 0; }

  .zoomcard { background: var(--mc-panel); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-md); padding: 15px 16px; margin-top: 14px; }
  .zt { font-family: var(--mc-font-display); font-size: 15px; font-weight: 600; color: var(--mc-ink); }
  .zm { font-size: 11.5px; color: var(--mc-muted); margin-top: 4px; }
  .zbtn { display: inline-block; margin-top: 11px; font-size: 11.5px; font-weight: 700; letter-spacing: .05em; color: var(--mc-on-gold); background: var(--mc-gold); border-radius: 8px; padding: 8px 16px; text-decoration: none; }
  .zbtn:hover { background: var(--mc-gold-soft); }
  .attest-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--mc-muted); padding: 10px 2px 0; cursor: pointer; }
  .attested { font-size: 12px; color: var(--mc-good-bright); font-weight: 600; margin-top: 10px; }

  @media (max-width: 480px) {
    .dots { grid-template-columns: repeat(14, 1fr); }
    .drivers { grid-template-columns: repeat(2, 1fr); }
  }
</style>
