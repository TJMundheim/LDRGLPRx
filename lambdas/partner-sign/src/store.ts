// DynamoDB access for the PartnerAgreements table (pk = code).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.PARTNER_AGREEMENTS_TABLE ?? 'PartnerAgreements';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));

export interface Signed {
  code: string; version: string; docSha256: string; legalName: string; title: string;
  business: string; email: string; signedAt: string; ip?: string; userAgent?: string;
}

export async function getSigned(code: string): Promise<Partial<Signed> | undefined> {
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { code } }));
  return r.Item as Partial<Signed> | undefined;
}

/** Conditional put: returns false (and writes nothing) when a signature already exists. */
export async function putSigned(item: Signed): Promise<boolean> {
  try {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item, ConditionExpression: 'attribute_not_exists(code)' }));
    return true;
  } catch (e: any) {
    if (e?.name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}
