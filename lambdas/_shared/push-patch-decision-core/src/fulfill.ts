// Per-lane fulfillment after an approval claim lands. Push Patch: Genesis order. GLP-1: TJ-only pharmacy order email.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { sendWelcome, sendGlp1Welcome, sendGlp1OrderEmail } from './emails';
import { sendGenesisOrder } from './genesis-order';
import { resolveShip, type OrderInput } from './genesis-form';
import { recordShipment } from './refill-auth';
import { rxProduct } from './rx-products';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-2' }));
const TABLE = process.env.PATIENT_RECORDS_TABLE ?? 'PatientRecords';

// Stamped after the Genesis order (or the TJ-only ACTION NEEDED email) is out. The admin refund refuses
// any encounter carrying genesisOrderSentAt (no refunds once shipped). Never set on decline.
export async function stampGenesisSent(contactId: string, encounterId: string, to: string, toGenesis: boolean): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { contactId, sk: `encounter#${encounterId}` },
    UpdateExpression: `SET genesisOrderSentAt = :now, updatedAt = :now${toGenesis ? ', genesisOrderTo = :to' : ''}`,
    ExpressionAttributeValues: { ':now': now, ...(toGenesis ? { ':to': to } : {}) },
  }));
}

export interface FulfillCtx {
  contactId: string; encounterId: string; enc: any; demo: any; session: any; sku: string; granted: boolean; providerName?: string; dose?: string;
}

export function fulfillPushPatch(c: FulfillCtx): Promise<void>[] {
  const { demo, enc, session, sku } = c;
  const name = `${demo.firstName ?? ''} ${demo.lastName ?? ''}`.trim();
  return [
    sendWelcome(demo.email, demo.firstName ?? '', sku),
    sendGenesisOrder({ signedAt: new Date().toISOString(), testOrder: session.metadata?.test_price === 'true', sku, sessionId: enc.sessionId, clinicianName: c.providerName, name, lastName: demo.lastName ?? '', phone: demo.phone ?? '', ship: resolveShip(enc.shipTo, session.shipping_details as OrderInput['ship']) })
      .then(async (o) => {
        await stampGenesisSent(c.contactId, c.encounterId, o.to, o.toGenesis);
        if (c.granted) { try { await recordShipment(c.contactId, c.encounterId, new Date(), true); } catch { console.error('[decide] record-shipment-failed'); } }
      }),
  ];
}

// GLP-1: nothing goes to a pharmacy or Genesis. TJ places the order by hand; the stamp blocks refunds after that.
export function fulfillGlp1(c: FulfillCtx): Promise<void>[] {
  const { demo, enc, session, sku } = c;
  const product = rxProduct(sku);
  // Auto-ship = the buyer paid through the recurring (subscription-mode) Checkout session.
  const autoShip = session.mode === 'subscription' || session.metadata?.autoShip === 'true';
  return [
    sendGlp1Welcome(demo.email, demo.firstName ?? '', sku),
    sendGlp1OrderEmail({ firstName: demo.firstName ?? '', lastName: demo.lastName ?? '', dob: demo.dob, productName: product?.name ?? sku, dose: c.dose ?? '', phone: demo.phone ?? '',
      ship: resolveShip(enc.shipTo, session.shipping_details as OrderInput['ship']), autoShip, encounterId: c.encounterId })
      .then(async () => {
        await stampGenesisSent(c.contactId, c.encounterId, 'tj', false);
        if (c.granted) { try { await recordShipment(c.contactId, c.encounterId, new Date(), !autoShip, product?.intervalDays); } catch { console.error('[decide] record-shipment-failed'); } }
      }),
  ];
}
