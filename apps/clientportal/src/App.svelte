<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { storage } from './lib/storage';
  import { createEmptyWorkbook, type Workbook } from './lib/data/schema';
  import {
    renderPage, renderSidebar, sidebarStats, type RenderContext
  } from './lib/renderer';
  import Sidebar from './lib/components/Sidebar.svelte';
  import DiscoveryFlow from './lib/components/discovery/DiscoveryFlow.svelte';
  import PricingPage from './lib/components/tiers/PricingPage.svelte';
  import AdminDashboard from './lib/components/admin/AdminDashboard.svelte';
  import { currentUser as currentUserLegacy } from './lib/integrations/auth';
  import AuthGate from './lib/components/auth/AuthGate.svelte';

  // ── State ───────────────────────────────────────────────
  // Single-workbook mode during beta; auth wiring will supply real ids.
  const WORKBOOK_ID = 'local-workbook';
  const USER_ID = 'local-user';

  let workbook = $state<Workbook>(createEmptyWorkbook(WORKBOOK_ID, USER_ID));
  let curTab = $state('dash');
  let userRole = $state<'patient' | 'clinician' | 'admin' | undefined>(undefined);
  let currentView = $state<'workbook' | 'admin'>('workbook');
  let showDiscovery = $state(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'discovery'
  );
  let showPricing = $state(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'pricing'
  );
  let pricingHighlightTier = $state(
    typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tier') ?? '') : ''
  );
  let openFactor = $state<string | null>(null);
  let factorTab = $state<'imm' | 'tools' | 'adv' | 'res'>('imm');
  let toastMsg = $state('');
  let toastShow = $state(false);

  // Re-render tick: structural changes (tabs, factor toggle, score, day toggle,
  // supplement change) bump this. Field edits do NOT bump it so focus is
  // preserved while typing into inputs.
  let renderTick = $state(0);
  let pageHtml = $state('');
  let navHtml = $state('');
  const stats = $derived(sidebarStats(workbook));

  $effect(() => {
    // Track only structural triggers.
    renderTick;
    curTab;
    openFactor;
    factorTab;
    untrack(() => {
      const ctx: RenderContext = { W: workbook, curTab, openFactor, factorTab };
      pageHtml = renderPage(ctx);
      navHtml = renderSidebar(ctx);
    });
  });

  // ── Actions ─────────────────────────────────────────────
  function showToast(msg: string): void {
    toastMsg = msg;
    toastShow = true;
    setTimeout(() => { toastShow = false; }, 2200);
  }

  function persist(): void {
    void storage.saveWorkbook($state.snapshot(workbook) as Workbook);
  }

  /**
   * Dotted-path field setter. Handles `factorPlans.03`, `priorities.0`,
   * `weekLogs.1.reflection`, `bodyBaseline.weight`, `month2.training`, etc.
   */
  function setField(path: string, value: unknown): void {
    const parts = path.split('.');
    let obj: Record<string, unknown> = workbook as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const next = obj[parts[i]!];
      if (typeof next !== 'object' || next === null) {
        obj[parts[i]!] = {};
      }
      obj = obj[parts[i]!] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]!] = value;
    persist();
  }

  function setScore(fId: string, n: number): void {
    workbook.factorScores[fId] = n;
    showToast(`Factor ${fId} scored ${n} / 5`);
    persist();
  }

  function toggleFactor(fId: string): void {
    openFactor = openFactor === fId ? null : fId;
    factorTab = 'imm';
  }

  function setFactorTab(tab: 'imm' | 'tools' | 'adv' | 'res'): void {
    factorTab = tab;
  }

  function toggleDay(type: 'morn' | 'cold', week: number, key: string): void {
    const wk = week as 1 | 2 | 3 | 4;
    const log = workbook.weekLogs[wk];
    log[type][key] = !log[type][key];
    persist();
  }

  function setSupp(key: string, value: 'Yes' | 'No'): void {
    workbook.supplements[key] = { takingNow: value === 'Yes', response: value };
    persist();
  }

  function goTo(id: string, params?: Record<string, string>): void {
    if (id === 'admin') {
      if (userRole === 'admin' || userRole === 'clinician') {
        currentView = 'admin';
        showDiscovery = false;
        showPricing = false;
      }
      window.scrollTo(0, 0);
      return;
    }
    currentView = 'workbook';
    if (id === 'discovery') {
      showDiscovery = true;
      showPricing = false;
      window.scrollTo(0, 0);
      return;
    }
    if (id === 'pricing') {
      showPricing = true;
      showDiscovery = false;
      pricingHighlightTier = params?.tier ?? '';
      window.scrollTo(0, 0);
      return;
    }
    showDiscovery = false;
    showPricing = false;
    curTab = id;
    window.scrollTo(0, 0);
  }

  // Expose actions for inline onclick/oninput handlers emitted by renderer.ts.
  // This is the documented seam the renderer uses — components that call
  // setField/setScore/etc. directly should go through these functions too.
  type PortalAction =
    | 'goTo' | 'setScore' | 'toggleFactor' | 'setFactorTab' | 'toggleDay' | 'setSupp' | 'recalc';
  function portalAction(action: PortalAction, ...args: unknown[]): void {
    switch (action) {
      case 'goTo':         goTo(String(args[0]), args[1] as Record<string, string> | undefined); break;
      case 'setScore':     setScore(String(args[0]), Number(args[1])); break;
      case 'toggleFactor': toggleFactor(String(args[0])); break;
      case 'setFactorTab': setFactorTab(args[0] as 'imm' | 'tools' | 'adv' | 'res'); break;
      case 'toggleDay':    toggleDay(args[0] as 'morn' | 'cold', Number(args[1]), String(args[2])); break;
      case 'setSupp':      setSupp(String(args[0]), args[1] as 'Yes' | 'No'); break;
      case 'recalc':       showToast('Recalculated'); break;
    }
    // Structural change — trigger re-render.
    renderTick++;
  }

  function portalField(path: string, value: unknown): void {
    setField(path, value);
  }

  // Types for the window-exposed API so TS doesn't complain.
  type PortalWindow = Window & {
    portalAction?: typeof portalAction;
    portalField?: typeof portalField;
  };

  onMount(async () => {
    (window as PortalWindow).portalAction = portalAction;
    (window as PortalWindow).portalField = portalField;

    const user = await currentUserLegacy();
    if (user) {
      const g = user.groups ?? [];
      userRole = g.includes('Admins') ? 'admin' : g.includes('Clinicians') ? 'clinician' : 'patient';
    }

    const existing = await storage.getWorkbook(WORKBOOK_ID);
    if (existing) {
      // Merge to tolerate old snapshots missing newer fields.
      workbook = { ...createEmptyWorkbook(WORKBOOK_ID, USER_ID), ...existing };
    }
    renderTick++;
    await tick();
  });
