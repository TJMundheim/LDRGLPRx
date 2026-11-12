// Shipping emails: while-you-wait (+2 days) and on-its-way (tracking). Pure composers, no sending.
import { describe, it, expect, vi } from 'vitest';

vi.mock('./mailer', () => ({ send: async () => {} }));

import { composeWhileYouWait, composeOnItsWay, HOWTO_URL } from './shipping-emails';
import { FOOTER } from './emails';

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const SAFE = 'Do not use the patch if you have epilepsy';
const bodyOf = (text: string) => { const [a, rest] = text.split(SAFE); return a + rest.split('\n\n').slice(1).join('\n\n').split(FOOTER)[0]; };
const all = (m: { subject: string; html: string; text: string }) => `${m.subject}\n${m.html}\n${m.text}`;

describe.each([
  ['composeWhileYouWait', () => composeWhileYouWait({ firstName: 'Ronda', blendName: 'Enhanced Glow' })],
  ['composeOnItsWay', () => composeOnItsWay({ firstName: 'Ronda', blendName: 'Enhanced Glow', trackingNumber: '1Z999AA10123456784', carrier: 'UPS' })],
])('%s', (_n, make) => {
  it('returns subject, html and text with first name and blend', () => {
    const m = make();
    expect(m.subject.length).toBeGreaterThan(5);
    for (const part of [m.html, m.text]) {
      expect(part).toContain('Ronda');
      expect(part).toContain('Enhanced Glow');
    }
  });
  it('carries the transactional footer (no tagline) and support contact', () => {
    const m = make();
    expect(m.text).toContain(FOOTER);
    expect(m.text).not.toContain("Don't lose your identity");
    expect(m.text).toContain('support@my4mlife.com');
    expect(m.html).toContain('support@my4mlife.com');
    expect(m.html).toContain('These statements have not been evaluated by the Food and Drug Administration.');
  });
  it('has no Genesis, amazon, guarantee, promo or outcome language', () => {
    const m = make();
    expect(all(m)).not.toMatch(/genesis|amazon\.|guarantee|discount|promo|coupon|coming soon/i);
    expect(all(m)).not.toMatch(/\b\d{2}\s*(-|–|to)\s*\d{2}\b/);
  });
  it('includes the safety line', () => {
    expect(make().text).toContain('Do not use the patch if you have epilepsy or seizures');
  });
  it('never says video, and signs from Dr. TJ and the team', () => {
    const m = make();
    expect(all(m)).not.toMatch(/video/i);
    expect(m.text).toContain('Dr. TJ and the My4MLife team');
  });
  it('features the how-to button, a real list and a body of 130-190 words', () => {
    const m = make();
    expect(m.html).toContain(`<a href="${HOWTO_URL}" style=`);
    expect(m.html).toContain('>See how to get your patch ready</a>');
    expect(m.html).toMatch(/<ul><li>/);
    expect(m.html).not.toMatch(/<p>- /);
    expect(m.text).toContain(`See how to get your patch ready: ${HOWTO_URL}`);
    const n = words(bodyOf(m.text));
    expect(n).toBeGreaterThanOrEqual(130);
    expect(n).toBeLessThanOrEqual(190);
  });
});

describe('composeWhileYouWait', () => {
  const m = composeWhileYouWait({ firstName: 'Ronda', blendName: 'Enhanced Glow' });
  it('says what happens next', () => {
    expect(m.text).toMatch(/tracking email/i);
    expect(m.text).toMatch(/within about a week of approval/);
  });
  it('has a while-you-wait section built from known instructions', () => {
    expect(m.text).toContain('While you wait');
    expect(m.text).toContain('one patch a week, worn for 12 hours');
    expect(m.text).toContain('https://my4mlife.com/go/push-patch#wear');
    expect(HOWTO_URL).toBe('https://my4mlife.com/go/push-patch#wear');
  });
  it('escapes HTML in first name and blend', () => {
    const x = composeWhileYouWait({ firstName: '<b>Ann</b>', blendName: 'A&B' });
    expect(x.html).toContain('&lt;b&gt;Ann&lt;/b&gt;');
    expect(x.html).not.toContain('<b>Ann</b>');
    expect(x.html).toContain('A&amp;B');
    expect(x.text).toContain('<b>Ann</b>');
  });
});

