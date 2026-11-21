import { describe, it, expect } from 'vitest';
import { composeSpeakingConfirmation as compose } from './speaking-confirmation';

const full = { name: 'Pat Lee', organization: 'Rotary Austin', eventType: 'Keynote', preferredDates: 'March 12 or 19' };
const ID = "Don't lose your identity and your dignity while you still have a choice.";

describe('composeSpeakingConfirmation', () => {
  it('has the fixed subject, greeting, two-business-day promise, assessment link and sign-off', () => {
    const r = compose(full);
    expect(r.subject).toBe('Your speaking request');
    for (const s of ['Hi Pat,', 'Thank you for thinking of me for Rotary Austin.', 'within two business days', 'https://www.my4mlife.com/assessment', 'Dr. TJ', ID]) {
      expect(r.text).toContain(s);
    }
    expect(r.html).toContain('https://www.my4mlife.com/assessment');
    expect(r.html).toContain(`<em>${ID}</em>`);
  });

  it('includes dates when given, trimmed to 200 chars, and omits otherwise', () => {
    expect(compose(full).text).toContain('Dates you mentioned: March 12 or 19.');
    expect(compose({ ...full, preferredDates: 'x'.repeat(500) }).text).toContain(`Dates you mentioned: ${'x'.repeat(200)}.`);
    expect(compose({ ...full, preferredDates: 'x'.repeat(500) }).text).not.toContain('x'.repeat(201));
    expect(compose({ name: 'Pat' }).text).not.toContain('Dates you mentioned');
  });

  it('degrades gracefully without name or organization', () => {
    const t = compose({}).text;
    expect(t).toContain('Hi,');
    expect(t).toContain('Thank you for thinking of me.');
    expect(t).not.toContain('undefined');
  });

  it('escapes html in the html version only', () => {
    const r = compose({ ...full, organization: '<b>X</b>', preferredDates: '<i>d</i>' });
    expect(r.html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(r.html).toContain('&lt;i&gt;d&lt;/i&gt;');
    expect(r.html).not.toContain('<b>X</b>');
  });

  it('never includes an @my4mlife.com address', () => {
    const r = compose(full);
    expect(r.text + r.html).not.toContain('@my4mlife.com');
  });
});
