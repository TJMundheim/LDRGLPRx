// push-patch-tracking: SES Lambda action -> parse Novo tracking email -> stamp order + email patient (or ask TJ).
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { send } from '@my4mlife/push-patch-decision-core/mailer';
import { blendFor } from '@my4mlife/push-patch-decision-core/blends';
import { composeOnItsWay } from '@my4mlife/push-patch-decision-core/shipping-emails';
import { parseTrackingEmail } from './parse';
import { findCandidates, isKnownTracking, stampTracking, unstampTracking } from './match';
import { failureMail, reviewMail } from './notify';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-2' });

interface SesEvent { Records: Array<{ ses: { mail: { messageId: string; commonHeaders?: { subject?: string } } } }> }

async function run(event: SesEvent): Promise<void> {
  const { mail } = event.Records[0].ses;
  const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.MAIL_BUCKET ?? process.env.INBOUND_BUCKET, Key: `push-patch-tracking/${mail.messageId}` }));
  const parsed = await parseTrackingEmail(await obj.Body!.transformToString());
  if (!parsed.ok) {
    console.log(`tracking: parse-failed ${parsed.reason}`);
    if (parsed.reason !== 'not-supplier') await failureMail(mail.commonHeaders?.subject ?? '(no subject)', parsed.reason);
    return;
  }
  // Same tracking email delivered twice (e.g. Google copies for info@ and drtj@): already stamped, do nothing.
  if (await isKnownTracking(parsed.trackingNumber)) return void console.log('tracking: duplicate');
  const cands = await findCandidates(parsed.firstName, parsed.lastName);
  if (cands.length !== 1) {
    await reviewMail(parsed, cands);
    console.log(`tracking: needs-review candidates=${cands.length}`);
    return;
  }
  const [c] = cands;
  if (!(await stampTracking(c, parsed.trackingNumber, parsed.carrier))) return void console.log('tracking: duplicate');
  const mailBody = composeOnItsWay({ firstName: c.firstName, blendName: blendFor(c.sku).name, trackingNumber: parsed.trackingNumber, carrier: parsed.carrier });
  try {
    await send({ to: c.email, from: 'support', ...mailBody });
  } catch (e) {
    await unstampTracking(c, parsed.trackingNumber); // let the async retry stamp and send again
    throw e;
  }
  console.log('tracking: shipped-email-sent');
}

export const handler = async (event: SesEvent): Promise<void> => {
  try {
    await run(event);
  } catch (e) {
    const name = (e as Error)?.name ?? 'Error';
    console.error(`tracking: failed ${name}`); // no PHI: error class only
    throw new Error(`push-patch-tracking failed (${name})`); // sanitized, so the runtime log carries no PHI
  }
};
