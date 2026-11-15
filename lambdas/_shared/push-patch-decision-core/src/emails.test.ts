// Assessment invitation card: welcome only, never on decline.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const sent: any[] = [];
vi.mock('./mailer', () => ({ send: async (m: any) => { sent.push(m); } }));

import { sendWelcome, sendDeclined } from './emails';

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
    expect(m.html).toMatch(/<a href="[^"]+"[^>]*>Reorder in one click<\/a>/);
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
