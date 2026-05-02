<script lang="ts">
  import type { IntakeReport } from '../../intake/report';

  interface Props {
    report: IntakeReport;
    onCheckout: () => void;
    onGoToPricing?: (tierId: string) => void;
  }
  let { report, onCheckout, onGoToPricing }: Props = $props();

  const { headline, summary, priorityCards, recommendedProducts, recommendedLabs, recommendedTier, suggestedCart, clinicianFlags } = $derived(report);

  /** Format USD cents-free */
  function usd(n: number): string {
    return `$${n.toLocaleString('en-US')}`;
  }

  function domainColor(domain: string): string {
    const map: Record<string, string> = {
      brain: '#4a9eff',
      gut: '#4ade80',
      sleep: '#a78bfa',
      metabolic: '#fb923c',
      hormone: '#f472b6',
      joint: '#fbbf24',
      sexual: '#e879f9',
      inflammation: '#f87171',
    };
    return map[domain] ?? '#9ba3b2';
  }
</script>

<article class="report" aria-labelledby="report-headline">

  <!-- Hero -->
  <header class="report-hero">
    <div class="badge">YOUR PERSONALIZED PROTOCOL</div>
    <h1 id="report-headline" class="report-headline">{headline}</h1>
    <p class="report-summary">{summary}</p>
    <p class="report-note">
      "Every symptom you're experiencing has a name, a cause, and a fix.
      Most people just never get told what they are." — Dr. TJ Mundheim
    </p>
  </header>

  <!-- Clinician flags banner -->
  {#if clinicianFlags && clinicianFlags.length > 0}
    <div class="flag-banner" role="alert" aria-live="assertive">
      <strong>Clinician review flagged.</strong>
      Based on your responses, a licensed clinician will review your intake before your protocol begins.
      This is standard for complex presentations — not a cause for alarm.
    </div>
  {/if}

  <!-- Top Priorities -->
  {#if priorityCards.length > 0}
    <section class="report-section" aria-labelledby="priorities-heading">
      <h2 id="priorities-heading" class="section-heading">Your Top Priorities</h2>
      <p class="section-sub">
        Normal is not optimal — these are the domains where the data shows the highest opportunity.
      </p>
      <div class="priority-grid">
        {#each priorityCards as card}
          <div class="priority-card" style="border-top-color: {domainColor(card.domain)}">
            <div class="priority-domain" style="color: {domainColor(card.domain)}">{card.domain.toUpperCase()}</div>
            <h3 class="priority-title">{card.title}</h3>
            <p class="priority-body">{card.body}</p>
            <div class="priority-severity" aria-label="Severity score">
              {#each { length: 3 } as _, i}
                <span class="sev-pip" class:sev-pip-on={i < Math.min(card.severity, 3)}></span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Recommended Tier -->
  {#if recommendedTier}
    <section class="report-section tier-feature" aria-labelledby="tier-heading">
      <div class="tier-badge">RECOMMENDED FOR YOU</div>
      <h2 id="tier-heading" class="tier-name">{recommendedTier.name}</h2>
      <p class="tier-tagline">{recommendedTier.tagline}</p>
      {#if recommendedTier.oneTimePriceUSD !== undefined}
        <div class="tier-price">
          <span class="price-value">{usd(recommendedTier.oneTimePriceUSD)}</span>
          <span class="price-label">one-time · program entry</span>
        </div>
      {:else if recommendedTier.monthlyUSD !== undefined}
        <div class="tier-price">
          <span class="price-value">{usd(recommendedTier.monthlyUSD)}/mo</span>
          {#if recommendedTier.onboardingFeeUSD}
            <span class="price-label">+ {usd(recommendedTier.onboardingFeeUSD)} onboarding</span>
          {/if}
        </div>
      {/if}
      <ul class="tier-features" aria-label="What's included">
        {#each recommendedTier.features as f}
          <li>{f}</li>
        {/each}
      </ul>
      <div class="tier-cta-row">
        <button class="btn-tier" onclick={onCheckout}>
          Start with this tier →
        </button>
        {#if onGoToPricing && recommendedTier}
          <button
            class="btn-tier-compare"
            onclick={() => onGoToPricing?.(recommendedTier?.id ?? '')}
            aria-label="See full pricing for {recommendedTier.name}"
          >
            Compare all tiers
          </button>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Recommended Products -->
  {#if recommendedProducts.length > 0}
    <section class="report-section" aria-labelledby="products-heading">
      <h2 id="products-heading" class="section-heading">Recommended Formulas</h2>
      <p class="section-sub">
        Practitioner-grade formulas built for cognitive longevity — not available anywhere else.
        Not your fault you've been guessing. Now you don't have to.
      </p>
      <div class="product-grid">
        {#each recommendedProducts as product}
          <div class="product-card">
            {#if product.requiresRx}
              <div class="rx-badge">Rx COMPOUND</div>
            {/if}
            <h3 class="product-name">{product.name}</h3>
            <p class="product-desc">{product.description}</p>
            {#if product.pricing.memberUSD !== undefined}
              <div class="product-price">
                <span class="price-member">{usd(product.pricing.memberUSD)} member</span>
                <span class="price-retail">{usd(product.pricing.retailUSD)} retail</span>
              </div>
            {:else}
              <div class="product-price">
                <span class="price-retail">{usd(product.pricing.retailUSD)}</span>
              </div>
            {/if}
            <button class="btn-add" onclick={onCheckout} aria-label={`Add ${product.name} to cart`}>
              Add to cart
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Recommended Labs -->
  {#if recommendedLabs.length > 0}
    <section class="report-section" aria-labelledby="labs-heading">
      <h2 id="labs-heading" class="section-heading">Recommended Labs</h2>
      <p class="section-sub">
        You walk into Week 1 with your numbers. No other program in this space does this.
      </p>
      <div class="product-grid">
        {#each recommendedLabs as lab}
          <div class="product-card">
            <div class="rx-badge lab-badge">LAB PANEL</div>
            <h3 class="product-name">{lab.name}</h3>
            <p class="product-desc">{lab.description}</p>
            <div class="product-price">
              <span class="price-retail">{usd(lab.pricing.memberUSD ?? lab.pricing.retailUSD)}</span>
            </div>
            <button class="btn-add" onclick={onCheckout} aria-label={`Add ${lab.name} to cart`}>
              Add to cart
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Cart footer -->
  <footer class="cart-footer" aria-labelledby="cart-heading">
    <h2 id="cart-heading" class="cart-heading">Your Pre-loaded Cart</h2>
    <div class="cart-items">
      {#each suggestedCart.products as product}
        <div class="cart-line">
          <span class="cart-item-name">{product.name}</span>
          <span class="cart-item-price">{usd(product.pricing.memberUSD ?? product.pricing.retailUSD)}</span>
        </div>
      {/each}
      {#each suggestedCart.labs as lab}
        <div class="cart-line">
          <span class="cart-item-name">{lab.name}</span>
          <span class="cart-item-price">{usd(lab.pricing.memberUSD ?? lab.pricing.retailUSD)}</span>
        </div>
      {/each}
    </div>
    <div class="cart-total">
      <span>Estimated total</span>
      <span class="cart-total-value">{usd(suggestedCart.estimatedTotalUSD)}</span>
    </div>
    <p class="cart-note">
      The man you were is still in there. He didn't disappear — he got depleted.
      Month 1 is where we bring him back. With your data. Your labs. Your protocol.
    </p>
    <button class="btn-checkout" onclick={onCheckout}>
      Continue to checkout →
    </button>
  </footer>

</article>

<style>
  .report {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* Hero */
  .report-hero {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .badge, .tier-badge {
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent, #4a9eff);
    font-weight: 600;
  }

  .report-headline {
    font-size: clamp(1.5rem, 3.5vw, 2.2rem);
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
    line-height: 1.2;
  }

  .report-summary {
    font-size: 1rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.7;
    margin: 0;
  }

  .report-note {
    border-left: 3px solid var(--accent, #4a9eff);
    padding: 8px 16px;
    color: var(--text-muted, #9ba3b2);
    font-style: italic;
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.6;
  }

  /* Clinician flag banner */
  .flag-banner {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.4);
    border-radius: 8px;
    padding: 14px 18px;
    color: #fca5a5;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* Section structure */
  .report-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-heading {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .section-sub {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.88rem;
    margin: 0;
    line-height: 1.5;
  }

  /* Priority cards */
  .priority-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }

  .priority-card {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-top: 3px solid;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .priority-domain {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .priority-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .priority-body {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }

  .priority-severity {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .sev-pip {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border, rgba(255,255,255,0.12));
  }

  .sev-pip.sev-pip-on {
    background: var(--accent, #4a9eff);
  }

  /* Tier feature block */
  .tier-feature {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--accent, #4a9eff);
    border-radius: 12px;
    padding: 28px;
    gap: 12px;
  }

  .tier-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .tier-tagline {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.95rem;
    margin: 0;
  }

  .tier-price {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .price-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--accent, #4a9eff);
  }

  .price-label {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
  }

  .tier-features {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tier-features li {
    font-size: 0.9rem;
    color: var(--text-muted, #9ba3b2);
    padding-left: 18px;
    position: relative;
  }

  .tier-features li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--accent, #4a9eff);
    font-weight: 700;
  }

  .btn-tier {
    background: var(--accent, #4a9eff);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    transition: background 0.15s;
  }

  .btn-tier:hover { background: #3a8fe8; }
  .btn-tier:focus-visible { outline: 2px solid var(--accent, #4a9eff); outline-offset: 3px; }

  .tier-cta-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .btn-tier-compare {
    background: transparent;
    border: 1px solid var(--accent, #4a9eff);
    color: var(--accent, #4a9eff);
    border-radius: 8px;
    padding: 12px 20px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-tier-compare:hover {
    background: rgba(74, 158, 255, 0.1);
  }

  .btn-tier-compare:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 3px;
  }

  /* Product/lab cards */
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }

  .product-card {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 10px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rx-badge {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent, #4a9eff);
  }

  .lab-badge {
    color: #4ade80;
  }

  .product-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .product-desc {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }

  .product-price {
    display: flex;
    gap: 10px;
    align-items: baseline;
    flex-wrap: wrap;
  }

  .price-member {
    font-weight: 700;
    color: var(--accent, #4a9eff);
    font-size: 0.95rem;
  }

  .price-retail {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.82rem;
    text-decoration: line-through;
  }

  .product-price:has(.price-retail:only-child) .price-retail {
    text-decoration: none;
    color: var(--accent, #4a9eff);
    font-size: 0.95rem;
    font-weight: 700;
  }

  .btn-add {
    background: transparent;
    border: 1px solid var(--accent, #4a9eff);
    color: var(--accent, #4a9eff);
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-add:hover {
    background: rgba(74, 158, 255, 0.12);
  }

  .btn-add:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 2px;
  }

  /* Cart footer */
  .cart-footer {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .cart-heading {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
    padding-bottom: 12px;
  }

  .cart-line {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
    color: var(--text-muted, #9ba3b2);
  }

  .cart-item-name {
    flex: 1;
  }

  .cart-item-price {
    font-variant-numeric: tabular-nums;
    color: var(--text, #e8eaf0);
  }

  .cart-total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    font-size: 1rem;
  }

  .cart-total-value {
    color: var(--accent, #4a9eff);
  }

  .cart-note {
    font-size: 0.85rem;
    font-style: italic;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.6;
    margin: 0;
  }

  .btn-checkout {
    background: var(--accent, #4a9eff);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 14px 28px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    width: 100%;
    text-align: center;
  }

  .btn-checkout:hover { background: #3a8fe8; }
  .btn-checkout:focus-visible { outline: 2px solid var(--accent, #4a9eff); outline-offset: 3px; }
</style>
