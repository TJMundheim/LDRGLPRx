// Which provider signs an approval: the chosen roster entry, else the roster default (which falls back
// to the SSM practice clinician until /my4mlife/providers exists, so behaviour is unchanged by default).
import { loadRoster, resolveProvider } from '@my4mlife/provider-roster';

export interface SigningProvider { id: string; name: string }

// A roster that cannot load (no providers param AND no practice clinician) must not block the approval:
// null means "no override, no stamp", so the existing missing-config path (TJ-only ACTION NEEDED email) runs.
export async function pickProvider(providerId?: string): Promise<SigningProvider | null> {
  try {
    const p = resolveProvider(await loadRoster(), providerId);
    return { id: p.id, name: p.name };
  } catch (e) {
    console.error('provider roster unavailable', (e as Error).name);
    return null;
  }
}
