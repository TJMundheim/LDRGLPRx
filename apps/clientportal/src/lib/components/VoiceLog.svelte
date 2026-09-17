<script lang="ts">
  /**
   * VoiceLog — "Tell Dr. TJ's AI".
   *
   * One sentence in (spoken or typed) → /api/log-parse → a PREVIEW the member
   * confirms → adherence writes + numeric day-log.
   *
   * HARD RULE: nothing is ever written without an explicit Confirm tap.
   *
   * Numeric fields have no backend column yet, so they land in localStorage
   * under `daylog-<YYYY-MM-DD>` and a `my4m:daylog` CustomEvent is dispatched
   * so trackers elsewhere can pick them up without a reload.
   */
  import * as speech from '../speech.js';
  import { parseDayLog, todaysSchema, LogParseError, type LogParseResult, type LogSchema } from '../logParse.js';
  import Chips from './Chips.svelte';

  interface Props {
    week: number;
    date: string;
    onLog: (actionId: string, completed: boolean) => void | Promise<void>;
  }
  let { week, date, onLog }: Props = $props();

  const schema = $derived<LogSchema>(todaysSchema(week));

  const CHIP_OPTIONS: Record<string, number[]> = {
    sleepHours: [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9],
    walkMinutes: [0, 10, 20, 30, 45, 60],
    proteinGrams: [20, 30, 40, 50, 60],
    strengthMinutes: [0, 20, 30, 45, 60],
  };

  // Voice can die mid-session (iOS standalone PWA: the recogniser exists but
  // never fires an event). `voiceDead` flips on the first fatal error and the
  // mic disappears for the rest of the session.
  let voiceDead = $state(!speech.isSupported());
  const supported = $derived(!voiceDead);

  let listening = $state(false);
  let interim = $state('');
  let text = $state('');
  let busy = $state(false);
  let errorMsg = $state('');
  let toast = $state('');

  let preview = $state<LogParseResult | null>(null);
  let draftActions = $state<Record<string, boolean | null>>({});
  let draftFields = $state<Record<string, number | null>>({});

  // ── "Same as yesterday" ───────────────────────────────────────────────────
  // Same logic MorningTracker uses, but living on the dashboard (MorningTracker
  // is not mounted — the dashboard renders via renderer.ts). Reads yesterday's
  // completed ids straight out of the adherence cache
  // (`adherence-cache-<date>-<actionId>`) and re-logs them for today. Disabled
  // with a reason when yesterday is empty. Nothing is written without a tap.
  function ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const yesterdayStr = $derived.by(() => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() - 1);
    return ymd(d);
  });

  function cachedIds(day: string, ids: string[]): string[] {
    try {
      return ids.filter(id => !!localStorage.getItem(`adherence-cache-${day}-${id}`));
    } catch { return []; }
  }

  let copied = $state(false);
  const yesterdayIds = $derived.by(() => {
    copied; // re-read after a copy
    return cachedIds(yesterdayStr, schema.actions.map(a => a.id));
  });
  const canCopy = $derived(yesterdayIds.length > 0);

  async function copyYesterday(): Promise<void> {
    if (!canCopy || busy) return;
    busy = true;
    errorMsg = '';
    try {
      const already = cachedIds(date, yesterdayIds);
      let n = 0;
      for (const id of yesterdayIds) {
        if (already.includes(id)) continue;
        await onLog(id, true);
        n++;
      }
      copied = true;
      toast = n > 0
        ? `Logged — ${n} action${n === 1 ? '' : 's'} copied from yesterday.`
        : 'Already logged for today.';
      setTimeout(() => { toast = ''; }, 2600);
    } catch {
      errorMsg = "Couldn't copy yesterday. Try again.";
    } finally {
      busy = false;
    }
  }

  /** Hard stop — always usable, never waits on the recogniser to call back. */
  function cancelListening(): void {
    speech.abort();
    listening = false;
    interim = '';
  }

  function toggleMic(): void {
    errorMsg = '';
    if (listening) { cancelListening(); return; }
    listening = true;
    interim = '';
    speech.start(
      (t) => { interim = t; },
      (t) => {
        listening = false;
        interim = '';
        if (t) text = text ? `${text.trim()} ${t}` : t;
      },
      (err) => {
        listening = false;
        interim = '';
        if (err.code === 'unavailable' || err.code === 'not-allowed' || err.code === 'unsupported') {
          voiceDead = true;
        }
        if (err.code !== 'aborted') errorMsg = err.message;
      },
    );
  }

  async function submit(): Promise<void> {
    errorMsg = '';
    if (!text.trim()) { errorMsg = 'Say or type what you did first.'; return; }
    busy = true;
    try {
      const res = await parseDayLog(text, date, schema);
      preview = res;
      draftActions = { ...res.actions };
      draftFields = { ...res.fields };
    } catch (e) {
      errorMsg = e instanceof LogParseError ? e.message : 'Something went wrong. Try again.';
    } finally {
      busy = false;
    }
  }

  function cycle(id: string): void {
    const cur = draftActions[id];
    // unknown → done → skipped → unknown
    draftActions = { ...draftActions, [id]: cur === null || cur === undefined ? true : cur === true ? false : null };
  }

  function setField(id: string, v: number | null): void {
    draftFields = { ...draftFields, [id]: v };
  }

  function cancel(): void {
    preview = null;
    errorMsg = '';
  }

  async function confirm(): Promise<void> {
    if (!preview) return;
    busy = true;
    let nActions = 0;
    try {
      for (const a of schema.actions) {
        const v = draftActions[a.id];
        if (v === true || v === false) {
          await onLog(a.id, v);
          nActions++;
        }
      }
      const numbers: Record<string, number> = {};
      for (const f of schema.fields) {
        const v = draftFields[f.id];
        if (typeof v === 'number') numbers[f.id] = v;
      }
      const nNumbers = Object.keys(numbers).length;
      if (nNumbers > 0 || preview.notes) {
        const payload = { date, ...numbers, notes: preview.notes ?? '' };
        try { localStorage.setItem(`daylog-${date}`, JSON.stringify(payload)); } catch { /* private mode */ }
        try {
          window.dispatchEvent(new CustomEvent('my4m:daylog', { detail: payload }));
        } catch { /* older webviews */ }
      }
      preview = null;
      text = '';
      toast = `Logged — ${nActions} action${nActions === 1 ? '' : 's'}, ${nNumbers} number${nNumbers === 1 ? '' : 's'}.`;
      setTimeout(() => { toast = ''; }, 2600);
    } catch {
      errorMsg = "Couldn't save everything. Try again.";
    } finally {
      busy = false;
    }
  }
