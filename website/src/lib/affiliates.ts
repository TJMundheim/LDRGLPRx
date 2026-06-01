/**
 * Affiliate link configuration.
 *
 * Per the Week 1 spec (docs/plan/week-1-spec.md §5): the protein-breakfast
 * tile (and any future ingredient/equipment expander) surfaces affiliate
 * links so users can route their normal grocery spend through partners we
 * earn a commission on — "same spend, better quality."
 *
 * These are PLACEHOLDERS until TJ signs up for the three programs:
 *   - ButcherBox Partner Program
 *   - Thrive Market Affiliates
 *   - Amazon Associates (US store)
 *
 * Once the real codes arrive, drop them in here. No other code changes
 * are required — every consumer reads from this single file.
 */

export const AFFILIATES = {
  butcherbox: {
    name: 'ButcherBox',
    baseUrl: 'https://www.butcherbox.com',
    code: 'PLACEHOLDER_BUTCHERBOX',
    /** Returns a tagged URL. Pass a path like "/" or "/products/breakfast-sausage" */
    link(path = '/'): string {
      return `${this.baseUrl}${path}?ref=${this.code}`;
    },
  },
  thrive: {
    name: 'Thrive Market',
    baseUrl: 'https://thrivemarket.com',
    code: 'PLACEHOLDER_THRIVE',
    link(path = '/'): string {
      return `${this.baseUrl}${path}?utm_source=my4mlife&ref=${this.code}`;
    },
  },
  amazon: {
    name: 'Amazon',
    baseUrl: 'https://www.amazon.com',
    code: 'PLACEHOLDER_AMAZON',
    /** Amazon Associates uses ?tag= */
    link(path = '/'): string {
      const sep = path.includes('?') ? '&' : '?';
      return `${this.baseUrl}${path}${sep}tag=${this.code}`;
    },
  },
} as const;

/** Disclosure line shown at the bottom of any tile that surfaces affiliate links. */
export const AFFILIATE_DISCLOSURE =
  "We earn a small commission. We never recommend something we don't use ourselves. Same spend, better quality.";
