// Clinical packet generation.
//
// The packet renderer lives in ONE place — lambdas/export-clinical-packet. We
// invoke that function rather than duplicating its assembly/HTML, so the
// provider always reads exactly what the "Export clinical packet" button
// produces. It is invoked with its AppSync-shaped event (arguments + identity);
// this Lambda has already enforced the Admins gate before calling.
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const PACKET_FN = process.env.EXPORT_PACKET_FN ?? 'my4mlife-export-clinical-packet';

const lambda = new LambdaClient({ region: REGION });

/** Must stay in step with export-clinical-packet's S3 key layout. */
export function packetKeyFor(contactId: string, encounterId: string): string {
  return `clinical-packets/${contactId}/${encounterId}.html`;
}

export interface PacketResult {
  packetUrl: string;
  packetKey: string;
}

export async function generatePacket(contactId: string, encounterId: string): Promise<PacketResult> {
  const res = await lambda.send(new InvokeCommand({
    FunctionName: PACKET_FN,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({
      arguments: { contactId, encounterId },
      identity: { groups: ['Admins'] },
    })),
  }));

  if (res.FunctionError) throw new Error('packet generation failed');

  const raw = res.Payload ? Buffer.from(res.Payload).toString('utf8') : '';
  let parsed: { ok?: boolean; summaryUrl?: string; error?: string };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error('packet generation returned an unreadable response');
  }
  if (!parsed.ok || !parsed.summaryUrl) {
    throw new Error(parsed.error ? `packet generation failed: ${parsed.error}` : 'packet generation failed');
  }
  return { packetUrl: parsed.summaryUrl, packetKey: packetKeyFor(contactId, encounterId) };
}
