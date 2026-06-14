<script lang="ts">
  import { onMount } from 'svelte';
  import { listProteges, type Protege } from '../../api/operations.js';

  let items = $state<Protege[]>([]);
  let nextToken = $state<string | null | undefined>(null);
  let loading = $state(false);
  let error = $state('');
  let search = $state('');
  let sortCol = $state<keyof Protege>('createdAt');
  let sortAsc = $state(false);

  const filtered = $derived(
    items.filter((p) => {
      const q = search.toLowerCase();
      return (
        !q ||
        (p.firstName ?? '').toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    }),
  );

  const sorted = $derived(
    [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    }),
  );

  async function load(token?: string) {
    loading = true;
    error = '';
    try {
      const res = await listProteges(50, token);
      const page = res.listProteges;
      if (token) {
        items = [...items, ...(page.items ?? [])];
      } else {
        items = page.items ?? [];
      }
      nextToken = page.nextToken;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load Protégés';
    } finally {
      loading = false;
    }
  }

  function toggleSort(col: keyof Protege) {
    if (sortCol === col) {
      sortAsc = !sortAsc;
    } else {
      sortCol = col;
      sortAsc = true;
    }
  }

  function sortIndicator(col: keyof Protege) {
    if (sortCol !== col) return '';
    return sortAsc ? ' ▲' : ' ▼';
  }

  function fmtDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  onMount(() => load());
</script>

<div class="proteges-panel">
  <div class="panel-header">
    <h3 class="panel-title">
      Protégés
      <span class="badge">{items.length}{nextToken ? '+' : ''}</span>
    </h3>
    <input
      class="search"
      type="search"
      placeholder="Search by name or email…"
      bind:value={search}
    />
  </div>

  {#if loading && items.length === 0}
    <p class="loading">Loading…</p>
  {:else if error}
    <p class="err">{error}</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th onclick={() => toggleSort('firstName')}>Name{sortIndicator('firstName')}</th>
            <th onclick={() => toggleSort('email')}>Email{sortIndicator('email')}</th>
            <th onclick={() => toggleSort('phone')}>Phone{sortIndicator('phone')}</th>
            <th onclick={() => toggleSort('createdAt')}>Signed up{sortIndicator('createdAt')}</th>
            <th onclick={() => toggleSort('daysAsProtege')}>Days{sortIndicator('daysAsProtege')}</th>
          </tr>
        </thead>
        <tbody>
          {#each sorted as p (p.contactId)}
            <tr>
              <td>{p.firstName ?? '—'}</td>
              <td class="mono">{p.email}</td>
              <td>{p.phone ?? '—'}</td>
              <td>{fmtDate(p.createdAt)}</td>
              <td class="num">{p.daysAsProtege}</td>
            </tr>
          {:else}
            <tr><td colspan="5" class="empty">No Protégés found.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if nextToken}
      <button class="load-more" disabled={loading} onclick={() => load(nextToken ?? undefined)}>
        {loading ? 'Loading…' : 'Load more'}
      </button>
    {/if}
  {/if}
</div>

<style>
  .proteges-panel {
    padding: 0;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .panel-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2E1E;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    background: #1D9E75;
    border: 1px solid #1D9E75;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 0.75rem;
    color: #ffffff;
    font-weight: 600;
  }

  .search {
    margin-left: auto;
    background: #ffffff;
    border: 1px solid #c5d0c2;
    border-radius: 6px;
    padding: 6px 12px;
    color: #0a1a0e;
    font-size: 0.85rem;
    outline: none;
    min-width: 220px;
  }

  .search:focus {
    border-color: #1D9E75;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  thead th {
    text-align: left;
    padding: 8px 12px;
    color: #1A2E1E;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 2px solid #1D9E75;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    background: #F0F5F0;
  }

  thead th:hover {
    color: #1D9E75;
  }

  tbody td {
    padding: 10px 12px;
    color: #0a0a0a;
    font-weight: 500;
    border-bottom: 1px solid #d9e5d6;
    background: #ffffff;
  }

  tr:hover td {
    background: #f5faf3;
  }

  .mono { font-family: monospace; font-size: 0.82rem; }
  .num { text-align: right; }
  .empty { text-align: center; color: #3A6A44; padding: 24px; }

  .loading, .err {
    color: #3A6A44;
    padding: 20px 0;
  }
  .err { color: #c81e1e; }

  .load-more {
    margin-top: 12px;
    background: #1D9E75;
    border: 1px solid #1D9E75;
    border-radius: 6px;
    color: #ffffff;
    padding: 8px 20px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .load-more:hover:not(:disabled) {
    background: #222a38;
  }

  .load-more:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
