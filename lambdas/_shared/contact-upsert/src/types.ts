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
export type Ddb = { send: (cmd: unknown) => Promise<unknown> };
