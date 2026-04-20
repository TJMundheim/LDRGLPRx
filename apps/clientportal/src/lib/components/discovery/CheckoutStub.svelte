<script lang="ts">
  import type { SuggestedCart } from '../../intake/report';
  import type { MembershipTier } from '../../data/catalog';

  interface Props {
    cart: SuggestedCart;
    recommendedTier: MembershipTier | null;
    onBack: () => void;
  }
  let { cart, recommendedTier, onBack }: Props = $props();

  // TODO: Replace with real Stripe payment link or embedded checkout
  const STRIPE_CHECKOUT_URL = ''; // TODO: wire Stripe integration

  // Contact email for intro call booking
  const INTRO_EMAIL = 'drtj@essentialmanage.com';

  function usd(n: number): string {
    return `$${n.toLocaleString('en-US')}`;
  }

  function buildIntroMailto(): string {
    const subject = encodeURIComponent('4M Program — Book My Intro Call');
    const body = encodeURIComponent(
      'Hi Dr. TJ,\n\nI completed the 4M intake and would like to book a 15-minute intro call.\n\nPlease let me know your availability.\n\nThank you.'
    );
    return `mailto:${INTRO_EMAIL}?subject=${subject}&body=${body}`;
  }
</script>

<section class="checkout" aria-labelledby="checkout-heading">

  <header class="checkout-header">
    <div class="badge">CHECKOUT</div>
    <h1 id="checkout-heading" class="checkout-title">Your order summary</h1>
    <p class="checkout-sub">Review your selections before proceeding to payment.</p>
  </header>

  <!-- Recommended tier line -->
  {#if recommendedTier}
    <div class="tier-line">
      <span class="tier-line-label">Program tier</span>
      <span class="tier-line-name">{recommendedTier.name}</span>
    </div>
  {/if}

  <!-- Cart items -->
  <div class="cart-block" aria-label="Cart items">
    {#if cart.products.length === 0 && cart.labs.length === 0}
      <p class="empty-cart">No items in cart — go back and select your protocol.</p>
    {:else}
      {#each cart.products as product}
        <div class="cart-row">
          <div class="cart-row-info">
            <span class="cart-row-name">{product.name}</span>
            {#if product.requiresRx}
              <span class="cart-row-tag">Rx compound</span>
            {/if}
          </div>
          <span class="cart-row-price">
            {usd(product.pricing.memberUSD ?? product.pricing.retailUSD)}
          </span>
        </div>
      {/each}

      {#each cart.labs as lab}
        <div class="cart-row">
          <div class="cart-row-info">
            <span class="cart-row-name">{lab.name}</span>
            <span class="cart-row-tag">Lab panel</span>
          </div>
          <span class="cart-row-price">
            {usd(lab.pricing.memberUSD ?? lab.pricing.retailUSD)}
          </span>
        </div>
      {/each}

      <div class="cart-total-row">
        <span>Estimated total</span>
        <span class="cart-total-value">{usd(cart.estimatedTotalUSD)}</span>
      </div>
    {/if}
  </div>

  <!-- Actions -->
  <div class="action-stack">
    <!-- TODO: Wire Stripe integration — replace disabled button with real checkout flow -->
    <!-- TODO: When Stripe is live, pass lineItems via metadata or a Stripe Price lookup -->
    <button
      class="btn-stripe"
      disabled
      aria-disabled="true"
      title="Stripe integration coming soon"
    >
      Pay with Stripe (coming soon)
    </button>
    <p class="stripe-note">
      Online payment integration is in progress.
      In the meantime, book your intro call — Dr. TJ will walk you through next steps.
    </p>

    <!-- TODO: Replace mailto with a real calendar booking link (Calendly / Cal.com) -->
    <a
      class="btn-intro"
      href={buildIntroMailto()}
      aria-label="Book a free 15-minute intro call with Dr. TJ"
    >
      Book your free intro call
    </a>

    <p class="intro-note">
      15 minutes. No pressure. Dr. TJ will confirm your tier, order your labs, and answer any questions.
    </p>
  </div>

  <div class="back-row">
    <button class="btn-back" onclick={onBack}>← Back to your report</button>
  </div>

</section>

<style>
  .checkout {
    max-width: 560px;
    margin: 0 auto;
    padding: 32px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .badge {
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent, #4a9eff);
    font-weight: 600;
  }

  .checkout-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .checkout-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .checkout-sub {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.9rem;
    margin: 0;
  }

  /* Tier line */
  .tier-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(74, 158, 255, 0.08);
    border: 1px solid rgba(74, 158, 255, 0.25);
    border-radius: 8px;
    padding: 12px 16px;
  }

  .tier-line-label {
    font-size: 0.82rem;
    color: var(--text-muted, #9ba3b2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .tier-line-name {
    font-weight: 700;
    color: var(--accent, #4a9eff);
    font-size: 0.95rem;
  }

  /* Cart */
  .cart-block {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .empty-cart {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.9rem;
    text-align: center;
    margin: 0;
  }

  .cart-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
  }

  .cart-row:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }

  .cart-row-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cart-row-name {
    font-size: 0.92rem;
    color: var(--text, #e8eaf0);
    font-weight: 600;
  }

  .cart-row-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent, #4a9eff);
  }

  .cart-row-price {
    font-variant-numeric: tabular-nums;
    color: var(--text, #e8eaf0);
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .cart-total-row {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text, #e8eaf0);
    padding-top: 10px;
    border-top: 1px solid var(--border, rgba(255,255,255,0.1));
  }

  .cart-total-value {
    color: var(--accent, #4a9eff);
  }

  /* Actions */
  .action-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .btn-stripe {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border, rgba(255,255,255,0.12));
    color: var(--text-muted, #9ba3b2);
    border-radius: 8px;
    padding: 14px;
    font-size: 1rem;
    font-weight: 600;
    cursor: not-allowed;
    opacity: 0.6;
    text-align: center;
  }

  .stripe-note {
    font-size: 0.8rem;
    color: var(--text-muted, #9ba3b2);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }

  .btn-intro {
    display: block;
    background: var(--accent, #4a9eff);
    color: #fff;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    padding: 14px;
    font-size: 1rem;
    font-weight: 600;
    transition: background 0.15s;
  }

  .btn-intro:hover {
    background: #3a8fe8;
  }

  .btn-intro:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 3px;
  }

  .intro-note {
    font-size: 0.8rem;
    color: var(--text-muted, #9ba3b2);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }

  /* Back */
  .back-row {
    display: flex;
    justify-content: flex-start;
  }

  .btn-back {
    background: transparent;
    border: 1px solid var(--border, rgba(255,255,255,0.12));
    color: var(--text-muted, #9ba3b2);
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .btn-back:hover {
    border-color: var(--accent, #4a9eff);
    color: var(--text, #e8eaf0);
  }

  .btn-back:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 2px;
  }
</style>
