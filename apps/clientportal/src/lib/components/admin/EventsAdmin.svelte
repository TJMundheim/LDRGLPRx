<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listEventsAdmin,
    updateEventRecordingUrl,
    type AdminEvent,
  } from '../../api/operations.js';

  let items = $state<AdminEvent[]>([]);
  let loading = $state(false);
  let error = $state('');
  let drafts = $state<Record<string, string>>({});
  let savingId = $state<string>('');
  let saveError = $state<Record<string, string>>({});

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await listEventsAdmin(100);
      const list = [...(res.listEventsAdmin ?? [])].sort((a, b) =>
        (b.startsAt ?? '').localeCompare(a.startsAt ?? ''),
      );
      items = list;
      const d: Record<string, string> = {};
      for (const ev of list) d[ev.eventId] = ev.recordingUrl ?? '';
      drafts = d;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load Events';
    } finally {
      loading = false;
    }
  }

  async function save(ev: AdminEvent) {
    const url = (drafts[ev.eventId] ?? '').trim();
    if (!url) return;
    savingId = ev.eventId;
    saveError = { ...saveError, [ev.eventId]: '' };
    try {
      const res = await updateEventRecordingUrl({
        eventId: ev.eventId,
        recordingUrl: url,
      });
      const updated = res.updateEventRecordingUrl;
      if (updated) {
        items = items.map((x) =>
          x.eventId === ev.eventId ? { ...x, recordingUrl: updated.recordingUrl } : x,
        );
      }
    } catch (e: unknown) {
      saveError = {
        ...saveError,
        [ev.eventId]: e instanceof Error ? e.message : 'Save failed',
      };
    } finally {
      savingId = '';
    }
  }

  function fmtDateTime(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  onMount(() => load());
</script>

<div class="events-admin">
  <div class="panel-header">
    <h3 class="panel-title">
      Events
      <span class="badge">{items.length}</span>
    </h3>
  </div>

  {#if loading && items.length === 0}
    <p class="loading">Loading…</p>
  {:else if error}
    <p class="err">{error}</p>
  {:else if items.length === 0}
    <p class="loading">No events found.</p>
  {:else}
    <ul class="event-list">
      {#each items as ev (ev.eventId)}
        <li class="event-row">
          <div class="row-top">
            <div class="meta">
              <div class="title">{ev.title}</div>
              <div class="sub">{fmtDateTime(ev.startsAt)} · {ev.durationMin} min</div>
            </div>
            <div class="status status-{ev.status}">{ev.status}</div>
          </div>

          {#if ev.recordingUrl}
            <div class="current-link">
              <a href={ev.recordingUrl} target="_blank" rel="noopener noreferrer">
                {ev.recordingUrl}
              </a>
            </div>
          {:else}
            <div class="current-link none">No recording URL set</div>
          {/if}

          <div class="edit-row">
            <label for={`url-${ev.eventId}`}>Recording URL</label>
            <input
              id={`url-${ev.eventId}`}
              type="url"
              placeholder="https://…"
              bind:value={drafts[ev.eventId]}
            />
            <button
              class="save"
              disabled={savingId === ev.eventId || !(drafts[ev.eventId] ?? '').trim()}
              onclick={() => save(ev)}
            >
              {savingId === ev.eventId ? 'Saving…' : 'Save'}
            </button>
          </div>
          {#if saveError[ev.eventId]}
            <div class="err small">{saveError[ev.eventId]}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .events-admin { padding: 0; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .panel-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #7a8390;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    background: #1a1f2a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 0.75rem;
    color: #4a9eff;
  }

  .event-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .event-row {
    background: #1a1f2a;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 14px 18px;
  }

  .row-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .title { color: #cdd4e0; font-weight: 600; font-size: 0.95rem; }
  .sub { color: #7a8390; font-size: 0.8rem; margin-top: 2px; }

  .status {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    color: #7a8390;
  }
  .status-scheduled { color: #4a9eff; }
  .status-live { color: #ffc840; }
  .status-completed { color: #52c87e; }
  .status-cancelled { color: #ff6060; }

  .current-link {
    font-size: 0.82rem;
    padding: 6px 0 10px;
    word-break: break-all;
  }
  .current-link a { color: #4a9eff; text-decoration: none; }
  .current-link a:hover { text-decoration: underline; }
  .current-link.none { color: #7a8390; font-style: italic; }

  .edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .edit-row label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #7a8390;
  }
  .edit-row input {
    flex: 1;
    min-width: 260px;
    background: #11151c;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    padding: 6px 10px;
    color: #cdd4e0;
    font-size: 0.85rem;
    outline: none;
  }
  .edit-row input:focus { border-color: #4a9eff; }

  .save {
    background: #1a2433;
    border: 1px solid rgba(74,158,255,0.4);
    border-radius: 6px;
    color: #4a9eff;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 600;
  }
  .save:hover:not(:disabled) { background: #22324a; }
  .save:disabled { opacity: 0.5; cursor: default; }

  .loading, .err { color: #7a8390; padding: 14px 0; }
  .err { color: #ff6060; }
  .err.small { font-size: 0.8rem; padding: 6px 0 0; }
</style>
