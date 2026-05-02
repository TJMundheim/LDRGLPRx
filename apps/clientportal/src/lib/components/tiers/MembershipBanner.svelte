<script lang="ts">
  // TODO: replace with dynamic Insider session dates when available
  const INSIDER_OPEN_DATE = 'Coming soon';

  let dismissed = $state(false);
</script>

{#if !dismissed}
  <div class="membership-banner" role="banner" aria-label="Insider membership notice">
    <div class="banner-text">
      <span class="banner-icon" aria-hidden="true">⭐</span>
      Insider sessions opening —&nbsp;<strong>{INSIDER_OPEN_DATE}</strong>
      &nbsp;·&nbsp;
      Start free as a Protégé today
    </div>
    <button
      class="dismiss-btn"
      onclick={() => { dismissed = true; }}
      aria-label="Dismiss membership banner"
    >
      ✕
    </button>
  </div>
{/if}

<style>
  .membership-banner {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #1D9E75;
    color: #fff;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .banner-text {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .banner-icon {
    font-size: 0.9rem;
  }

  .dismiss-btn {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.8);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 4px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    transition: color 0.1s;
  }

  .dismiss-btn:hover {
    color: #fff;
  }

  .dismiss-btn:focus-visible {
    outline: 2px solid rgba(255,255,255,0.7);
    outline-offset: 2px;
  }
</style>
