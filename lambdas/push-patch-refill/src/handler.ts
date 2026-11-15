// /api/push-patch-refill: patient reorders a Push Patch box from a signed link.
// GET only renders the page (link scanners prefetch GETs); POST re-verifies the signature, then acts.
import { getRefillAuth, setRefillShipTo, sendRefillChangeReported, blendFor } from '@my4mlife/push-patch-decision-core';
import { hmacKey, verify } from './sig';
import { loadContact } from './contact';
import { createCheckout, priceLabel, type Mode } from './checkout';
import { choose, msg, EXPIRED } from './page';
import { parseAddress, ADDR_FIELDS } from './address';

type Res = { statusCode: number; headers: Record<string, string>; body: string };
type Evt = { queryStringParameters?: Record<string, string | undefined> | null; requestContext?: { http?: { method?: string } }; body?: string | null; isBase64Encoded?: boolean };
const H = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
const html = (statusCode: number, body: string): Res => ({ statusCode, body, headers: { 'content-type': 'text/html; charset=utf-8', ...H } });
const unavailable = () => html(200, msg('Refill not available', 'A refill is not available on this order right now. Reply to your last email from us or write support@my4mlife.com.'));
const log = (outcome: string) => console.log(JSON.stringify({ fn: 'push-patch-refill', outcome })); // outcome code only, no PHI

export const handler = async (event: Evt): Promise<Res> => {
  try {
    const isPost = event.requestContext?.http?.method === 'POST';
    const raw = isPost ? (event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : (event.body ?? '')) : '';
    const p = new URLSearchParams(isPost ? raw : ((event.queryStringParameters ?? {}) as Record<string, string>));
    if (!isPost && p.has('done') && !p.has('sig')) {
      return html(200, p.get('done') === '1' ? msg('Thank you', 'Your payment went through. We will email you when your box ships.') : msg('No charge made', 'Nothing was charged. Use your link again whenever you are ready.'));
    }
    const link = verify(p, await hmacKey());
    if (!link) { log('bad-link'); return html(403, EXPIRED); }
    const found = await getRefillAuth(link.c, link.e), a = found?.auth;
    if (!a || a.status !== 'active' || a.expiresAt <= new Date().toISOString() || a.refillsUsed >= a.refillsAuthorized) { log('not-available'); return unavailable(); }
    const contact = await loadContact(link.c);
    if (!contact) { log('no-contact'); return unavailable(); }
    const hasAuto = !(a.mode === 'auto' && a.subscriptionId);
    const onFile = (a.shipTo ?? (found?.encounter as { shipTo?: { city?: string; state?: string } } | undefined)?.shipTo) ?? {};
    const render = async (status: number, error?: string) => {
      const fields = { c: link.c, e: link.e, exp: String(link.exp), sig: p.get('sig')! };
      const form = isPost ? Object.fromEntries(['mode', 'change', 'addr', ...ADDR_FIELDS].map((k) => [k, p.get(k) ?? ''])) : undefined;
      return html(status, choose({ blend: blendFor(a.sku).name, price: await priceLabel(a.sku, hasAuto ? 'auto' : 'one'), fields, hasAuto, city: onFile.city, state: onFile.state, form, error }));
    };
    if (!isPost) return render(200);
    const mode = p.get('mode') as Mode, change = p.get('change'), addr = p.get('addr');
    if ((mode !== 'auto' && mode !== 'one') || (change !== 'yes' && change !== 'no') || (mode === 'auto' && !hasAuto)) { log('bad-form'); return html(400, msg('Please go back', 'Please choose an option for each question.')); }
    if (change === 'yes') {
      await sendRefillChangeReported({ contactId: link.c, encounterId: link.e });
      log('change-reported');
      return html(200, msg('Thanks', 'Thanks. A care coordinator will reach out before anything ships.'));
    }
    if (addr !== 'yes' && addr !== 'no') { log('bad-form'); return render(400, 'Please tell us whether your shipping address has changed.'); }
    if (addr === 'yes') {
      const s = parseAddress(p);
      if (!s.ok) { log('bad-address'); return render(400, 'Please check your shipping address: full name, street, city, state and a 5-digit ZIP are required.'); }
      await setRefillShipTo(link.c, link.e, s.shipTo); // before checkout: fulfilment reads it when the payment lands
      log('address-updated');
    }
    const url = await createCheckout({ contactId: link.c, encounterId: link.e, sku: a.sku, email: contact.email, partnerRef: a.partnerRef, mode }, link.exp);
    if (!url) { log('no-price'); return html(500, msg('Something went wrong', 'Nothing was charged. Please write support@my4mlife.com.')); }
    log(`checkout-${mode}`);
    return { statusCode: 303, headers: { location: url, ...H }, body: '' };
  } catch (e) {
    console.error('push-patch-refill failed', (e as Error).name); // no PHI: error class only
    return html(500, msg('Something went wrong', 'Nothing was charged. Try your link again, or write support@my4mlife.com.'));
  }
};
