// export-clinical-packet — assembles a clinical packet from a stored PatientRecord
// and returns structured JSON + a signed S3 URL to an HTML summary.
//
// AUTH (two invocation paths):
//   HTTP path  — shared-secret header `x-packet-key` == PACKET_API_KEY (partner API).
//   AppSync path — Cognito group claim; `Admins` group required (admin UI button).
//
// Detection: if `event.arguments` is present AND `event.requestContext` is absent →
// treat as AppSync direct-resolver; otherwise treat as HTTP (API Gateway v2).
//
// NOTE: any future AI summarization must use @aws-sdk/client-bedrock-runtime (Bedrock),
// never @anthropic-ai/sdk directly. No AI in MVP.

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RECORD_SK, encounterSk } from '@my4mlife/patient-record';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';
const BUCKET = process.env.PACKET_BUCKET ?? 'my4mlife-digital-fulfillment';
// Read at request time so tests can set env after module load.
function getPacketApiKey(): string { return process.env.PACKET_API_KEY ?? ''; }

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

const ALLOWED_ORIGINS = new Set([
  'https://my4mlife.com', 'https://www.my4mlife.com', 'https://app.my4mlife.com',
  'http://localhost:4321', 'http://localhost:5173',
]);

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://my4mlife.com';
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'Content-Type,x-packet-key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Vary': 'Origin', 'Content-Type': 'application/json' };
}

function reply(s: number, b: unknown, origin?: string): APIGatewayProxyResultV2 {
  return { statusCode: s, headers: corsHeaders(origin), body: JSON.stringify(b) };
}

/** Compute BMI from history fields. Returns null if either field is missing or zero. */
export function computeBmi(heightIn?: number, weightLb?: number): number | null {
  if (!heightIn || !weightLb) return null;
  return Math.round((703 * weightLb / (heightIn * heightIn)) * 10) / 10;
}

/** Render a deterministic HTML clinical summary from the assembled packet. */
export function renderSummary(packet: ReturnType<typeof assemblePacket>): string {
  const esc = (v: unknown) => String(v ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
  const d = packet.demographics;
  const h = packet.history;
  const rows = (label: string, value: unknown) =>
    `<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#555">${esc(label)}</th><td>${esc(value ?? '—')}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Clinical Packet</title></head><body style="font-family:system-ui,sans-serif;max-width:700px;margin:32px auto;padding:0 20px">
<h1 style="font-size:20px">Clinical Packet — ${esc(d?.firstName)} ${esc(d?.lastName)}</h1>
<p style="color:#888;font-size:12px">contactId: ${esc(packet.contactId)} | encounterId: ${esc(packet.encounterId)} | exported: ${esc(packet.exportedAt)}</p>
<h2 style="font-size:15px;margin-top:24px">Demographics</h2>
<table><tbody>${rows('Email', d?.email)}${rows('Phone', d?.phone)}${rows('DOB', d?.dob)}${rows('Sex', d?.sex)}${rows('State', d?.state)}</tbody></table>
<h2 style="font-size:15px;margin-top:24px">History</h2>
<table><tbody>${rows('Height (in)', h?.heightIn)}${rows('Weight (lb)', h?.weightLb)}${rows('BMI', packet.bmi)}${rows('Medications', (h?.medications ?? []).join(', '))}${rows('Allergies', (h?.allergies ?? []).join(', '))}${rows('Conditions', (h?.conditions ?? []).join(', '))}</tbody></table>
<h2 style="font-size:15px;margin-top:24px">Encounter</h2>
<table><tbody>${rows('Category', packet.category)}${rows('Visit Type', packet.visitType)}${rows('State', packet.state)}</tbody></table>
<h2 style="font-size:15px;margin-top:24px">Screening Answers</h2>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;overflow:auto">${esc(JSON.stringify(packet.screeningAnswers ?? {}, null, 2))}</pre>
<h2 style="font-size:15px;margin-top:24px">Consents</h2>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;overflow:auto">${esc(JSON.stringify(packet.consents ?? {}, null, 2))}</pre>
<p style="color:#888;font-size:11px;margin-top:32px">Card on file: ${packet.cardOnFile ? 'yes' : 'no'} — raw card data never stored here (PCI scope excluded).</p>
</body></html>`;
}

/** Assemble the clinical packet from a record item and encounter item. */
export function assemblePacket(args: {
  contactId: string; encounterId: string; exportedAt: string;
  record: Record<string, unknown>; encounter: Record<string, unknown>;
}) {
  const { contactId, encounterId, exportedAt, record, encounter } = args;
  const history = record['history'] as Record<string, unknown> | undefined;
  const rawCard = record['cardOnFile'] as Record<string, unknown> | undefined;
  // SECURITY: cardOnFile is represented as boolean only — raw card data NEVER included in packet.
  const cardOnFile = !!(rawCard?.paymentMethodId || rawCard?.stripeCustomerId || rawCard?.setupIntentId);
  return {
    contactId, encounterId, exportedAt,
    demographics: record['demographics'] as Record<string, unknown> | undefined,
    bmi: computeBmi(history?.['heightIn'] as number | undefined, history?.['weightLb'] as number | undefined),
    history: { medications: history?.['medications'] as string[] | undefined,
      allergies: history?.['allergies'] as string[] | undefined,
      conditions: history?.['conditions'] as string[] | undefined,
      heightIn: history?.['heightIn'] as number | undefined,
      weightLb: history?.['weightLb'] as number | undefined },
    medications: history?.['medications'] as string[] | undefined,
    allergies: history?.['allergies'] as string[] | undefined,
    conditions: history?.['conditions'] as string[] | undefined,
    screeningAnswers: record['screeningAnswers'] as Record<string, unknown> | undefined,
    consents: record['consents'] as Record<string, unknown> | undefined,
    category: encounter['category'] as string | undefined,
    visitType: encounter['visitType'] as string | undefined,
    state: encounter['state'] as string | undefined,
    cardOnFile,
  };
}

// ---------------------------------------------------------------------------
// Core logic — shared by both invocation paths
// ---------------------------------------------------------------------------

/** Query DDB, assemble the packet, upload HTML to S3, return presigned URL.
 *  Throws with a descriptive message if the record or encounter is not found.
 */
export async function buildAndUpload(
  contactId: string,
  encounterId: string,
): Promise<{ packet: ReturnType<typeof assemblePacket>; summaryUrl: string }> {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'contactId = :cid',
    ExpressionAttributeValues: { ':cid': contactId },
  }));

  const items = result.Items ?? [];
  const recordItem = items.find(i => i['sk'] === RECORD_SK);
  const encounterItem = items.find(i => i['sk'] === encounterSk(encounterId));

  if (!recordItem) throw new Error('patient record not found');
  if (!encounterItem) throw new Error('encounter not found');

  const exportedAt = new Date().toISOString();
  const packet = assemblePacket({ contactId, encounterId, exportedAt, record: recordItem, encounter: encounterItem });
  const html = renderSummary(packet);

  const s3Key = `clinical-packets/${contactId}/${encounterId}.html`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: html, ContentType: 'text/html' }));

  // Presign a GET so the provider can read the uploaded HTML summary (not re-upload it).
  const summaryUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 604800 });

  return { packet, summaryUrl };
}