describe('composeOnItsWay', () => {
  it('UPS link is correct in html and text, with a tracking button', () => {
    const m = composeOnItsWay({ firstName: 'Ronda', blendName: 'Enhanced Glow', trackingNumber: '1Z999AA10123456784', carrier: 'UPS' });
    const url = 'https://www.ups.com/track?tracknum=1Z999AA10123456784';
    expect(m.text).toContain(url);
    expect(m.html).toMatch(new RegExp(`<a href="${url.replace(/[?.]/g, '\\$&')}"[^>]*>Track your package</a>`));
    expect(m.html).toContain(`>${url}</a>`);
    expect(m.subject).toBe('Your Push Patch is on its way');
  });
  it('prints the raw tracking number as visible text in html and text', () => {
    const m = composeOnItsWay({ firstName: 'Ronda', blendName: 'Enhanced Glow', trackingNumber: '1Z999AA10123456784', carrier: 'UPS' });
    expect(m.text).toContain('Your UPS tracking number: 1Z999AA10123456784');
    expect(m.html).toContain('Your UPS tracking number: <strong>1Z999AA10123456784</strong>');
    const f = composeOnItsWay({ firstName: 'R', blendName: 'Repair', trackingNumber: '123456789012', carrier: 'FedEx' });
    expect(f.text).toContain('Your FedEx tracking number: 123456789012');
    expect(f.html).toContain('<strong>123456789012</strong>');
  });
  it('escapes the visible tracking number in html', () => {
    const m = composeOnItsWay({ firstName: 'R', blendName: 'Repair', trackingNumber: '<i>1</i>', carrier: 'UPS' });
    expect(m.html).toContain('&lt;i&gt;1&lt;/i&gt;');
    expect(m.html).not.toContain('<i>1</i>');
  });
  it('FedEx link is correct', () => {
    const m = composeOnItsWay({ firstName: 'R', blendName: 'Repair', trackingNumber: '123456789012', carrier: 'FedEx' });
    expect(m.text).toContain('https://www.fedex.com/fedextrack/?trknbr=123456789012');
    expect(m.html).toContain('https://www.fedex.com/fedextrack/?trknbr=123456789012');
  });
  it('URL-encodes the tracking number in the link', () => {
    const m = composeOnItsWay({ firstName: 'R', blendName: 'Repair', trackingNumber: '1Z 9&9?"x', carrier: 'UPS' });
    expect(m.text).toContain('tracknum=1Z%209%269%3F%22x');
    expect(m.html).not.toContain('tracknum=1Z 9');
    expect(m.html).not.toContain('"x"');
  });
  it('mentions the carrier, tracking number and first steps', () => {
    const m = composeOnItsWay({ firstName: 'Ronda', blendName: 'Enhanced Glow', trackingNumber: '1Z999AA10123456784', carrier: 'UPS' });
    expect(m.text).toContain('UPS');
    expect(m.text).toContain('1Z999AA10123456784');
    expect(m.text).toContain('When your box arrives');
    expect(m.text).toContain('https://my4mlife.com/go/push-patch#wear');
    expect(m.text).toMatch(/Before your first patch/);
  });
  it('escapes HTML in first name', () => {
    const x = composeOnItsWay({ firstName: '<b>Ann</b>', blendName: 'Repair', trackingNumber: '1Z1', carrier: 'UPS' });
    expect(x.html).toContain('&lt;b&gt;Ann&lt;/b&gt;');
    expect(x.html).not.toContain('<b>Ann</b>');
  });
  it('rejects an unknown carrier', () => {
    expect(() => composeOnItsWay({ firstName: 'R', blendName: 'Repair', trackingNumber: '1', carrier: 'DHL' as any })).toThrow();
  });
});
