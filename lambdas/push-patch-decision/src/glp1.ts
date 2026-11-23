// GLP-1 physician dose picker helpers. Dose lists are weekly mg per the plan contract.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export const DOSES: Record<string, string[]> = {
  'glp1-sema': ['0.25', '0.5', '1', '1.7', '2.4'],
  'glp1-tirzep': ['2.5', '5', '7.5', '10', '12.5', '15'],
  'glp1-reta': ['2', '4', '8', '12'],
};
export const isGlp1Encounter = (encounterId: string): boolean => encounterId.startsWith('g1-');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
// Display only: a lookup failure falls back to showing every list; decide() stays the gate.
export async function lookupSku(contactId: string, encounterId: string): Promise<string | undefined> {
  try {
    const r = await ddb.send(new GetCommand({ TableName: process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords', Key: { contactId, sk: `encounter#${encounterId}` } }));
    return r.Item?.sku ? String(r.Item.sku) : undefined;
  } catch {
    return undefined;
  }
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const dosePicker = (sku?: string): string => {
  const opt = (d: string) => `<option value="${d} mg">${d} mg</option>`;
  const body = DOSES[sku ?? '']
    ? DOSES[sku!]!.map(opt).join('')
    : Object.entries(DOSES).map(([k, v]) => `<optgroup label="${esc(k)}">${v.map(opt).join('')}</optgroup>`).join('');
  return `<p><label>Weekly dose <select name="dose" required><option value="">Choose a dose</option>${body}<option value="other">Other (type it)</option></select></label></p>` +
    `<p><label>If Other, type the dose <input type="text" name="dose_other" maxlength="60"></label></p>`;
};

// Form → dose string ('' when none chosen). "other" uses the typed text.
export const doseFromForm = (form: URLSearchParams): string => {
  const v = (form.get('dose') ?? '').trim();
  return (v === 'other' ? (form.get('dose_other') ?? '') : v).trim().slice(0, 60);
};
