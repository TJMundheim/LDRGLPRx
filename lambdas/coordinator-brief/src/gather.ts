// Reads the three source records a pre-call brief is built from: the patient
// record, the specific encounter, the Contact table row, and the assessment
// (Users table, with legacy Contact fallback — see assessment.ts).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { RECORD_SK, encounterSk } from '@my4mlife/patient-record';
import { loadAssessment, type Assessment } from './assessment';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PATIENT_RECORDS_TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const CONTACT_TABLE = process.env.CONTACT_TABLE ?? 'Contact';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export interface GatheredData {
  record: Record<string, unknown> | undefined;
  encounter: Record<string, unknown> | undefined;
  contact: Record<string, unknown> | undefined;
  assessment: Assessment | undefined;
}

/** Fetch the record, encounter, and Contact row needed to draft a brief.
 *  Missing items resolve to `undefined` rather than throwing — a brief can
 *  still be generated with partial data (e.g. no Contact row yet).
 */
export async function gather(contactId: string, encounterId: string): Promise<GatheredData> {
  const [recordRes, encounterRes, contactRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: PATIENT_RECORDS_TABLE, Key: { contactId, sk: RECORD_SK } })),
    ddb.send(new GetCommand({ TableName: PATIENT_RECORDS_TABLE, Key: { contactId, sk: encounterSk(encounterId) } })),
    ddb.send(new GetCommand({ TableName: CONTACT_TABLE, Key: { contactId } })),
  ]);

  const record = recordRes.Item as Record<string, unknown> | undefined;
  const contact = contactRes.Item as Record<string, unknown> | undefined;
  const email = (contact?.['email'] as string | undefined)
    ?? ((record?.['demographics'] as Record<string, unknown> | undefined)?.['email'] as string | undefined);

  return {
    record,
    encounter: encounterRes.Item as Record<string, unknown> | undefined,
    contact,
    assessment: await loadAssessment(email, contact),
  };
}