</script>

<AuthGate>
<div class="shell">
  <Sidebar {navHtml} name={workbook.name} {stats} discoveryActive={showDiscovery} pricingActive={showPricing} {userRole} adminActive={currentView === 'admin'} />
  <div class="main" id="main-content">
    {#if currentView === 'admin'}
      <AdminDashboard />
    {:else if showDiscovery}
      <DiscoveryFlow
        userId={USER_ID}
        onGoToPricing={(tierId) => goTo('pricing', { tier: tierId })}
      />
    {:else if showPricing}
      <PricingPage
        highlightTierId={pricingHighlightTier}
        onGoToDiscovery={() => goTo('discovery')}
      />
    {:else}
      {@html pageHtml}
      <button
        type="button"
        class="recalc-btn"
        onclick={() => { renderTick++; showToast('Recalculated'); }}
        title="Refresh totals, deltas, and comparison columns"
        aria-label="Recalculate"
      >
        ↻ Recalculate
      </button>
    {/if}
  </div>
</div>
</AuthGate>
<div id="toast" class:show={toastShow}>{toastMsg}</div>

<style>
  .recalc-btn {
    position: fixed;
    bottom: 22px;
    right: 22px;
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 12px 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(29,158,117,0.35);
    z-index: 50;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .recalc-btn:hover {
    background: #17875F;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(29,158,117,0.45);
  }
  .recalc-btn:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 3px;
  }
</style>
