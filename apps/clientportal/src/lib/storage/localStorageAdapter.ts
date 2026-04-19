import type { Workbook } from '../data/schema';
import type { Storage, Unsubscribe } from './types';

/**
 * LocalStorage-backed implementation. Keys:
 *   4m:workbook:<id>     — the serialized Workbook JSON
 *   4m:index:<userId>    — array of workbook ids belonging to the user
 *
 * Saves are debounced per-id (300ms) to avoid thrashing on keystroke.
 */
export class LocalStorageAdapter implements Storage {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private subs = new Map<string, Set<(w: Workbook) => void>>();

  private keyFor(id: string): string { return `4m:workbook:${id}`; }
  private indexKey(userId: string): string { return `4m:index:${userId}`; }

  async getWorkbook(id: string): Promise<Workbook | null> {
    try {
      const raw = localStorage.getItem(this.keyFor(id));
      if (!raw) return null;
      return JSON.parse(raw) as Workbook;
    } catch {
      return null;
    }
  }

  async saveWorkbook(w: Workbook): Promise<void> {
    const existing = this.timers.get(w.id);
    if (existing) clearTimeout(existing);
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        try {
          const snapshot: Workbook = { ...w, updatedAt: new Date().toISOString() };
          localStorage.setItem(this.keyFor(w.id), JSON.stringify(snapshot));
          this.addToIndex(w.userId, w.id);
          this.notify(w.id, snapshot);
        } catch {
          // swallow quota / serialization errors silently
        }
        this.timers.delete(w.id);
        resolve();
      }, 300);
      this.timers.set(w.id, t);
    });
  }

  async listWorkbooks(userId: string): Promise<Workbook[]> {
    try {
      const raw = localStorage.getItem(this.indexKey(userId));
      const ids: string[] = raw ? JSON.parse(raw) : [];
      const out: Workbook[] = [];
      for (const id of ids) {
        const w = await this.getWorkbook(id);
        if (w) out.push(w);
      }
      return out;
    } catch {
      return [];
    }
  }

  async deleteWorkbook(id: string): Promise<void> {
    try {
      localStorage.removeItem(this.keyFor(id));
      // Leave index alone — best-effort cleanup on next listWorkbooks call.
    } catch {
      // ignore
    }
  }

  subscribe(id: string, handler: (w: Workbook) => void): Unsubscribe {
    let set = this.subs.get(id);
    if (!set) {
      set = new Set();
      this.subs.set(id, set);
    }
    set.add(handler);
    return () => {
      this.subs.get(id)?.delete(handler);
    };
  }

  private notify(id: string, w: Workbook): void {
    this.subs.get(id)?.forEach((h) => {
      try { h(w); } catch { /* ignore handler errors */ }
    });
  }

  private addToIndex(userId: string, id: string): void {
    try {
      const raw = localStorage.getItem(this.indexKey(userId));
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(this.indexKey(userId), JSON.stringify(ids));
      }
    } catch {
      // ignore
    }
  }
}
