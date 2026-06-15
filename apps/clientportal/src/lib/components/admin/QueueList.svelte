<script lang="ts">
  import type { AdminQueueItem, QueueStatus } from '../../api/operations.js';
  import { updateAdminQueueItem } from '../../api/operations.js';

  // Accept both the API type and the legacy seed type (structurally compatible except createdAt).
  type QueueItem = AdminQueueItem;

  interface Props {
    items: QueueItem[];
  }

  let { items }: Props = $props();

  // Seed visible from the passed items prop (items is a snapshot; user actions filter locally).
  let visible = $state<QueueItem[]>(items.slice());
  let expanded = $state<Set<string>>(new Set());
  let actionError = $state('');

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

  async function act(id: string, status: QueueStatus): Promise<void> {
    // Optimistically remove from view; roll back and surface an error if the
    // server mutation fails so a clinician never believes an item was actioned
    // when it wasn't.
    const idx = visible.findIndex((i) => i.id === id);
    const removed = idx >= 0 ? visible[idx] : undefined;
    visible = visible.filter((i) => i.id !== id);
    actionError = '';
    try {
      await updateAdminQueueItem({ id, status });
    } catch {
      if (removed) {
        const restored = visible.slice();
        restored.splice(Math.min(idx, restored.length), 0, removed);
        visible = restored;
      }
      actionError = 'Update failed — the item was restored. Please retry.';
    }
  }

  function toggleExpand(id: string): void {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    expanded = next;
  }
</script>

<div class="queue-list">
  {#if actionError}
    <div class="action-error" role="alert">{actionError}</div>
  {/if}
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
        <button class="btn btn-edit"    onclick={() => act(item.id, 'in_progress')}>Edit</button>
        <button class="btn btn-defer"   onclick={() => act(item.id, 'deferred')}>Defer</button>
        <button class="btn btn-escalate" onclick={() => act(item.id, 'in_progress')}>Escalate</button>
      </div>
    </div>
  {/each}
</div>

<style>
  .queue-list { display: flex; flex-direction: column; gap: 14px; }

  .empty-state {
    text-align: center;
    padding: 32px;
    color: #1A2E1E;
    font-size: 0.9rem;
  }

  .action-error {
    background: rgba(200,30,30,0.08);
    border: 1px solid rgba(200,30,30,0.3);
    color: #c81e1e;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .queue-card {
    background: #ffffff;
    border: 1px solid #d9e5d6;
    border-radius: 10px;
    padding: 16px 18px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .kind-badge {
    background: #1D9E75;
    color: #ffffff;
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
  .urgency-urgent  { background: rgba(200,30,30,0.1);  color: #c81e1e; }
  .urgency-soon    { background: rgba(176,125,0,0.12); color: #b07d00; }
  .urgency-routine { background: #F0F5F0; color: #1D9E75; }

  .patient-label {
    margin-left: auto;
    font-size: 0.8rem;
    color: #1A2E1E;
    font-family: monospace;
  }

  .summary {
    font-size: 0.88rem;
    color: #0a0a0a;
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
    color: #1D9E75;
    font-size: 0.78rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 8px;
  }

  .drafted-action {
    background: #F0F5F0;
    border-left: 3px solid #1D9E75;
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    font-size: 0.84rem;
    color: #0a0a0a;
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

  .btn-approve  { background: #1D9E75; color: #ffffff; }
  .btn-edit     { background: #F0F5F0; color: #1A2E1E; }
  .btn-defer    { background: rgba(176,125,0,0.12); color: #b07d00; }
  .btn-escalate { background: rgba(200,30,30,0.1);  color: #c81e1e; }
</style>
