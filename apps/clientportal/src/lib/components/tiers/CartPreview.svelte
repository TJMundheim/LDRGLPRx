<script lang="ts">
  import { tiers } from '../../content/tiers';
  import { products } from '../../content/products';

  interface Props {
    selectedTierId: string;
    addonProductSlugs?: string[];
    onCheckout?: () => void;
  }

  let {
    selectedTierId,
    addonProductSlugs = [],
    onCheckout,
  }: Props = $props();

  const selectedTier = $derived(tiers.find(t => t.id === selectedTierId) ?? null);

  const addonProducts = $derived(
    addonProductSlugs
      .map(slug => products.find(p => p.slug === slug))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
  );

  function usd(n: number): string {
    return `$${n.toLocaleString('en-US')}`;
  }

  const subtotal = $derived((): number => {
    if (!selectedTier) return 0;
    let total = 0;
    if (selectedTier.kind === 'cohort') {
      total += selectedTier.oneTimePriceUSD ?? selectedTier.monthlyUSD ?? 0;
    } else {
      total += selectedTier.onboardingFeeUSD ?? 0;
      total += selectedTier.monthlyUSD ?? 0;
    }
    for (const p of addonProducts) {
      total += p.pricing.memberUSD ?? p.pricing.retailUSD;
    }
    return total;
  });

  const INTRO_EMAIL = 'drtj@essentialmanage.com';

  function buildCheckoutMailto(): string {
    const tierName = selectedTier?.name ?? '';
    const subject = encodeURIComponent(`4M Program — Start ${tierName}`);
    const body = encodeURIComponent(
      `Hi Dr. TJ,\n\nI'd like to begin the ${tierName} tier.\n\nPlease send me next steps.\n\nThank you.`
    );
    return `mailto:${INTRO_EMAIL}?subject=${subject}&body=${body}`;
  }
</script>

{#if selectedTier}
  <aside class="cart-preview" aria-label="Order preview">
    <div class="cart-header">
      <div class="cart-badge">YOUR SELECTION</div>
      <h2 class="cart-title">Order Preview</h2>
    </div>

    <div class="cart-body">
      <!-- Selected tier line -->
      <div class="line tier-line">
        <div class="line-info">
          <span class="line-name">{selectedTier.name}</span>
          {#if selectedTier.kind === 'cohort'}
            <span class="line-tag">Month 1 cohort</span>
          {:else}
            <span class="line-tag">Membership tier</span>
          {/if}
        </div>
        <span class="line-price">
          {#if selectedTier.kind === 'cohort' && selectedTier.oneTimePriceUSD !== undefined}
            {usd(selectedTier.oneTimePriceUSD)}
          {:else if selectedTier.monthlyUSD !== undefined}
            {usd(selectedTier.monthlyUSD)}/mo
          {/if}
        </span>
      </div>

      {#if selectedTier.onboardingFeeUSD && selectedTier.onboardingFeeUSD > 0}
        <div class="line">
          <span class="line-name line-sub">Onboarding fee</span>
          <span class="line-price">{usd(selectedTier.onboardingFeeUSD)}</span>
        </div>
      {/if}

      <!-- Add-on products -->
      {#each addonProducts as product}
        <div class="line">
          <span class="line-name">{product.name}</span>
          <span class="line-price">{usd(product.pricing.memberUSD ?? product.pricing.retailUSD)}</span>
        </div>
      {/each}

      <div class="subtotal-line">
        <span>Estimated total</span>
        <span class="subtotal-value">{usd(subtotal())}</span>
      </div>
    </div>

    <div class="cart-actions">
      <!-- TODO: Wire Stripe integration — replace mailto with real checkout flow -->
      <a
        class="btn-checkout"
        href={buildCheckoutMailto()}
        onclick={() => onCheckout?.()}
        aria-label="Continue to checkout for {selectedTier.name}"
      >
        Continue to checkout →
      </a>
      <p class="checkout-note">
        Secure checkout coming soon. Clicking will email Dr. TJ to begin your onboarding.
      </p>
    </div>
  </aside>
{/if}

<style>
  .cart-preview {
    background: #FFFFFF;
    border: 1.5px solid #D8E8DC;
    border-radius: 14px;
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
  }

  .cart-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cart-badge {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #1D9E75;
    font-weight: 700;
  }

  .cart-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #1A2E1E;
    margin: 0;
  }

  .cart-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 1px solid #E8F0E8;
    padding-top: 16px;
  }

  .line {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .tier-line {
    background: #F0FAF5;
    border: 1px solid #C8DCC8;
    border-radius: 8px;
    padding: 10px 12px;
  }

  .line-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .line-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: #1A2E1E;
  }

  .line-sub {
    font-weight: 400;
    color: #5A7A5E;
  }

  .line-tag {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #1D9E75;
    font-weight: 600;
  }

  .line-price {
    font-size: 0.88rem;
    font-weight: 600;
    color: #1A2E1E;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .subtotal-line {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 1rem;
    color: #1A2E1E;
    border-top: 1px solid #D8E8DC;
    padding-top: 12px;
  }

  .subtotal-value {
    color: #1D9E75;
  }

  .cart-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn-checkout {
    display: block;
    background: #1D9E75;
    color: #fff;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    padding: 13px 16px;
    font-size: 0.95rem;
    font-weight: 600;
    transition: background 0.15s;
  }

  .btn-checkout:hover {
    background: #19876A;
  }

  .btn-checkout:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 3px;
  }

  .checkout-note {
    font-size: 0.73rem;
    color: #7A9A7E;
    text-align: center;
    line-height: 1.4;
    margin: 0;
  }
</style>
