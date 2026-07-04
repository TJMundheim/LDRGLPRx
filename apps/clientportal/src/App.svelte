<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { storage } from './lib/storage';
  import { createEmptyWorkbook, type Workbook } from './lib/data/schema';
  import {
    renderPage, renderSidebar, sidebarStats, type RenderContext
  } from './lib/renderer';
  import Sidebar from './lib/components/Sidebar.svelte';
  import AdminDashboard from './lib/components/admin/AdminDashboard.svelte';
  import { currentUser as currentUserLegacy } from './lib/integrations/auth';
  import { getMyProfile, upsertMyProfile, recordAdherence } from './lib/api/operations';
  import AuthGate from './lib/components/auth/AuthGate.svelte';
  import SettingsView from './lib/components/SettingsView.svelte';
  import Toast from './lib/toast/Toast.svelte';
  import TodayView from './lib/components/TodayView.svelte';
  import { purchaseState, loadPurchaseFlag } from './lib/auth/purchase.svelte';
  import { consumeAuditParam } from './lib/auth/auditRecap';
  import NudgeStack from './lib/components/nudge/NudgeStack.svelte';
  import { runNudgeTriggers, updateLastSeen, trackScreenVisit, triggerWeekMilestone } from './lib/nudge/triggers';

  // ── Schema sentinel + clean-slate wipe ──────────────────────────────────────
  // MUST run before any gating logic reads localStorage.
  //
  // WHAT GETS WIPED (WIPE_KEYS):
  //   Intake state:     basics-v1, audit-v1, discovery-v1, intake-stage-v1,
  //                     intake-complete-v1, intake-audit-scores-v1, intake-date-v1,
  //                     consent-protege-v1, consent-npp-v1, consent-phi-auth-v1,
  //                     consent-ai-comm-v1, consent-marketing-v1
  //   Assessment state: gut-assessment-v1, allergy-assessment-v1, goals-v1,
  //                     connected-mind-v1
  //   Workbook data:    workbook-local-workbook, 4m:workbook:local-workbook,
  //                     4m:index:local-user
  //   Nudge state:      last-seen-v1, intake-celebrated-v1, nudges-shown-today-v1,
  //                     nudges-dismissed-v1, nudges-week-1-shown-v1 through
  //                     nudges-week-4-shown-v1, nudges-substance-use-shown-v1,
  //                     screens-visited-v1, last-upgrade-nudge-v1
  //
  // WHAT IS PRESERVED (NOT in WIPE_KEYS):
  //   Cognito tokens: cognito_id_token, cognito_access_token, cognito_refresh_token
  //   Reason: these keep the user signed in through schema bumps. The wipe is
  //   about resetting app/workbook state, not identity.
  //
  // When bumping the schema version in the future, increment SCHEMA_KEY to v7 etc.
  // and add any newly-discovered keys to WIPE_KEYS. Never remove keys from
  // WIPE_KEYS — old keys are harmless no-ops on removeItem.
  const SCHEMA_KEY = 'intake-schema-v6';
  const SCHEMA_VAL = '2026-05-05';

  const WIPE_KEYS = [
    // ── Intake state ─────────────────────────────────────────────────────────
    'basics-v1',
    'audit-v1',
    'discovery-v1',
    'intake-stage-v1',
    'intake-complete-v1',
    'intake-audit-scores-v1',   // audit top-3 scores seeded from the profile (separate from audit-v1)
    'intake-date-v1',           // set when intake completes; used by nudge upgrade trigger
    // ── Consent state ────────────────────────────────────────────────────────
    'consent-protege-v1',
    'consent-npp-v1',
    'consent-phi-auth-v1',
    'consent-ai-comm-v1',
    'consent-marketing-v1',
    // ── Assessment state ─────────────────────────────────────────────────────
    'gut-assessment-v1',
    'allergy-assessment-v1',
    'goals-v1',
    'connected-mind-v1',
    // ── Workbook data ─────────────────────────────────────────────────────────
    'workbook-local-workbook',          // legacy LocalStorageAdapter key (pre-4m: prefix)
    '4m:workbook:local-workbook',       // LocalStorageAdapter workbook payload
    '4m:index:local-user',             // LocalStorageAdapter workbook index
    // ── Nudge state ───────────────────────────────────────────────────────────
    'last-seen-v1',
    'intake-celebrated-v1',
    'nudges-shown-today-v1',
    'nudges-dismissed-v1',
    'nudges-week-1-shown-v1',
    'nudges-week-2-shown-v1',
    'nudges-week-3-shown-v1',
    'nudges-week-4-shown-v1',
    'nudges-substance-use-shown-v1',
    'screens-visited-v1',
    'last-upgrade-nudge-v1',
  ];

  if (typeof window !== 'undefined') {
    // ?reset=1 — developer/testing escape hatch: wipe all app state.
    // Triggered via https://app.my4mlife.com/?reset=1
    const params = new URLSearchParams(window.location.search);
    if (params.has('reset')) {
      WIPE_KEYS.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem(SCHEMA_KEY);
      // Strip ?reset from the URL so subsequent reloads don't re-wipe
      const url = new URL(window.location.href);
      url.searchParams.delete('reset');
      window.history.replaceState({}, '', url.toString());
    }
  }

  if (typeof localStorage !== 'undefined' && localStorage.getItem(SCHEMA_KEY) !== SCHEMA_VAL) {
    WIPE_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(SCHEMA_KEY, SCHEMA_VAL);
  }

  // ── State ───────────────────────────────────────────────
  // USER_ID and WORKBOOK_ID are set in onMount once we have a Cognito sub.
  // Initialise with null so we can detect "not yet resolved".
  let USER_ID = $state<string | null>(null);
  let WORKBOOK_ID = $state<string | null>(null);

  // workbook is initialised to a placeholder; replaced in onMount once we know the user sub.
  let workbook = $state<Workbook>(createEmptyWorkbook('pending', 'pending'));
  let curTab = $state('dash');
  let userRole = $state<'patient' | 'clinician' | 'admin' | undefined>(undefined);
  let currentView = $state<'workbook' | 'admin' | 'settings'>('workbook');
  let openFactor = $state<string | null>(null);
  // Profile fields surfaced to the eating-window modal + settings page.
  let userEmail = $state<string | null>(null);
  let eatingWindowStart = $state<string | null>(null);
  let eatingWindowEnd = $state<string | null>(null);
  let bonusTargetsEnabled = $state(false);
  let profileLoaded = $state(false);
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
  // Per 2026-05-25 spec: signed-in user is a Protégé and gets full access.
  // The legacy intake gate is intentionally disabled — kept as a stub so any
  // residual reads return true.
  let intakeComplete = $state(true);
  void isIntakeComplete; // (suppress unused warning if helper survives)
  let hasActiveSubscription = $state(false);
  let stripeCustomerId = $state<string | null>(null);

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
    showToast(`Factor ${fId} updated`);
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
      }
      window.scrollTo(0, 0);
      return;
    }
    if (id === 'settings') {
      currentView = 'settings';
      window.scrollTo(0, 0);
      return;
    }
    currentView = 'workbook';
    // Pricing view removed 2026-06-01 — Protégé is free; no in-app upgrade UI.
    if (id === 'pricing') {
      void params;
      window.scrollTo(0, 0);
      return;
    }
    curTab = id;
    window.scrollTo(0, 0);
    // Track screen visit for upgrade-nudge eligibility
    trackScreenVisit(id);
    // Fire week-milestone nudge when user lands on a week tab
    const weekMatch = /^week([1-4])$/.exec(id);
    if (weekMatch) {
      const wn = Number(weekMatch[1]) as 1 | 2 | 3 | 4;
      // Small delay so the stack is visible before the nudge fires
      setTimeout(() => triggerWeekMilestone(wn), 800);
    }
  }

  // Expose actions for inline onclick/oninput handlers emitted by renderer.ts.
  // This is the documented seam the renderer uses — components that call
  // setField/setScore/etc. directly should go through these functions too.
  type PortalAction =
    | 'goTo' | 'setScore' | 'toggleFactor' | 'setFactorTab' | 'toggleDay' | 'setSupp' | 'recalc'
    | 'logAdherence';
  function portalAction(action: PortalAction, ...args: unknown[]): void {
    switch (action) {
      case 'goTo':         goTo(String(args[0]), args[1] as Record<string, string> | undefined); break;
      case 'setScore':     setScore(String(args[0]), Number(args[1])); break;
      case 'toggleFactor': toggleFactor(String(args[0])); break;
      case 'setFactorTab': setFactorTab(args[0] as 'imm' | 'tools' | 'adv' | 'res'); break;
      case 'toggleDay':    toggleDay(args[0] as 'morn' | 'cold', Number(args[1]), String(args[2])); break;
      case 'setSupp':      setSupp(String(args[0]), args[1] as 'Yes' | 'No'); break;
      case 'recalc':       showToast('Recalculated'); break;
      case 'logAdherence': void logAdherence(String(args[0]), args[1] != null ? String(args[1]) : undefined); break;
    }
    // Structural change — trigger re-render.
    renderTick++;
  }

  // Week 1 adherence single-tap logger.
  // localStorage cache key pattern: `adherence-cache-<YYYY-MM-DD>-<actionId>` = '1'
  // The cache lets renderer.ts show counters without an API round-trip.
  // DDB (via recordAdherence mutation) is the source of truth.
  async function logAdherence(actionId: string, dateArg?: string): Promise<void> {
    let date = dateArg;
    if (!date) {
      const d = new Date();
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const cacheKey = `adherence-cache-${date}-${actionId}`;
    // Toggle: if already logged for that date, clear locally AND on the server.
    let nowDone = true;
    try {
      if (localStorage.getItem(cacheKey)) {
        localStorage.removeItem(cacheKey);
        nowDone = false;
      } else {
        localStorage.setItem(cacheKey, '1');
      }
    } catch { /* ignore */ }
    try {
      await recordAdherence({ date, actionId, completed: nowDone });
      showToast(nowDone ? 'Logged' : 'Cleared');
    } catch (e) {
      // On server failure, revert the local cache so the UI and server stay in sync.
      try {
        if (nowDone) localStorage.removeItem(cacheKey);
        else localStorage.setItem(cacheKey, '1');
      } catch { /* ignore */ }
      console.error('[adherence] recordAdherence failed', e);
      showToast('Sync error — retry');
    }
    renderTick++;
  }

  function portalField(path: string, value: unknown): void {
    setField(path, value);
  }

  // Same as portalField but also bumps renderTick — use for inputs/onclick
  // sites whose downstream UI (derived values, selection highlights) needs an
  // immediate re-render rather than waiting on the next structural change.
  function portalFieldRender(path: string, value: unknown): void {
    setField(path, value);
    renderTick++;
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
      const ac = 'var(--mc-good-bright)';
      const violet = 'var(--mc-info)';
      const offBg = 'var(--mc-panel-2)';
      const offColor = 'var(--mc-muted)';
      const offBorder = 'var(--mc-line)';
      const card = document.getElementById('gut-questions-block');
      if (card) {
        const rows = card.querySelectorAll<HTMLElement>('[data-gut-row]');
        const row = rows[qIndex];
        if (row) {
          const [yesBtn, noBtn] = row.querySelectorAll<HTMLButtonElement>('button');
          if (yesBtn && noBtn) {
            yesBtn.style.background = value ? ac : offBg;
            yesBtn.style.color = value ? 'var(--mc-ink)' : offColor;
            yesBtn.style.borderColor = value ? ac : offBorder;
            noBtn.style.background = !value ? violet : offBg;
            noBtn.style.color = !value ? 'var(--mc-ink)' : offColor;
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
        cta = 'Anchor with Biome NS Ultra';
        scoreColor = 'var(--mc-good-bright)';
      } else if (score <= 5) {
        title = 'Clear gut-axis signals.';
        body = "Your gut is sending signals worth listening to. Week 1's gut-repair protocol plus Biome NS Ultra daily will drive measurable change in 30 days. Retake this assessment then.";
        cta = 'Start with Biome NS Ultra';
        scoreColor = 'var(--mc-warn-bright)';
      } else {
        title = 'Strong gut-repair indication.';
        body = 'These are the patterns Biome NS Ultra was built for. Anchor your entire Month 1 in gut repair: Biome NS Ultra daily, eliminate sugar/seed oils/alcohol immediately, prioritize bone broth and fermented foods. Retake in 30 days.';
        cta = 'Begin with Biome NS Ultra today';
        scoreColor = 'var(--mc-crit-bright)';
      }

      const resultBlock = document.getElementById('gut-result-block');
      const questionsBlock = document.getElementById('gut-questions-block');
      if (resultBlock && questionsBlock) {
        questionsBlock.style.display = 'none';
        resultBlock.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="width:56px;height:56px;border-radius:50%;background:color-mix(in srgb, ${scoreColor} 20%, transparent);border:2px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-size:22px;font-weight:800;color:${scoreColor}">${score}</span>
            </div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--mc-ink);line-height:1.3">${title}</div>
              <div style="font-size:10px;color:var(--mc-muted);margin-top:2px">Score: ${score}/10</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:var(--mc-muted);line-height:1.7;margin-bottom:16px">${body}</div>
          <a href="https://my4mlife.com/assessment" style="display:inline-block;background:var(--mc-gold);color:var(--mc-on-gold);font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;text-decoration:none;letter-spacing:.02em">${cta} →</a>
          <div style="margin-top:16px">
            <button onclick="gutAssessmentAction('retake')"
              style="background:none;border:none;color:var(--mc-muted);font-size:12px;cursor:pointer;text-decoration:underline;padding:0">Retake assessment</button>
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

      const ac = 'var(--mc-good-bright)';
      const violet = 'var(--mc-info)';
      const offBg = 'var(--mc-panel-2)';
      const offColor = 'var(--mc-muted)';
      const offBorder = 'var(--mc-line)';
      const card = document.getElementById('allergy-questions-block');
      if (card) {
        const rows = card.querySelectorAll<HTMLElement>('[data-allergy-row]');
        const row = rows[qIndex];
        if (row) {
          const [yesBtn, noBtn] = row.querySelectorAll<HTMLButtonElement>('button');
          if (yesBtn && noBtn) {
            yesBtn.style.background = value ? ac : offBg;
            yesBtn.style.color = value ? 'var(--mc-ink)' : offColor;
            yesBtn.style.borderColor = value ? ac : offBorder;
            noBtn.style.background = !value ? violet : offBg;
            noBtn.style.color = !value ? 'var(--mc-ink)' : offColor;
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
        scoreColor = 'var(--mc-good-bright)';
      } else if (score <= 5) {
        title = 'Notable allergy/sensitivity signals.';
        body = 'Start with Biome NS Ultra to support gut-immune barrier; consider a 30-day elimination protocol.';
        scoreColor = 'var(--mc-warn-bright)';
      } else {
        title = 'Significant allergy/sensitivity load.';
        body = 'Strong indication for elimination diet + Biome NS Ultra; flag for telemedicine consult to discuss IgG/IgE testing.';
        scoreColor = 'var(--mc-crit-bright)';
      }

      const resultBlock = document.getElementById('allergy-result-block');
      const questionsBlock = document.getElementById('allergy-questions-block');
      if (resultBlock && questionsBlock) {
        questionsBlock.style.display = 'none';
        resultBlock.innerHTML = `
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="width:56px;height:56px;border-radius:50%;background:color-mix(in srgb, ${scoreColor} 20%, transparent);border:2px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-size:22px;font-weight:800;color:${scoreColor}">${score}</span>
            </div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--mc-ink);line-height:1.3">${title}</div>
              <div style="font-size:10px;color:var(--mc-muted);margin-top:2px">Score: ${score}/10</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:var(--mc-muted);line-height:1.7;margin-bottom:16px">${body}</div>
          <div style="margin-top:16px">
            <button onclick="allergyAssessmentAction('retake')"
              style="background:none;border:none;color:var(--mc-muted);font-size:12px;cursor:pointer;text-decoration:underline;padding:0">Retake assessment</button>
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
    portalFieldRender?: typeof portalFieldRender;
    gutAssessmentAction?: typeof gutAssessmentAction;
    allergyAssessmentAction?: typeof allergyAssessmentAction;
  };

  onMount(async () => {
    // Consume ?audit=<base64> param from marketing-site hand-off (must run
    // before LockedGate reads localStorage on first render).
    consumeAuditParam();
    // Load hard-paywall flag for the current user. Defaults to false until
    // the Stripe webhook is wired; ?unlocked=1 overrides for dev.
    await loadPurchaseFlag();

    (window as PortalWindow).portalAction = portalAction;
    (window as PortalWindow).portalField = portalField;
    (window as PortalWindow).portalFieldRender = portalFieldRender;
    (window as PortalWindow).gutAssessmentAction = gutAssessmentAction;
    (window as PortalWindow).allergyAssessmentAction = allergyAssessmentAction;

    // Re-check intake completion after mount (handles page refresh)
    intakeComplete = isIntakeComplete();

    const user = await currentUserLegacy();
    if (user) {
      const g = user.groups ?? [];
      userRole = g.includes('Admins') ? 'admin' : g.includes('Clinicians') ? 'clinician' : 'patient';

      // Derive per-user IDs from Cognito sub so testers never share state.
      USER_ID = user.id;
      WORKBOOK_ID = user.id; // workbook key = sub; simple, collision-free
    }

    if (USER_ID && WORKBOOK_ID) {
      const uid = USER_ID;
      const wid = WORKBOOK_ID;
      const local = await storage.getWorkbook(wid);

      // Try to load remote workbook for conflict resolution / new-device hydration.
      let remoteWorkbook: Workbook | null = null;
      let remoteAuditHydrated = false;
      // Seed bucket: audit hydration writes into this; merged into the workbook below.
      const audit_remote_workbook_seed: { factorScores?: Record<string, number>; priorities?: string[] } = {};
      try {
        // appsyncClient (lib/api/client.ts) returns json.data directly —
        // NOT the full { data, errors } envelope. So profileResult is already
        // the data object, and the profile lives at .getMyProfile (not .data.getMyProfile).
        const profileResult = await getMyProfile() as any;
        const profile = profileResult?.getMyProfile ?? profileResult?.data?.getMyProfile;
        const diag = {
          hasProfile: !!profile,
          hasWorkbook: !!profile?.workbookJson,
          workbookUpdatedAt: profile?.workbookUpdatedAt,
          hasAuditTop3: !!profile?.auditTop3,
          auditTop3Len: profile?.auditTop3 ? profile.auditTop3.length : 0,
          auditTop3Sample: profile?.auditTop3 ? profile.auditTop3.slice(0, 60) : null,
          auditCompletedAt: profile?.auditCompletedAt,
          hasIntakeAnswers: !!profile?.intakeAnswers,
          graphqlErrors: profileResult?.errors ? JSON.stringify(profileResult.errors).slice(0, 200) : null,
          profileResultShape: profileResult ? Object.keys(profileResult).slice(0, 8).join(',') : 'null',
        };
        console.info('[profile] loaded', diag);
        try { (window as any).__myDiag = diag; } catch {}
        if (profile?.workbookJson) {
          // AWSJSON may arrive double-encoded — use the same defensive parser
          // (declared below for auditTop3 but applied here too).
          const parsedWb = (function parseAwsJsonLocal(v: unknown): unknown {
            if (v == null) return null;
            if (typeof v !== 'string') return v;
            try {
              const once = JSON.parse(v);
              if (typeof once === 'string') {
                try { return JSON.parse(once); } catch { return once; }
              }
              return once;
            } catch { return null; }
          })(profile.workbookJson);
          if (parsedWb && typeof parsedWb === 'object' && !Array.isArray(parsedWb)) {
            remoteWorkbook = parsedWb as Workbook;
            if (profile.workbookUpdatedAt) {
              remoteWorkbook.updatedAt = profile.workbookUpdatedAt;
            }
          } else {
            console.warn('[workbook] remote workbookJson did not parse to an object', { type: typeof parsedWb });
          }
        }
        // Populate subscription state for ManageSubscriptionButton
        if (profile) {
          hasActiveSubscription = !!profile.hasActiveSubscription;
          stripeCustomerId = profile.stripeCustomerId ?? null;
          // Surface eating-window + bonus toggle for modal + settings.
          userEmail = (profile as any).primaryEmail ?? user?.email ?? null;
          eatingWindowStart = (profile as any).eatingWindowStart ?? null;
          eatingWindowEnd = (profile as any).eatingWindowEnd ?? null;
          bonusTargetsEnabled = !!(profile as any).bonusTargetsEnabled;
          profileLoaded = true;
        }
        // ── BUG 4 fix: hydrate intake completion + workbook from remote audit data ────
        // AWSJSON is sometimes returned double-encoded over the wire (string of a JSON
        // string). Parse defensively: first parse → if still a string, parse again.
        function parseAwsJson(v: unknown): unknown {
          if (v == null) return null;
          if (typeof v !== 'string') return v;
          try {
            const once = JSON.parse(v);
            if (typeof once === 'string') {
              try { return JSON.parse(once); } catch { return once; }
            }
            return once;
          } catch { return null; }
        }
        if (profile?.auditTop3) {
          try {
            const parsedTop3 = parseAwsJson(profile.auditTop3);
            if (Array.isArray(parsedTop3) && parsedTop3.length > 0) {
              remoteAuditHydrated = true;
              localStorage.setItem('intake-audit-scores-v1', profile.auditTop3);
              // Also write the legacy 'audit-v1' key that the dashboard renderer
              // (renderer.ts/loadAuditScores) reads from. Without this, the
              // dashboard shows "Complete your assessment to see your top 3 priorities"
              // even though the audit data is present in the cloud.
              if (profile.intakeAnswers) {
                try {
                  const answersObj = parseAwsJson(profile.intakeAnswers);
                  if (answersObj && typeof answersObj === 'object') {
                    localStorage.setItem('audit-v1', JSON.stringify({ scores: answersObj }));
                  }
                } catch (e) { console.warn('[profile] failed to write audit-v1:', e); }
              }
              if (profile.auditCompletedAt) {
                localStorage.setItem('intake-date-v1', profile.auditCompletedAt);
              }
              if (profile.intakeAnswers) {
                localStorage.setItem('intake-answers-v1', profile.intakeAnswers);
              }
              localStorage.setItem(INTAKE_COMPLETE_KEY, '1');
              intakeComplete = true;
              // Hydrate the WORKBOOK so the dashboard renders the user's data immediately.
              try {
                const answersObj = (profile.intakeAnswers ? parseAwsJson(profile.intakeAnswers) : {}) as Record<string, number>;
                const priorityLabels = (parsedTop3 as any[]).map((t: any) => t?.label || t?.id || '');
                (audit_remote_workbook_seed as any).factorScores = answersObj;
                (audit_remote_workbook_seed as any).priorities = [
                  priorityLabels[0] || '', priorityLabels[1] || '', priorityLabels[2] || ''
                ];
                console.info('[profile] seeded workbook from audit', { factors: Object.keys(answersObj).length, priorityLabels });
              } catch (e) {
                console.warn('[profile] failed to seed workbook from audit:', e);
              }
            }
          } catch (e) {
            console.warn('[profile] failed to parse auditTop3:', e);
          }
        }
      } catch (err) {
        console.warn('[workbook] remote load failed:', err);
      }

      const localTs = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const remoteTs = remoteWorkbook?.updatedAt ? new Date(remoteWorkbook.updatedAt).getTime() : 0;
      console.info('[workbook] hydration', { localTs, remoteTs, hasLocal: !!local, hasRemote: !!remoteWorkbook, remoteAuditHydrated });

      if (local && localTs >= remoteTs) {
        // Local is current or there's no remote — use local.
        workbook = { ...createEmptyWorkbook(wid, uid), ...local };
      } else if (remoteWorkbook && remoteTs > localTs) {
        // Remote is newer (e.g. different device) — hydrate from it.
        workbook = { ...createEmptyWorkbook(wid, uid), ...remoteWorkbook, id: wid, userId: uid };
        // Persist remote copy to local so subsequent saves go through normal path.
        void storage.saveWorkbook(workbook);
      } else {
        workbook = createEmptyWorkbook(wid, uid);
      }

      // Prefill name + start date from Cognito profile if workbook fields are blank.
      // (Group ID / cohortId field intentionally not prefilled — legacy field, no longer customer-facing.)
      const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      if (!workbook.name && displayName) workbook.name = displayName;
      if (!workbook.startDate) {
        workbook.startDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      // Merge audit hydration into the workbook so dashboard shows top-3 + factor scores
      // without requiring the user to retake intake. Only fill if not already present.
      if (audit_remote_workbook_seed.factorScores && Object.keys(audit_remote_workbook_seed.factorScores).length > 0) {
        if (!workbook.factorScores || Object.keys(workbook.factorScores).length === 0) {
          workbook.factorScores = audit_remote_workbook_seed.factorScores;
        }
      }
      if (audit_remote_workbook_seed.priorities && audit_remote_workbook_seed.priorities.length > 0) {
        if (!workbook.priorities || workbook.priorities.every((p: string) => !p)) {
          workbook.priorities = audit_remote_workbook_seed.priorities;
        }
      }
      void storage.saveWorkbook(workbook);
    }
    // If no user sub (signed out), workbook stays as placeholder and the
    // AuthGate / LockedGate below will prevent the workbook UI from mounting.
    renderTick++;
    await tick();

    // ── AI Concierge Phase 1 — Nudge triggers ───────────────────────────────
    updateLastSeen();
    runNudgeTriggers();
  });

  // Eating-window modal handler kept for direct invocations from Settings.
  async function saveEatingWindowFromModal(start: string, end: string): Promise<void> {
    try {
      await upsertMyProfile({ eatingWindowStart: start, eatingWindowEnd: end });
    } catch (e) {
      console.warn('[eating-window] upsert failed', e);
    }
    eatingWindowStart = start;
    eatingWindowEnd = end;
  }
  void saveEatingWindowFromModal; // (suppress unused warning until Settings wires it)

  function applySettingsUpdate(patch: {
    eatingWindowStart?: string;
    eatingWindowEnd?: string;
    bonusTargetsEnabled?: boolean;
  }): void {
    if (patch.eatingWindowStart !== undefined) eatingWindowStart = patch.eatingWindowStart;
    if (patch.eatingWindowEnd !== undefined) eatingWindowEnd = patch.eatingWindowEnd;
    if (patch.bonusTargetsEnabled !== undefined) bonusTargetsEnabled = patch.bonusTargetsEnabled;
  }
</script>

<NudgeStack />
<Toast />
<AuthGate>
<!-- Per 2026-05-25 spec: any signed-in user is a Protégé and gets full app access. -->
<div class="shell">
  <Sidebar {navHtml} name={workbook.name} {stats} {userRole} adminActive={currentView === 'admin'} settingsActive={currentView === 'settings'} {intakeComplete} {hasActiveSubscription} {stripeCustomerId} />
  <div class="main" id="main-content">
    {#if currentView === 'admin'}
      <AdminDashboard />
    {:else if currentView === 'settings'}
      <SettingsView
        email={userEmail}
        {eatingWindowStart}
        {eatingWindowEnd}
        {bonusTargetsEnabled}
        onUpdated={applySettingsUpdate}
      />
    {:else}
      {#if curTab === 'dash'}
        <!-- MindSpan Daily Brief leads the home screen (TJ 2026-07-04:
             the ring is the first thing every member sees). Workbook
             dashboard renders below it. -->
        <TodayView firstName={(workbook.name || '').trim().split(' ')[0]} />
      {/if}
      {@html pageHtml}
    {/if}
  </div>
</div>
<!-- Eating-window first-sign-in modal disabled per TJ direction 2026-06-01:
     most new Protégés won't know what an eating window is until after the
     Week 1 Zoom. Silently default to 9 AM – 6 PM and let them adjust in
     Settings later. EatingWindowModal component stays for direct invocation. -->
</AuthGate>
<div id="toast" class:show={toastShow}>{toastMsg}</div>

<style>
</style>
