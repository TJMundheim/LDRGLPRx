<script lang="ts">
  import { signOut } from '../auth/cognito.js';
  import { clearUser } from '../auth/store.svelte.js';
  import ManageSubscriptionButton from './ManageSubscriptionButton.svelte';

  interface Props {
    navHtml: string;
    name: string;
    stats: { audit: string; score: string; morn: string; cold: string };
    pricingActive?: boolean;
    userRole?: 'patient' | 'clinician' | 'admin';
    adminActive?: boolean;
    intakeComplete?: boolean;
    hasActiveSubscription?: boolean;
    stripeCustomerId?: string | null;
  }
  let { navHtml, name, stats, pricingActive = false, userRole, adminActive = false, intakeComplete = true, hasActiveSubscription = false, stripeCustomerId = null }: Props = $props();

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

  <!-- Pricing nav entry -->
  <div class="discovery-nav">
    <button
      class="discovery-btn pricing-btn"
      class:discovery-active={pricingActive}
      onclick={() => { (window as Window & { portalAction?: (a: string, ...args: unknown[]) => void }).portalAction?.('goTo', 'pricing'); }}
      aria-current={pricingActive ? 'page' : undefined}
    >
      ◈ Pricing & Tiers
    </button>
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

  <div id="nav-items" class:nav-locked={!intakeComplete}>
    {@html navHtml}
    {#if !intakeComplete}
      <div class="lock-overlay" role="note">
        <span class="lock-icon" aria-hidden="true">🔒</span>
        <span class="lock-text">Complete intake to unlock Weeks 1–4</span>
      </div>
    {/if}
  </div>
  <div class="sb-stats" style="margin-top:8px">
    <div class="sb-stats-title">WORKBOOK PROGRESS</div>
    <div class="sb-stat">{stats.audit}</div>
    <div class="sb-stat">{stats.score}</div>
    <div class="sb-stat">{stats.morn}</div>
    <div class="sb-stat">{stats.cold}</div>
  </div>
  <ManageSubscriptionButton {hasActiveSubscription} {stripeCustomerId} />
</div>

<style>
  .discovery-nav {
    padding: 6px 0 10px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    margin-bottom: 6px;
  }

  .discovery-btn {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: #9ba3b2;
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
    background: rgba(74, 158, 255, 0.1);
    color: #4a9eff;
  }

  .discovery-btn.discovery-active {
    background: rgba(74, 158, 255, 0.15);
    color: #4a9eff;
  }

  .discovery-btn:focus-visible {
    outline: 2px solid #4a9eff;
    outline-offset: 2px;
  }

  .admin-nav {
    border-top: 1px solid rgba(255,255,255,0.07);
    padding-top: 8px;
    margin-top: 6px;
    border-bottom: none;
  }

  .admin-btn { color: #c8a8ff; }
  .admin-btn:hover { background: rgba(200,168,255,0.1); color: #c8a8ff; }
  .admin-btn.discovery-active { background: rgba(200,168,255,0.15); color: #c8a8ff; }

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
