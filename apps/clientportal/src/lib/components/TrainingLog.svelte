<script lang="ts">
  import type { TrainingSession } from '../data/schema';

  interface Props {
    label: string;
    /** Rows: [key, display label] pairs. */
    rows: Array<[string, string]>;
    log: TrainingSession;
    onField: (key: string, value: string) => void;
  }
  let { label, rows, log, onField }: Props = $props();
</script>

<div class="card">
  <div class="card-title">{label}</div>
  <div style="display:grid;grid-template-columns:1.5fr 1fr 0.8fr;gap:8px;margin-bottom:6px">
    {#each ['Exercise','Weight / resistance','Reps'] as h}
      <div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#7A9A7E">{h}</div>
    {/each}
  </div>
  {#each rows as [k, l]}
    <div style="display:grid;grid-template-columns:1.5fr 1fr 0.8fr;gap:8px;margin-bottom:7px;align-items:center">
      <div style="background:#F0FAF5;border:1px solid #D0E8D8;border-radius:7px;padding:8px 10px;font-size:11px;color:#3A6A44;font-weight:600">{l}</div>
      <input placeholder="Weight / level" style="font-size:11px"
        value={log[`${k}_weight`] ?? ''}
        oninput={(e) => onField(`${k}_weight`, (e.currentTarget as HTMLInputElement).value)} />
      <input placeholder="Reps" style="font-size:11px"
        value={log[`${k}_reps`] ?? ''}
        oninput={(e) => onField(`${k}_reps`, (e.currentTarget as HTMLInputElement).value)} />
    </div>
  {/each}
</div>
