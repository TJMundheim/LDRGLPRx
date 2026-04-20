<script lang="ts">
  import type { QueueItem, QueueStatus } from '../../data/adminQueue';
  import { resolveQueueItem } from '../../data/adminQueue';

  interface Props {
    items: QueueItem[];
  }

  let { items }: Props = $props();

  // Seed visible from the passed items prop (items is a snapshot; user actions filter locally).
  let visible = $state<QueueItem[]>(items.slice());
  let expanded = $state<Set<string>>(new Set());

  const KIND_LABELS: Record<string, string> = {
    'intake-review': 'Intake Review',
    'clinician-escalation': 'Escalation',
    'rx-approval': 'Rx Approval',
    'protocol-check': 'Protocol Check',
    'lab-result-review': 'Lab Results',
    'outcome-flag': 'Outcome Flag',
  };

  const URGENCY_CLASS: Record<string, string> = {
    urgent: 'urgency-urgent',
    soon: 'urgency-soon',
    routine: 'urgency-routine',
  };

  function act(id: string, status: QueueStatus): void {
    resolveQueueItem(id, status);
    visible = visible.filter((i) => i.id !== id);
  }

  function toggleExpand(id: string): void {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    expanded = next;
  }
</script>

<div class="queue-list">
  {#if visible.length === 0}
    <div class="empty-state">No pending items — queue is clear.</div>
  {/if}
  {#each visible as item (item.id)}
    <div class="queue-card">
      <div class="card-header">
        <span class="kind-badge">{KIND_LABELS[item.kind] ?? item.kind}</span>
        <span class="urgency-pill {URGENCY_CLASS[item.urgency]}">{item.urgency}</span>
        <span class="patient-label">{item.patientLabel}</span>
      </div>

      <p class="summary">{item.summary}</p>

      {#if item.draftedAction}
        <button class="expand-btn" onclick={() => toggleExpand(item.id)}>
          {expanded.has(item.id) ? '▲ Hide' : '▼ Drafted action'}
        </button>
        {#if expanded.has(item.id)}
          <div class="drafted-action">{item.draftedAction}</div>
        {/if}
      {/if}

      <div class="card-actions">
        <button class="btn btn-approve" onclick={() => act(item.id, 'resolved')}>Approve</button>
        <button class="btn btn-edit"    onclick={() => act(item.id, 'in-progress')}>Edit</button>
        <button class="btn btn-defer"   onclick={() => act(item.id, 'deferred')}>Defer</button>
        <button class="btn btn-escalate" onclick={() => act(item.id, 'in-progress')}>Escalate</button>
      </div>
    </div>
  {/each}
</div>

<style>
  .queue-list { display: flex; flex-direction: column; gap: 14px; }

  .empty-state {
    text-align: center;
    padding: 32px;
    color: #7a8390;
    font-size: 0.9rem;
  }

  .queue-card {
    background: #1a1f2a;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 16px 18px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .kind-badge {
    background: rgba(74,158,255,0.15);
    color: #4a9eff;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .urgency-pill {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .urgency-urgent  { background: rgba(255,80,80,0.2);  color: #ff6060; }
  .urgency-soon    { background: rgba(255,190,50,0.2); color: #ffc840; }
  .urgency-routine { background: rgba(80,200,120,0.2); color: #52c87e; }

  .patient-label {
    margin-left: auto;
    font-size: 0.8rem;
    color: #9ba3b2;
    font-family: monospace;
  }

  .summary {
    font-size: 0.88rem;
    color: #cdd4e0;
    line-height: 1.55;
    margin: 0 0 10px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .expand-btn {
    background: none;
    border: none;
    color: #4a9eff;
    font-size: 0.78rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 8px;
  }

  .drafted-action {
    background: rgba(255,255,255,0.04);
    border-left: 3px solid #4a9eff;
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    font-size: 0.84rem;
    color: #aab4c2;
    margin-bottom: 10px;
  }

  .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .btn {
    padding: 5px 14px;
    border-radius: 6px;
    border: none;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.8; }

  .btn-approve  { background: rgba(80,200,120,0.2);  color: #52c87e; }
  .btn-edit     { background: rgba(74,158,255,0.2);  color: #4a9eff; }
  .btn-defer    { background: rgba(255,190,50,0.15); color: #ffc840; }
  .btn-escalate { background: rgba(255,80,80,0.15);  color: #ff6060; }
</style>
