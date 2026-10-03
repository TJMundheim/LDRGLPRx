// /api/push-patch-decision — physician Approve / Decline, two-step.
// GET ?t=<token>  → confirm page only (NO side effects). Email link scanners (Outlook Safe Links,
//                   Gmail previews, corporate gateways) prefetch GET links; a GET must never act.
// POST t=<token>  → the confirm page's form submit performs the decision.
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { verifyToken } from './sign';
import { decide } from '@my4mlife/push-patch-decision-core';
import { pages } from './pages';

type Res = { statusCode: number; headers: Record<string, string>; body: string };
type Evt = {
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: { http?: { method?: string } };
  body?: string | null;
  isBase64Encoded?: boolean;
};
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

function formToken(e: Evt): string | undefined {
  if (!e.body) return undefined;
  const raw = e.isBase64Encoded ? Buffer.from(e.body, 'base64').toString('utf8') : e.body;
  return new URLSearchParams(raw).get('t') ?? undefined;
}

export const handler = async (event: Evt): Promise<Res> => {
  try {
    const isPost = event.requestContext?.http?.method === 'POST';
    const token = isPost ? formToken(event) : event.queryStringParameters?.['t'];
    if (!token) return html(403, pages.invalid());
    const key = await hmacKey();
    let claim;
    try {
      claim = verifyToken(token, key);
    } catch {
      return html(403, pages.invalid());
    }
    if (!isPost) return html(200, pages.confirm(claim.action, token));
    const out = await decide({ ...claim, decidedBy: 'physician-link' });
    if (out.kind === 'not-found') return html(403, pages.invalid());
    if (out.kind === 'already-decided') return html(200, pages.decided(out.state));
    if (out.kind === 'approved') return html(200, out.mailOk ? pages.approved() : pages.approvedMailFailed());
    return html(200, out.mailOk ? pages.declined() : pages.declinedMailFailed());
  } catch (e) {
    console.error('push-patch-decision failed', (e as Error).name); // no PHI: error class only
    return html(500, pages.error());
  }
};
