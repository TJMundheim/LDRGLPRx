import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Same SecureString the physician approve/decline links use (created by push-patch-decision's deploy).
const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
let secret: string | undefined;
export async function hmacKey(): Promise<string> {
  if (!secret) {
    const r = await ssm.send(new GetParameterCommand({ Name: process.env.HMAC_PARAM ?? 'push-patch-decision-hmac-key', WithDecryption: true }));
    secret = r.Parameter?.Value;
  }
  if (!secret) throw new Error('hmac key missing');
  return secret;
}
