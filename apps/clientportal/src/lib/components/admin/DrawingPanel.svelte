<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { listDrawingEvents, listDrawingEntrants } from '../../api/operations.js';
  import {
    pickWinner, ordinal, defaultEvent, loadState, saveState, clearState,
    type Entrant, type DrawingEventInfo,
  } from '../../drawing/drawing.js';

  let events = $state<DrawingEventInfo[]>([]);
  let tag = $state('');
  let entrants = $state<Entrant[]>([]);
  let winners = $state<Entrant[]>([]);
  let maxDraws = $state(3);
  let loading = $state(true);
  let error = $state('');
  let loaded = $state(false);

  const remaining = $derived(entrants.filter((e) => !winners.some((w) => w.contactId === e.contactId)).length);
  const atMax = $derived(winners.length >= maxDraws);
  const canDraw = $derived(!atMax && remaining > 0);

  async function loadEntrants() {
    if (!tag) return;
    loading = true;
    error = '';
    try {
      const res = await listDrawingEntrants(tag);
      entrants = res.drawingEntrants ?? [];
      loaded = true;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load entrants';
    } finally {
      loading = false;
    }
  }

  function selectTag(t: string) {
    tag = t;
    const s = loadState(t);
    winners = s.winners;
    maxDraws = s.maxDraws;
    entrants = [];
    loaded = false;
    void loadEntrants();
  }

  function persist() { saveState(tag, { winners, maxDraws }); }

  let winnersEl = $state<HTMLOListElement | null>(null);

  // A double-tap on a phone must not draw two names at once.
  let cooling = $state(false);

  async function draw() {
    if (cooling) return;
    const w = pickWinner(entrants, winners);
    if (!w) return;
    cooling = true;
    setTimeout(() => { cooling = false; }, 600);
    winners = [...winners, w];
    persist();
    // On a phone the newest name lands below the fold: bring it into view.
    await tick();
    winnersEl?.lastElementChild?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }

  function drawAnother() {
    if (cooling) return;
    maxDraws = winners.length + 1;
    persist();
    void draw();
  }

  function reset() {
    if (!window.confirm('Clear all winners for this event?')) return;
    winners = [];
    maxDraws = 3;
    clearState(tag);
  }

  onMount(async () => {
    try {
      const res = await listDrawingEvents();
      events = res.drawingEvents ?? [];
      const first = defaultEvent(events);
      if (first) selectTag(first);
      else loading = false;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load events';
      loading = false;
    }
  });
</script>

<div class="drawing">
  {#if error}<p class="error">{error}</p>{/if}

  {#if !loading && events.length === 0 && !error}
    <p class="muted">No talk events in the last 14 days.</p>
  {/if}

  {#if events.length > 0}
    <label class="picker">
      <span>Event</span>
      <select value={tag} onchange={(e) => selectTag((e.currentTarget as HTMLSelectElement).value)}>
        {#each events as ev}
          <option value={ev.tag}>{ev.tag} ({ev.entrantCount})</option>
        {/each}
      </select>
    </label>

    <div class="count">
      <div class="count-num" data-testid="entrant-count">{loaded ? entrants.length : '…'}</div>
      <div class="count-label">entrants</div>
    </div>

    <div class="actions">
      {#if !atMax}
        <button class="draw" onclick={draw} disabled={!canDraw || cooling}>Draw</button>
      {:else}
        <button class="draw" onclick={drawAnother} disabled={remaining === 0 || cooling}>Draw another</button>
      {/if}
      <div class="row">
        <button class="secondary" onclick={loadEntrants} disabled={loading}>Refresh entrants</button>
        <button class="secondary danger" onclick={reset}>Reset</button>
      </div>
    </div>

    <ol class="winners" bind:this={winnersEl}>
      {#each winners as w, i}
        <li data-testid="winner"><span class="ord">{ordinal(i + 1)}</span> <span class="name">{w.display}</span></li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .drawing { max-width: 640px; margin: 0 auto; text-align: center; }
  .picker { display: flex; flex-direction: column; gap: 6px; text-align: left; font-size: 0.8rem; color: var(--mc-ink); }
  .picker select { font-size: 1rem; padding: 12px; border-radius: 10px; border: 1px solid var(--mc-line); background: var(--mc-panel-2); color: var(--mc-ink); }
  .count { margin: 28px 0 20px; }
  .count-num { font-size: 5rem; font-weight: 800; line-height: 1; color: var(--mc-good-bright); }
  .count-label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; color: var(--mc-ink); }
  .actions { display: flex; flex-direction: column; gap: 12px; }
  .draw { font-size: 2rem; font-weight: 800; padding: 24px; border-radius: 16px; border: none; background: var(--mc-good-bright); color: var(--mc-on-gold); cursor: pointer; min-height: 72px; }
  .draw:disabled { opacity: 0.4; cursor: not-allowed; }
  .row { display: flex; gap: 12px; }
  .secondary { flex: 1; padding: 14px; border-radius: 10px; border: 1px solid var(--mc-line); background: var(--mc-panel-2); color: var(--mc-ink); font-size: 0.95rem; font-weight: 600; cursor: pointer; }
  .danger { color: var(--mc-crit); }
  .winners { list-style: none; padding: 0; margin: 32px 0 0; display: flex; flex-direction: column; gap: 16px; }
  .winners li { background: var(--mc-panel-2); border: 1px solid var(--mc-line); border-radius: 16px; padding: 20px; }
  .ord { display: block; font-size: 1rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mc-good-bright); }
  .name { display: block; font-size: clamp(2.5rem, 12vw, 4.5rem); font-weight: 800; line-height: 1.1; overflow-wrap: anywhere; }
  .error { color: var(--mc-crit); }
  .muted { color: var(--mc-ink); padding: 20px 0; }
</style>
