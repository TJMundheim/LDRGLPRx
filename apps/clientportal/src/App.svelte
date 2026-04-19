<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { storage } from './lib/storage';
  import { createEmptyWorkbook, type Workbook } from './lib/data/schema';
  import {
    renderPage, renderSidebar, sidebarStats, type RenderContext
  } from './lib/renderer';
  import Sidebar from './lib/components/Sidebar.svelte';

  // ── State ───────────────────────────────────────────────
  // Single-workbook mode during beta; auth wiring will supply real ids.
  const WORKBOOK_ID = 'local-workbook';
  const USER_ID = 'local-user';

  let workbook = $state<Workbook>(createEmptyWorkbook(WORKBOOK_ID, USER_ID));
  let curTab = $state('dash');
  let openFactor = $state<string | null>(null);
  let factorTab = $state<'imm' | 'tools' | 'adv' | 'res'>('imm');
  let toastMsg = $state('');
  let toastShow = $state(false);

  const ctx = $derived<RenderContext>({ W: workbook, curTab, openFactor, factorTab });
  const pageHtml = $derived(renderPage(ctx));
  const navHtml = $derived(renderSidebar(ctx));
  const stats = $derived(sidebarStats(workbook));

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

  function goTo(id: string): void {
    curTab = id;
    window.scrollTo(0, 0);
  }

  // Expose actions for inline onclick/oninput handlers emitted by renderer.ts.
  // This is the documented seam the renderer uses — components that call
  // setField/setScore/etc. directly should go through these functions too.
  type PortalAction =
    | 'goTo' | 'setScore' | 'toggleFactor' | 'setFactorTab' | 'toggleDay' | 'setSupp';
  function portalAction(action: PortalAction, ...args: unknown[]): void {
    switch (action) {
      case 'goTo':         goTo(String(args[0])); break;
      case 'setScore':     setScore(String(args[0]), Number(args[1])); break;
      case 'toggleFactor': toggleFactor(String(args[0])); break;
      case 'setFactorTab': setFactorTab(args[0] as 'imm' | 'tools' | 'adv' | 'res'); break;
      case 'toggleDay':    toggleDay(args[0] as 'morn' | 'cold', Number(args[1]), String(args[2])); break;
      case 'setSupp':      setSupp(String(args[0]), args[1] as 'Yes' | 'No'); break;
    }
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

    const existing = await storage.getWorkbook(WORKBOOK_ID);
    if (existing) {
      // Merge to tolerate old snapshots missing newer fields.
      workbook = { ...createEmptyWorkbook(WORKBOOK_ID, USER_ID), ...existing };
    }
    await tick();
  });
</script>

<div class="shell">
  <Sidebar {navHtml} name={workbook.name} {stats} />
  <div class="main" id="main-content">
    {@html pageHtml}
  </div>
</div>
<div id="toast" class:show={toastShow}>{toastMsg}</div>
