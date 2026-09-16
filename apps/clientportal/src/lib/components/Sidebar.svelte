<script lang="ts">
  import { signOut } from '../auth/cognito.js';
  import { clearUser } from '../auth/store.svelte.js';
  import ManageSubscriptionButton from './ManageSubscriptionButton.svelte';

  interface Props {
    navHtml: string;
    name: string;
    stats: { audit: string; score: string; morn: string; cold: string };
    userRole?: 'patient' | 'clinician' | 'admin';
    adminActive?: boolean;
    settingsActive?: boolean;
    intakeComplete?: boolean;
    hasActiveSubscription?: boolean;
    stripeCustomerId?: string | null;
  }
  let { navHtml, name, stats, userRole, adminActive = false, settingsActive = false, intakeComplete = true, hasActiveSubscription = false, stripeCustomerId = null }: Props = $props();

  function handleSignOut() {
    signOut();
    clearUser();
  }

  const isStaff = $derived(userRole === 'admin' || userRole === 'clinician');

  /** Week tabs that are locked until intake is complete. */
  const WEEK_TABS = new Set(['w1', 'w2', 'w3', 'w4']);

  // Inline SVG line icons (18px, stroke currentColor, 1.75 stroke-width) — no emoji.
  const ICON_INBOX = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';
  const ICON_GEAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  const ICON_SIGNOUT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
</script>

<div class="sidebar" id="sidebar">
  <div class="logo">
    <div class="logo-title">My<b class="logo-gold">4M</b>Life</div>
    <div class="logo-sub">Begin with the end in mind</div>
    <div class="logo-name">{name}</div>
  </div>

  {#if isStaff}
    <div class="discovery-nav admin-nav">
      <button
        class="discovery-btn admin-btn"
        class:discovery-active={adminActive}
        onclick={() => { (window as Window & { portalAction?: (a: string, ...args: unknown[]) => void }).portalAction?.('goTo', 'admin'); }}
        aria-current={adminActive ? 'page' : undefined}
      >
        <span class="btn-icon">{@html ICON_INBOX}</span> Admin Queue
      </button>
    </div>
  {/if}

  <!-- Per 2026-05-25 spec: signed-in = Protégé = full access. No intake lock. -->
  <div id="nav-items">
    {@html navHtml}
  </div>
  <div class="sb-stats" style="margin-top:8px">
    <div class="sb-stats-title">LOGBOOK PROGRESS</div>
    <div class="sb-stat">{stats.audit}</div>
    <div class="sb-stat">{stats.score}</div>
    <div class="sb-stat">{stats.morn}</div>
    <div class="sb-stat">{stats.cold}</div>
  </div>
  <ManageSubscriptionButton {hasActiveSubscription} {stripeCustomerId} />
  <div class="discovery-nav settings-nav">
    <button
      class="discovery-btn settings-btn"
      class:discovery-active={settingsActive}
      onclick={() => { (window as Window & { portalAction?: (a: string, ...args: unknown[]) => void }).portalAction?.('goTo', 'settings'); }}
      aria-current={settingsActive ? 'page' : undefined}
    >
      <span class="btn-icon">{@html ICON_GEAR}</span> Settings
    </button>
    <button class="discovery-btn signout-btn" onclick={handleSignOut}>
      <span class="btn-icon">{@html ICON_SIGNOUT}</span> Sign Out
    </button>
  </div>
</div>

<style>
  .discovery-nav {
    padding: 6px 0 10px;
    border-bottom: 1px solid var(--mc-line);
    margin-bottom: 6px;
  }

  .discovery-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--mc-muted);
    padding: 8px 12px;
    min-height: 44px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .btn-icon {
    display: inline-flex;
    flex-shrink: 0;
    color: inherit;
  }
  .btn-icon :global(svg) { display: block; width: 16px; height: 16px; }

  .discovery-btn:hover {
    background: var(--mc-gold-tint);
    color: var(--mc-ink);
  }

  .discovery-btn.discovery-active {
    background: var(--mc-gold);
    color: var(--mc-on-gold);
  }

  .discovery-btn:focus-visible {
    outline: 2px solid var(--mc-gold);
    outline-offset: 2px;
  }

  .admin-nav {
    border-top: 1px solid var(--mc-line);
    padding-top: 8px;
    margin-top: 6px;
    border-bottom: none;
  }

  .admin-btn { color: var(--mc-info); }
  .admin-btn:hover { background: var(--mc-info-tint); color: var(--mc-info); }
  .admin-btn.discovery-active { background: var(--mc-info); color: var(--mc-on-gold); }

  .settings-nav {
    border-top: 1px solid var(--mc-line);
    padding-top: 10px;
    margin-top: 8px;
    border-bottom: none;
  }
  .signout-btn { color: var(--mc-crit-b); }
  .signout-btn:hover { background: var(--mc-crit-tint); color: var(--mc-crit); }

  /* ── Mobile: sidebar collapses to a bottom bar; make the Settings / Admin /
     Sign Out controls reachable inline as compact icon-buttons instead of
     overflowing off-screen. ── */
  @media (max-width: 820px) {
    .discovery-nav {
      border: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: row;
      align-items: stretch;
    }
    .discovery-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      width: auto;
      min-width: 52px;
      padding: 6px 6px;
      font-size: 8.5px;
      letter-spacing: 0.02em;
      text-align: center;
      white-space: nowrap;
    }
  }

  /* Locked state when intake is incomplete */
  .nav-locked {
    position: relative;
    pointer-events: none;
    user-select: none;
  }

  .nav-locked :global(.nav-item) {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .lock-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--mc-navy);
    border: 1px solid var(--mc-gold-line);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    backdrop-filter: blur(2px);
  }

  .lock-icon {
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .lock-text {
    font-size: 0.72rem;
    color: var(--mc-gold);
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: 0.02em;
  }
</style>
