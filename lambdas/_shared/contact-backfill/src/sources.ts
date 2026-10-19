import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import Stripe from 'stripe';
import type { CognitoUserIn, PatientRecordIn, StripeCustomerIn } from './map';

export const REGION = 'us-east-2';
const POOL_ID = 'us-east-2_kIpKnr17R';

export async function stripeCustomers(): Promise<StripeCustomerIn[]> {
  const sm = new SecretsManagerClient({ region: REGION });
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: 'all-stripe-keys' }));
  const key = JSON.parse(secret.SecretString ?? '{}')['stripe-live-secret'];
  if (!key) throw new Error('stripe-live-secret missing in all-stripe-keys');
  const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });
  const paidIds = new Set<string>();
  const paidEmails = new Map<string, string | null>(); // email -> billing name (guest Checkout buyers have no Customer)
  for await (const ch of stripe.charges.list({ limit: 100 })) {
    if (!ch.paid || ch.status !== 'succeeded') continue;
    const cus = typeof ch.customer === 'string' ? ch.customer : ch.customer?.id;
    if (cus) paidIds.add(cus);
    const em = ch.billing_details?.email?.trim().toLowerCase();
    if (em && !paidEmails.has(em)) paidEmails.set(em, ch.billing_details?.name ?? null);
  }
  const out: StripeCustomerIn[] = [];
  const seen = new Set<string>();
  for await (const c of stripe.customers.list({ limit: 100 })) {
    const email = c.email?.trim().toLowerCase();
    if (email) seen.add(email);
    out.push({ id: c.id, email: c.email, name: c.name, hasPaid: paidIds.has(c.id) || (!!email && paidEmails.has(email)) });
  }
  for (const [email, name] of paidEmails) if (!seen.has(email)) out.push({ id: '', email, name, hasPaid: true });
  return out;
}

export async function cognitoUsers(): Promise<CognitoUserIn[]> {
  const client = new CognitoIdentityProviderClient({ region: REGION });
  const out: CognitoUserIn[] = [];
  let PaginationToken: string | undefined;
  do {
    const res = await client.send(new ListUsersCommand({ UserPoolId: POOL_ID, PaginationToken }));
    out.push(...(res.Users ?? []));
    PaginationToken = res.PaginationToken;
  } while (PaginationToken);
  return out;
}

export async function patientRecords(ddb: { send(cmd: unknown): Promise<any> }): Promise<PatientRecordIn[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: PatientRecordIn[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: 'PatientRecords',
      FilterExpression: 'sk = :r',
      ExpressionAttributeValues: { ':r': 'record' },
      ProjectionExpression: 'contactId, demographics.email, demographics.firstName, demographics.lastName',
      ExclusiveStartKey,
    }));
    out.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out;
}
