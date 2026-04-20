<script lang="ts">
  interface Props {
    navHtml: string;
    name: string;
    stats: { audit: string; score: string; morn: string; cold: string };
    discoveryActive?: boolean;
    pricingActive?: boolean;
  }
  let { navHtml, name, stats, discoveryActive = false, pricingActive = false }: Props = $props();
</script>

<div class="sidebar" id="sidebar">
  <div class="logo">
    <div class="logo-title">4M PROGRAM</div>
    <div class="logo-sub">MONTH 1 WORKBOOK</div>
    <div class="logo-name">{name}</div>
  </div>

  <!-- Discovery nav entry — shown above workbook nav items -->
  <div class="discovery-nav">
    <button
      class="discovery-btn"
      class:discovery-active={discoveryActive}
      onclick={() => { (window as Window & { portalAction?: (a: string, ...args: unknown[]) => void }).portalAction?.('goTo', 'discovery'); }}
      aria-current={discoveryActive ? 'page' : undefined}
    >
      ✦ Discovery Intake
    </button>
    <button
      class="discovery-btn pricing-btn"
      class:discovery-active={pricingActive}
      onclick={() => { (window as Window & { portalAction?: (a: string, ...args: unknown[]) => void }).portalAction?.('goTo', 'pricing'); }}
      aria-current={pricingActive ? 'page' : undefined}
    >
      ◈ Pricing & Tiers
    </button>
  </div>

  <div id="nav-items">{@html navHtml}</div>
  <div class="sb-stats" style="margin-top:8px">
    <div class="sb-stats-title">WORKBOOK PROGRESS</div>
    <div class="sb-stat">{stats.audit}</div>
    <div class="sb-stat">{stats.score}</div>
    <div class="sb-stat">{stats.morn}</div>
    <div class="sb-stat">{stats.cold}</div>
  </div>
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
</style>
