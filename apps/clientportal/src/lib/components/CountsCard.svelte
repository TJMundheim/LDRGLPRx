<script lang="ts">
  /**
   * CountsCard — "My counts": type the day's Count Yourself Skinny numbers.
   * Rows live in the Adherence table (see lib/counts.ts); the parent owns
   * `entries` and gets the updated list through onEntries.
   */
  import { recordAdherence } from '../api/operations.js';
  import { pushToast } from '../toast/toast.svelte.js';
  import {
    COUNT_FIELDS, parseCountInput, countRowsToValues, saveCounts, weekSummary, countNotes, TEN_K_ACTION,
    type CountValues, type CountKey,
  } from '../counts.js';

  type Row = { userId?: string; dateActionId: string; completedAt?: string; value?: number | null; notes?: string | null };
  type Props = {
    entries: Row[];
    today: string;
    weekDates: string[];
    weekStart: Date;
    onEntries: (next: Row[]) => void;
  };
  const { entries, today, weekDates, weekStart, onEntries }: Props = $props();

  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let selected = $state('');
  let inputs = $state<Record<CountKey, string>>({ steps: '', chews: '', water: '', sleep: '' });
  let errors = $state<Record<string, string>>({});
  let saving = $state(false);
  let saved = $state(false);

  function load(date: string): void {
    const v = countRowsToValues(entries, date);
    inputs = {
      steps: v.steps === null ? '' : String(v.steps),
      chews: v.chews === null ? '' : String(v.chews),
      water: v.water === null ? '' : String(v.water),
      sleep: v.sleep === null ? '' : String(v.sleep),
    };
    errors = {};
    saved = false;
  }
  function pick(date: string): void { selected = date; load(date); }
  // Default to today; also snap back when a resumed session rolls into a new
  // program week (or the selected day is no longer pickable).
  $effect(() => {
    if (!selected || selected > today || !weekDates.includes(selected)) pick(today);
  });

  const savedValues = $derived(countRowsToValues(entries, selected || today));
  const hasSaved = $derived(COUNT_FIELDS.some(f => savedValues[f.key] !== null));
  const sum = $derived(weekSummary(entries, weekStart));
  const prevSum = $derived(weekSummary(entries, new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7)));
  const maxSteps = $derived(Math.max(1, ...sum.steps.map(v => v ?? 0)));
  const stepsDelta = $derived(sum.avgSteps !== null && prevSum.avgSteps !== null ? Math.round(sum.avgSteps - prevSum.avgSteps) : null);
  function dayLabel(d: string): string {
    const [y, m, dd] = d.split('-').map(Number);
    return new Date(y, m - 1, dd).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }
  const selectedLabel = $derived(selected === today ? 'today' : dayLabel(selected));
  const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString());

  async function save(): Promise<void> {
    if (saving) return;
    const values = {} as CountValues;
    const errs: Record<string, string> = {};
    for (const f of COUNT_FIELDS) {
      const r = parseCountInput(f.key, inputs[f.key]);
      if (r.ok) values[f.key] = r.value; else errs[f.key] = r.error;
    }
    errors = errs;
    if (Object.keys(errs).length) return;
    saving = true;
    const date = selected || today;
    try {
      const { tenKLogged } = await saveCounts((input) => recordAdherence(input as any), date, values, entries);
      const keep = entries.filter(e => !COUNT_FIELDS.some(f => e.dateActionId === `${date}#${f.actionId}`));
      const added: Row[] = COUNT_FIELDS.filter(f => values[f.key] !== null).map(f => ({
        userId: '', dateActionId: `${date}#${f.actionId}`, completedAt: new Date().toISOString(),
        value: values[f.key], notes: countNotes('manual'),
      }));
      const tenK: Row[] = tenKLogged
        ? [{ userId: '', dateActionId: `${date}#${TEN_K_ACTION}`, completedAt: new Date().toISOString() }] : [];
      onEntries([...keep, ...added, ...tenK]);
      saved = true;
      pushToast({ message: 'Counts saved.' });
    } catch (err) {
      // No values in logs — these are health numbers.
      console.error('[CountsCard] save failed', (err as Error)?.message ?? 'error');
      pushToast({ message: 'Could not save your counts — check your connection.', retry: () => save() });
    } finally {
      saving = false;
    }
  }
</script>

