<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '../../auth/store.svelte.js';
  import { adminListUsers, adminListOutcomes, adminListQueue, type AdminQueueItem } from '../../api/operations.js';
  import type { UserProfile, Outcome } from '../../api/operations.js';
  import QueueList from './QueueList.svelte';
  import Forbidden403 from './Forbidden403.svelte';
  import { SEED_QUEUE } from '../../data/adminQueue';

  const isAdmin = $derived(currentUser.value?.groups.includes('Admins') ?? false);

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
      const pending = queueItems.filter((i) => i.status !== 'resolved');
      queue = pending.length > 0 ? pending : (SEED_QUEUE.filter((i) => i.status !== 'resolved') as unknown as AdminQueueItem[]);
    } catch {
      // API unavailable — use seed data so the view remains useful in dev/offline
      queue = SEED_QUEUE.filter((i) => i.status !== 'resolved') as unknown as AdminQueueItem[];
    } finally {
      loading = false;
    }
  });
</script>

{#if !isAdmin}
  <Forbidden403 />
{:else}
<div class="admin-dashboard">
  <h2 class="dash-title">Admin Queue</h2>

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
</div>
{/if}

<style>
  .admin-dashboard {
    padding: 28px 32px;
    max-width: 860px;
  }

  .dash-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #cdd4e0;
    margin: 0 0 20px;
    letter-spacing: 0.03em;
  }

  .loading, .error {
    color: #7a8390;
    padding: 20px 0;
  }

  .error {
    color: #ff6060;
  }

  .stat-cards {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .stat-card {
    background: #1a1f2a;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 16px 22px;
    min-width: 110px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
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
    color: #7a8390;
  }

  .stat-card.urgent  .stat-num { color: #ff6060; }
  .stat-card.soon    .stat-num { color: #ffc840; }
  .stat-card.routine .stat-num { color: #52c87e; }
  .stat-card.neutral .stat-num { color: #4a9eff; }

  .section-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #7a8390;
    margin: 0 0 14px;
  }
</style>
