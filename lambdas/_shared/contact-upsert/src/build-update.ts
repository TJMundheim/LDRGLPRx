import type { ContactUpsertInput } from './types';

type Built = {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
};

const str = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const strSet = (v: unknown): Set<string> | undefined => {
  const items = Array.isArray(v) ? v.filter(str) : [];
  return items.length ? new Set(items) : undefined;
};

export function buildUpdate(input: ContactUpsertInput, email: string, now: string, phone?: string): Built {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  const adds: string[] = [];
  const bind = (attr: string, value: unknown): [string, string] => {
    names[`#${attr}`] = attr;
    values[`:${attr}`] = value;
    return [`#${attr}`, `:${attr}`];
  };
  const setOnce = (attr: string, value: unknown) => {
    const [n, v] = bind(attr, value);
    sets.push(`${n} = if_not_exists(${n}, ${v})`);
  };
  const setAlways = (attr: string, value: unknown) => {
    const [n, v] = bind(attr, value);
    sets.push(`${n} = ${v}`);
  };
  const add = (attr: string, value: unknown) => {
    const [n, v] = bind(attr, value);
    adds.push(`${n} ${v}`);
  };

  setOnce('email', email);
  setOnce('createdAt', now);
  setOnce('firstSeenAt', now);
  setOnce('firstSource', input.source);
  if (str(input.firstName)) setOnce('firstName', input.firstName.trim());
  if (str(input.lastName)) setOnce('lastName', input.lastName.trim());
  if (phone) setOnce('phone', phone);
  if (str(input.stripeCustomerId)) setOnce('stripeCustomerId', input.stripeCustomerId);
  setOnce('lifecycleStage', 'lead');
  setAlways('updatedAt', now);
  setAlways('lastEvent', {
    type: input.event?.type ?? 'upsert',
    at: input.event?.at ?? now,
    source: input.source,
  });
  if (input.marketingConsent) setAlways('marketingConsent', { ...input.marketingConsent, at: now });

  add('sources', new Set([input.source]));
  const tags = strSet(input.tags);
  if (tags) add('tags', tags);
  const skus = strSet(input.skus);
  if (skus) add('skusPurchased', skus);
  if (typeof input.amountUSD === 'number' && input.amountUSD > 0) add('lifetimeValueUSD', input.amountUSD);

  return {
    UpdateExpression: `SET ${sets.join(', ')} ADD ${adds.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}
