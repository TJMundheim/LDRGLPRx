// pushPatchProviders query: the public-safe roster view. NEVER includes `inbox`.
import { loadRoster } from '@my4mlife/provider-roster';

export interface PushPatchProvider { id: string; name: string; credentials: string; default: boolean }

export const listProviders = async (): Promise<PushPatchProvider[]> => {
  try {
    return (await loadRoster()).map(p => ({ id: p.id, name: p.name, credentials: p.credentials, default: p.default === true }));
  } catch (e) {
    console.error('pushPatchProviders failed', (e as Error).name);
    throw new Error('Providers unavailable');
  }
};
