<script lang="ts">
  /**
   * TodayView — Week 1 single-track Today view per docs/plan/week-1-spec.md.
   *
   * Two modes selected by day-of-week + Zoom attest state:
   *   - WEEKDAY (Mon-Sat, or Sun before 5pm): daily tiles + this-week tiles.
   *   - SCOREBOARD (Sun >= 5pm, OR Wed Zoom has passed and not yet attested):
   *     weekly summary with prominent attest checkbox.
   *
   * Reads only TODAY's tiles for the daily section. The this-week section
   * shows counters but does not list which days.
   *
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

  let loading = $state(true);
  let entries = $state<AdherenceEntry[]>([]);
  let profile = $state<Partial<UserProfile> | null>(null);
  let weeklyEvent = $state<Event | null>(null);
  let expanded = $state<Record<string, boolean>>({});
  let saving = $state<Record<string, boolean>>({});

  // Read-only helpers over entries
  function entryDate(e: AdherenceEntry): string {
    // dateActionId = "YYYY-MM-DD#actionId" OR "YYYY-MM-DD-Wxx#actionId"
    const hash = e.dateActionId.indexOf('#');
    return hash > 0 ? e.dateActionId.slice(0, 10) : e.dateActionId.slice(0, 10);
  }
  function entryAction(e: AdherenceEntry): string {
    const hash = e.dateActionId.indexOf('#');
    return hash > 0 ? e.dateActionId.slice(hash + 1) : '';
  }
  function todayHas(actionId: string): boolean {
    return entries.some(e => entryAction(e) === actionId && entryDate(e) === today);
  }
  function weekCount(actionId: string): number {
    return entries.filter(e => entryAction(e) === actionId).length;
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

  // Mode selection
  const isSunday = now.getDay() === 0;
  const isAfter5pm = now.getHours() >= 17;
  const weeklyZoomAttested = $derived(!!profile?.weeklyZoomAttestedAt
    && new Date(profile.weeklyZoomAttestedAt).getTime() >= weekStart.getTime());

  // Wednesday Zoom default — if event passed and not attested, show scoreboard.
  const wedZoomPassed = $derived.by(() => {
    if (!weeklyEvent) return false;
    return new Date(weeklyEvent.startsAt).getTime() < now.getTime();
  });

  const scoreboardMode = $derived(
    (isSunday && isAfter5pm) || (wedZoomPassed && !weeklyZoomAttested)
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function logAction(actionId: string, valueDate = today): Promise<void> {
    if (saving[actionId]) return;
    saving[actionId] = true;
    try {
      const res = await recordAdherence({
        date: valueDate,
        actionId,
        completed: true,
      });
      const data = (res as any)?.data?.recordAdherence ?? (res as any)?.recordAdherence;
      if (data) {
        entries = [...entries, data as AdherenceEntry];
      } else {
        // Optimistic: still update locally so UI reflects tap.
        entries = [...entries, {
          userId: '',
          dateActionId: `${valueDate}#${actionId}`,
          completedAt: new Date().toISOString(),
        } as AdherenceEntry];
      }
    } catch (err) {
      console.error('[TodayView] recordAdherence failed', err);
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
        listMyAdherence(ymd(weekStart), ymd(weekEnd)),
        getMyProfile(),
        upcomingEvents(20),
      ]);
      entries = ((adh as any)?.data?.listMyAdherence ?? (adh as any)?.listMyAdherence ?? []) as AdherenceEntry[];
      profile = ((prof as any)?.data?.getMyProfile ?? (prof as any)?.getMyProfile ?? null) as UserProfile | null;
      const evList = ((evs as any)?.data?.upcomingEvents ?? (evs as any)?.upcomingEvents ?? []) as Event[];
      // Find this-week zoom-weekly event (within Mon..Sun bounds)
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

  // ── Derived: daily tile state ──────────────────────────────────────────────
  const biomeDone = $derived(todayHas(A_BIOME));
  const windowDone = $derived(todayHas(A_WINDOW));
  const walkCount = $derived(weekCount(A_WALK));
  const strengthCount = $derived(weekCount(A_STRENGTH));
  const proteinCount = $derived(weekCount(A_PROTEIN));
  const zoomDone = $derived(weeklyZoomAttested);
  const coldDone = $derived(todayHas(A_COLD));
  const stepsDone = $derived(todayHas(A_STEPS));

  // This-week "done count" header — counts capped per spec
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

  // Scoreboard calcs
  const dailyCompletionPct = $derived.by(() => {
    // Trailing 7 days of biome + eating window
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(ymd(d));
    }
    let hits = 0;
    for (const d of days) {
      if (entries.some(e => entryDate(e) === d && entryAction(e) === A_BIOME)) hits++;
      if (entries.some(e => entryDate(e) === d && entryAction(e) === A_WINDOW)) hits++;
    }
    return Math.round((hits / (days.length * 2)) * 100);
  });

  const streak = $derived.by(() => {
    // Longest run of consecutive days hitting Biome NS Ultra (within loaded week)
    let best = 0, cur = 0;
    const days: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(ymd(d));
    }
    days.reverse();
    for (const d of days) {
      if (entries.some(e => entryDate(e) === d && entryAction(e) === A_BIOME)) {
        cur++;
        if (cur > best) best = cur;
      } else {
        cur = 0;
      }
    }
    return best;
  });

  const overallAdherencePct = $derived.by(() => {
    const total = 2 * 7 /*biome+window x 7*/ + 2 + 2 + 2 + 1;
    let hits = 0;
    // daily
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
    <p class="meta">Loading...</p>
  {:else if scoreboardMode}
    <!-- ── SCOREBOARD MODE ─────────────────────────────────────────────── -->
    <h1 class="head">Week 1 scoreboard</h1>
    <p class="sub">{headerDate}</p>

    <div class="card">
      <div class="row">
        <div class="stat">
          <div class="stat-n">{streak}</div>
          <div class="stat-l">Day streak</div>
        </div>
        <div class="stat">
          <div class="stat-n">{dailyCompletionPct}%</div>
          <div class="stat-l">Daily, last 7 days</div>
        </div>
        <div class="stat">
          <div class="stat-n">{overallAdherencePct}%</div>
          <div class="stat-l">Week 1 overall</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="sec">This week</h2>
      <ul class="tally">
        <li>Fasted sunlight walk: {Math.min(walkCount, 2)} / 2</li>
        <li>Strength session: {Math.min(strengthCount, 2)} / 2</li>
        <li>30g protein breakfast: {Math.min(proteinCount, 2)} / 2</li>
        <li>Zoom: {zoomDone ? 1 : 0} / 1</li>
      </ul>
    </div>

    <div class="card attest">
      <p class="orient">Week 2 unlocks when you attest you watched (live or recording).</p>
      {#if weeklyEvent}
        <p class="meta">{weeklyEvent.title} — {fmtEvent(weeklyEvent)}</p>
        {#if (weeklyEvent as any).recordingUrl}
          <p><a class="lnk" href={(weeklyEvent as any).recordingUrl} target="_blank" rel="noreferrer">Watch recording →</a></p>
        {/if}
      {/if}
      {#if zoomDone}
        <div class="tile done">Attested ✓</div>
      {:else}
        <button class="tile big" onclick={attestZoom} disabled={!!saving['__zoom']}>
          {saving['__zoom'] ? 'Saving...' : 'I attended live or watched the recording.'}
        </button>
      {/if}
    </div>
  {:else}
    <!-- ── WEEKDAY MODE ───────────────────────────────────────────────── -->
    <h1 class="head">Good morning{firstName ? `, ${firstName}` : ''}.</h1>
    <p class="sub">{headerDate}</p>

    <h2 class="sec">Daily</h2>

    <!-- Biome NS Ultra -->
    <div class="card tile-card">
      <button class="tile" class:done={biomeDone} onclick={() => logAction(A_BIOME)} disabled={biomeDone || !!saving[A_BIOME]}>
        <span class="check">{biomeDone ? '✓' : ''}</span>
        <span>Take Biome NS Ultra</span>
      </button>
      <button class="more" onclick={() => toggleExpand('biome')}>{expanded['biome'] ? 'Hide' : 'Why'}</button>
      {#if expanded['biome']}
        <div class="exp">
          BPC-157 oral is added to your protocol at your consult — it ships with your GLP-1 prescription.
          <a class="lnk" href="https://my4mlife.com/cart?sku=consult-comprehensive">Book your consult →</a>
        </div>
      {/if}
    </div>

    <!-- Eating window -->
    <div class="card tile-card">
      <button class="tile" class:done={windowDone} onclick={() => logAction(A_WINDOW)} disabled={windowDone || !!saving[A_WINDOW]}>
        <span class="check">{windowDone ? '✓' : ''}</span>
        <span>Stayed in {fmtTime12(eatStart)}–{fmtTime12(eatEnd)} eating window</span>
      </button>
      <button class="more" onclick={() => toggleExpand('window')}>{expanded['window'] ? 'Hide' : 'Why'}</button>
      {#if expanded['window']}
        <div class="exp">
          A consistent overnight fast gives the gut lining time to repair and lowers insulin between meals.
          Same calories, better metabolic outcome.
        </div>
      {/if}
    </div>

    <h2 class="sec">This week <span class="hdr-n">({weekHeader.done} of {weekHeader.total} done)</span></h2>

    <!-- Fasted walk -->
    <div class="card tile-card">
      <button class="tile" class:done={walkCount >= 2} onclick={() => logAction(A_WALK)} disabled={!!saving[A_WALK]}>
        <span class="check">{walkCount >= 2 ? '✓' : `${Math.min(walkCount, 2)}/2`}</span>
        <span>Fasted morning sunlight walk</span>
      </button>
      <button class="more" onclick={() => toggleExpand('walk')}>{expanded['walk'] ? 'Hide' : 'Why'}</button>
      {#if expanded['walk']}
        <div class="exp">
          Morning sunlight on bare eyes (no sunglasses) anchors your circadian clock and regulates the cortisol-awakening response.
          Done fasted, it sharpens the metabolic signal.
        </div>
      {/if}
    </div>

    <!-- Strength -->
    <div class="card tile-card">
      <button class="tile" class:done={strengthCount >= 2} onclick={() => logAction(A_STRENGTH)} disabled={!!saving[A_STRENGTH]}>
        <span class="check">{strengthCount >= 2 ? '✓' : `${Math.min(strengthCount, 2)}/2`}</span>
        <span>Strength session (push-ups 3×10 + air squats 3×10)</span>
      </button>
      <button class="more" onclick={() => toggleExpand('strength')}>{expanded['strength'] ? 'Hide' : 'Form'}</button>
      {#if expanded['strength']}
        <div class="exp">
          Form: push-ups against the kitchen counter, body straight, slow eccentric.
          Squats: hold the counter for balance, sit back, knees track over toes.
        </div>
      {/if}
    </div>

    <!-- Protein breakfast -->
    <div class="card tile-card">
      <button class="tile" class:done={proteinCount >= 2} onclick={() => logAction(A_PROTEIN)} disabled={!!saving[A_PROTEIN]}>
        <span class="check">{proteinCount >= 2 ? '✓' : `${Math.min(proteinCount, 2)}/2`}</span>
        <span>30g protein breakfast</span>
      </button>
      <button class="more" onclick={() => toggleExpand('protein')}>{expanded['protein'] ? 'Hide' : 'Examples'}</button>
      {#if expanded['protein']}
        <div class="exp">
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

    <!-- Weekly Zoom -->
    <div class="card tile-card">
      <div class="tile" class:done={zoomDone}>
        <span class="check">{zoomDone ? '✓' : '0/1'}</span>
        <span>Watch this week's Zoom</span>
      </div>
      {#if weeklyEvent}
        <p class="meta">{weeklyEvent.title} — {fmtEvent(weeklyEvent)}</p>
        {#if (weeklyEvent as any).recordingUrl}
          <p><a class="lnk" href={(weeklyEvent as any).recordingUrl} target="_blank" rel="noreferrer">Watch recording →</a></p>
        {/if}
      {/if}
      {#if !zoomDone}
        <label class="attest-row">
          <input type="checkbox" onchange={attestZoom} disabled={!!saving['__zoom']} />
          I attended live or watched the recording.
        </label>
      {/if}
    </div>

    {#if profile?.bonusTargetsEnabled}
      <h2 class="sec">Bonus targets</h2>
      <div class="card tile-card">
        <button class="tile" class:done={coldDone} onclick={() => logAction(A_COLD)} disabled={coldDone || !!saving[A_COLD]}>
          <span class="check">{coldDone ? '✓' : ''}</span>
          <span>Cold shower close (≥1 min)</span>
        </button>
      </div>
      <div class="card tile-card">
        <button class="tile" class:done={stepsDone} onclick={() => logAction(A_STEPS)} disabled={stepsDone || !!saving[A_STEPS]}>
          <span class="check">{stepsDone ? '✓' : ''}</span>
          <span>Walk 10,000 steps</span>
        </button>
      </div>
    {/if}

    <p class="footer">
      You're here because you don't want to become the person you're afraid of. We start with your gut because the brain runs on what the gut makes.
    </p>
  {/if}
</div>

<style>
  .today { max-width: 720px; padding: 8px 4px 64px; }
  .head { font-size: 22px; font-weight: 800; color: #e8eaf0; margin: 4px 0 2px; letter-spacing: .01em; }
  .sub { font-size: 12.5px; color: #6A8A6E; margin: 0 0 22px; }
  .sec { font-size: 13px; font-weight: 700; color: #A8D8C0; letter-spacing: .08em; text-transform: uppercase; margin: 22px 0 10px; }
  .hdr-n { font-weight: 500; color: #6A8A6E; text-transform: none; letter-spacing: 0; font-size: 12px; }
  .card { background: #1a2a1e; border: 1px solid #2a3d2e; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
  .tile-card { padding: 10px 12px; }
  .tile {
    display: flex; align-items: center; gap: 12px;
    width: 100%;
    background: transparent;
    border: none;
    color: #e8eaf0;
    font-size: 14px;
    font-weight: 600;
    text-align: left;
    padding: 10px 6px;
    cursor: pointer;
    border-radius: 8px;
  }
  .tile:hover:not(:disabled) { background: #243426; }
  .tile.done { color: #1D9E75; }
  .tile.done .check { color: #1D9E75; }
  .tile:disabled { cursor: default; }
  .tile.big { font-size: 14px; font-weight: 700; background: #1D9E75; color: #fff; justify-content: center; padding: 14px; }
  .check {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 32px; height: 22px;
    font-size: 13px; font-weight: 700; color: #6A8A6E;
    border: 1.5px solid #2a3d2e; border-radius: 6px;
    padding: 0 6px;
  }
  .tile.done .check { border-color: #1D9E75; }
  .more {
    background: none; border: none; color: #6A8A6E; font-size: 11.5px; cursor: pointer;
    padding: 4px 6px 0; text-decoration: underline;
  }
  .exp { font-size: 12.5px; color: #A8D8C0; line-height: 1.6; padding: 8px 6px 4px; }
  .ex-h { font-size: 12.5px; color: #e8eaf0; font-weight: 700; margin: 8px 0 2px; }
  .ex-l { font-size: 12px; color: #A8D8C0; margin: 0 0 6px; }
  .disc { font-size: 10.5px; color: #6A8A6E; font-style: italic; margin: 10px 0 0; line-height: 1.5; }
  .lnk { color: #6B5ED4; text-decoration: underline; }
  .meta { font-size: 11.5px; color: #6A8A6E; margin: 6px 6px 4px; }
  .attest-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #A8D8C0; padding: 8px 6px; cursor: pointer; }
  .footer { font-size: 11.5px; color: #6A8A6E; line-height: 1.6; margin: 32px 4px 0; font-style: italic; }
  /* Scoreboard */
  .row { display: flex; gap: 16px; justify-content: space-between; }
  .stat { flex: 1; text-align: center; }
  .stat-n { font-size: 28px; font-weight: 800; color: #1D9E75; line-height: 1; }
  .stat-l { font-size: 10.5px; color: #6A8A6E; margin-top: 6px; letter-spacing: .04em; text-transform: uppercase; }
  .tally { list-style: none; padding: 0; margin: 0; font-size: 13px; color: #A8D8C0; line-height: 1.9; }
  .attest .orient { font-size: 12.5px; color: #A8D8C0; margin: 0 0 12px; }
  .tile.done:not(.big) { background: #1a2a1e; }
</style>
