// Private, expiring $2 test-price override for live Push Patch end-to-end tests.
// Keeps the real skuId (every downstream system is unchanged); only the charge differs.
// ANY failure (bad/expired/missing token, SSM error) resolves to null -> the normal price. Never log the token.
import { timingSafeEqual } from 'node:crypto';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { isPushPatchSku } from './push-patch';

const PARAM = '/my4mlife/push-patch/test-token';
const TTL_MS = 60_000;
const ssm = new SSMClient({ region: 'us-east-2' });

// Copy of lambdas/push-patch-decision/src/blends.ts names — keep in sync.
const BLEND_NAMES: Record<string, string> = {
  'push-patch-nad-ghk': 'NAD+ Restore',
  'push-patch-bpc-nad-ghk': 'Repair',
  'push-patch-kpv-nad-ghk': 'Calm Gut',
  'push-patch-nad-motsc-ghk': 'Metabolic',
  'push-patch-enhanced-glow': 'Enhanced Glow',
  'push-patch-wolverine': 'Wolverine',
  'push-patch-glutathione-ghk': 'Glutathione Radiance',
};

export interface TestPriceData {
  currency: 'usd';
  unit_amount: 200;
  product_data: { name: string };
}

let cache: { token: string; expiresAt: number; loadedAt: number } | null = null;
export const resetTestPriceCache = (): void => { cache = null; };

async function load(): Promise<{ token: string; expiresAt: number } | null> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  try {
    const r = await ssm.send(new GetParameterCommand({ Name: PARAM, WithDecryption: true }));
    const p = JSON.parse(r.Parameter?.Value ?? '');
    const expiresAt = Date.parse(p?.expiresAt);
    if (typeof p?.token !== 'string' || !p.token || Number.isNaN(expiresAt)) return null;
    cache = { token: p.token, expiresAt, loadedAt: Date.now() };
    return cache;
  } catch {
    return null;
  }
}

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function resolveTestPrice(skuId: string | undefined, token: unknown): Promise<TestPriceData | null> {
  if (!isPushPatchSku(skuId) || typeof token !== 'string' || !token) return null;
  const stored = await load();
  if (!stored || !safeEqual(token, stored.token) || Date.now() >= stored.expiresAt) return null;
  const name = BLEND_NAMES[skuId as string] ?? 'Blend';
  return { currency: 'usd', unit_amount: 200, product_data: { name: `Push Patch — ${name} (TEST $2)` } };
}