<section class="counts" aria-labelledby="counts-h">
  <h2 id="counts-h" class="sec">My counts <span class="secnote">your Count Yourself Skinny numbers</span></h2>
  <div class="cc">
    <div class="days" role="group" aria-label="Choose a day this week">
      {#each weekDates as d, i}
        {#if d <= today}
          <button type="button" class="day" class:on={d === selected} aria-pressed={d === selected}
            aria-label="Counts for {dayLabel(d)} ({d}){d === today ? ', today' : ''}" onclick={() => pick(d)}>{dayLetters[i]}</button>
        {/if}
      {/each}
    </div>
    <div class="cc-title">Counts for {selectedLabel}</div>
    <div class="cc-grid">
      {#each COUNT_FIELDS as f}
        <label class="cc-field">
          <span>{f.label} <em>{f.unit}</em></span>
          <input type="text" inputmode={f.inputMode} autocomplete="off" placeholder="—"
            aria-invalid={errors[f.key] ? 'true' : 'false'} bind:value={inputs[f.key]} />
          {#if errors[f.key]}<small class="err" role="alert">{errors[f.key]}</small>{/if}
        </label>
      {/each}
    </div>
    <button type="button" class="cc-save" onclick={save} disabled={saving}>
      {saving ? 'Saving…' : hasSaved ? 'Update counts' : 'Save counts'}
    </button>
    {#if hasSaved}
      <p class="cc-saved" aria-live="polite">
        Saved:
        {#each COUNT_FIELDS as f}{#if savedValues[f.key] !== null}<b>{f.label} {fmt(savedValues[f.key])}</b>{' '}{/if}{/each}
      </p>
    {:else}
      <p class="cc-hint">Fill in what you have. Leave the rest blank, and come back to edit anytime this week.</p>
    {/if}

    <div class="wk" role="group" aria-label="This week's counts">
      <div class="wk-h">This week</div>
      <div class="wk-stats">
        <div><b>{sum.daysLogged}</b><span>of 7 days logged</span></div>
        <div><b>{fmt(sum.avgSteps)}</b><span>avg steps{stepsDelta !== null ? ` (${stepsDelta >= 0 ? '+' : ''}${stepsDelta.toLocaleString()} vs last week)` : ''}</span></div>
        <div><b>{fmt(sum.avgChews)}</b><span>avg chews per bite</span></div>
      </div>
      <div class="wk-bars" role="img" aria-label="Daily step totals for this week">
        {#each sum.steps as v, i}
          <div class="wk-col">
            <div class="wk-bar" class:f={v !== null} style="height:{v === null ? 4 : Math.max(8, Math.round((v / maxSteps) * 100))}%" title="{dayLetters[i]}: {v === null ? 'no steps logged' : v.toLocaleString()}"></div>
            <span>{dayLetters[i]}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .sec { font-size: 11px; font-weight: 600; color: var(--mc-muted); letter-spacing: .2em; text-transform: uppercase; margin: 22px 0 10px; }
  .secnote { font-weight: 400; color: var(--mc-faint); text-transform: none; letter-spacing: 0; font-size: 11px; margin-left: 6px; }
  .counts { min-width: 0; }
  .cc { background: var(--mc-panel); border: 1px solid var(--mc-line); border-radius: var(--mc-r-lg); padding: 14px; }
  .days { display: flex; gap: 6px; margin-bottom: 10px; }
  .day { flex: 1 1 0; max-width: 52px; min-width: 0; min-height: 44px; border-radius: 9px; border: 1px solid var(--mc-line); background: var(--mc-panel-raised); color: var(--mc-muted); font-size: 13px; font-weight: 600; cursor: pointer; }
  .day.on { border-color: var(--mc-gold); color: var(--mc-ink); background: var(--mc-gold-tint); }
  .cc-title { font-size: 12px; font-weight: 600; color: var(--mc-ink); margin-bottom: 10px; }
  .cc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 8px; }
  .cc-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .cc-field span { flex: 1; font-size: 11px; letter-spacing: .04em; color: var(--mc-muted); }
  .cc-field span em { font-style: normal; color: var(--mc-faint); }
  .cc-field input { background: var(--mc-panel-raised); border: 1px solid var(--mc-line); border-radius: 8px; padding: 10px 10px; font-size: 16px; color: var(--mc-ink); width: 100%; min-width: 0; min-height: 44px; font-variant-numeric: tabular-nums; box-sizing: border-box; }
  .cc-field input:focus { outline: none; border-color: var(--mc-gold-line); }
  .cc-field input[aria-invalid='true'] { border-color: var(--mc-crit); }
  .err { color: var(--mc-crit-bright); font-size: 12px; }
  .cc-save { margin-top: 12px; width: 100%; min-height: 44px; border: none; cursor: pointer; background: var(--mc-gold); color: var(--mc-on-gold); border-radius: 9px; font-size: 14px; font-weight: 700; }
  .cc-save:disabled { opacity: .6; cursor: default; }
  .cc-saved, .cc-hint { font-size: 12px; color: var(--mc-muted); margin: 10px 2px 0; line-height: 1.6; }
  .cc-saved b { color: var(--mc-ink); font-weight: 600; margin-right: 6px; white-space: nowrap; }
  .wk { margin-top: 16px; border-top: 1px solid var(--mc-line); padding-top: 12px; }
  .wk-h { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--mc-muted); margin-bottom: 8px; }
  .wk-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .wk-stats b { display: block; font-size: 18px; color: var(--mc-ink); font-variant-numeric: tabular-nums; }
  .wk-stats span { display: block; font-size: 11px; color: var(--mc-muted); line-height: 1.35; margin-top: 2px; }
  .wk-bars { display: flex; gap: 6px; align-items: flex-end; height: 64px; margin-top: 12px; }
  .wk-col { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 3px; }
  .wk-bar { width: 100%; background: var(--mc-line-soft); border-radius: 2px 2px 0 0; min-height: 4px; }
  .wk-bar.f { background: var(--mc-gold); }
  .wk-col span { font-size: 10px; color: var(--mc-faint); }
</style>
