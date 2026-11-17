// Tests against the REAL template (docs/legal), unlike the other tests which use a small fixture.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fillAgreement, parseVersion } from './agreement';
import { partnerVars } from './handler';

const real = readFileSync(resolve(__dirname, '../../../docs/legal/My_4M_Life_Partner_Agreement.md'), 'utf8');
const fx = (n: string) => readFileSync(resolve(__dirname, `fixtures/${n}`), 'utf8');
const AT = '2026-10-31T15:00:00Z';
const P = (clientDiscount: string, commission: string, extra: object = {}) =>
  ({ code: 'GLOW', business: 'Glow Spa', email: 'j@g.com', clientDiscount, commission, ...extra });
const render = (p: any) => fillAgreement(real, partnerVars(p, { name: 'Jane Doe', title: 'Owner', business: 'Glow Spa', at: AT }));

// What PA-2026-10 text becomes under the entity rename + version bump only.
const migrate = (old: string) => old
  .replace('PA-2026-10', 'PA-2026-11')
  .replace('between My 4M Life ("My 4M Life,"', 'between My4MLIFE LLC ("My4MLife,"')
  .replace('**My 4M Life and', '**My4MLIFE LLC and')
  .replace('**MY 4M LIFE**', '**MY4MLIFE LLC**')
  .replace(/My 4M Life/g, 'My4MLife');

describe('real agreement PA-2026-11', () => {
  it('is version PA-2026-11 with the entity renamed everywhere', () => {
    expect(parseVersion(real)).toBe('PA-2026-11');
    expect(real).not.toMatch(/My 4M Life/i);
    expect(real).toContain('My4MLIFE LLC');
  });
  it.each([['50', '$150'], ['100', '$100']])('renders $%s-off identically to PA-2026-10 apart from rename + version', (d, c) => {
    expect(render(P(d, c.slice(1)))).toBe(migrate(fx(`pa-2026-10-discount${d}.txt`)));
  });
  it('renders the no-discount partner with full price, no $0, and the metadata link', () => {
    const t = render(P('0', '200', { code: 'HERITAGE', business: 'Heritage Personal Training', link: 'https://www.my4mlife.com/heritage' }));
    expect(t).toContain('None. Your clients pay full price.');
    expect(t).toContain('There is no client discount or code to enter.');
    expect(t).toContain('Wherever this Agreement says "link or code," it means your link');
    expect(t).toContain('https://www.my4mlife.com/heritage');
    expect(t).toContain('$200');
    expect(t).not.toContain('$0');
    expect(t).not.toContain('applied automatically');
    expect(t).not.toMatch(/My 4M Life/);
  });
});
