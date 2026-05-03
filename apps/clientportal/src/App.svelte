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
  import IntakeModule from './lib/components/intake/IntakeModule.svelte';
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

  // ── Intake gating ────────────────────────────────────────────────────────
  const INTAKE_COMPLETE_KEY = 'intake-complete-v1';
  function isIntakeComplete(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return !!localStorage.getItem(INTAKE_COMPLETE_KEY);
    } catch { return false; }
  }
  let intakeComplete = $state(isIntakeComplete());

  function onIntakeComplete(): void {
    intakeComplete = true;
    renderTick++;
  }

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

  // ── Gut Health Self-Assessment ──────────────────────────────────────────────
  // Fully self-contained: reads/writes localStorage under `gut-assessment-v1`,
  // manipulates DOM directly so no workbook re-render is needed.
  const GUT_STORAGE_KEY = 'gut-assessment-v1';
  const GUT_TOTAL = 10;

  function gutAssessmentAction(action: string, qIndex?: number, value?: boolean): void {
    const raw = localStorage.getItem(GUT_STORAGE_KEY);
    const state: { answers: Record<number, boolean>; score: number | null; completedAt: string | null } =
      raw ? JSON.parse(raw) : { answers: {}, score: null, completedAt: null };

    if (action === 'answer' && qIndex !== undefined && value !== undefined) {
      state.answers[qIndex] = value;
      localStorage.setItem(GUT_STORAGE_KEY, JSON.stringify(state));

      // Visually update the two buttons for this question
      const ac = '#1D9E75';
      const violet = '#6B5ED4';
      const offBg = '#FFFFFF';
      const offColor = '#5A8A64';
      const offBorder = '#D8E8DC';
      const card = document.getElementById('gut-questions-block');
      if (card) {
        const rows = card.querySelectorAll<HTMLElement>('[data-gut-row]');
        const row = rows[qIndex];
        if (row) {
          const [yesBtn, noBtn] = row.querySelectorAll<HTMLButtonElement>('button');
          if (yesBtn && noBtn) {
            yesBtn.style.background = value ? ac : offBg;
            yesBtn.style.color = value ? '#fff' : offColor;
            yesBtn.style.borderColor = value ? ac : offBorder;
            noBtn.style.background = !value ? violet : offBg;
            noBtn.style.color = !value ? '#fff' : offColor;
            noBtn.style.borderColor = !value ? violet : offBorder;
          }
        }
      }

      // Enable/disable submit button
      const answeredCount = Object.keys(state.answers).length;
      const submitBtn = document.getElementById('gut-submit-btn') as HTMLButtonElement | null;
      if (submitBtn) {
        const allDone = answeredCount >= GUT_TOTAL;
        submitBtn.disabled = !allDone;
        submitBtn.style.opacity = allDone ? '1' : '.45';
        submitBtn.style.pointerEvents = allDone ? 'auto' : 'none';
      }
      return;
    }

    if (action === 'submit') {
      const answeredCount = Object.keys(state.answers).length;
      if (answeredCount < GUT_TOTAL) return;
      const score = Object.values(state.answers).filter(Boolean).length;
      state.score = score;
      state.completedAt = new Date().toISOString();
      localStorage.setItem(GUT_STORAGE_KEY, JSON.stringify(state));

      // Build result band
      let title: string, body: string, cta: string, scoreColor: string;
      if (score <= 2) {
        title = 'Your gut is in good shape.';
        body = "Stay consistent with Week 1's protocol — bone broth, fermented foods, and your foundational stack maintain what you've built.";
        cta = 'Anchor with Biome-AF';
        scoreColor = '#1D9E75';
      } else if (score <= 5) {
        title = 'Clear gut-axis signals.';
        body = "Your gut is sending signals worth listening to. Week 1's gut-repair protocol plus Biome-AF daily will drive measurable change in 30 days. Retake this assessment then.";
        cta = 'Start with Biome-AF';
        scoreColor = '#D4920A';
      } else {
        title = 'Strong gut-repair indication.';
        body = 'These are the patterns Biome-AF was built for. Anchor your entire Month 1 in gut repair: Biome-AF daily, eliminate sugar/seed oils/alcohol immediately, prioritize bone broth and fermented foods. Retake in 30 days.';
        cta = 'Begin with Biome-AF today';
        scoreColor = '#E05C2A';
      }

      const resultBlock = document.getElementById('gut-result-block');
      const questionsBlock = document.getElementById('gut-questions-block');
      if (resultBlock && questionsBlock) {
        questionsBlock.style.display = 'none';
        resultBlock.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="width:56px;height:56px;border-radius:50%;background:${scoreColor}20;border:2px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-size:22px;font-weight:800;color:${scoreColor}">${score}</span>
            </div>
            <div>
              <div style="font-size:14px;font-weight:700;color:#e8eaf0;line-height:1.3">${title}</div>
              <div style="font-size:10px;color:#6A8A6E;margin-top:2px">Score: ${score}/10</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:#A8D8C0;line-height:1.7;margin-bottom:16px">${body}</div>
          <a href="https://my4mlife.com/membership" style="display:inline-block;background:#1D9E75;color:#fff;font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;text-decoration:none;letter-spacing:.02em">${cta} →</a>
          <div style="margin-top:16px">
            <button onclick="gutAssessmentAction('retake')"
              style="background:none;border:none;color:#6A8A6E;font-size:12px;cursor:pointer;text-decoration:underline;padding:0">Retake assessment</button>
          </div>`;
        resultBlock.style.display = 'block';
      }
      return;
    }

    if (action === 'retake') {
      localStorage.removeItem(GUT_STORAGE_KEY);
      // Trigger full re-render so questions re-appear fresh
      renderTick++;
    }
  }

  // ── Allergy Self-Assessment ─────────────────────────────────────────────
  // Same pattern as gutAssessmentAction. Reads/writes `allergy-assessment-v1`.
  const ALLERGY_STORAGE_KEY = 'allergy-assessment-v1';
  const ALLERGY_TOTAL = 10;

  function allergyAssessmentAction(action: string, qIndex?: number, value?: boolean): void {
    const raw = localStorage.getItem(ALLERGY_STORAGE_KEY);
    const state: { answers: Record<number, boolean>; score: number | null; completedAt: string | null } =
      raw ? JSON.parse(raw) : { answers: {}, score: null, completedAt: null };

    if (action === 'answer' && qIndex !== undefined && value !== undefined) {
      state.answers[qIndex] = value;
      localStorage.setItem(ALLERGY_STORAGE_KEY, JSON.stringify(state));

      const ac = '#9B4D8A';
      const violet = '#6B5ED4';
      const offBg = '#FFFFFF';
      const offColor = '#5A8A64';
      const offBorder = '#D8E8DC';
      const card = document.getElementById('allergy-questions-block');
      if (card) {
        const rows = card.querySelectorAll<HTMLElement>('[data-allergy-row]');
        const row = rows[qIndex];
        if (row) {
          const [yesBtn, noBtn] = row.querySelectorAll<HTMLButtonElement>('button');
          if (yesBtn && noBtn) {
            yesBtn.style.background = value ? ac : offBg;
            yesBtn.style.color = value ? '#fff' : offColor;
            yesBtn.style.borderColor = value ? ac : offBorder;
            noBtn.style.background = !value ? violet : offBg;
            noBtn.style.color = !value ? '#fff' : offColor;
            noBtn.style.borderColor = !value ? violet : offBorder;
          }
        }
      }

      const answeredCount = Object.keys(state.answers).length;
      const submitBtn = document.getElementById('allergy-submit-btn') as HTMLButtonElement | null;
      if (submitBtn) {
        const allDone = answeredCount >= ALLERGY_TOTAL;
        submitBtn.disabled = !allDone;
        submitBtn.style.opacity = allDone ? '1' : '.45';
        submitBtn.style.pointerEvents = allDone ? 'auto' : 'none';
      }
      return;
    }

    if (action === 'submit') {
      const answeredCount = Object.keys(state.answers).length;
      if (answeredCount < ALLERGY_TOTAL) return;
      const score = Object.values(state.answers).filter(Boolean).length;
      state.score = score;
      state.completedAt = new Date().toISOString();
      localStorage.setItem(ALLERGY_STORAGE_KEY, JSON.stringify(state));

      let title: string, body: string, scoreColor: string;
      if (score <= 2) {
        title = 'Low allergy/sensitivity load.';
        body = 'Minimal allergy/sensitivity burden. Maintain your current protocol.';
        scoreColor = '#1D9E75';
      } else if (score <= 5) {
        title = 'Notable allergy/sensitivity signals.';
        body = 'Start with Biome-AF to support gut-immune barrier; consider a 30-day elimination protocol.';
        scoreColor = '#D4920A';
      } else {
        title = 'Significant allergy/sensitivity load.';
        body = 'Strong indication for elimination diet + Biome-AF; flag for telemedicine consult to discuss IgG/IgE testing.';
        scoreColor = '#E05C2A';
      }

      const resultBlock = document.getElementById('allergy-result-block');
      const questionsBlock = document.getElementById('allergy-questions-block');
      if (resultBlock && questionsBlock) {
        questionsBlock.style.display = 'none';
        resultBlock.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="width:56px;height:56px;border-radius:50%;background:${scoreColor}20;border:2px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-size:22px;font-weight:800;color:${scoreColor}">${score}</span>
            </div>
            <div>
              <div style="font-size:14px;font-weight:700;color:#e8eaf0;line-height:1.3">${title}</div>
              <div style="font-size:10px;color:#6A8A6E;margin-top:2px">Score: ${score}/10</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:#A8D8C0;line-height:1.7;margin-bottom:16px">${body}</div>
          <div style="margin-top:16px">
            <button onclick="allergyAssessmentAction('retake')"
              style="background:none;border:none;color:#6A8A6E;font-size:12px;cursor:pointer;text-decoration:underline;padding:0">Retake assessment</button>
          </div>`;
        resultBlock.style.display = 'block';
      }
      return;
    }

    if (action === 'retake') {
      localStorage.removeItem(ALLERGY_STORAGE_KEY);
      renderTick++;
    }
  }

  // Types for the window-exposed API so TS doesn't complain.
  type PortalWindow = Window & {
    portalAction?: typeof portalAction;
    portalField?: typeof portalField;
    gutAssessmentAction?: typeof gutAssessmentAction;
    allergyAssessmentAction?: typeof allergyAssessmentAction;
  };

  onMount(async () => {
    (window as PortalWindow).portalAction = portalAction;
    (window as PortalWindow).portalField = portalField;
    (window as PortalWindow).gutAssessmentAction = gutAssessmentAction;
    (window as PortalWindow).allergyAssessmentAction = allergyAssessmentAction;

    // Re-check intake completion after mount (handles page refresh)
    intakeComplete = isIntakeComplete();

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
  <Sidebar {navHtml} name={workbook.name} {stats} discoveryActive={showDiscovery} pricingActive={showPricing} {userRole} adminActive={currentView === 'admin'} {intakeComplete} />
  <div class="main" id="main-content">
    {#if !intakeComplete && currentView !== 'admin'}
      <!-- Gated: show intake module until complete -->
      <IntakeModule onComplete={onIntakeComplete} />
    {:else if currentView === 'admin'}
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
