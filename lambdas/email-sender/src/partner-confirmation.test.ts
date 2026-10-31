import { describe, it, expect } from 'vitest';
import { composePartnerConfirmation as compose } from './partner-confirmation';

const full = { name: 'Dana Reyes', businessName: 'Glow IV Bar', discount: '$100' };

describe('composePartnerConfirmation', () => {
  it('has the fixed subject, first-name greeting, personal-review line and sign-off', () => {
    const r = compose(full);
    expect(r.subject).toBe('Your Push Patch partner application');
    for (const s of ['Hi Dana,', 'I review every partner application personally.', 'Dr. TJ']) {
      expect(r.text).toContain(s);
      expect(r.html).toContain(s);
    }
  });

  it('names the business and the chosen client discount, and the $100 commission', () => {
    const t = compose(full).text;
    expect(t).toContain('Glow IV Bar');
    expect(t).toContain('$100 off');
    expect(t).toContain('so you earn $100 on every approved, paid order.');
    expect(compose({ ...full, discount: '$50' }).text).toContain('so you earn $150 on every approved, paid order.');
  });

  it('promises link, code, counter card and one-page guide within two business days', () => {
    const t = compose(full).text;
    expect(t).toContain('Within two business days');
    for (const s of ['your link', 'your code', 'a counter card', 'a one-page guide']) expect(t).toContain(s);
  });

  it('normalizes $50 and omits the discount sentence for anything else', () => {
    expect(compose({ ...full, discount: '50' }).text).toContain('$50 off');
    expect(compose({ ...full, discount: 'whatever' }).text).not.toContain('off for your clients');
  });

  it('degrades gracefully with a blank name and business', () => {
    const t = compose({ discount: '$50' }).text;
    expect(t).toContain('Hi,');
    expect(t).not.toContain('undefined');
  });

  it('escapes html in the html version only', () => {
    const r = compose({ ...full, businessName: '<b>X</b>' });
    expect(r.html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(r.html).not.toContain('<b>X</b>');
  });

  it('never says Genesis, carries no emoji and no identity tagline', () => {
    const r = compose(full);
    expect(r.text + r.html).not.toMatch(/genesis|identity|dignity/i);
    expect(r.text + r.html).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
