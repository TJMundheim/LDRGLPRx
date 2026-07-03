<script lang="ts">
  /**
   * Eating window picker — reusable form block.
   * Used by the first-sign-in modal and by SettingsView.
   *
   * Emits `save(start, end)` on submit. Does NOT call the API itself —
   * parent decides what to do with the picked window (so the same component
   * can be wired to either upsertMyProfile or a local optimistic update).
   */

  interface Props {
    initialStart?: string | null;
    initialEnd?: string | null;
    submitLabel?: string;
    onSave: (start: string, end: string) => void | Promise<void>;
  }

  let { initialStart = null, initialEnd = null, submitLabel = 'Save', onSave }: Props = $props();

  type Preset = { id: string; label: string; start: string; end: string };
  const PRESETS: Preset[] = [
    { id: 'p9-18',  label: '9 AM – 6 PM',  start: '09:00', end: '18:00' },
    { id: 'p10-19', label: '10 AM – 7 PM', start: '10:00', end: '19:00' },
    { id: 'p11-20', label: '11 AM – 8 PM', start: '11:00', end: '20:00' },
    { id: 'p12-20', label: '12 PM – 8 PM', start: '12:00', end: '20:00' },
  ];

  function matchPreset(s: string | null, e: string | null): string {
    if (!s || !e) return 'p9-18';
    const hit = PRESETS.find(p => p.start === s && p.end === e);
    return hit ? hit.id : 'custom';
  }

  const _initialMatch = matchPreset(initialStart, initialEnd);
  let choice = $state<string>(_initialMatch);
  let customStart = $state<string>(_initialMatch === 'custom' && initialStart ? initialStart : '09:00');
  let customEnd = $state<string>(_initialMatch === 'custom' && initialEnd ? initialEnd : '18:00');
  let saving = $state(false);
  let error = $state<string>('');

  async function handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    error = '';
    let start: string, end: string;
    if (choice === 'custom') {
      if (!customStart || !customEnd) { error = 'Both start and end times are required.'; return; }
      if (customStart >= customEnd) { error = 'End time must be later than start time.'; return; }
      start = customStart; end = customEnd;
    } else {
      const preset = PRESETS.find(p => p.id === choice)!;
      start = preset.start; end = preset.end;
    }
    saving = true;
    try { await onSave(start, end); }
    finally { saving = false; }
  }
</script>

<form class="ewp" onsubmit={handleSubmit}>
  <div class="opts">
    {#each PRESETS as p (p.id)}
      <label class="opt" class:selected={choice === p.id}>
        <input type="radio" name="ewp" value={p.id} bind:group={choice} />
        <span>{p.label}</span>
      </label>
    {/each}
    <label class="opt" class:selected={choice === 'custom'}>
      <input type="radio" name="ewp" value="custom" bind:group={choice} />
      <span>Custom</span>
    </label>
  </div>

  {#if choice === 'custom'}
    <div class="custom">
      <label>Start <input type="time" bind:value={customStart} required /></label>
      <label>End <input type="time" bind:value={customEnd} required /></label>
    </div>
  {/if}

  {#if error}<div class="err">{error}</div>{/if}

  <button type="submit" class="submit" disabled={saving}>
    {saving ? 'Saving…' : submitLabel}
  </button>
</form>

<style>
  .ewp { display: flex; flex-direction: column; gap: 14px; }
  .opts { display: flex; flex-direction: column; gap: 8px; }
  .opt {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--mc-line);
    border-radius: 8px;
    background: var(--mc-panel);
    cursor: pointer;
    font-size: 0.95rem;
    color: var(--mc-ink);
    transition: background 0.12s, border-color 0.12s;
  }
  .opt:hover { background: rgba(212,175,90,0.08); }
  .opt.selected { background: rgba(212,175,90,0.12); border-color: var(--mc-good-bright); }
  .opt input { accent-color: var(--mc-good-bright); }
  .custom { display: flex; gap: 12px; flex-wrap: wrap; }
  .custom label {
    display: flex; flex-direction: column; gap: 4px;
    font-size: 0.8rem; color: var(--mc-muted); letter-spacing: 0.04em; text-transform: uppercase;
  }
  .custom input {
    background: var(--mc-panel-2);
    border: 1px solid var(--mc-line);
    color: var(--mc-ink);
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 0.95rem;
  }
  .err { color: var(--mc-crit-b); font-size: 0.85rem; }
  .submit {
    background: var(--mc-good-bright); color: #fff;
    border: none; border-radius: 8px;
    padding: 12px 18px;
    font-size: 0.95rem; font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.12s;
  }
  .submit:hover:not(:disabled) { background: #168661; }
  .submit:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
