<script lang="ts">
  import { getPendingQueue, type QueueItem } from '../../data/adminQueue';
  import QueueList from './QueueList.svelte';

  // Mock aggregate stats — replace with real queries once backend is wired.
  const ACTIVE_PATIENTS = 42;
  const INTAKES_THIS_WEEK = 7;

  let queue = $state<QueueItem[]>(getPendingQueue());

  const urgentCount  = $derived(queue.filter((i) => i.urgency === 'urgent').length);
  const soonCount    = $derived(queue.filter((i) => i.urgency === 'soon').length);
  const routineCount = $derived(queue.filter((i) => i.urgency === 'routine').length);
</script>

<div class="admin-dashboard">
  <h2 class="dash-title">Admin Queue</h2>

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
      <div class="stat-num">{ACTIVE_PATIENTS}</div>
      <div class="stat-label">Active Patients</div>
    </div>
    <div class="stat-card neutral">
      <div class="stat-num">{INTAKES_THIS_WEEK}</div>
      <div class="stat-label">Intakes This Week</div>
    </div>
  </div>

  <div class="queue-section">
    <h3 class="section-title">Pending Items</h3>
    <QueueList items={queue} />
  </div>
</div>

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
