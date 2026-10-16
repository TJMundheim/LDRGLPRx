// Typed-name signature on the intake form also signs the Notice of Privacy Practices and the
// Patient Authorization. Stored shape + audit match lambdas/consent-sign/src/store.ts exactly.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { RECORD_SK, auditSk, CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';
import { buildSignedConsents, copyEmailHtml } from '@my4mlife/legal-consents';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const lambda = new LambdaClient({ region: REGION });

const errName = (e: unknown) => (e as { name?: string })?.name ?? 'Error';

/** Writes both consents + the audit item, then emails the signed copy. Never throws: the intake already succeeded. */
export async function signAndSendCopy(a: {
  contactId: string; encounterId: string; typedName: string; at: string; ip?: string; userAgent?: string;
  email: string; name: string;
}): Promise<void> {
  const { npp, phi } = buildSignedConsents({ typedName: a.typedName, at: a.at, ip: a.ip, userAgent: a.userAgent });
  try {
    const Key = { contactId: a.contactId, sk: RECORD_SK };
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key, UpdateExpression: 'SET #c = if_not_exists(#c, :empty)',
      ExpressionAttributeNames: { '#c': 'consents' }, ExpressionAttributeValues: { ':empty': {} },
    }));
    await ddb.send(new UpdateCommand({
      TableName: TABLE, Key, UpdateExpression: 'SET #c.#npp = :npp, #c.#phi = :phi, updatedAt = :ts',
      ExpressionAttributeNames: { '#c': 'consents', '#npp': CONSENT_NPP_V1, '#phi': CONSENT_PHI_AUTH_V1 },
      ExpressionAttributeValues: { ':npp': JSON.stringify(npp), ':phi': JSON.stringify(phi), ':ts': a.at },
    }));
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        contactId: a.contactId, sk: auditSk(a.at, 0), at: a.at, encounterId: a.encounterId,
        action: 'consent.signed', detail: { npp: true, phiAuth: true },
      },
    }));
  } catch (e) {
    console.error('[push-patch-intake] consent write failed', { error: errName(e) });
  }
  try {
    const html = copyEmailHtml(a.name, a.typedName, a.at);
    const res = await lambda.send(new InvokeCommand({
      FunctionName: EMAIL_SENDER_FN,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify({
        kind: 'info', from: 'support', to: a.email, subject: 'Your signed privacy notice and authorization',
        html, text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      })),
    }));
    if (res.FunctionError) throw Object.assign(new Error('copy email rejected'), { name: 'EmailSenderError' });
  } catch (e) {
    console.error('[push-patch-intake] signed copy email failed', { error: errName(e) });
  }
}
