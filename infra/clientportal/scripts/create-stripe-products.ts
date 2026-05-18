#!/usr/bin/env tsx
/**
 * create-stripe-products.ts
 *
 * Run once after Stripe test/live keys arrive.
 *
 * Reads website/src/data/skus.ts, creates Stripe Products + Prices for each
 * SKU with a non-null price, and prints the generated stripePriceId values
 * for TJ to paste back into skus.ts.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxxx npx tsx infra/clientportal/scripts/create-stripe-products.ts
 *
 * Or for live mode:
 *   STRIPE_SECRET_KEY=sk_live_xxxx npx tsx infra/clientportal/scripts/create-stripe-products.ts
 *
 * Pre-run checklist:
 *   1. SKU memberPriceUSD and retailPriceUSD fields populated for each SKU you want to charge for
 *   2. SKU cadence ('monthly' | 'annual' | 'one-time') correct per product
 *   3. Stripe secret key in env (NEVER commit this — load from Secrets Manager or .env.local)
 *
 * What this script does NOT do:
 *   - Does not modify skus.ts (you paste the stripePriceId values back manually
 *     so the diff is reviewable)
 *   - Does not create discount codes / coupons (use the Stripe Dashboard for those)
 *   - Does not delete existing products (idempotent on Product name; will reuse)
 */

import Stripe from 'stripe';
import { SKUS, type SKU } from '../../../website/src/data/skus';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('ERROR: STRIPE_SECRET_KEY env var is required.');
  console.error('Usage: STRIPE_SECRET_KEY=sk_test_xxxx npx tsx <this-script>');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: '2024-09-30.acacia' as any });

interface Result {
  skuId: string;
  productId: string;
  retailPriceId: string;
  memberPriceId: string;
}

function priceToCents(usd: number | null): number | null {
  if (usd === null) return null;
  return Math.round(usd * 100);
}

function intervalFor(cadence: SKU['cadence']): Stripe.PriceCreateParams.Recurring | undefined {
  if (cadence === 'monthly') return { interval: 'month' };
  if (cadence === 'annual') return { interval: 'year' };
  return undefined;
}

async function findOrCreateProduct(sku: SKU): Promise<string> {
  // Idempotent: search Stripe products by metadata.sku_id
  const existing = await stripe.products.search({
    query: `active:'true' AND metadata['sku_id']:'${sku.id}'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`  Reusing existing product: ${existing.data[0].id}`);
    return existing.data[0].id;
  }
  const product = await stripe.products.create({
    name: sku.name,
    description: sku.tagline,
    metadata: {
      sku_id: sku.id,
      solution_slug: sku.solutionSlug,
      cadence: sku.cadence ?? 'one-time',
    },
  });
  console.log(`  Created product: ${product.id}`);
  return product.id;
}

async function createPrice(
  productId: string,
  amountCents: number,
  cadence: SKU['cadence'],
  tier: 'retail' | 'member',
): Promise<string> {
  const params: Stripe.PriceCreateParams = {
    product: productId,
    currency: 'usd',
    unit_amount: amountCents,
    metadata: { tier },
  };
  const interval = intervalFor(cadence);
  if (interval) params.recurring = interval;
  const price = await stripe.prices.create(params);
  console.log(`  Created ${tier} price: ${price.id} ($${(amountCents / 100).toFixed(2)})`);
  return price.id;
}

async function main() {
  console.log(`\nStripe SKU sync — key prefix: ${stripeKey!.slice(0, 8)}...`);
  console.log(`Mode: ${stripeKey!.includes('test') ? 'TEST' : 'LIVE'}\n`);

  const results: Result[] = [];

  for (const sku of Object.values(SKUS)) {
    console.log(`\n[${sku.id}] ${sku.name}`);

    const memberCents = priceToCents(sku.memberPriceUSD);
    const retailCents = priceToCents(sku.retailPriceUSD);

    if (memberCents === null || retailCents === null) {
      console.log(`  Skipping — pricing not set (memberPriceUSD or retailPriceUSD is null)`);
      continue;
    }

    const productId = await findOrCreateProduct(sku);
    const memberPriceId = await createPrice(productId, memberCents, sku.cadence, 'member');
    const retailPriceId = await createPrice(productId, retailCents, sku.cadence, 'retail');

    results.push({ skuId: sku.id, productId, retailPriceId, memberPriceId });
  }

  console.log('\n\n=== PASTE THESE BACK INTO website/src/data/skus.ts ===\n');
  console.log('// For each SKU below, set stripePriceId to the appropriate id:');
  console.log('// (retail is default; member-pricing tier resolution happens in checkout-session Lambda)\n');
  for (const r of results) {
    console.log(`  '${r.skuId}': stripePriceId: '${r.retailPriceId}', // retail`);
    console.log(`  '${r.skuId}': stripePriceId_member: '${r.memberPriceId}', // member`);
    console.log(`  '${r.skuId}': stripeProductId: '${r.productId}',`);
    console.log('');
  }

  console.log(`\nDone — ${results.length} SKU(s) processed.`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
