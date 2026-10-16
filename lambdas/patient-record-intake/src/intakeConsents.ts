// Server-built NPP + Patient Authorization signature taken inside the /consult intake.
// Stored shape + audit match lambdas/consent-sign/src/store.ts. Never throws: the
// intake has already succeeded by the time this runs.
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { RECORD_SK, auditSk, CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';
import { buildSignedConsents, copyEmailHtml, esc } from '@my4mlife/legal-consents';

const EMAIL_SENDER_FN = process.env.EMAIL_SENDER_FN ?? 'my4mlife-email-sender';
const TABLE = () => process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const NOTIFY_TO = process.env.NOTIFY_TO ?? 'drtj@my4mlife.com';

/** Merge keys into record.consents one by one — never replaces the whole map. */
export async function writeConsentKeys(
  ddb: DynamoDBDocumentClient, contactId: string, entries: Record<string, string>, ts: string,
): Promise<void> {
  const keys = Object.keys(entries);
  if (!keys.length) return;
  const Key = { contactId, sk: RECORD_SK };
  await ddb.send(new UpdateCommand({
    TableName: TABLE(), Key,
    UpdateExpression: 'SET #c = if_not_exists(#c, :empty)',
    ExpressionAttributeNames: { '#c': 'consents' }, ExpressionAttributeValues: { ':empty': {} },
  }));
  const names: Record<string, string> = { '#c': 'consents' };
  const vals: Record<string, unknown> = { ':ts': ts };
  const sets = keys.map((k, i) => { names[`#k${i}`] = k; vals[`:v${i}`] = entries[k]; return `#c.#k${i} = :v${i}`; });
  await ddb.send(new UpdateCommand({
    TableName: TABLE(), Key,
    UpdateExpression: `SET ${sets.join(', ')}, updatedAt = :ts`,
    ExpressionAttributeNames: names, ExpressionAttributeValues: vals,
  }));
}

export interface SignArgs {
  contactId: string; encounterId: string; typedName: string; at: string;
  ip?: string; userAgent?: string; email: string; name: string;
}

export async function signAtIntake(ddb: DynamoDBDocumentClient, lambda: LambdaClient, a: SignArgs): Promise<boolean> {
  const { npp, phi } = buildSignedConsents({ typedName: a.typedName, at: a.at, ip: a.ip, userAgent: a.userAgent });
  try {
    await writeConsentKeys(ddb, a.contactId, {
      [CONSENT_NPP_V1]: JSON.stringify(npp), [CONSENT_PHI_AUTH_V1]: JSON.stringify(phi),
    }, a.at);
    await ddb.send(new PutCommand({
      TableName: TABLE(),
      Item: {
        contactId: a.contactId, sk: auditSk(a.at, 1), at: a.at, encounterId: a.encounterId,
        action: 'consent.signed', detail: { npp: true, phiAuth: true, source: 'intake' },
      },
    }));
  } catch (e) {
    console.error('[patient-record-intake] consent write failed', { error: (e as { name?: string })?.name });
    return false;
  }
  const mail = (to: string, subject: string, html: string, text: string) => lambda.send(new InvokeCommand({
    FunctionName: EMAIL_SENDER_FN, InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ kind: 'info', to, subject, html, text })),
  }));
  const send = async (to: string, subject: string, html: string, text: string) => {
    try { await mail(to, subject, html, text); }
    catch (e) { console.error('[patient-record-intake] consent email failed', { error: (e as { name?: string })?.name }); }
  };
  await send(a.email, 'Your signed My4MLife privacy notice and authorization', copyEmailHtml(a.name, a.typedName, a.at),
    `Signed by ${a.typedName} on ${a.at}. A full copy is in the HTML version of this email.`);
  await send(NOTIFY_TO, `[Consent signed] ${a.name}`,
    `<p>${esc(a.name)} (${esc(a.email)}) signed the NPP + Patient Authorization at intake on ${esc(a.at)}.</p><p>Encounter: ${esc(a.encounterId)}</p>`,
    `${a.name} (${a.email}) signed the NPP + Patient Authorization at intake on ${a.at}. Encounter: ${a.encounterId}`);
  return true;
}
