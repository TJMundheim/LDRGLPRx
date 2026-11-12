import { describe, it, expect } from 'vitest';
import { parseTrackingEmail } from './parse';

const UPS = '1Z999AA10123456784';
const bodyText = (n = UPS) => `Please find your UPS tracking number below.\r\n\r\nTracking Number: ${n}\r\nhttps://www.ups.com/track?tracknum=${n}\r\n`;
const fwd = (inner: string) =>
  `---------- Forwarded message ---------\r\nFrom: Daniela <orders@regenerativekits.com>\r\nSubject: TRACKING - Jane Testcase\r\n\r\n${inner}`;

function msg(opts: { subject?: string; from?: string; headers?: string; body: string }) {
  const { subject = 'FW: TRACKING - Jane Testcase', from = 'ORDERS@NOVO <orders@novobioalliance.com>' } = opts;
  return [
    `From: ${from}`, 'To: tracking@inbox.my4mlife.com', `Subject: ${subject}`,
    'Date: Thu, 12 Nov 2026 10:00:00 -0600', 'MIME-Version: 1.0',
    opts.headers ?? 'Content-Type: text/plain; charset=UTF-8', '', opts.body,
  ].join('\r\n');
}
const plain = (o: Parameters<typeof msg>[0] = { body: fwd(bodyText()) }) => msg(o);

describe('parseTrackingEmail', () => {
  it('parses plain text', async () => {
    expect(await parseTrackingEmail(plain())).toEqual({
      ok: true, firstName: 'Jane', lastName: 'Testcase', trackingNumber: UPS, carrier: 'UPS', fromSupplier: true,
    });
  });
  it('parses quoted-printable HTML only', async () => {
    const html = `<div>Please find your UPS tracking number below.</div><p>Tracking Number: <b>${UPS}</b></p><a href=3D"https://www.ups.com/track?tracknum=3D${UPS}">track</a>`;
    const raw = msg({ headers: 'Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable', body: `<div>From: orders@regenerativekits.com</div>${html}` });
    const r = await parseTrackingEmail(raw);
    expect(r).toMatchObject({ ok: true, trackingNumber: UPS, carrier: 'UPS' });
  });
  it('parses base64', async () => {
    const b64 = Buffer.from(fwd(bodyText())).toString('base64').replace(/(.{76})/g, '$1\r\n');
    const r = await parseTrackingEmail(msg({ headers: 'Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64', body: b64 }));
    expect(r).toMatchObject({ ok: true, trackingNumber: UPS });
  });
  it('handles RE: FW: stacking', async () => {
    const r = await parseTrackingEmail(msg({ subject: 'RE: FW: Fwd: tracking - Jane Testcase', body: bodyText() }));
    expect(r).toMatchObject({ ok: true, firstName: 'Jane', lastName: 'Testcase' });
  });
  it('handles a middle initial', async () => {
    const r = await parseTrackingEmail(msg({ subject: 'FW: TRACKING - Jane Q. Testcase', body: bodyText() }));
    expect(r).toMatchObject({ ok: true, firstName: 'Jane', lastName: 'Testcase' });
  });
  it('handles an en dash and extra spaces', async () => {
    const r = await parseTrackingEmail(msg({ subject: 'FW:   TRACKING  –  Jane   Testcase', body: bodyText() }));
    expect(r).toMatchObject({ ok: true, firstName: 'Jane', lastName: 'Testcase' });
  });
  it('handles an em dash', async () => {
    const r = await parseTrackingEmail(msg({ subject: 'TRACKING — Jane Testcase', body: bodyText() }));
    expect(r).toMatchObject({ ok: true, firstName: 'Jane' });
  });
  it('finds FedEx when FedEx is mentioned', async () => {
    const r = await parseTrackingEmail(msg({ body: 'Your FedEx tracking number is 123456789012 thanks' }));
    expect(r).toMatchObject({ ok: true, carrier: 'FedEx', trackingNumber: '123456789012' });
  });
  it('finds 15-digit FedEx', async () => {
    const r = await parseTrackingEmail(msg({ body: 'FedEx: 123456789012345' }));
    expect(r).toMatchObject({ ok: true, carrier: 'FedEx', trackingNumber: '123456789012345' });
  });
  it('ignores digit runs without FedEx', async () => {
    const r = await parseTrackingEmail(msg({ body: 'Order 123456789012 shipped' }));
    expect(r).toMatchObject({ ok: false });
  });
  it('prefers UPS over FedEx', async () => {
    const r = await parseTrackingEmail(msg({ body: `FedEx 123456789012 and UPS ${UPS}` }));
    expect(r).toMatchObject({ ok: true, carrier: 'UPS', trackingNumber: UPS });
  });
  it('rejects non-supplier senders', async () => {
    const r = await parseTrackingEmail(msg({ from: 'Bob <bob@example.com>', body: bodyText() }));
    expect(r).toEqual({ ok: false, reason: 'not-supplier' });
  });
  it('accepts supplier named only in the forwarded body', async () => {
    const r = await parseTrackingEmail(msg({ from: 'TJ <tj@my4mlife.com>', body: fwd(bodyText()) }));
    expect(r).toMatchObject({ ok: true });
  });
  it('reports a missing tracking number', async () => {
    const r = await parseTrackingEmail(plain({ body: fwd('No number here.') }));
    expect(r).toMatchObject({ ok: false, reason: 'no-tracking' });
  });
  it('reports a missing name', async () => {
    const r = await parseTrackingEmail(msg({ subject: 'FW: Your order', body: bodyText() }));
    expect(r).toMatchObject({ ok: false, reason: 'no-name' });
  });
});
