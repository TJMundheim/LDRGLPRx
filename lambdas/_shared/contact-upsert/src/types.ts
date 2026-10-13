export type Stage = 'lead' | 'protege' | 'customer';

export type ContactUpsertInput = Record<string, unknown> & {
  email: string;
  source: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  skus?: string[];
  amountUSD?: number;
  stripeCustomerId?: string;
  stage?: Stage;
  marketingConsent?: { status: 'opted_in' | 'opted_out'; source: string };
  event?: { type: string; at?: string };
};

export type Clock = string | Date | (() => string | Date);
export type ContactUpsertOptions = { table?: string; now?: Clock };
// Structural subset of DynamoDBDocumentClient. `any` (not `unknown`) so the SDK's overloaded
// send() type-checks without caller casts; commands are built inside the helper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ddb = { send(cmd: any): Promise<any> };
