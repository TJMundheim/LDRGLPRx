// Genesis practice constants: ONE JSON SSM parameter (plain String). Cached once complete; an
// incomplete/missing config is re-read on the next order so fixing it needs no redeploy.
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

export const PRACTICE_PARAM = '/my4mlife/genesis/practice';
export const REQUIRED = ['clinician', 'practice', 'practice_phone', 'payment_email', 'billing', 'placer', 'placer_phone', 'salesrep'] as const;
export interface Practice {
  clinician: string; practice: string; practice_phone: string; payment_email: string; billing: string;
  placer: string; placer_phone: string; salesrep: string; physician_signature?: string; microneedling_per_order?: string;
}
export interface Loaded { practice: Partial<Practice>; missing: string[] }

const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
let cached: Loaded | undefined;
export const resetPracticeCache = (): void => { cached = undefined; };

const str = (v: unknown): string | undefined => (v == null ? undefined : String(v).trim() || undefined);

export async function loadPractice(): Promise<Loaded> {
  if (cached) return cached;
  let raw: Record<string, unknown> = {};
  try {
    const r = await ssm.send(new GetParameterCommand({ Name: PRACTICE_PARAM }));
    const parsed = JSON.parse(r.Parameter?.Value ?? '');
    if (parsed && typeof parsed === 'object') raw = parsed;
  } catch (e) {
    console.error('genesis practice config unavailable', (e as Error).name);
  }
  const practice: Partial<Practice> = {};
  for (const k of [...REQUIRED, 'physician_signature', 'microneedling_per_order'] as const) {
    const v = str(raw[k]);
    if (v !== undefined) practice[k] = v;
  }
  const result = { practice, missing: REQUIRED.filter((k) => !practice[k]) as string[] };
  if (!result.missing.length) cached = result;
  return result;
}
