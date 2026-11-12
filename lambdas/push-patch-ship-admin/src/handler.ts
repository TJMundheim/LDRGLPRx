// /api/push-patch-ship — TJ confirms which order a tracking number belongs to.
// GET shows a confirm page only (link scanners prefetch GETs); POST stamps the order and emails the patient.
import { hmacKey } from './key';
import { verify } from './sig';
import { load, stamp, unstamp } from './store';
import { send } from './mail';
import { confirm, msg } from './pages';
import { composeOnItsWay } from '@my4mlife/push-patch-decision-core/shipping-emails';
import { blendFor } from '@my4mlife/push-patch-decision-core/blends';

type Res = { statusCode: number; headers: Record<string, string>; body: string };
type Evt = { queryStringParameters?: Record<string, string | undefined> | null; requestContext?: { http?: { method?: string } }; body?: string | null; isBase64Encoded?: boolean };
const html = (statusCode: number, body: string): Res => ({ statusCode, body, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
const bad = () => html(403, msg('Link not valid', 'This link is invalid or has expired.'));
const already = (n: string) => html(200, msg(`Already sent: tracking ${n}`, 'Nothing was sent again.'));

export const handler = async (event: Evt): Promise<Res> => {
  try {
    const isPost = event.requestContext?.http?.method === 'POST';
    const raw = isPost ? (event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : (event.body ?? '')) : '';
    const params = isPost ? new URLSearchParams(raw) : new URLSearchParams(event.queryStringParameters as Record<string, string>);
    const link = verify(params, await hmacKey());
    if (!link) return bad();
    const { enc, demo } = await load(link.c, link.s);
    if (!link.s.startsWith('encounter#pp-') || !enc || enc.lane !== 'push-patch' || enc.testOrder) return html(404, msg('Order not found'));
    if (enc.trackingNumber) return already(String(enc.trackingNumber));
    if (enc.state !== 'script-written') return html(409, msg('Not ready to ship', 'This order is not in the approved state.'));
    const first = String(demo.firstName ?? '');
    if (!isPost) {
      const fields = { c: link.c, s: link.s, t: link.t, k: link.k, e: String(link.e), sig: params.get('sig')! };
      return html(200, confirm(`${first} ${String(demo.lastName ?? '').charAt(0)}.`.trim(), fields, link.t));
    }
    if (!(await stamp(link.c, link.s, link.t, link.k, new Date().toISOString()))) {
      return already(String((await load(link.c, link.s)).enc?.trackingNumber ?? link.t));
    }
    const mail = composeOnItsWay({ firstName: first, blendName: blendFor(String(enc.sku ?? '')).name, trackingNumber: link.t, carrier: link.k });
    try {
      await send({ to: String(demo.email), from: 'support', ...mail });
    } catch (e) {
      await unstamp(link.c, link.s, link.t); // so "try the link again" really retries
      throw e;
    }
    return html(200, msg('Sent', 'The on-its-way email is on its way to the patient.'));
  } catch (e) {
    console.error('push-patch-ship-admin failed', (e as Error).name); // no PHI: error class only
    return html(500, msg('Something went wrong', 'Nothing more was done. Try the link again.'));
  }
};
