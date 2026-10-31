#!/usr/bin/env node
// Prints the signed agreement link for a partner code.
//   node infra/scripts/partner-sign-link.mjs <CODE> [--days 30] [--mode live|test]
// Looks up the code's email in Stripe promotion-code metadata, reads the HMAC key and the
// Function URL from SSM, prints the URL. Never prints the key. Stripe keys: Secrets Manager `all-stripe-keys`.
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const HMAC_PARAM = '/my4mlife/partner-sign/hmac-key';
export const URL_PARAM = '/my4mlife/partner-sign/url';

// Keep identical to lambdas/partner-sign/src/token.ts (cross-checked by its tests).
export function makeToken(secret, code, email, exp) {
  const payload = Buffer.from(`${code}|${email}|${exp}`).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export function buildLink(baseUrl, secret, code, email, days, nowSec = Math.floor(Date.now() / 1000)) {
  return `${baseUrl.replace(/\/+$/, '')}/?${new URLSearchParams({ t: makeToken(secret, code, email, nowSec + days * 86400) })}`;
}

const ssm = (name) => execFileSync('aws', ['ssm', 'get-parameter', '--region', 'us-east-2', '--name', name, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'], { encoding: 'utf8' }).trim();

async function main() {
  const argv = process.argv.slice(2);
  const flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
  const die = (m) => { console.error(m); process.exit(2); };
  const code = (argv[0] ?? '').toUpperCase();
  const days = Number(flag('--days', '30')), mode = flag('--mode', 'live');
  if (!/^[A-Z0-9-]{2,30}$/.test(code)) die('Usage: partner-sign-link.mjs <CODE> [--days 30] [--mode live|test]');
  if (!Number.isFinite(days) || days <= 0) die('--days must be a positive number');
  if (!['live', 'test'].includes(mode)) die('--mode must be live or test');

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const require = createRequire(path.join(root, 'lambdas/_shared/stripe-client/') + 'package.json');
  const Stripe = require('stripe');
  const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
  const sec = await new SecretsManagerClient({ region: 'us-east-2' }).send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }));
  const key = JSON.parse(sec.SecretString)[`stripe-${mode}-secret`];
  if (!key) die(`stripe-${mode}-secret missing in all-stripe-keys`);
  const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });

  const p = (await stripe.promotionCodes.list({ code, limit: 1 })).data[0];
  if (!p || p.metadata?.partner !== 'true') die(`No partner promotion code "${code}" in ${mode} mode.`);
  if (!p.metadata.email) die(`Code ${code} has no email in its metadata.`);
  console.log(buildLink(ssm(URL_PARAM), ssm(HMAC_PARAM), code, p.metadata.email, days));
  console.error(`(${p.metadata.business ?? code} <${p.metadata.email}>, valid ${days} days)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
