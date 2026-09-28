// Provider inbox address. Single source of truth is SSM
// /my4mlife/provider/email (written by this Lambda's infra/deploy.sh — the IaC
// path; never edit it by hand in the console). Read at cold start and cached
// for five minutes so a change propagates without a redeploy.
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PARAM = process.env.PROVIDER_EMAIL_PARAM ?? '/my4mlife/provider/email';
const TTL_MS = 5 * 60 * 1000;

const ssm = new SSMClient({ region: REGION });

let cached: { value: string; at: number } | null = null;

/** Test seam — reset the module cache. */
export function resetProviderEmailCache(): void {
  cached = null;
}

export async function providerEmail(now: number = Date.now()): Promise<string> {
  if (cached && now - cached.at < TTL_MS) return cached.value;
  const res = await ssm.send(new GetParameterCommand({ Name: PARAM }));
  const value = (res.Parameter?.Value ?? '').trim();
  if (!value) throw new Error(`provider email not configured (SSM ${PARAM} is empty)`);
  cached = { value, at: now };
  return value;
}
