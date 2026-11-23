// Assessment invitation card: welcome only, never on decline.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const sent: any[] = [];
vi.mock('./mailer', () => ({ send: async (m: any) => { sent.push(m); } }));

import { sendWelcome, sendDeclined, sendGlp1Welcome, sendGlp1Declined, buildGlp1OrderEmail } from './emails';

const URL = 'https://my4mlife.com/assessment?src=push-patch-buyer';
const SKU = 'push-patch-bpc-nad-ghk';

beforeEach(() => { sent.length = 0; });

describe('welcome email: assessment invitation card', () => {
  it('html has the heading, body, and a "Take the assessment" button linking to the src-tagged URL', async () => {
    await sendWelcome('j@example.com', 'Jane', SKU);
    const { html } = sent[0];
    expect(html).toContain('Your free MindSpan assessment');
    expect(html).toContain("As a Push Patch customer, you&#39;re invited to take our free 20-question MindSpan assessment.");
    expect(html).toContain('when you finish you get the book, the Logbook and our app, all free.');
    expect(html).toMatch(new RegExp(`<a href="${URL.replace(/[?.]/g, '\\$&')}"[^>]*>Take the assessment</a>`));
  });

  it('text version carries the heading and the URL', async () => {
    await sendWelcome('j@example.com', 'Jane', SKU);
    const { text } = sent[0];
    expect(text).toContain('Your free MindSpan assessment');
    expect(text).toContain(URL);
  });

  it('card sits after the shipping steps and before the support line', async () => {
    await sendWelcome('j@example.com', 'Jane', SKU);
    const { text } = sent[0];
    const i = text.indexOf('Your free MindSpan assessment');
    expect(i).toBeGreaterThan(text.indexOf('You will get a shipping confirmation email'));
    expect(i).toBeLessThan(text.indexOf('Questions? Reply to this email'));
  });

  it('keeps the brand link and uses no Genesis wording', async () => {
    await sendWelcome('j@example.com', 'Jane', SKU);
    expect(sent[0].html).toContain('<a href="https://my4mlife.com/?utm_source=push-patch');
    expect(`${sent[0].text}${sent[0].html}`).not.toMatch(/genesis/i);
  });
});

describe('decline email', () => {
  it('does not contain the assessment invitation', async () => {
    await sendDeclined('j@example.com', 'Jane', SKU);
    const { text, html } = sent[0];
    for (const s of [text, html]) {
      expect(s).not.toContain('src=push-patch-buyer');
      expect(s).not.toContain('MindSpan');
      expect(s).not.toContain('Take the assessment');
    }
  });
});

import { sendRefillShipped, sendRefillNotice, sendRefillPaymentFailed, sendRefillChangeReported } from './emails';

describe('refill emails', () => {
  it('shipped: blend name only, change/cancel instructions, next charge, no genesis/formula', async () => {
    await sendRefillShipped({ to: 'j@example.com', firstName: 'Jane', blendName: 'Repair', refillNumber: 2, refillsAuthorized: 4, nextChargeDate: 'December 27, 2026' });
    const m = sent[0];
    expect(m.subject).toBe('Your next Push Patch box is on its way');
    expect(m.from).toBe('support');
    expect(m.text).toContain('Hi Jane,');
    expect(m.text).toContain('Repair');
    expect(m.text).toContain('2 of 4');
    expect(m.text).toContain('December 27, 2026');
    expect(m.text).toContain('Reply to this email or write to support@my4mlife.com');
    expect(m.text).toContain('The My4MLife team');
    expect(`${m.text}${m.html}`).not.toMatch(/genesis|BPC|NAD\+ \d/i);
  });
  it('shipped: omits next charge when absent', async () => {
    await sendRefillShipped({ to: 'j@example.com', firstName: 'Jane', blendName: 'Repair', refillNumber: 1, refillsAuthorized: 4 });
    expect(sent[0].text).not.toMatch(/next charge/i);
  });
  it('notice to TJ is one line', async () => {
    await sendRefillNotice({ name: 'Jane Doe', blendName: 'Repair', refillNumber: 2, refillsAuthorized: 4, ref: 'in_123' });
    expect(sent[0].to).toBe('drtj@my4mlife.com');
    expect(sent[0].text.trim().split('\n')).toHaveLength(1);
    expect(sent[0].text).toContain('Jane Doe');
    expect(sent[0].text).toContain('2 of 4');
    expect(sent[0].text).toContain('in_123');
  });
  it('notice mentions an updated shipping address, no address text', async () => {
    await sendRefillNotice({ name: 'Jane Doe', blendName: 'Repair', refillNumber: 2, refillsAuthorized: 4, ref: 'in_123', shipToUpdatedAt: '2026-11-20T10:00:00.000Z' });
    expect(sent[0].text).toContain('Shipping address updated 2026-11-20');
    expect(sent[0].text.trim().split('\n')).toHaveLength(1);
  });
  it('payment failed links the hosted invoice', async () => {
    await sendRefillPaymentFailed({ to: 'j@example.com', firstName: 'Jane', hostedInvoiceUrl: 'https://invoice.stripe.com/i/x' });
    expect(sent[0].text).toContain('https://invoice.stripe.com/i/x');
    expect(sent[0].to).toBe('j@example.com');
  });
  it('payment failed, Push Patch copy unchanged when no productName', async () => {
    await sendRefillPaymentFailed({ to: 'j@example.com', firstName: 'Jane', hostedInvoiceUrl: 'https://invoice.stripe.com/i/x' });
    expect(sent[0].subject).toBe("We couldn't process your Push Patch payment");
    expect(sent[0].text).toContain('your next Push Patch box, so it has not shipped yet');
  });
  it('payment failed, manual Rx: product name, Rx footer, no Push Patch/supplement wording', async () => {
    await sendRefillPaymentFailed({ to: 'j@example.com', firstName: 'Jane', hostedInvoiceUrl: 'https://invoice.stripe.com/i/x', productName: 'Gut-Brain Rx' });
    const m = sent[0];
    expect(m.subject).toBe("We couldn't process your Gut-Brain Rx payment");
    expect(m.from).toBe('support');
    expect(m.text).toContain('https://invoice.stripe.com/i/x');
    expect(m.text).toContain('prescription refill from My4MLife');
    expect(m.text).not.toMatch(/Push Patch|Food and Drug|bpc|glutamine|aloe/i);
  });
  it('change reported: ids only', async () => {
    await sendRefillChangeReported({ contactId: 'c1', encounterId: 'pp-cs_1' });
    expect(sent[0].to).toBe('drtj@my4mlife.com');
    expect(sent[0].text).toContain('c1');
    expect(sent[0].text).toContain('pp-cs_1');
    expect(sent[0].text).toMatch(/provider/i);
  });
});

