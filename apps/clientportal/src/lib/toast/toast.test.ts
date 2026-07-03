/**
 * Toast store — Svelte 5 runes module.
 *
 * Contract:
 *   - `toasts`: readonly reactive array of { id, message, kind, retry? }.
 *   - `pushToast(opts)`: returns id; kind defaults 'error'; auto-removes
 *     after ttlMs (default 8000ms) UNLESS a retry callback is provided,
 *     in which case it persists until dismissed/retried.
 *   - `dismissToast(id)`: removes the toast.
 *   - `retryToast(id)`: invokes the stored retry callback exactly once,
 *     then removes the toast.
 *   - Max 3 toasts at a time; pushing a 4th drops the oldest.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toasts, pushToast, dismissToast, retryToast } from './toast.svelte.js';

beforeEach(() => {
  vi.useFakeTimers();
  // Drain any toasts left over from a previous test.
  for (const t of [...toasts]) {
    dismissToast(t.id);
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pushToast', () => {
  it('appends a toast and returns its id', () => {
    const id = pushToast({ message: 'Something broke' });
    expect(typeof id).toBe('string');
    expect(toasts.some((t) => t.id === id)).toBe(true);
  });

  it('defaults kind to "error"', () => {
    const id = pushToast({ message: 'Oops' });
    const toast = toasts.find((t) => t.id === id);
    expect(toast?.kind).toBe('error');
  });

  it('honors an explicit kind', () => {
    const id = pushToast({ message: 'FYI', kind: 'info' });
    const toast = toasts.find((t) => t.id === id);
    expect(toast?.kind).toBe('info');
  });

  it('auto-removes the toast after the default ttl (8000ms) when no retry is given', () => {
    const id = pushToast({ message: 'Will vanish' });
    expect(toasts.some((t) => t.id === id)).toBe(true);
    vi.advanceTimersByTime(8000);
    expect(toasts.some((t) => t.id === id)).toBe(false);
  });

  it('auto-removes after a custom ttlMs', () => {
    const id = pushToast({ message: 'Quick', ttlMs: 2000 });
    vi.advanceTimersByTime(1999);
    expect(toasts.some((t) => t.id === id)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(toasts.some((t) => t.id === id)).toBe(false);
  });

  it('does NOT auto-dismiss a toast that has a retry callback', () => {
    const id = pushToast({ message: 'Retry me', retry: vi.fn() });
    vi.advanceTimersByTime(60000);
    expect(toasts.some((t) => t.id === id)).toBe(true);
  });

  it('caps toasts at 3, dropping the oldest on the 4th push', () => {
    const id1 = pushToast({ message: 'one' });
    pushToast({ message: 'two' });
    pushToast({ message: 'three' });
    const id4 = pushToast({ message: 'four' });

    expect(toasts.length).toBe(3);
    expect(toasts.some((t) => t.id === id1)).toBe(false);
    expect(toasts.some((t) => t.id === id4)).toBe(true);
  });
});

describe('dismissToast', () => {
  it('removes the toast by id', () => {
    const id = pushToast({ message: 'Bye' });
    dismissToast(id);
    expect(toasts.some((t) => t.id === id)).toBe(false);
  });
});

describe('retryToast', () => {
  it('invokes the stored retry callback exactly once and removes the toast', () => {
    const retry = vi.fn();
    const id = pushToast({ message: 'Retry me', retry });

    retryToast(id);

    expect(retry).toHaveBeenCalledTimes(1);
    expect(toasts.some((t) => t.id === id)).toBe(false);
  });
});
