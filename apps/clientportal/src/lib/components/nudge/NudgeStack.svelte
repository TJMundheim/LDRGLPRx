<script lang="ts">
  import { onMount } from 'svelte';
  import Nudge from './Nudge.svelte';
  import type { NudgeItem } from '../../nudge/types';

  const DISMISSED_KEY = 'nudges-dismissed-v1';

  let queue = $state<NudgeItem[]>([]);

  function getDismissed(): Set<string> {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  }

  function saveDismissed(set: Set<string>): void {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
    } catch { /* ignore */ }
  }

  function addNudge(nudge: NudgeItem): void {
    const dismissed = getDismissed();
    if (dismissed.has(nudge.id)) return;
    if (queue.some(n => n.id === nudge.id)) return;
    queue = [...queue, nudge];
  }

  function handleDismiss(id: string): void {
    queue = queue.filter(n => n.id !== id);
    const dismissed = getDismissed();
    dismissed.add(id);
    saveDismissed(dismissed);
  }

  onMount(() => {
    // Expose globally so triggers.ts can push nudges without component coupling
    (window as Window & { addNudge?: typeof addNudge }).addNudge = addNudge;
    return () => {
      delete (window as Window & { addNudge?: typeof addNudge }).addNudge;
    };
  });
</script>

<div class="nudge-stack" aria-label="Notifications">
  {#each queue as nudge (nudge.id)}
    <Nudge
      id={nudge.id}
      title={nudge.title}
      body={nudge.body}
      action={nudge.action}
      autoDismissMs={nudge.autoDismissMs}
      tone={nudge.tone}
      onDismiss={handleDismiss}
    />
  {/each}
</div>

<style>
  .nudge-stack {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    max-width: 380px;
    width: calc(100vw - 40px);
  }

  .nudge-stack > :global(.nudge-card) {
    pointer-events: auto;
  }

  @media (max-width: 600px) {
    .nudge-stack {
      top: 0;
      right: 0;
      left: 0;
      max-width: 100%;
      width: 100%;
      gap: 0;
    }
  }
</style>
