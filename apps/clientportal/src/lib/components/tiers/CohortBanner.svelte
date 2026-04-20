<script lang="ts">
  // TODO: dynamic cohort dates — replace these with real enrollment dates
  const COHORT_START_DATE = 'May 5, 2025';
  const ENROLLMENT_CLOSE_DATE = 'Apr 28, 2025';

  let dismissed = $state(false);
</script>

{#if !dismissed}
  <div class="cohort-banner" role="banner" aria-label="Cohort enrollment notice">
    <div class="banner-text">
      <span class="banner-icon" aria-hidden="true">⏱</span>
      Next cohort starts <strong>{COHORT_START_DATE}</strong>
      &nbsp;·&nbsp;
      Enrollment closes <strong>{ENROLLMENT_CLOSE_DATE}</strong>
    </div>
    <button
      class="dismiss-btn"
      onclick={() => { dismissed = true; }}
      aria-label="Dismiss cohort banner"
    >
      ✕
    </button>
  </div>
{/if}

<style>
  .cohort-banner {
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
