<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '../../auth/store.svelte.js';
  import { adminListUsers, adminListOutcomes, adminListQueue, type AdminQueueItem } from '../../api/operations.js';
  import type { UserProfile, Outcome } from '../../api/operations.js';
  import QueueList from './QueueList.svelte';
  import Forbidden403 from './Forbidden403.svelte';
  import ProtegesPanel from './ProtegesPanel.svelte';
  import EventsAdmin from './EventsAdmin.svelte';

  const isAdmin = $derived(currentUser.value?.groups.includes('Admins') ?? false);

  let activeTab = $state<'queue' | 'proteges' | 'events'>('queue');
  let users = $state<UserProfile[]>([]);
  let outcomes = $state<Outcome[]>([]);
  let queue = $state<AdminQueueItem[]>([]);
  let loading = $state(false);
  let error = $state('');

  const urgentCount  = $derived(queue.filter((i) => i.urgency === 'urgent').length);
  const soonCount    = $derived(queue.filter((i) => i.urgency === 'soon').length);
  const routineCount = $derived(queue.filter((i) => i.urgency === 'routine').length);

  onMount(async () => {
    if (!isAdmin) return;
    loading = true;
    try {
      const [usersResult, outcomesResult, queueResult] = await Promise.all([
        adminListUsers(50),
        adminListOutcomes(undefined, 50),
        adminListQueue(50),
      ]);
      users = usersResult.adminListUsers?.items ?? [];
      outcomes = outcomesResult.adminListOutcomes?.items ?? [];
      const queueItems = queueResult.adminListQueue?.items ?? [];
      queue = queueItems.filter((i) => i.status !== 'resolved');
    } catch {
      // API unavailable — show empty queue rather than fake seed data
      queue = [];
    } finally {
      loading = false;
    }
  });
</script>

{#if !isAdmin}
  <Forbidden403 />
{:else}
<div class="admin-dashboard">
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'queue'}
      onclick={() => (activeTab = 'queue')}
    >Admin Queue</button>
    <button
      class="tab"
      class:active={activeTab === 'proteges'}
      onclick={() => (activeTab = 'proteges')}
    >Protégés</button>
    <button
      class="tab"
      class:active={activeTab === 'events'}
      onclick={() => (activeTab = 'events')}
    >Events</button>
  </div>

  {#if activeTab === 'queue'}
    {#if loading}
      <p class="loading">Loading…</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else}
    <div class="stat-cards">
      <div class="stat-card urgent">
        <div class="stat-num">{urgentCount}</div>
        <div class="stat-label">Urgent</div>
      </div>
      <div class="stat-card soon">
        <div class="stat-num">{soonCount}</div>
        <div class="stat-label">Soon</div>
      </div>
      <div class="stat-card routine">
        <div class="stat-num">{routineCount}</div>
        <div class="stat-label">Routine</div>
      </div>
      <div class="stat-card neutral">
        <div class="stat-num">{users.length}</div>
        <div class="stat-label">Active Patients</div>
      </div>
      <div class="stat-card neutral">
        <div class="stat-num">{outcomes.length}</div>
        <div class="stat-label">Outcomes</div>
      </div>
    </div>

    <div class="queue-section">
      <h3 class="section-title">Pending Items</h3>
      <QueueList items={queue} />
    </div>
    {/if}
  {:else if activeTab === 'proteges'}
    <ProtegesPanel />
  {:else if activeTab === 'events'}
    <EventsAdmin />
  {/if}
</div>
{/if}

<style>
  .admin-dashboard {
    padding: 28px 32px;
    max-width: 960px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
    border-bottom: 1px solid #d9e5d6;
    padding-bottom: 0;
  }

  .tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 10px 18px;
    color: #1A2E1E;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color 0.15s;
  }

  .tab:hover {
    color: #1D9E75;
  }

  .tab.active {
    color: #1D9E75;
    border-bottom-color: #1D9E75;
  }

  .loading, .error {
    color: #1A2E1E;
    padding: 20px 0;
  }

  .error {
    color: #c81e1e;
  }

  .stat-cards {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .stat-card {
    background: #ffffff;
    border: 1px solid #d9e5d6;
    border-radius: 10px;
    padding: 16px 22px;
    min-width: 110px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  .stat-num {
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2E1E;
  }

  .stat-card.urgent  .stat-num { color: #c81e1e; }
  .stat-card.soon    .stat-num { color: #b07d00; }
  .stat-card.routine .stat-num { color: #1D9E75; }
  .stat-card.neutral .stat-num { color: #1D9E75; }

  .section-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2E1E;
    margin: 0 0 14px;
  }
</style>
