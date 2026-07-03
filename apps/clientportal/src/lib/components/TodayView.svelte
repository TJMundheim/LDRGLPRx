<script lang="ts">
  /**
   * TodayView — "Daily Brief" (Mission Control restyle, approved 2026-07-02).
   *
   * Two modes selected by day-of-week + Zoom attest state:
   *   - WEEKDAY (Mon-Sat, or Sun before 5pm): MindSpan hero + status tiles +
   *     daily/this-week action rows.
   *   - SCOREBOARD (Sun >= 5pm, OR Wed Zoom has passed and not yet attested):
   *     weekly summary with prominent attest button.
   *
   * MindSpan Score v1 (lib/mindspan.ts): adherence + audit risk load + streak.
   * Tone: no emoji, no exclamation marks, no celebration popups.
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
  import { AFFILIATES, AFFILIATE_DISCLOSURE } from '../affiliates.js';
  import {
    riskLoadFromScores,
    mindspanScore,
    adherencePctForWindow,
    streakDays,
    mindspanSeries,
    weeklyDelta,
  } from '../mindspan.js';
  import { pushToast } from '../toast/toast.svelte.js';

  type Props = { firstName?: string };
  const { firstName = '' }: Props = $props();

  // Action IDs (spec §"How to read state")
  const A_BIOME = 'biome-ns-ultra';
  const A_WINDOW = 'eating-window';
  const A_WALK = 'fasted-walk';
  const A_STRENGTH = 'strength';
  const A_PROTEIN = 'protein-breakfast';
  const A_COLD = 'cold-shower';
  const A_STEPS = '10k-steps';

  // ── Date helpers (user local time) ──────────────────────────────────────────
  function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function startOfWeekMon(d: Date): Date {
    const out = new Date(d);
    const dow = out.getDay(); // 0=Sun..6=Sat
    const diff = dow === 0 ? -6 : 1 - dow;
    out.setDate(out.getDate() + diff);
    out.setHours(0, 0, 0, 0);
    return out;
  }
  function endOfWeekSun(d: Date): Date {
    const start = startOfWeekMon(d);
    const out = new Date(start);
    out.setDate(out.getDate() + 6);
    out.setHours(23, 59, 59, 999);
    return out;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const today = ymd(now);
  const weekStart = startOfWeekMon(now);
  const weekEnd = endOfWeekSun(now);
  // MindSpan needs history: fetch from 14 days before the week for streak/series.
  const fetchStart = (() => { const d = new Date(weekStart); d.setDate(d.getDate() - 14); return d; })();
  const dayOfWeek = Math.min(7, Math.max(1, Math.floor((now.getTime() - weekStart.getTime()) / 86400000) + 1));

  let loading = $state(true);
  let entries = $state<AdherenceEntry[]>([]);
  let profile = $state<Partial<UserProfile> | null>(null);
  let weeklyEvent = $state<Event | null>(null);
  let expanded = $state<Record<string, boolean>>({});
  let saving = $state<Record<string, boolean>>({});

  // Read-only helpers over entries
  function entryDate(e: AdherenceEntry): string {
    return e.dateActionId.slice(0, 10);
  }
  function entryAction(e: AdherenceEntry): string {
    const hash = e.dateActionId.indexOf('#');
    return hash > 0 ? e.dateActionId.slice(hash + 1) : '';
  }
  function todayHas(actionId: string): boolean {
    return entries.some(e => entryAction(e) === actionId && entryDate(e) === today);
  }
  // Weekly counters use the current week window only (unchanged semantics).
  function weekCount(actionId: string): number {
    const ws = ymd(weekStart);
    return entries.filter(e => entryAction(e) === actionId && entryDate(e) >= ws).length;
  }

  // Eating window (with sensible defaults from spec)
  const eatStart = $derived(profile?.eatingWindowStart || '9:00');
  const eatEnd = $derived(profile?.eatingWindowEnd || '18:00');
  function fmtTime12(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(':');
    let h = parseInt(hStr ?? '0', 10);
    const m = parseInt(mStr ?? '0', 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  const windowHoursLeft = $derived.by(() => {
    const [hStr, mStr] = eatEnd.split(':');
    const end = new Date(now);
    end.setHours(parseInt(hStr ?? '18', 10), parseInt(mStr ?? '0', 10), 0, 0);
    const hrs = (end.getTime() - Date.now()) / 3600000;
    return hrs > 0 ? Math.ceil(hrs) : 0;
  });

  // Mode selection
  const isSunday = now.getDay() === 0;
  const isAfter5pm = now.getHours() >= 17;
  const weeklyZoomAttested = $derived(!!profile?.weeklyZoomAttestedAt
    && new Date(profile.weeklyZoomAttestedAt).getTime() >= weekStart.getTime());

  const wedZoomPassed = $derived.by(() => {
    if (!weeklyEvent) return false;
    return new Date(weeklyEvent.startsAt).getTime() < now.getTime();
  });

  const scoreboardMode = $derived(
    (isSunday && isAfter5pm) || (wedZoomPassed && !weeklyZoomAttested)
  );

  // ── MindSpan ────────────────────────────────────────────────────────────────
  // Risk load from the intake audit factor scores (audit-v1.scores, 0–5 scale);
  // neutral 50 when the assessment isn't hydrated yet.
  const riskLoad = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('audit-v1') : null;
      if (!raw) return riskLoadFromScores(null);
      const outer = JSON.parse(raw) as { scores?: Record<string, number> };
      return riskLoadFromScores(outer.scores ?? (outer as unknown as Record<string, number>));
    } catch {
      return riskLoadFromScores(null);
    }
  })();

  const msAdherence = $derived(adherencePctForWindow(entries, now));
  const msStreak = $derived(streakDays(entries, now));
  const msScore = $derived(mindspanScore({ adherencePct: msAdherence, riskLoad, streakDays: msStreak }));
  const msSeries = $derived(mindspanSeries(entries, riskLoad, now));
  const msDelta = $derived(weeklyDelta(msSeries));

  const RING_R = 72;
  const RING_C = 2 * Math.PI * RING_R;
  const ringDash = $derived(`${(RING_C * msScore / 100).toFixed(1)} ${(RING_C * (1 - msScore / 100)).toFixed(1)}`);
  const sparkPoints = $derived.by(() => {
    const s = msSeries;
    if (s.length < 2) return '';
    const min = Math.min(...s), max = Math.max(...s);
    const span = Math.max(1, max - min);
    return s.map((v, i) => {
      const x = (i / (s.length - 1)) * 200;
      const y = 30 - ((v - min) / span) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });
  const sparkEnd = $derived.by(() => {
    const pts = sparkPoints.split(' ');
    const last = pts[pts.length - 1] ?? '200,10';
    const [x, y] = last.split(',');
    return { x: x ?? '200', y: y ?? '10' };
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function logAction(actionId: string, valueDate = today): Promise<void> {
    if (saving[actionId]) return;
    saving[actionId] = true;
    // Optimistic entry so the tap lands instantly; rolled back on failure.
    const optimistic = {
      userId: '',
      dateActionId: `${valueDate}#${actionId}`,
      completedAt: new Date().toISOString(),
    } as AdherenceEntry;
    entries = [...entries, optimistic];
    try {
      const res = await recordAdherence({
        date: valueDate,
        actionId,
        completed: true,
      });
      const data = (res as any)?.data?.recordAdherence ?? (res as any)?.recordAdherence;
      if (data) {
        entries = [...entries.filter(e => e !== optimistic), data as AdherenceEntry];
      }
    } catch (err) {
      console.error('[TodayView] recordAdherence failed', err);
      entries = entries.filter(e => e !== optimistic);
      pushToast({
        message: 'Could not save that action — check your connection.',
        retry: () => logAction(actionId, valueDate),
      });
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
      } as any);
      const data = (res as any)?.data?.upsertMyProfile ?? (res as any)?.upsertMyProfile;
      if (data) profile = data;
    } catch (err) {
      console.error('[TodayView] attest failed', err);
      pushToast({
        message: 'Could not record your attestation — check your connection.',
        retry: () => attestZoom(),
      });
    } finally {
      saving['__zoom'] = false;
    }
  }

  function toggleExpand(key: string): void {
    expanded[key] = !expanded[key];
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  onMount(async () => {
    try {
      const [adh, prof, evs] = await Promise.all([
        listMyAdherence(ymd(fetchStart), ymd(weekEnd)),
        getMyProfile(),
        upcomingEvents(20),
      ]);
      entries = ((adh as any)?.data?.listMyAdherence ?? (adh as any)?.listMyAdherence ?? []) as AdherenceEntry[];
      profile = ((prof as any)?.data?.getMyProfile ?? (prof as any)?.getMyProfile ?? null) as UserProfile | null;
      const evList = ((evs as any)?.data?.upcomingEvents ?? (evs as any)?.upcomingEvents ?? []) as Event[];
      weeklyEvent = evList.find(e => {
        if (e.type !== 'zoom-weekly') return false;
        const t = new Date(e.startsAt).getTime();
        return t >= weekStart.getTime() && t <= weekEnd.getTime();
      }) ?? null;
    } catch (err) {
      console.error('[TodayView] load failed', err);
    } finally {
      loading = false;
    }
  });

  // ── Derived: tile + row state ───────────────────────────────────────────────
  const biomeDone = $derived(todayHas(A_BIOME));
  const windowDone = $derived(todayHas(A_WINDOW));
  const walkCount = $derived(weekCount(A_WALK));
  const strengthCount = $derived(weekCount(A_STRENGTH));
  const proteinCount = $derived(weekCount(A_PROTEIN));
  const zoomDone = $derived(weeklyZoomAttested);
  const coldDone = $derived(todayHas(A_COLD));
  const stepsDone = $derived(todayHas(A_STEPS));

  const weekHeader = $derived.by(() => {
    const items = [
      Math.min(walkCount, 2),
      Math.min(strengthCount, 2),
      Math.min(proteinCount, 2),
      zoomDone ? 1 : 0,
    ];
    const total = 2 + 2 + 2 + 1; // 7
    return { done: items.reduce((a, b) => a + b, 0), total };
  });

  // Scoreboard calcs (unchanged semantics)
  const dailyCompletionPct = $derived(adherencePctForWindow(entries, now));
  const overallAdherencePct = $derived.by(() => {
    const total = 2 * 7 + 2 + 2 + 2 + 1;
    let hits = 0;
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(ymd(d));
    }
    for (const d of days) {
      if (entries.some(e => entryDate(e) === d && entryAction(e) === A_BIOME)) hits++;
      if (entries.some(e => entryDate(e) === d && entryAction(e) === A_WINDOW)) hits++;
    }
    hits += Math.min(walkCount, 2);
    hits += Math.min(strengthCount, 2);
    hits += Math.min(proteinCount, 2);
    if (zoomDone) hits += 1;
    return Math.round((hits / total) * 100);
  });

  // ── Format helpers ────────────────────────────────────────────────────────
  const headerDate = now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  function fmtEvent(e: Event): string {
    return new Date(e.startsAt).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }
</script>

<div class="today">
  {#if loading}
    <p class="meta">Loading…</p>
  {:else if scoreboardMode}
    <!-- ── SCOREBOARD MODE ─────────────────────────────────────────────── -->
    <h1 class="head">Week 1 scoreboard</h1>
    <p class="sub">{headerDate}</p>

    <div class="score-cards">
      <div class="scard"><div class="n">{msStreak}</div><div class="l">Day streak</div></div>
      <div class="scard"><div class="n">{dailyCompletionPct}%</div><div class="l">Daily · last 7 days</div></div>
      <div class="scard"><div class="n">{overallAdherencePct}%</div><div class="l">Week 1 overall</div></div>
    </div>

    <div class="tallycard">
      <div class="tally-row"><span>Fasted sunlight walk</span><span class="v" class:hit={walkCount >= 2}>{Math.min(walkCount, 2)} / 2</span></div>
      <div class="tally-row"><span>Strength session</span><span class="v" class:hit={strengthCount >= 2}>{Math.min(strengthCount, 2)} / 2</span></div>
      <div class="tally-row"><span>30–40g protein breakfast</span><span class="v" class:hit={proteinCount >= 2}>{Math.min(proteinCount, 2)} / 2</span></div>
      <div class="tally-row"><span>Cohort call</span><span class="v" class:hit={zoomDone}>{zoomDone ? 1 : 0} / 1</span></div>
    </div>

    <div class="attest-card">
      <p class="orient">Week 2 unlocks when you attest you watched — live or the recording.</p>
      {#if weeklyEvent}
        <p class="meta">{weeklyEvent.title} — {fmtEvent(weeklyEvent)}</p>
        {#if (weeklyEvent as any).recordingUrl}
          <p><a class="lnk" href={(weeklyEvent as any).recordingUrl} target="_blank" rel="noreferrer">Watch recording</a></p>
        {/if}
      {/if}
      {#if zoomDone}
        <div class="attested">Attested — Week 2 unlocked</div>
      {:else}
        <button class="attest-btn" onclick={attestZoom} disabled={!!saving['__zoom']}>
          {saving['__zoom'] ? 'Saving…' : 'I attended live or watched the recording'}
        </button>
      {/if}
    </div>
  {:else}
    <!-- ── DAILY BRIEF ────────────────────────────────────────────────── -->
    <h1 class="head">Good morning{firstName ? `, ${firstName}` : ''}.</h1>
    <p class="sub">{headerDate} · Week 1, Day {dayOfWeek}</p>

    <div class="brief-grid">
      <div class="hero">
        <div class="klabel">MindSpan Score</div>
        <svg class="ring" width="168" height="168" viewBox="0 0 168 168" role="img" aria-label="MindSpan score {msScore} of 100">
          <defs><linearGradient id="msg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e3c98b"/><stop offset="1" stop-color="#d4af5a"/>
          </linearGradient></defs>
          <circle cx="84" cy="84" r={RING_R} fill="none" stroke="#16244a" stroke-width="9"/>
          <circle cx="84" cy="84" r={RING_R} fill="none" stroke="url(#msg1)" stroke-width="9" stroke-linecap="round"
            stroke-dasharray={ringDash} transform="rotate(-90 84 84)"/>
          <text class="ring-num" x="84" y="95" text-anchor="middle">{msScore}</text>
          <text class="ring-unit" x="84" y="114" text-anchor="middle">of 100</text>
        </svg>
        <div class="trend" class:flat={msDelta < 0}>
          {msDelta >= 0 ? '▲' : '▽'} {Math.abs(msDelta).toFixed(1)} this week
        </div>
        {#if sparkPoints}
          <svg class="spark" width="200" height="34" viewBox="0 0 200 34" role="img" aria-label="Seven-day score trend">
            <polyline points={sparkPoints} fill="none" stroke="var(--mc-gold)" stroke-width="2"/>
            <circle cx={sparkEnd.x} cy={sparkEnd.y} r="3.5" fill="var(--mc-gold)"/>
          </svg>
        {/if}
        <div class="caption">Every logged action moves it</div>
        <div class="drivers">
          <div class="drv"><div class="dl">Adherence</div><div class="dv" class:g={msAdherence >= 70}>{msAdherence}%</div></div>
          <div class="drv"><div class="dl">Risk load</div><div class="dv">{Math.round(riskLoad)}</div></div>
          <div class="drv"><div class="dl">Streak</div><div class="dv" class:g={msStreak >= 3}>{msStreak}d</div></div>
        </div>
      </div>

      <div>
        <div class="tiles">
          <div class="tile" class:ok={biomeDone} class:due={!biomeDone}>
            <div class="tl">Gut protocol</div>
            <div class="tv">{biomeDone ? 'Done' : 'Due'} <small>today</small></div>
          </div>
          <div class="tile" class:ok={windowDone} class:due={!windowDone}>
            <div class="tl">Eating window</div>
            <div class="tv">{fmtTime12(eatStart).replace(' ', '')}–{fmtTime12(eatEnd).replace(' ', '')}
              <small>{windowDone ? 'held' : (windowHoursLeft > 0 ? `${windowHoursLeft}h left` : 'closes today')}</small></div>
          </div>
          <div class="tile" class:ok={walkCount >= 2} class:due={walkCount < 2}>
            <div class="tl">Walks</div>
            <div class="tv">{Math.min(walkCount, 2)}/2 <small>this wk</small></div>
          </div>
          <div class="tile" class:ok={strengthCount >= 2} class:due={strengthCount < 2}>
            <div class="tl">Strength</div>
            <div class="tv">{Math.min(strengthCount, 2)}/2 <small>this wk</small></div>
          </div>
        </div>

        <h2 class="sec">Daily</h2>

        <div class="actwrap">
          <button class="act" class:done={biomeDone} onclick={() => logAction(A_BIOME)} disabled={biomeDone || !!saving[A_BIOME]}>
            <span class="sq">{biomeDone ? '✓' : ''}</span>
            <span class="t">Take Biome NS Ultra</span>
            {#if msStreak >= 3 && biomeDone}<span class="count hit">{msStreak}-day streak</span>{/if}
          </button>
          <button class="more" onclick={() => toggleExpand('biome')}>{expanded['biome'] ? 'Hide' : 'Why'}</button>
          {#if expanded['biome']}
            <div class="exp">
              BPC-157 oral is added to your protocol at your consult — it ships with your GLP-1 prescription.
              <a class="lnk" href="https://my4mlife.com/cart?sku=consult-comprehensive">Book your consult</a>
            </div>
          {/if}
        </div>

        <div class="actwrap">
          <button class="act" class:done={windowDone} onclick={() => logAction(A_WINDOW)} disabled={windowDone || !!saving[A_WINDOW]}>
            <span class="sq">{windowDone ? '✓' : ''}</span>
            <span class="t">Hold the {fmtTime12(eatStart)}–{fmtTime12(eatEnd)} eating window</span>
            {#if !windowDone && windowHoursLeft > 0}<span class="count">{windowHoursLeft} h left</span>{/if}
          </button>
          <button class="more" onclick={() => toggleExpand('window')}>{expanded['window'] ? 'Hide' : 'Why'}</button>
          {#if expanded['window']}
            <div class="exp">
              Default window: 9am–6pm. Once you reach ideal body weight, low body fat, and low visceral fat you can experiment with an earlier cutoff (4–5pm) to further regulate cortisol before sleep.
              Train fasted in the morning until those targets are met — break the fast after your workout with 30–40g of lean protein.
              Same calories, better metabolic outcome.
            </div>
          {/if}
        </div>

        <h2 class="sec">This week <span class="hdr-n">{weekHeader.done} of {weekHeader.total} done</span></h2>

        <div class="actwrap">
          <button class="act" class:done={walkCount >= 2} onclick={() => logAction(A_WALK)} disabled={!!saving[A_WALK]}>
            <span class="sq">{walkCount >= 2 ? '✓' : ''}</span>
            <span class="t">Fasted morning sunlight walk</span>
            <span class="count" class:hit={walkCount >= 2}>{Math.min(walkCount, 2)}/2</span>
          </button>
          <button class="more" onclick={() => toggleExpand('walk')}>{expanded['walk'] ? 'Hide' : 'Why'}</button>
          {#if expanded['walk']}
            <div class="exp">
              Morning sunlight on bare eyes (no sunglasses) anchors your circadian clock and regulates the cortisol-awakening response.
              Done fasted, it sharpens the metabolic signal — fasted morning walking is a great accelerator while you are working toward ideal body weight and low visceral fat.
              Break the fast after your workout with 30–40g of lean protein (if your workout ends around 10am, eat after that).
            </div>
          {/if}
        </div>

        <div class="actwrap">
          <button class="act" class:done={strengthCount >= 2} onclick={() => logAction(A_STRENGTH)} disabled={!!saving[A_STRENGTH]}>
            <span class="sq">{strengthCount >= 2 ? '✓' : ''}</span>
            <span class="t">Strength session — push-ups 3×10 + air squats 3×10</span>
            <span class="count" class:hit={strengthCount >= 2}>{Math.min(strengthCount, 2)}/2</span>
          </button>
          <button class="more" onclick={() => toggleExpand('strength')}>{expanded['strength'] ? 'Hide' : 'Form'}</button>
          {#if expanded['strength']}
            <div class="exp">
              Form: push-ups against the kitchen counter, body straight, slow eccentric.
              Squats: hold the counter for balance, sit back, knees track over toes.
            </div>
          {/if}
        </div>

        <div class="actwrap">
          <button class="act" class:done={proteinCount >= 2} onclick={() => logAction(A_PROTEIN)} disabled={!!saving[A_PROTEIN]}>
            <span class="sq">{proteinCount >= 2 ? '✓' : ''}</span>
            <span class="t">30–40g protein breakfast</span>
            <span class="count" class:hit={proteinCount >= 2}>{Math.min(proteinCount, 2)}/2</span>
          </button>
          <button class="more" onclick={() => toggleExpand('protein')}>{expanded['protein'] ? 'Hide' : 'Examples'}</button>
          {#if expanded['protein']}
            <div class="exp">
              <p class="exp-lead">Break the fast after your workout with 30–40g of lean protein. First meal opens your eating window — aim for the 9am–6pm default.</p>
              <p class="ex-h">Eggs + breakfast sausage + spinach (~32g)</p>
              <p class="ex-l">
                <a class="lnk" href={AFFILIATES.butcherbox.link('/')} target="_blank" rel="noreferrer">ButcherBox</a> ·
                <a class="lnk" href={AFFILIATES.thrive.link('/')} target="_blank" rel="noreferrer">Thrive Market</a>
              </p>
              <p class="ex-h">Wild salmon + leftover greens (~34g)</p>
              <p class="ex-l">
                <a class="lnk" href={AFFILIATES.butcherbox.link('/')} target="_blank" rel="noreferrer">ButcherBox</a> ·
                <a class="lnk" href={AFFILIATES.amazon.link('/')} target="_blank" rel="noreferrer">Amazon</a>
              </p>
              <p class="ex-h">Leftover ribeye + soft-boiled egg (~40g)</p>
              <p class="ex-l">
                <a class="lnk" href={AFFILIATES.butcherbox.link('/')} target="_blank" rel="noreferrer">ButcherBox</a> ·
                <a class="lnk" href={AFFILIATES.thrive.link('/')} target="_blank" rel="noreferrer">Thrive Market</a>
              </p>
              <p class="disc">{AFFILIATE_DISCLOSURE}</p>
            </div>
          {/if}
        </div>

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
          {#if !zoomDone}
            <label class="attest-row">
              <input type="checkbox" onchange={attestZoom} disabled={!!saving['__zoom']} />
              I attended live or watched the recording
            </label>
          {:else}
            <div class="attested-inline">Attested for this week</div>
          {/if}
        </div>

        {#if profile?.bonusTargetsEnabled}
          <h2 class="sec">Bonus targets</h2>
          <div class="actwrap">
            <button class="act" class:done={coldDone} onclick={() => logAction(A_COLD)} disabled={coldDone || !!saving[A_COLD]}>
              <span class="sq">{coldDone ? '✓' : ''}</span>
              <span class="t">Cold shower close (≥1 min)</span>
            </button>
          </div>
          <div class="actwrap">
            <button class="act" class:done={stepsDone} onclick={() => logAction(A_STEPS)} disabled={stepsDone || !!saving[A_STEPS]}>
              <span class="sq">{stepsDone ? '✓' : ''}</span>
              <span class="t">Walk 10,000 steps</span>
            </button>
          </div>
        {/if}

        <p class="footer">
          You're here because you don't want to become the person you're afraid of. We start with your gut because the brain runs on what the gut makes.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .today { max-width: 980px; padding: 8px 4px 64px; }
  .head { font-family: var(--mc-font-display); font-size: 26px; font-weight: 700; color: var(--mc-ink); margin: 4px 0 2px; letter-spacing: -.01em; }
  .sub { font-size: 11.5px; color: var(--mc-muted); margin: 0 0 20px; letter-spacing: .08em; text-transform: uppercase; }
  .sec { font-size: 11px; font-weight: 600; color: var(--mc-muted); letter-spacing: .2em; text-transform: uppercase; margin: 22px 0 10px; }
  .hdr-n { font-weight: 500; color: var(--mc-faint); text-transform: none; letter-spacing: 0; font-size: 11.5px; font-variant-numeric: tabular-nums; }
  .meta { font-size: 11.5px; color: var(--mc-muted); margin: 6px 0 4px; }
  .lnk { color: var(--mc-gold); text-decoration: underline; text-underline-offset: 2px; }

  /* grid */
  .brief-grid { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .brief-grid { grid-template-columns: 1fr; } }

  /* hero */
  .hero { background: radial-gradient(130% 130% at 50% 0%, var(--mc-panel-raised) 0%, var(--mc-panel) 58%); border: 1px solid var(--mc-line); border-radius: var(--mc-r-lg); padding: 24px 20px; text-align: center; }
  .klabel { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--mc-gold); }
  .ring { display: block; margin: 14px auto 4px; }
  .ring-num { font-family: var(--mc-font-display); font-weight: 700; font-size: 46px; fill: var(--mc-ink); }
  .ring-unit { font-size: 10px; letter-spacing: .14em; fill: var(--mc-muted); text-transform: uppercase; }
  .trend { font-size: 13px; color: var(--mc-good-bright); font-weight: 600; }
  .trend.flat { color: var(--mc-muted); }
  .spark { display: block; margin: 12px auto 0; }
  .caption { font-size: 11px; color: var(--mc-muted); margin-top: 8px; }
  .drivers { margin-top: 16px; border-top: 1px solid var(--mc-line); padding-top: 13px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .drv .dl { font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--mc-faint); }
  .drv .dv { font-size: 15px; font-weight: 600; margin-top: 3px; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
  .drv .dv.g { color: var(--mc-good-bright); }

  /* tiles */
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tile { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 13px 14px; position: relative; }
  .tile .tl { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--mc-muted); }
  .tile .tv { font-size: 17px; font-weight: 600; margin-top: 5px; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
  .tile .tv small { font-size: 10.5px; color: var(--mc-muted); font-weight: 400; }
  .tile.ok { border-color: rgba(46, 158, 107, .5); }
  .tile.ok::after { content: '✓'; position: absolute; top: 9px; right: 12px; color: var(--mc-good-bright); font-size: 13px; font-weight: 700; }
  .tile.due::after { content: ''; position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: var(--mc-gold); }

  /* action rows */
  .actwrap { margin-bottom: 8px; }
  .act { display: flex; align-items: center; gap: 13px; width: 100%; background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 13px 15px; color: var(--mc-ink); font-size: 13.5px; font-weight: 500; text-align: left; cursor: pointer; transition: border-color .15s; }
  .act:hover:not(:disabled) { border-color: var(--mc-gold-line); }
  .act:disabled { cursor: default; }
  .act .sq { width: 22px; height: 22px; border-radius: 7px; border: 1.5px solid var(--mc-gold); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--mc-on-gold); background: transparent; transition: background .15s; }
  .act.done { border-color: var(--mc-line-soft); }
  .act.done .sq { background: var(--mc-gold); }
  .act.done .t { color: var(--mc-muted); }
  .act .count { margin-left: auto; font-size: 11.5px; color: var(--mc-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .act .count.hit { color: var(--mc-good-bright); font-weight: 600; }
  .more { background: none; border: none; color: var(--mc-faint); font-size: 11px; cursor: pointer; padding: 5px 6px 0; text-decoration: underline; text-underline-offset: 2px; }
  .more:hover { color: var(--mc-gold); }
  .exp { font-size: 12.5px; color: var(--mc-muted); line-height: 1.65; padding: 10px 8px 4px; }
  .exp-lead { margin-bottom: 8px; font-size: 12.5px; }
  .ex-h { font-size: 12.5px; color: var(--mc-ink); font-weight: 600; margin: 8px 0 2px; }
  .ex-l { font-size: 12px; color: var(--mc-muted); margin: 0 0 6px; }
  .disc { font-size: 10.5px; color: var(--mc-faint); font-style: italic; margin: 10px 0 0; line-height: 1.5; }

  /* zoom card */
  .zoomcard { background: var(--mc-panel); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-md); padding: 15px 16px; margin-top: 16px; }
  .zt { font-family: var(--mc-font-display); font-size: 15px; font-weight: 600; color: var(--mc-ink); }
  .zm { font-size: 11.5px; color: var(--mc-muted); margin-top: 4px; }
  .zbtn { display: inline-block; margin-top: 11px; font-size: 11.5px; font-weight: 700; letter-spacing: .05em; color: var(--mc-on-gold); background: var(--mc-gold); border-radius: 8px; padding: 8px 16px; text-decoration: none; }
  .zbtn:hover { background: var(--mc-gold-soft); }
  .attest-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--mc-muted); padding: 10px 2px 0; cursor: pointer; }
  .attested-inline { font-size: 12px; color: var(--mc-good-bright); font-weight: 600; margin-top: 10px; }

  .footer { font-size: 11.5px; color: var(--mc-faint); line-height: 1.6; margin: 28px 4px 0; font-style: italic; max-width: 52ch; }

  /* scoreboard */
  .score-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0 12px; max-width: 640px; }
  .scard { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 18px; text-align: center; }
  .scard .n { font-family: var(--mc-font-display); font-weight: 700; font-size: 32px; color: var(--mc-gold); font-variant-numeric: tabular-nums; line-height: 1; }
  .scard .l { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--mc-muted); margin-top: 7px; }
  .tallycard { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-md); padding: 16px 18px; max-width: 640px; }
  .tally-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--mc-line-soft); font-size: 13px; color: var(--mc-ink); }
  .tally-row:last-child { border-bottom: none; }
  .tally-row .v { font-variant-numeric: tabular-nums; color: var(--mc-muted); }
  .tally-row .v.hit { color: var(--mc-good-bright); font-weight: 600; }
  .attest-card { max-width: 640px; margin-top: 12px; background: var(--mc-gold-tint); border: 1px solid var(--mc-gold-line); border-radius: var(--mc-r-md); padding: 17px 19px; }
  .orient { font-size: 12.5px; color: var(--mc-ink); margin: 0 0 10px; }
  .attest-btn { border: none; font-size: 12.5px; font-weight: 700; color: var(--mc-on-gold); background: var(--mc-gold); border-radius: 8px; padding: 12px 20px; width: 100%; cursor: pointer; }
  .attest-btn:hover:not(:disabled) { background: var(--mc-gold-soft); }
  .attest-btn:disabled { opacity: .6; cursor: default; }
  .attested { font-size: 13px; color: var(--mc-good-bright); font-weight: 600; padding: 6px 0; }

  @media (max-width: 480px) {
    .tiles { grid-template-columns: 1fr 1fr; }
    .score-cards { grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  }
</style>
