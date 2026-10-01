// GET /api/push-patch-decision?t=<token> — physician one-tap Approve / Decline.
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { verifyToken } from './sign';
import { decide } from './decide';
import { pages } from './pages';

type Res = { statusCode: number; headers: Record<string, string>; body: string };
const html = (statusCode: number, body: string): Res => ({
  statusCode,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  body,
});

const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-2' });
let secret: string | undefined;
async function hmacKey(): Promise<string> {
  if (!secret) {
    const r = await ssm.send(new GetParameterCommand({ Name: 'push-patch-decision-hmac-key', WithDecryption: true }));
    secret = r.Parameter?.Value;
  }
  if (!secret) throw new Error('hmac key missing');
  return secret;
}

export const handler = async (event: { queryStringParameters?: Record<string, string | undefined> | null }): Promise<Res> => {
  try {
    const token = event.queryStringParameters?.['t'];
    if (!token) return html(403, pages.invalid());
    const key = await hmacKey();
    let claim;
    try {
      claim = verifyToken(token, key);
    } catch {
      return html(403, pages.invalid());
    }
    const out = await decide(claim);
    if (out.kind === 'not-found') return html(403, pages.invalid());
    if (out.kind === 'already-decided') return html(200, pages.decided(out.state));
    if (out.kind === 'approved') return html(200, out.mailOk ? pages.approved() : pages.approvedMailFailed());
    return html(200, out.mailOk ? pages.declined() : pages.declinedMailFailed());
  } catch (e) {
    console.error('push-patch-decision failed', (e as Error).name); // no PHI: error class only
    return html(500, pages.error());
  }
};