// ---------------------------------------------------------------------------
// AppSync direct-resolver types
// ---------------------------------------------------------------------------

interface AppSyncEvent {
  arguments: { contactId: string; encounterId: string };
  identity?: {
    groups?: string[];
    claims?: { 'cognito:groups'?: string[] };
    [key: string]: unknown;
  };
}

interface AppSyncResult {
  ok: boolean;
  summaryUrl?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Unified handler
// ---------------------------------------------------------------------------

export const handler = async (
  event: APIGatewayProxyEventV2 | AppSyncEvent,
): Promise<APIGatewayProxyResultV2 | AppSyncResult> => {
  // ── Detection ──────────────────────────────────────────────────────────────
  // AppSync direct-resolver events carry `arguments` but no `requestContext`.
  const isAppSync = 'arguments' in event && !('requestContext' in event);

  // ── AppSync path ───────────────────────────────────────────────────────────
  if (isAppSync) {
    const appsyncEvent = event as AppSyncEvent;
    const groups: string[] =
      appsyncEvent.identity?.groups ??
      appsyncEvent.identity?.claims?.['cognito:groups'] ??
      [];
    if (!groups.includes('Admins')) {
      throw new Error('Unauthorized');
    }

    const { contactId, encounterId } = appsyncEvent.arguments;
    try {
      const { summaryUrl } = await buildAndUpload(contactId, encounterId);
      return { ok: true, summaryUrl };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Not-found and handled errors return ok:false (don't throw — UI shows it).
      return { ok: false, error: msg };
    }
  }

  // ── HTTP path (existing behavior — unchanged) ──────────────────────────────
  const httpEvent = event as APIGatewayProxyEventV2;
  const origin = (httpEvent.headers?.['origin'] ?? httpEvent.headers?.['Origin']) as string | undefined;
  if (httpEvent.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);

  // AUTH: require x-packet-key matching PACKET_API_KEY
  const packetApiKey = getPacketApiKey();
  const key = httpEvent.headers?.['x-packet-key'] ?? httpEvent.headers?.['X-Packet-Key'] ?? '';
  if (!packetApiKey || key !== packetApiKey) return reply(401, { error: 'unauthorized' }, origin);

  if (!httpEvent.body) return reply(400, { error: 'missing body' }, origin);
  let parsed: { contactId?: string; encounterId?: string };
  try { parsed = JSON.parse(httpEvent.body); } catch { return reply(400, { error: 'invalid json' }, origin); }

  const { contactId, encounterId } = parsed;
  if (!contactId || !encounterId) return reply(400, { error: 'contactId and encounterId required' }, origin);

  try {
    const { packet, summaryUrl } = await buildAndUpload(contactId, encounterId);
    return reply(200, { ok: true, packet, summaryUrl }, origin);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('patient record not found')) return reply(404, { error: 'patient record not found' }, origin);
    if (msg.includes('encounter not found')) return reply(404, { error: 'encounter not found' }, origin);
    throw err;
  }
};
