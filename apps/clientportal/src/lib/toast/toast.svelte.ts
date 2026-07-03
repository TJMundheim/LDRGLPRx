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

export type ToastKind = 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  retry?: () => void;
}

export interface PushToastOptions {
  message: string;
  kind?: ToastKind;
  ttlMs?: number;
  retry?: () => void;
}

const DEFAULT_TTL_MS = 8000;
const MAX_TOASTS = 3;

// Svelte 5 rune-based store via a module-level $state array.
/** Reactive array of active toasts. */
export const toasts: Toast[] = $state([]);

const _timeouts = new Map<string, ReturnType<typeof setTimeout>>();

let _nextId = 0;

function generateId(): string {
  _nextId += 1;
  return `toast-${Date.now()}-${_nextId}`;
}

function clearTimeoutFor(id: string): void {
  const handle = _timeouts.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    _timeouts.delete(id);
  }
}

function removeToast(id: string): void {
  clearTimeoutFor(id);
  const index = toasts.findIndex((t) => t.id === id);
  if (index !== -1) {
    toasts.splice(index, 1);
  }
}

/** Push a new toast. Returns its id. */
export function pushToast(opts: PushToastOptions): string {
  const id = generateId();
  const kind: ToastKind = opts.kind ?? 'error';
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;

  const toast: Toast = { id, message: opts.message, kind, retry: opts.retry };

  if (toasts.length >= MAX_TOASTS) {
    const oldest = toasts[0];
    if (oldest) {
      removeToast(oldest.id);
    }
  }

  toasts.push(toast);

  if (!opts.retry) {
    const handle = setTimeout(() => {
      removeToast(id);
    }, ttlMs);
    _timeouts.set(id, handle);
  }

  return id;
}

/** Remove a toast by id. */
export function dismissToast(id: string): void {
  removeToast(id);
}

/** Invoke the toast's retry callback exactly once, then remove it. */
export function retryToast(id: string): void {
  const toast = toasts.find((t) => t.id === id);
  const retry = toast?.retry;
  removeToast(id);
  if (retry) {
    retry();
  }
}
