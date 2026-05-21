<script lang="ts">
  import { programTiers, membershipTiers } from '../../content/tiers';
  import TierCard from './TierCard.svelte';
  import TierComparisonTable from './TierComparisonTable.svelte';
  import MembershipBanner from './MembershipBanner.svelte';
  import CartPreview from './CartPreview.svelte';

  interface Props {
    highlightTierId?: string;
    onGoToDiscovery?: () => void;
  }

  let {
    highlightTierId = '',
    onGoToDiscovery,
  }: Props = $props();

  let showComparison = $state(false);
  let selectedTierId = $state('');

  // Launch state: Protégé + Graduate only. Insider tiers retired 2026-05-18.
  const programMain = $derived(programTiers.filter(t =>
    t.id === 'protege' || t.id === 'graduate'
  ));

  const discovery = $derived(membershipTiers.find(t => t.id === 'discovery'));
  const mainMembership = $derived(membershipTiers.filter(t => t.id !== 'discovery'));

  // highlightTierId is a prop (not reactive $state), so capture into derived
  const effectiveHighlight = $derived(selectedTierId || highlightTierId);

  function handleSelect(id: string): void {
    selectedTierId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

<div class="pricing-page">
  <MembershipBanner />

  <!-- Hero -->
  <header class="pricing-hero">
    <div class="hero-badge">PRICING & TIERS</div>
    <h1 class="hero-headline">Normal is not optimal.<br>And optimal is what you're after.</h1>
    <p class="hero-attr">— Dr. TJ Mundheim, DC, DABAAHP</p>
    <p class="hero-explainer">
      <strong>Two tiers at launch.</strong> Protégé is the active-member state — activated by any My4MLife purchase. Graduate is earned after 12+ continuous months and unlocks lifetime app access and lifetime member pricing.
      Not sure where to start? Take the 3-minute Personalized Assessment and we'll tell you.
    </p>
  </header>

  <div class="pricing-layout">
    <div class="pricing-main">

      <!-- Section A: Membership Tiers (Protégé + Graduate) -->
      <section class="pricing-section" aria-labelledby="program-heading">
        <div class="section-header">
          <div class="section-badge">MEMBERSHIP TIERS</div>
          <h2 id="program-heading" class="section-title">Protégé &amp; Graduate</h2>
          <p class="section-sub">Protégé activates with any purchase. Graduate is earned after 12+ months of continuous active membership — and is yours for life.</p>
        </div>

        <div class="tier-grid program-grid">
          {#each programMain as tier}
            <TierCard
              {tier}
              mostPopular={tier.id === 'protege'}
              highlightId={effectiveHighlight}
              onSelect={handleSelect}
            />
          {/each}
        </div>
      </section>

      <!-- Section B: Long-term Membership -->
      <section class="pricing-section" aria-labelledby="membership-heading">
        <div class="section-header">
          <div class="section-badge">ONGOING MEMBERSHIP</div>
          <h2 id="membership-heading" class="section-title">Long-term Membership</h2>
          <p class="section-sub">Platform access, clinician oversight, and your full protocol — beyond Month 1.</p>
        </div>

        {#if discovery}
          <div class="discovery-entry">
            <div class="discovery-label">Start here — free, no commitment</div>
            <TierCard
              tier={discovery}
              compact={true}
              highlightId={effectiveHighlight}
              onSelect={handleSelect}
            />
          </div>
        {/if}

        <div class="tier-grid membership-grid">
          {#each mainMembership as tier}
            <TierCard
              {tier}
              mostPopular={tier.id === 'optimization'}
              highlightId={effectiveHighlight}
              onSelect={handleSelect}
            />
          {/each}
        </div>
      </section>

      <!-- Comparison table accordion -->
      <section class="comparison-section" aria-labelledby="compare-heading">
        <button
          class="compare-toggle"
          onclick={() => { showComparison = !showComparison; }}
          aria-expanded={showComparison}
          aria-controls="comparison-table"
          id="compare-heading"
        >
          {showComparison ? '▲' : '▼'} {showComparison ? 'Hide' : 'Expand for'} full membership comparison
        </button>

        {#if showComparison}
          <div id="comparison-table" role="region" aria-label="Full comparison table">
            <TierComparisonTable />
          </div>
        {/if}
      </section>

    </div>

    <!-- Cart preview sidebar (desktop) -->
    {#if selectedTierId}
      <aside class="cart-sidebar">
        <CartPreview selectedTierId={selectedTierId} />
      </aside>
    {/if}
  </div>

  <!-- Sticky compare bar -->
  <div class="sticky-bar" role="complementary" aria-label="Discovery quiz prompt">
    <span class="sticky-bar-text">Not sure which tier fits you?</span>
    <button
      class="sticky-bar-cta"
      onclick={() => onGoToDiscovery?.()}
      aria-label="Take the 3-minute Discovery quiz"
    >
      Take the 3-min Discovery quiz →
    </button>
  </div>
</div>

<style>
  .pricing-page {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100vh;
    padding-bottom: 80px;
  }

  /* Hero */
  .pricing-hero {
    padding: 40px 36px 32px;
    max-width: 760px;
  }

  .hero-badge {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #1D9E75;
    margin-bottom: 12px;
  }

  .hero-headline {
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    font-weight: 700;
    color: #1A2E1E;
    line-height: 1.2;
    margin: 0 0 8px;
  }

  .hero-attr {
    font-size: 0.85rem;
    color: #7A9A7E;
    font-style: italic;
    margin: 0 0 20px;
  }

  .hero-explainer {
    font-size: 0.9rem;
    color: #5A7A5E;
    line-height: 1.7;
    max-width: 640px;
    margin: 0;
  }

  /* Layout */
  .pricing-layout {
    display: flex;
    gap: 28px;
    padding: 0 36px;
    align-items: flex-start;
  }

  .pricing-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 48px;
  }

  .cart-sidebar {
    width: 280px;
    flex-shrink: 0;
    position: sticky;
    top: 60px;
  }

  /* Sections */
  .pricing-section {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .section-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #1D9E75;
  }

  .section-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #1A2E1E;
    margin: 0;
  }

  .section-sub {
    font-size: 0.88rem;
    color: #5A7A5E;
    margin: 0;
  }

  /* Grids */
  .tier-grid {
    display: grid;
    gap: 20px;
  }

  .program-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .membership-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Ongoing */
  .ongoing-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 1px dashed #C8DCC8;
    padding-top: 20px;
  }

  .ongoing-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #7A9A7E;
  }

  .ongoing-card-wrap {
    max-width: 360px;
  }

  /* Discovery */
  .discovery-entry {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #F7FBF7;
    border: 1px dashed #C8DCC8;
    border-radius: 12px;
    padding: 16px;
  }

  .discovery-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #7A9A7E;
  }

  /* Comparison */
  .comparison-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .compare-toggle {
    background: transparent;
    border: 1px solid #C8DCC8;
    color: #3A6A44;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    font-family: Georgia, serif;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    align-self: flex-start;
  }

  .compare-toggle:hover {
    border-color: #1D9E75;
    background: #F0FAF5;
  }

  .compare-toggle:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 2px;
  }

  /* Sticky bar */
  .sticky-bar {
    position: fixed;
    bottom: 0;
    left: 230px;
    right: 0;
    background: #1A2E1E;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 40;
    box-shadow: 0 -2px 12px rgba(0,0,0,.15);
  }

  .sticky-bar-text {
    font-size: 0.88rem;
    color: rgba(255,255,255,0.75);
  }

  .sticky-bar-cta {
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-size: 0.88rem;
    font-weight: 600;
    font-family: Georgia, serif;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .sticky-bar-cta:hover {
    background: #19876A;
  }

  .sticky-bar-cta:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  /* Responsive */
  @media (max-width: 1100px) {
    .membership-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 900px) {
    .pricing-layout {
      padding: 0 20px;
      flex-direction: column;
    }

    .cart-sidebar {
      width: 100%;
      position: static;
    }

    .program-grid {
      grid-template-columns: 1fr;
    }

    .pricing-hero {
      padding: 24px 20px 20px;
    }
  }

  @media (max-width: 640px) {
    .membership-grid {
      grid-template-columns: 1fr;
    }

    .sticky-bar {
      left: 0;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
    }

    .ongoing-card-wrap {
      max-width: 100%;
    }
  }
</style>
