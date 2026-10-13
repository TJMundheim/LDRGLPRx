import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { upsertContact } from '@my4mlife/contact-upsert';

type Ddb = Parameters<typeof upsertContact>[0];
type Sender = { send: (cmd: any) => Promise<any> };

export type ProtegeContact = {
  contactId: string; email: string; firstName: string; phone?: string; at: string;
};

// A banned Contact is never written (same refusal as the old ConditionExpression,
// which also silently skipped the write). Customers are allowed: the helper never
// demotes a stage and promotes lead -> protege only.
export async function isBanned(ddb: Sender, table: string, contactId: string): Promise<boolean> {
  const r = await ddb.send(new GetCommand({
    TableName: table,
    Key: { contactId },
    ProjectionExpression: 'lifecycleStage',
  }));
  return r?.Item?.lifecycleStage === 'banned';
}

// Additive Contact write: identity (firstName/phone/...) is if_not_exists, so a
// repeat signup never clobbers good data. The consent map is written only once.
export async function writeProtegeContact(ddb: Sender, table: string, c: ProtegeContact): Promise<void> {
  await upsertContact(ddb as Ddb, {
    email: c.email,
    firstName: c.firstName,
    ...(c.phone ? { phone: c.phone } : {}),
    source: 'protege-signup',
    stage: 'protege',
    event: { type: 'protege-signup', at: c.at },
  }, { table, now: c.at });

  await ddb.send(new UpdateCommand({
    TableName: table,
    Key: { contactId: c.contactId },
    UpdateExpression: 'SET #consent = if_not_exists(#consent, :consent)',
    ExpressionAttributeNames: { '#consent': 'consent' },
    ExpressionAttributeValues: {
      ':consent': { ai: { v: 'consent-ai-v1', at: c.at }, protege: { v: 'consent-protege-v1', at: c.at } },
    },
  }));
}
