<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '../../auth/store.svelte.js';
  import Forbidden403 from './Forbidden403.svelte';
  import ProtegesPanel from './ProtegesPanel.svelte';
  import EventsAdmin from './EventsAdmin.svelte';
  import PatientsAdmin from './PatientsAdmin.svelte';

  const isAdmin = $derived(currentUser.value?.groups.includes('Admins') ?? false);

  let activeTab = $state<'proteges' | 'events' | 'patients'>('proteges');
</script>

{#if !isAdmin}
  <Forbidden403 />
{:else}
<div class="admin-dashboard">
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'proteges'}
      onclick={() => (activeTab = 'proteges')}
    >Protégés</button>
    <button
      class="tab"
      class:active={activeTab === 'events'}
      onclick={() => (activeTab = 'events')}
    >Events</button>
    <button
      class="tab"
      class:active={activeTab === 'patients'}
      onclick={() => (activeTab = 'patients')}
    >Patients</button>
  </div>

  {#if activeTab === 'proteges'}
    <ProtegesPanel />
  {:else if activeTab === 'events'}
    <EventsAdmin />
  {:else if activeTab === 'patients'}
    <PatientsAdmin />
  {/if}
</div>
{/if}

<style>
  .admin-dashboard {
    padding: 28px 32px;
    max-width: 960px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
    border-bottom: 1px solid #d9e5d6;
    padding-bottom: 0;
  }

  .tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 10px 18px;
    color: #1A2E1E;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color 0.15s;
  }

  .tab:hover {
    color: #1D9E75;
  }

  .tab.active {
    color: #1D9E75;
    border-bottom-color: #1D9E75;
  }

  .loading, .error {
    color: #1A2E1E;
    padding: 20px 0;
  }

  .error {
    color: #c81e1e;
  }

  .stat-cards {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .stat-card {
    background: #ffffff;
    border: 1px solid #d9e5d6;
    border-radius: 10px;
    padding: 16px 22px;
    min-width: 110px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
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
    color: #1A2E1E;
  }

  .stat-card.urgent  .stat-num { color: #c81e1e; }
  .stat-card.soon    .stat-num { color: #b07d00; }
  .stat-card.routine .stat-num { color: #1D9E75; }
  .stat-card.neutral .stat-num { color: #1D9E75; }

  .section-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2E1E;
    margin: 0 0 14px;
  }
</style>
