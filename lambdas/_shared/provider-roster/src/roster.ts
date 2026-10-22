import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import type { Provider } from './types';
import { validateRoster } from './validate';

export const ROSTER_PARAM = '/my4mlife/providers';
export const PRACTICE_PARAM = '/my4mlife/genesis/practice';

interface SsmLike { send(cmd: GetParameterCommand): Promise<{ Parameter?: { Value?: string } }> }

let client: SsmLike | undefined;
let cached: Provider[] | undefined;
export const resetRosterCache = (): void => { cached = undefined; };

const read = async (ssm: SsmLike, Name: string): Promise<string | undefined> =>
  (await ssm.send(new GetParameterCommand({ Name }))).Parameter?.Value;

async function fallback(ssm: SsmLike): Promise<Provider[]> {
  const raw = await read(ssm, PRACTICE_PARAM);
  const clinician = String((JSON.parse(raw ?? '') as { clinician?: unknown }).clinician ?? '').trim();
  if (!clinician) throw new Error('no clinician in practice config');
  return [{ id: 'default', name: clinician, credentials: '', inbox: '', default: true }];
}

/** Roster from SSM (cached per container). Missing/invalid param -> single provider from the Genesis practice clinician. */
export async function loadRoster(ssm?: unknown): Promise<Provider[]> {
  if (cached) return cached;
  const s = (ssm as SsmLike | undefined) ?? (client ??= new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' }) as SsmLike);
  try {
    cached = validateRoster(await read(s, ROSTER_PARAM));
    return cached;
  } catch (e) {
    console.error('provider roster param unavailable, using practice clinician', (e as Error).name);
  }
  try {
    return await fallback(s); // not cached: adding the param later needs no redeploy
  } catch (e) {
    throw new Error(`Provider roster unavailable: set SSM ${ROSTER_PARAM} or a clinician in ${PRACTICE_PARAM} (${(e as Error).message})`);
  }
}

/** Provider by id; unknown or empty id gives the default. */
export function resolveProvider(roster: Provider[], id?: string): Provider {
  const found = id ? roster.find((p) => p.id === id) : undefined;
  const picked = found ?? roster.find((p) => p.default) ?? roster[0];
  if (!picked) throw new Error('Provider roster is empty');
  return picked;
}