describe('refill reminder emails', () => {
  const LINK = 'https://example.com/r?c=c1&e=e1&exp=1&sig=ab';
  it('reminder 1: subject, copy, one-click button, no PHI beyond first name and blend', async () => {
    const { sendRefillReminder } = await import('./emails');
    await sendRefillReminder({ to: 'j@example.com', firstName: 'Jane', blendName: 'Glow', link: LINK, n: 1 });
    const m = sent[0];
    expect(m.subject).toBe('Time to reorder your Push Patch');
    expect(m.from).toBe('support');
    expect(m.text).toContain("Your last box shipped about 5 weeks ago, so you're about a week from running out.");
    expect(m.text).toContain("Just confirm your health and shipping address haven't changed, then check out.");
    expect(m.text).toContain(LINK);
    const L = LINK.replace(/&/g, '&amp;');
    expect(m.html).toContain(`<a href="${L}">${L}</a>`);
    expect(m.html).not.toMatch(/display:inline-block/);
    expect(m.text).toContain('1205 Hall Johnson Rd, Colleyville, TX 76034');
    expect(m.html).toContain('Prefer it automatic? Choose auto-ship on the next screen.');
  });
  it('reminder 2 subject; re-review links to /go/push-patch', async () => {
    const { sendRefillReminder, sendRefillReReview } = await import('./emails');
    await sendRefillReminder({ to: 'j@example.com', firstName: 'Jane', blendName: 'Glow', link: LINK, n: 2 });
    expect(sent[0].subject).toBe('Reminder: reorder your Push Patch');
    await sendRefillReReview({ to: 'j@example.com', firstName: 'Jane' });
    expect(sent[1].subject).toMatch(/re-review/);
    expect(sent[1].text).toContain('https://my4mlife.com/go/push-patch');
  });
});


