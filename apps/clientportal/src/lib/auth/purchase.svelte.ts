/**
 * Hard-paywall purchase flag store.
 *
 * Source of truth (eventually): DynamoDB `Contact` row, attribute
 * `hasActivePurchase: boolean`. Stripe webhook flips it to true on any
 * successful charge.
 *
 * TODO(stripe-webhook): Wire Stripe webhook → Lambda → DDB updateItem on
 * Contact row keyed by email. Until Stripe keys are ready, this store reads
 * false for every user (hard paywall in effect). When the AppSync `getMe`
 * query exposes `hasActivePurchase`, replace `loadFromBackend()` below with
 * a real fetch.
 *
 * Dev/test override: append `?unlocked=1` to the URL to bypass the gate.
 */

const UNLOCK_PARAM = 'unlocked';

function urlOverride(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get(UNLOCK_PARAM) === '1';
  } catch {
    return false;
  }
}

const _state = $state<{ hasActivePurchase: boolean; loaded: boolean }>({
  hasActivePurchase: urlOverride(),
  loaded: false,
});

export const purchaseState = {
  get hasActivePurchase(): boolean {
    return _state.hasActivePurchase;
  },
  get loaded(): boolean {
    return _state.loaded;
  },
};

/**
 * Load purchase flag for the current user.
 * TODO(stripe-webhook): replace stub with AppSync getMe { hasActivePurchase }.
 */
export async function loadPurchaseFlag(): Promise<void> {
  if (urlOverride()) {
    _state.hasActivePurchase = true;
    _state.loaded = true;
    return;
  }
  // Stub — defaults to false until the backend exposes the field.
  _state.hasActivePurchase = false;
  _state.loaded = true;
}
