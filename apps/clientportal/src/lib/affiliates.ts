/**
 * Affiliate link configuration — clientportal copy.
 *
 * Mirrors website/src/lib/affiliates.ts. Kept duplicated (rather than
 * shared via a workspace package) because affiliate codes change less
 * than once a quarter and the two apps don't otherwise share lib code.
 *
 * Per the Week 1 spec (docs/plan/week-1-spec.md §5).
 *
 * PLACEHOLDERS until TJ signs up for the three programs.
 */

export const AFFILIATES = {
  butcherbox: {
    name: 'ButcherBox',
    baseUrl: 'https://www.butcherbox.com',
    code: 'PLACEHOLDER_BUTCHERBOX',
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
    code: 'my4lifeamz-20',
    link(path = '/'): string {
      const sep = path.includes('?') ? '&' : '?';
      return `${this.baseUrl}${path}${sep}tag=${this.code}`;
    },
  },
} as const;

export const AFFILIATE_DISCLOSURE =
  "We earn a small commission. We never recommend something we don't use ourselves. Same spend, better quality.";