describe('manual Rx refill emails (Gut-Brain Rx)', () => {
  it('patient email: preparing, not shipped, no tracking, from support, brand footer, no ingredients', async () => {
    const { sendRefillPreparing } = await import('./emails');
    await sendRefillPreparing({ to: 'b@example.com', firstName: 'Bryan', productName: 'Gut-Brain Rx', refillNumber: 1, refillsAuthorized: 2, nextChargeDate: 'December 20, 2026' });
    const m = sent[sent.length - 1];
    expect(m).toMatchObject({ to: 'b@example.com', from: 'support', subject: "We're preparing your Gut-Brain Rx refill" });
    expect(m.text).toContain("We're preparing your Gut-Brain Rx refill");
    expect(m.text).toContain('refill 1 of 2');
    expect(m.text).toContain('December 20, 2026');
    expect(m.text).toContain('1205 Hall Johnson Rd');
    expect(m.text).not.toMatch(/on its way|tracking number|Push Patch|bpc|glutamine|aloe/i);
  });
  it('TJ action email: subject, full name, phone, address; no health text', async () => {
    const { buildManualRefillOrderEmail } = await import('./emails');
    const m = buildManualRefillOrderEmail({ productName: 'Gut-Brain Rx', firstName: 'Bryan', lastName: 'Shoemaker', phone: '555-0100', refillNumber: 1, refillsAuthorized: 2, ref: 'in_9',
      shipTo: { name: 'Bryan Shoemaker', line1: '1 Main St', line2: 'Apt <2>', city: 'Austin', state: 'TX', postalCode: '78701' } });
    expect(m.subject).toBe('[ACTION NEEDED] Place pharmacy order: Bryan S., Gut-Brain Rx refill 1 of 2');
    for (const s of ['Bryan Shoemaker', '555-0100', '1 Main St', 'Austin, TX 78701', 'in_9']) expect(m.text).toContain(s);
    expect(m.html).toContain('Apt &lt;2&gt;');
    expect(m.text).not.toMatch(/bpc|glutamine|aloe/i);
  });
  it('TJ action email flags a missing address', async () => {
    const { buildManualRefillOrderEmail } = await import('./emails');
    const m = buildManualRefillOrderEmail({ productName: 'Gut-Brain Rx', firstName: 'Bryan', lastName: 'Shoemaker', phone: '', refillNumber: 2, refillsAuthorized: 2, ref: 'in_9' });
    expect(m.text).toMatch(/NO ADDRESS ON FILE/);
  });
  it('reminders: Push Patch copy unchanged; manual copy says Gut-Brain Rx and uses weeks from days', async () => {
    const { sendRefillReminder, sendRefillReReview } = await import('./emails');
    await sendRefillReminder({ to: 'j@example.com', firstName: 'Jane', blendName: 'Glow', link: 'https://x/y', n: 1 });
    expect(sent[sent.length - 1].subject).toBe('Time to reorder your Push Patch');
    await sendRefillReminder({ to: 'b@example.com', firstName: 'Bryan', blendName: 'Gut-Brain Rx', link: 'https://x/y', n: 1, productName: 'Gut-Brain Rx', intervalDays: 30 });
    const a = sent[sent.length - 1];
    expect(a.subject).toBe('Time to reorder your Gut-Brain Rx');
    expect(a.text).toContain('Gut-Brain Rx');
    expect(a.text).not.toMatch(/Push Patch|5 weeks/);
    await sendRefillReminder({ to: 'b@example.com', firstName: 'Bryan', blendName: 'Gut-Brain Rx', link: 'https://x/y', n: 2, productName: 'Gut-Brain Rx', intervalDays: 30 });
    expect(sent[sent.length - 1].subject).toBe('Reminder: reorder your Gut-Brain Rx');
    await sendRefillReReview({ to: 'b@example.com', firstName: 'Bryan', productName: 'Gut-Brain Rx' });
    const r = sent[sent.length - 1];
    expect(r.text).toContain('Gut-Brain Rx');
    expect(r.text).not.toMatch(/go\/push-patch|Push Patch/);
  });
});

describe('GLP-1 emails', () => {
  it('welcome: physicians network, ships after pharmacy fills, tracking, brand; no Push Patch, no named physician, from support', async () => {
    await sendGlp1Welcome('j@example.com', 'Jane', 'glp1-sema');
    const m = sent[0];
    expect(m.from).toBe('support');
    expect(m.text).toContain("our network's licensed physicians");
    expect(m.text).toMatch(/ships after the pharmacy fills/i);
    expect(m.text).toMatch(/tracking/i);
    expect(m.text).toContain('GLP-1 · Sema (semaglutide)');
    expect(m.text).toContain('My4MLife');
    expect(m.text).not.toMatch(/push patch|genesis|\bDr\./i);
  });
  it('decline: GLP-1 wording, refund within 10 business days, no Push Patch', async () => {
    await sendGlp1Declined('j@example.com', 'Jane', 'glp1-reta');
    expect(sent[0].subject).toMatch(/GLP-1/);
    expect(sent[0].text).toContain('10 business days');
    expect(sent[0].text).not.toMatch(/push patch/i);
  });
  it('TJ order email: subject + full details', () => {
    const e = buildGlp1OrderEmail({ firstName: 'Jane', lastName: 'Doe', dob: '1980-01-02', productName: 'GLP-1 · Sema (semaglutide)', dose: '0.5 mg', phone: '555-1',
      ship: { name: 'Jane Doe', address: { line1: '1 A St', city: 'Austin', state: 'TX', postal_code: '78701' } }, autoShip: true, encounterId: 'g1-cs_1' });
    expect(e.subject).toBe('[ACTION NEEDED] Place pharmacy order: Jane D. · GLP-1 · Sema (semaglutide) · 0.5 mg');
    for (const x of ['Jane Doe', '1980-01-02', '0.5 mg', '1 A St', 'Austin, TX 78701', '555-1', 'Auto-ship: yes', 'g1-cs_1']) expect(e.text).toContain(x);
  });
});
