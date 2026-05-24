// Stripe SDK LatestApiVersion for stripe@17.7.0 (generated from OpenAPI spec)
const API_VERSION = '2025-02-24.acacia' as const;

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Stripe from 'stripe';

interface StripeKeys {
  live: { secret_key: string; webhook_secret: string | null };
  test: { secret_key: string; webhook_secret: string | null };
}

export interface GetStripeClientOptions {
  livemode?: boolean;
  modeOverride?: 'live' | 'test';
}

// Module-level secret cache (survives warm Lambda container reuse)
let cachedKeys: StripeKeys | null = null;

async function fetchKeys(): Promise<StripeKeys> {
  if (cachedKeys) return cachedKeys;
  const client = new SecretsManagerClient({ region: 'us-east-2' });
  const cmd = new GetSecretValueCommand({ SecretId: 'stripe-keys' });
  const res = await client.send(cmd);
  cachedKeys = JSON.parse(res.SecretString!) as StripeKeys;
  return cachedKeys;
}

export function __resetCacheForTests(): void {
  cachedKeys = null;
}

export async function getStripeClient(opts: GetStripeClientOptions = {}): Promise<Stripe> {
  const { livemode, modeOverride } = opts;

  // Mode resolution: modeOverride > livemode flag > STRIPE_MODE env > 'test'
  let mode: 'live' | 'test';
  if (modeOverride !== undefined) {
    mode = modeOverride;
  } else if (livemode === true) {
    mode = 'live';
  } else if (livemode === false) {
    mode = 'test';
  } else {
    mode = (process.env['STRIPE_MODE'] as 'live' | 'test') ?? 'test';
  }

  const keys = await fetchKeys();
  const secretKey = keys[mode].secret_key;

  return new Stripe(secretKey, { apiVersion: API_VERSION });
}
