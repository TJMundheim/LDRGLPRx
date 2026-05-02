<script lang="ts">
  import type { MembershipTier } from '../../data/catalog';
  import { products } from '../../content/products';

  interface Props {
    tier: MembershipTier;
    mostPopular?: boolean;
    compact?: boolean;
    highlightId?: string;
    onSelect?: (id: string) => void;
  }

  let {
    tier,
    mostPopular = false,
    compact = false,
    highlightId = '',
    onSelect,
  }: Props = $props();

  function usd(n: number): string {
    return `$${n.toLocaleString('en-US')}`;
  }

  const includedNames = $derived(
    tier.includedProductSlugs.length > 0
      ? tier.includedProductSlugs
          .map(slug => products.find(p => p.slug === slug)?.name ?? slug)
          .slice(0, 6)
      : []
  );

  const isHighlighted = $derived(highlightId === tier.id);

  function ctaLabel(): string {
    if (tier.monthlyUSD === 0) return 'Start free';
    if (tier.kind === 'program' && tier.id === 'protege') return 'Become a Protégé — Free';
    if (tier.kind === 'program') return 'Notify me when Insider opens';
    if (tier.onboardingFeeUSD !== undefined) return 'Start onboarding';
    return 'Upgrade';
  }
</script>

<article
  class="tier-card"
  class:popular={mostPopular}
  class:compact
  class:highlighted={isHighlighted}
  aria-label="{tier.name} tier"
>
  {#if mostPopular}
    <div class="popular-badge" aria-label="Most popular">MOST POPULAR</div>
  {/if}
  {#if isHighlighted}
    <div class="rec-badge" aria-label="Recommended for you">RECOMMENDED FOR YOU</div>
  {/if}

  <header class="card-header">
    <h3 class="tier-name">{tier.name}</h3>
    <p class="tier-tagline">{tier.tagline}</p>
  </header>

  <div class="price-block">
    {#if tier.monthlyUSD === 0 && tier.annualUSD === 0}
      <span class="price-main">Free</span>
    {:else if tier.kind === 'program' && tier.id === 'protege'}
      <span class="price-main">Free</span>
      <span class="price-sub">no card required</span>
    {:else if tier.kind === 'program'}
      <span class="price-main">TBD</span>
      <span class="price-sub">pricing coming soon</span>
    {:else if tier.monthlyUSD !== undefined && tier.annualUSD !== undefined}
      <span class="price-main">{usd(tier.monthlyUSD)}<span class="price-unit">/mo</span></span>
      <span class="price-sub">or {usd(tier.annualUSD)}/yr (save {usd(tier.monthlyUSD * 12 - tier.annualUSD)})</span>
    {:else if tier.monthlyUSD !== undefined}
      <span class="price-main">{usd(tier.monthlyUSD)}<span class="price-unit">/mo</span></span>
    {/if}

    {#if tier.onboardingFeeUSD && tier.onboardingFeeUSD > 0}
      <span class="onboarding-fee">+ {usd(tier.onboardingFeeUSD)} one-time onboarding</span>
    {/if}
  </div>

  <ul class="features-list" aria-label="Features">
    {#each tier.features as feature}
      <li class="feature-item">
        <span class="check" aria-hidden="true">✓</span>
        {feature}
      </li>
    {/each}
  </ul>

  {#if includedNames.length > 0}
    <div class="included-block">
      <div class="included-label">Included</div>
      <div class="included-pills">
        {#each includedNames as name}
          <span class="included-pill">{name}</span>
        {/each}
        {#if tier.includedProductSlugs.length > 6}
          <span class="included-pill more">+{tier.includedProductSlugs.length - 6} more</span>
        {/if}
      </div>
    </div>
  {/if}

  {#if !compact && tier.idealFor.length > 0}
    <div class="ideal-block">
      <div class="ideal-label">Ideal for</div>
      <ul class="ideal-list">
        {#each tier.idealFor as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <button
    class="cta-btn"
    class:cta-primary={mostPopular || isHighlighted}
    onclick={() => onSelect?.(tier.id)}
    aria-label="{ctaLabel()} — {tier.name}"
  >
    {ctaLabel()} →
  </button>
</article>

<style>
  .tier-card {
    background: #FFFFFF;
    border: 1.5px solid #D8E8DC;
    border-radius: 14px;
    padding: 24px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
    transition: box-shadow 0.15s;
  }

  .tier-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,.1);
  }

  .tier-card.popular {
    border-color: #1D9E75;
    box-shadow: 0 0 0 2px #1D9E75, 0 4px 20px rgba(29,158,117,.2);
  }

  .tier-card.highlighted {
    border-color: #1D9E75;
    box-shadow: 0 0 0 2px #1D9E75, 0 4px 20px rgba(29,158,117,.25);
  }

  .tier-card.compact {
    padding: 18px 16px;
    gap: 12px;
  }

  .popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #1D9E75;
    color: #fff;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 3px 12px;
    border-radius: 20px;
    white-space: nowrap;
  }

  .rec-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #2563EB;
    color: #fff;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 3px 12px;
    border-radius: 20px;
    white-space: nowrap;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 4px;
  }

  .tier-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1A2E1E;
    margin: 0;
  }

  .compact .tier-name {
    font-size: 0.95rem;
  }

  .tier-tagline {
    font-size: 0.82rem;
    color: #5A7A5E;
    line-height: 1.4;
    margin: 0;
  }

  .price-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .price-main {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1D9E75;
    line-height: 1;
  }

  .compact .price-main {
    font-size: 1.4rem;
  }

  .price-unit {
    font-size: 1rem;
    font-weight: 500;
    color: #5A8A64;
  }

  .price-sub {
    font-size: 0.78rem;
    color: #5A7A5E;
  }

  .onboarding-fee {
    font-size: 0.75rem;
    color: #7A9A7E;
  }

  .features-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .feature-item {
    font-size: 0.82rem;
    color: #3A5A44;
    line-height: 1.4;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .compact .feature-item {
    font-size: 0.78rem;
  }

  .check {
    color: #1D9E75;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 0.05em;
  }

  .included-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .included-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5A8A64;
  }

  .included-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .included-pill {
    background: #EEF7EF;
    border: 1px solid #C8DCC8;
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 0.7rem;
    color: #3A5A44;
    font-weight: 600;
  }

  .included-pill.more {
    background: transparent;
    border-color: #C8DCC8;
    color: #7A9A7E;
  }

  .ideal-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ideal-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5A8A64;
  }

  .ideal-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ideal-list li {
    font-size: 0.78rem;
    color: #5A7A5E;
    line-height: 1.4;
    padding-left: 12px;
    position: relative;
  }

  .ideal-list li::before {
    content: '·';
    position: absolute;
    left: 0;
    color: #1D9E75;
  }

  .cta-btn {
    margin-top: auto;
    background: transparent;
    border: 1.5px solid #1D9E75;
    color: #1D9E75;
    border-radius: 8px;
    padding: 11px 16px;
    font-size: 0.88rem;
    font-weight: 600;
    font-family: Georgia, serif;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    text-align: center;
    width: 100%;
  }

  .cta-btn:hover {
    background: #1D9E75;
    color: #fff;
  }

  .cta-btn:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 2px;
  }

  .cta-btn.cta-primary {
    background: #1D9E75;
    color: #fff;
  }

  .cta-btn.cta-primary:hover {
    background: #19876A;
  }
</style>
