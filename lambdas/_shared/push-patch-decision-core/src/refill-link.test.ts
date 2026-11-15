import { describe, it, expect } from 'vitest';
import { signRefillLink } from './refill-link';

describe('signRefillLink', () => {
  it('matches the shared test vector used by sig.ts and the CLI', () => {
    const url = new URL(signRefillLink({ contactId: 'c1', encounterId: 'pp-cs_1', days: 1, key: 'test-key', now: (2000000000 - 86400) * 1000 }));
    expect(url.searchParams.get('exp')).toBe('2000000000');
    expect(url.searchParams.get('sig')).toBe('df544e2799bddff07ed06d3bdbf5cea1fd08e3250b1073d48810c9f91da3b1c8');
    expect(url.origin + url.pathname).toBe('https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/push-patch-refill');
  });
  it('expires after the given days', () => {
    const now = 1_700_000_000_000;
    const u = new URL(signRefillLink({ contactId: 'c', encounterId: 'e', days: 21, key: 'k', now }));
    expect(Number(u.searchParams.get('exp'))).toBe(1_700_000_000 + 21 * 86400);
  });
});
