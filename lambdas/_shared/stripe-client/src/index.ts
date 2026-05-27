// Stripe SDK LatestApiVersion for stripe@17.7.0 (generated from OpenAPI spec)
const API_VERSION = '2025-02-24.acacia' as const;

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Stripe from 'stripe';

// Secret `all-stripe-keys` shape (flat — set by TJ 2026-05-27):
//   { "stripe-live-key": pk_live_..., "stripe-live-secret": sk_live_...,
//     "stripe-test-key": pk_test_..., "stripe-test-secret": sk_test_... }
// We only use the secret_key for server-side Stripe API calls; the publishable
// keys are stored alongside for completeness (frontend may read them later).
interface RawSecret {
  'stripe-live-key'?: string;
  'stripe-live-secret': string;
  'stripe-test-key'?: string;
  'stripe-test-secret': string;
}

export interface GetStripeClientOptions {
  livemode?: boolean;
  modeOverride?: 'live' | 'test';
}

// Module-level secret cache (survives warm Lambda container reuse)
let cachedKeys: RawSecret | null = null;

async function fetchKeys(): Promise<RawSecret> {
  if (cachedKeys) return cachedKeys;
  const client = new SecretsManagerClient({ region: 'us-east-2' });
  const cmd = new GetSecretValueCommand({ SecretId: 'all-stripe-keys' });
  const res = await client.send(cmd);
  cachedKeys = JSON.parse(res.SecretString!) as RawSecret;
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
  const secretKey = mode === 'live' ? keys['stripe-live-secret'] : keys['stripe-test-secret'];

  return new Stripe(secretKey, { apiVersion: API_VERSION });
}
