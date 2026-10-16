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
