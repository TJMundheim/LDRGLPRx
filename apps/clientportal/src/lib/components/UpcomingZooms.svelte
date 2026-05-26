<script lang="ts">
  import { onMount } from 'svelte';
  import { upcomingEvents, rsvpEvent } from '../api/operations.js';
  import type { Event } from '../api/generated.js';

  type EventWithRsvp = Event & { rsvped?: boolean };

  let events = $state<EventWithRsvp[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  // Map eventId -> loading state for individual RSVP buttons
  let rsvping = $state<Record<string, boolean>>({});

  function isLive(ev: Event): boolean {
    const now = Date.now();
    const start = new Date(ev.startsAt).getTime();
    const end = start + ev.durationMin * 60 * 1000;
    return ev.status === 'live' && now >= start && now < end;
  }

  function formatStart(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  async function handleRsvp(ev: EventWithRsvp) {
    rsvping[ev.eventId] = true;
    try {
      await rsvpEvent(ev.eventId, 'YES');
      events = events.map(e =>
        e.eventId === ev.eventId ? { ...e, rsvped: true } : e
      );
    } catch (err) {
      console.error('[UpcomingZooms] RSVP failed', err);
    } finally {
      rsvping[ev.eventId] = false;
    }
  }

  onMount(async () => {
    try {
      const result = await upcomingEvents(10);
      events = (result?.data?.upcomingEvents ?? []) as EventWithRsvp[];
    } catch (err) {
      console.error('[UpcomingZooms] load failed', err);
      error = 'Could not load upcoming Zooms.';
    } finally {
      loading = false;
    }
  });
</script>

<section class="zooms-widget">
  <h2 class="zooms-heading">Upcoming Zooms</h2>

  {#if loading}
    <p class="zooms-meta">Loading...</p>
  {:else if error}
    <p class="zooms-meta zooms-error">{error}</p>
  {:else if events.length === 0}
    <p class="zooms-meta">No upcoming Zooms scheduled — check back soon</p>
  {:else}
    <div class="zooms-list">
      {#each events as ev (ev.eventId)}
        <div class="zoom-card">
          <div class="zoom-info">
            <div class="zoom-title">{ev.title}</div>
            <div class="zoom-meta">{formatStart(ev.startsAt)} &middot; {ev.durationMin} min</div>
          </div>
          <div class="zoom-actions">
            {#if isLive(ev)}
              <a href={ev.joinUrl} target="_blank" rel="noreferrer" class="zoom-btn zoom-btn--live">
                Join Zoom now &rarr;
              </a>
            {:else if ev.rsvped}
              <span class="zoom-btn zoom-btn--confirmed">You're in ✓</span>
            {:else}
              <button
                class="zoom-btn zoom-btn--rsvp"
                disabled={!!rsvping[ev.eventId]}
                onclick={() => handleRsvp(ev)}
              >
                {rsvping[ev.eventId] ? 'Saving...' : 'Save your seat'}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .zooms-widget {
    margin-bottom: 24px;
  }
  .zooms-heading {
    font-size: 15px;
    font-weight: 700;
    color: #e8eaf0;
    margin: 0 0 12px;
    letter-spacing: .02em;
  }
  .zooms-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .zoom-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #1a2a1e;
    border: 1px solid #2a3d2e;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .zoom-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #e8eaf0;
    margin-bottom: 4px;
  }
  .zoom-meta {
    font-size: 11.5px;
    color: #6A8A6E;
  }
  .zooms-meta {
    font-size: 12.5px;
    color: #6A8A6E;
  }
  .zooms-error { color: #E05C2A; }
  .zoom-btn {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    padding: 9px 14px;
    border-radius: 7px;
    text-decoration: none;
    cursor: pointer;
    border: none;
    white-space: nowrap;
    letter-spacing: .02em;
  }
  .zoom-btn--live {
    background: #1D9E75;
    color: #fff;
    animation: pulse 1.6s ease-in-out infinite;
  }
  .zoom-btn--rsvp {
    background: #6B5ED4;
    color: #fff;
  }
  .zoom-btn--rsvp:disabled {
    opacity: .6;
    cursor: not-allowed;
  }
  .zoom-btn--confirmed {
    background: #1a2a1e;
    border: 1.5px solid #1D9E75;
    color: #1D9E75;
    cursor: default;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 #1D9E7560; }
    50% { box-shadow: 0 0 0 6px #1D9E7500; }
  }
</style>
