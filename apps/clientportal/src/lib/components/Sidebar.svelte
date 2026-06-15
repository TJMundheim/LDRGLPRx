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
</script>

<div class="sidebar" id="sidebar">
  <div class="logo">
    <div class="logo-title">4M PROGRAM</div>
    <div class="logo-sub">MONTH 1 WORKBOOK</div>
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
        ⬡ Admin Queue
      </button>
    </div>
  {/if}

  <!-- Per 2026-05-25 spec: signed-in = Protégé = full access. No intake lock. -->
  <div id="nav-items">
    {@html navHtml}
  </div>
  <div class="sb-stats" style="margin-top:8px">
    <div class="sb-stats-title">WORKBOOK PROGRESS</div>
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
      ⚙ Settings
    </button>
    <button class="discovery-btn signout-btn" onclick={handleSignOut}>
      ⎋ Sign Out
    </button>
  </div>
</div>

<style>
  .discovery-nav {
    padding: 6px 0 10px;
    border-bottom: 1px solid #C8DCC8;
    margin-bottom: 6px;
  }

  .discovery-btn {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: #3A6A44;
    padding: 8px 12px;
    min-height: 44px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .discovery-btn:hover {
    background: rgba(29,158,117,0.08);
    color: #1A4A28;
  }

  .discovery-btn.discovery-active {
    background: #1D9E75;
    color: #FFFFFF;
  }

  .discovery-btn:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 2px;
  }

  .admin-nav {
    border-top: 1px solid #C8DCC8;
    padding-top: 8px;
    margin-top: 6px;
    border-bottom: none;
  }

  .admin-btn { color: #6B5ED4; }
  .admin-btn:hover { background: rgba(107,94,212,0.1); color: #4A3EA8; }
  .admin-btn.discovery-active { background: #6B5ED4; color: #FFFFFF; }

  .settings-nav {
    border-top: 1px solid #C8DCC8;
    padding-top: 10px;
    margin-top: 8px;
    border-bottom: none;
  }
  .signout-btn { color: #9A5A4A; }
  .signout-btn:hover { background: rgba(154,90,74,0.1); color: #7A3A2A; }

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
    background: rgba(15, 17, 23, 0.88);
    border: 1px solid rgba(29,158,117,0.3);
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
    color: #1D9E75;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: 0.02em;
  }
</style>
