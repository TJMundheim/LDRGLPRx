import { LocalStorageAdapter } from './localStorageAdapter';
import type { Storage } from './types';

export type { Storage, Unsubscribe } from './types';

/**
 * Swap this export when Supabase (or another backend) lands.
 * All components must call `storage.saveWorkbook(...)` — never touch
 * localStorage directly.
 */
export const storage: Storage = new LocalStorageAdapter();
