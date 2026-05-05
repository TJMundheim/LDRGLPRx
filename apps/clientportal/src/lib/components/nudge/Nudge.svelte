<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export interface NudgeProps {
    id: string;
    title: string;
    body: string;
    action?: { label: string; href: string };
    autoDismissMs?: number;
    tone?: 'info' | 'celebrate' | 'reminder';
    onDismiss: (id: string) => void;
  }

  let {
    id,
    title,
    body,
    action,
    autoDismissMs = 8000,
    tone = 'info',
    onDismiss,
  }: NudgeProps = $props();

  let visible = $state(true);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function dismiss() {
    visible = false;
    setTimeout(() => onDismiss(id), 300); // wait for slide-out
  }

  onMount(() => {
    timer = setTimeout(dismiss, autoDismissMs);
  });

  onDestroy(() => {
    if (timer !== null) clearTimeout(timer);
  });

  function handleAction() {
    if (timer !== null) clearTimeout(timer);
    dismiss();
  }
</script>

{#if visible}
  <div class="nudge-card nudge-{tone}" role="status" aria-live="polite">
    <button class="nudge-close" onclick={dismiss} aria-label="Dismiss">×</button>
    <div class="nudge-title">{title}</div>
    <div class="nudge-body">{body}</div>
    {#if action}
      <a
        class="nudge-action"
        href={action.href}
        onclick={handleAction}
      >{action.label}</a>
    {/if}
  </div>
{/if}

<style>
  .nudge-card {
    position: relative;
    background: #1A2535;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 16px 40px 16px 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    max-width: 360px;
    width: 100%;
    animation: nudge-slide-in 0.28s cubic-bezier(0.22,1,0.36,1) both;
    border-left-width: 3px;
    border-left-style: solid;
  }

  /* Tone variants — left border accent */
  .nudge-info    { border-left-color: #6B5ED4; }
  .nudge-celebrate { border-left-color: #D4920A; }
  .nudge-reminder  { border-left-color: #8B6914; }

  .nudge-close {
    position: absolute;
    top: 10px;
    right: 12px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 0.12s;
  }
  .nudge-close:hover { color: rgba(255,255,255,0.85); }

  .nudge-title {
    font-size: 13px;
    font-weight: 700;
    color: #e8eaf0;
    margin-bottom: 5px;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }

  .nudge-body {
    font-size: 12px;
    color: #9badb8;
    line-height: 1.65;
    margin-bottom: 10px;
  }

  .nudge-action {
    display: inline-block;
    font-size: 11.5px;
    font-weight: 600;
    color: #1D9E75;
    text-decoration: none;
    letter-spacing: 0.02em;
    transition: color 0.12s;
  }
  .nudge-action:hover { color: #2bce97; }

  @keyframes nudge-slide-in {
    from {
      opacity: 0;
      transform: translateY(-16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    .nudge-card {
      max-width: 100%;
      border-radius: 0 0 12px 12px;
      border-left-width: 1px;
      border-bottom-width: 3px;
      border-bottom-style: solid;
    }
    .nudge-info     { border-bottom-color: #6B5ED4; }
    .nudge-celebrate { border-bottom-color: #D4920A; }
    .nudge-reminder  { border-bottom-color: #8B6914; }
  }
</style>