</script>

<section class="vl-card" aria-label="Tell Dr. TJ's AI">
  <h2 class="vl-title">Tell Dr. TJ's AI</h2>
  <p class="vl-help">Say or type what you did — e.g. “fasted walk 30 minutes, protein after, skipped strength.”</p>

  {#if !preview}
    <div class="vl-capture">
      {#if supported}
        <button
          type="button"
          class="mic"
          class:listening
          aria-pressed={listening}
          aria-label={listening ? 'Stop listening' : 'Start voice input'}
          onclick={toggleMic}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"/>
            <path fill="currentColor" d="M18 11a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.09A6 6 0 0 0 18 11Z"/>
          </svg>
        </button>
        <div class="vl-micside">
          <div class="vl-micstate">{listening ? 'Listening…' : 'Tap to talk'}</div>
          {#if interim}<div class="vl-interim">{interim}</div>{/if}
          {#if listening}
            <button type="button" class="vl-cancel" onclick={cancelListening}>Cancel</button>
          {/if}
        </div>
      {:else}
        <div class="vl-micside"><div class="vl-micstate">Voice isn't available here — type your log instead.</div></div>
      {/if}
    </div>

    <label class="vl-ta-label" for="vl-textarea">What you did today</label>
    <textarea
      id="vl-textarea"
      bind:value={text}
      rows="3"
      placeholder="Type or tap the mic… e.g. fasted walk 30 minutes, protein after, skipped strength"
    ></textarea>

    {#if errorMsg}
      <div class="vl-err" role="alert">
        {errorMsg}
        <button type="button" class="linkbtn" onclick={submit}>Try again</button>
      </div>
    {/if}

    <button type="button" class="primary" disabled={busy || !text.trim()} onclick={submit}>
      {busy ? 'Reading it…' : 'Log it'}
    </button>

    <button type="button" class="secondary" disabled={!canCopy || busy} onclick={copyYesterday}>
      {copied ? 'Copied from yesterday' : 'Same as yesterday'}
      {#if !canCopy}<em>— nothing logged yesterday</em>{/if}
    </button>
  {:else}
    <div class="vl-preview">
      <div class="vl-pretitle">Check this before it saves</div>

      <div class="vl-actions">
        {#each schema.actions as a}
          {@const v = draftActions[a.id]}
          <button
            type="button"
            class="arow"
            class:done={v === true}
            class:skipped={v === false}
            class:unknown={v !== true && v !== false}
            aria-pressed={v === true}
            onclick={() => cycle(a.id)}
          >
            <span class="abox" aria-hidden="true">{v === true ? '✓' : v === false ? '✕' : '–'}</span>
            <span class="alabel">{a.label}</span>
            <span class="astate">{v === true ? 'Done' : v === false ? 'Skipped' : 'Not said'}</span>
          </button>
        {/each}
      </div>

      <div class="vl-fields">
        {#each schema.fields as f}
          <Chips
            label={f.label}
            unit={f.unit}
            options={CHIP_OPTIONS[f.id] ?? []}
            value={draftFields[f.id] ?? null}
            onChange={(v) => setField(f.id, v)}
          />
        {/each}
      </div>

      {#if preview.notes}
        <div class="vl-notes"><b>Notes:</b> {preview.notes}</div>
      {/if}
      {#if preview.unclear.length > 0}
        <div class="vl-unclear">Not sure about: {preview.unclear.join(', ')}</div>
      {/if}

      {#if errorMsg}
        <div class="vl-err" role="alert">{errorMsg}</div>
      {/if}

      <div class="vl-confirmrow">
        <button type="button" class="ghost" onclick={cancel} disabled={busy}>Back</button>
        <button type="button" class="primary" onclick={confirm} disabled={busy}>
          {busy ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </div>
  {/if}

  {#if toast}
    <div class="vl-toast" role="status">{toast}</div>
  {/if}
</section>

<style>
  .vl-card {
    background: var(--mc-panel);
    border: 1px solid var(--mc-line);
    border-radius: 16px;
    padding: 18px 16px;
    margin: 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .vl-title {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: .01em;
    color: var(--mc-ink);
  }
  .vl-help { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--mc-muted); }

  .vl-capture { display: flex; align-items: center; gap: 14px; }
  .mic {
    width: 72px; height: 72px; flex: 0 0 72px;
    border-radius: 50%;
    border: none;
    background: var(--mc-gold);
    color: var(--mc-on-gold);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .mic:focus-visible { outline: 2px solid var(--mc-gold); outline-offset: 3px; }
  /* The "listening" cue is an animation on the BUTTON only — never a fixed
     overlay, backdrop or body-scroll lock. Nothing outside this 72px circle
     may become unclickable while listening (iOS freeze, 2026-09-17). */
  .mic.listening { animation: vlpulse 1.3s ease-in-out infinite; }
  @keyframes vlpulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--mc-gold-soft) 65%, transparent); }
    50%      { box-shadow: 0 0 0 14px color-mix(in srgb, var(--mc-gold-soft) 0%, transparent); }
  }
  @media (prefers-reduced-motion: reduce) {
    .mic.listening {
      animation: none;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--mc-gold-soft) 65%, transparent);
    }
  }

  .vl-cancel {
    margin-top: 6px;
    min-height: 34px; padding: 0 14px;
    border: 1px solid var(--mc-line); border-radius: 999px;
    background: var(--mc-panel-2); color: var(--mc-ink);
    font: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer;
  }
  .vl-cancel:focus-visible { outline: 2px solid var(--mc-gold); outline-offset: 2px; }

  .vl-micside { min-width: 0; }
  .vl-micstate { font-size: 12px; font-weight: 700; color: var(--mc-muted); letter-spacing: .04em; }
  .vl-interim { margin-top: 4px; font-size: 13px; color: var(--mc-ink); line-height: 1.5; }

  .vl-ta-label {
    font-size: 10px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--mc-muted);
  }
  textarea {
    width: 100%; box-sizing: border-box;
    min-height: 84px; padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--mc-line);
    background: var(--mc-panel-2);
    color: var(--mc-ink);
    font: inherit; font-size: 15px; line-height: 1.5;
    resize: vertical;
  }
  textarea:focus-visible { outline: 2px solid var(--mc-gold); outline-offset: 1px; }

  .primary {
    min-height: 52px; padding: 0 20px;
    border: none; border-radius: 12px;
    background: var(--mc-gold); color: var(--mc-on-gold);
    font-size: 15px; font-weight: 800; letter-spacing: .02em;
    cursor: pointer;
  }
  .primary:disabled { background: var(--mc-panel-2); color: var(--mc-muted); border: 1px solid var(--mc-line); opacity: 1; cursor: default; }
  .secondary {
    min-height: 48px; padding: 0 16px;
    border: 1px solid var(--mc-line); border-radius: 12px;
    background: var(--mc-panel-2); color: var(--mc-ink);
    font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .secondary:disabled { opacity: .5; cursor: default; }
  .secondary em {
    font-style: normal; font-weight: 600; font-size: 12px;
    color: var(--mc-muted); margin-left: 6px;
  }
  .secondary:focus-visible { outline: 2px solid var(--mc-gold); outline-offset: 2px; }
  .ghost {
    min-height: 52px; padding: 0 20px;
    border: 1px solid var(--mc-line); border-radius: 12px;
    background: transparent; color: var(--mc-muted);
    font-size: 15px; font-weight: 700; cursor: pointer;
  }
  .linkbtn {
    background: none; border: none; padding: 0 0 0 8px;
    color: var(--mc-gold); font: inherit; font-weight: 700;
    text-decoration: underline; cursor: pointer;
  }

  .vl-err {
    font-size: 13px; line-height: 1.5;
    color: var(--mc-crit-bright);
    background: color-mix(in srgb, var(--mc-crit-bright) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--mc-crit-bright) 40%, transparent);
    border-radius: 10px; padding: 10px 12px;
  }

  .vl-preview { display: flex; flex-direction: column; gap: 14px; }
  .vl-pretitle {
    font-size: 10px; font-weight: 700; letter-spacing: .16em;
    text-transform: uppercase; color: var(--mc-gold);
  }
  .vl-actions { display: flex; flex-direction: column; gap: 8px; }
  .arow {
    display: flex; align-items: center; gap: 12px;
    min-height: 56px; padding: 0 14px;
    width: 100%; text-align: left;
    border-radius: 12px;
    border: 1px solid var(--mc-line);
    background: var(--mc-panel-2);
    color: var(--mc-ink);
    font: inherit; cursor: pointer;
  }
  .abox {
    width: 30px; height: 30px; flex: 0 0 30px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800;
    border: 1px solid var(--mc-line);
  }
  .alabel { flex: 1 1 auto; font-size: 15px; font-weight: 700; }
  .astate { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--mc-muted); }
  .arow.done { border-color: var(--mc-good-bright); }
  .arow.done .abox { background: var(--mc-good-bright); border-color: var(--mc-good-bright); color: var(--mc-on-gold); }
  .arow.skipped .abox { color: var(--mc-crit-bright); border-color: var(--mc-crit-bright); }
  .arow.unknown { opacity: .55; }

  .vl-fields { display: flex; flex-direction: column; gap: 14px; }
  .vl-notes, .vl-unclear { font-size: 13px; line-height: 1.6; color: var(--mc-muted); }
  .vl-unclear { color: var(--mc-warn-bright); }

  .vl-confirmrow { display: flex; gap: 10px; }
  .vl-confirmrow .primary { flex: 1 1 auto; }

  .vl-toast {
    font-size: 13px; font-weight: 700;
    color: var(--mc-good-bright);
    background: color-mix(in srgb, var(--mc-good-bright) 12%, transparent);
    border-radius: 10px; padding: 10px 12px;
  }

  @media (max-width: 480px) {
    .vl-card { padding: 16px 12px; }
  }
</style>
