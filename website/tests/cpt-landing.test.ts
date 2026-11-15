import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const page = read('../src/pages/cpt.astro');
const comp = read('../src/components/push-patch/PushPatchLanding.astro');
const wrapper = read('../src/pages/go/push-patch.astro');
const mode = read('../src/lib/siteMode.ts');
const config = read('../astro.config.mjs');

describe('/cpt page', () => {
  it('renders PushPatchLanding with the CPT partner', () => {
    expect(page).toContain('PushPatchLanding');
    expect(page).toMatch(/ref:\s*'CPT'/);
    expect(page).toContain("name: 'Colleyville Physical Therapy'");
    expect(page).toContain('https://www.my4mlife.com/cpt');
  });
  it('personalizes the partner with owner details (photo/logo pending)', () => {
    expect(page).toContain("ownerName: 'Rochelle'");
    expect(page).toContain("ownerTitle: 'Owner · Head Personal Trainer, 25 years'");
    expect(page).toContain("location: 'Colleyville, Texas'");
    expect(page).toContain('website/public/images/partners/cpt/rochelle.jpg');
    expect(page).not.toMatch(/^\s*photo:\s*'/m);
  });
  it('is noindex while not approved, gated by SHOW_CPT', () => {
    expect(mode).toMatch(/const CPT_APPROVED = false/);
    expect(mode).toContain('export const SHOW_CPT = CPT_APPROVED ||');
    expect(mode).toContain("PUBLIC_SHOW_CPT === '1'");
    expect(page).toContain('SHOW_CPT');
    expect(page).toContain('noindex');
    expect(config).toContain('SHOW_CPT');
  });
  it('go/push-patch is a thin wrapper', () => {
    expect(wrapper).toContain('PushPatchLanding');
    expect(wrapper.split('\n').length).toBeLessThan(30);
  });
});

describe('PushPatchLanding partner mode', () => {
  it('writes pp-ref storage for the partner (90 days)', () => {
    expect(comp).toContain('partner');
    expect(comp).toMatch(/define:vars=\{\{[^}]*partnerRef/);
    expect(comp).toContain('90 * 864e5');
  });
  it('has the partner band with name and Rochelle', () => {
    expect(comp).toContain('{partner.name} <span aria-hidden="true">×</span> My4MLife');
    expect(comp).toContain('Glade Road');
    expect(comp).toContain('identity and your dignity while you still have a choice.');
    expect(comp).toContain('DRAFT — Rochelle to approve');
    expect(comp).toContain('TODO: Colleyville PT logo when TJ sends it');
  });
  it('renders the editorial personal-recommendation hero', () => {
    expect(comp).toContain('Reserved for clients of {partner.name}');
    expect(comp).toContain('A personal recommendation from {partner.ownerName}');
    expect(comp).toContain('How it works for {partner.name} clients');
    expect(comp).toContain('Choose your blend');
    expect(comp).toContain('A licensed physician reviews your order');
    expect(comp).toContain('nothing ships unless it');
    expect(comp).toContain('Great+Vibes');
    expect(comp).toContain('{partner.ownerTitle}');
    expect(comp).toContain('{partner.location}');
  });
  it('shows a photo when set and an aria-hidden monogram otherwise', () => {
    expect(comp).toContain('partner.photo ?');
    expect(comp).toMatch(/<img[^>]*src=\{partner\.photo\}/);
    expect(comp).toContain('alt={`${partner.ownerName}, ${partner.name}`}');
    expect(comp).toMatch(/class="pp-monogram"[^>]*aria-hidden="true"/);
    expect(comp).toContain('(partner.ownerName ?? partner.name).charAt(0)');
    expect(comp).toContain('partner.logo &&');
  });
  it('does not use discount or efficacy copy in the partner band', () => {
    const band = comp.slice(comp.indexOf('<aside class="pp-partner"'), comp.indexOf('</aside>'));
    expect(band).not.toMatch(/discount|% off|cure|guarantee/i);
  });
  it('uses the care coordinator CTA (no SMS) for both partner and non-partner', () => {
    expect(comp).toContain('Have more questions? Schedule a care coordinator call');
    expect(comp).toContain('/consult?src=${PP_COORD_SRC}');
    expect(comp).toContain("partner ? 'cpt' : 'push-patch'");
    expect(comp).toContain('pp_coordinator_click');
    expect(comp).not.toMatch(/Text Dr\. TJ|PP_SMS|sms:/);
    expect(comp).not.toContain('PromoBanner');
  });
  it('titles the partner page "Push Patch · <partner> × My4MLife" and keeps the default title otherwise', () => {
    expect(comp).toContain('`Push Patch · ${partner.name} × My4MLife`');
    expect(comp).toContain("'Push Patch — Needle-Free Peptides Through the Skin — My4MLife'");
  });
});
