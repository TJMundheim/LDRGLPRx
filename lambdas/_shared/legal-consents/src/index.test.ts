import { describe, it, expect } from 'vitest';
import { CONSENT_NPP_V1, CONSENT_PHI_AUTH_V1 } from '@my4mlife/patient-record';
import {
  buildSignedConsents, copyEmailHtml, LEGAL_VERSION, LEGAL_EFFECTIVE, NPP_HTML, PATIENT_AUTH_HTML,
} from './index';

describe('legal text', () => {
  it('exports the locked version, effective date and non-empty documents', () => {
    expect(LEGAL_VERSION).toBe('2026-09');
    expect(LEGAL_EFFECTIVE).toBe('September 1, 2026');
    expect(NPP_HTML).toContain('Notice of Privacy Practices');
    expect(PATIENT_AUTH_HTML).toContain('Authorization for Use and Disclosure');
  });
});

describe('buildSignedConsents', () => {
  const input = { typedName: 'Jane Doe', at: '2026-10-15T12:00:00.000Z', ip: '203.0.113.9', userAgent: 'UA/1' };

  it('returns npp + phi in the stored SignedConsent shape', () => {
    const { npp, phi } = buildSignedConsents(input);
    expect(npp).toEqual({
      version: CONSENT_NPP_V1, legalVersion: LEGAL_VERSION, at: input.at,
      typedName: 'Jane Doe', ip: '203.0.113.9', userAgent: 'UA/1',
    });
    expect(phi).toEqual({ ...npp, version: CONSENT_PHI_AUTH_V1 });
  });

  it('uses the expected version strings', () => {
    const { npp, phi } = buildSignedConsents(input);
    expect(npp.version).toBe('consent-npp-v1');
    expect(phi.version).toBe('consent-phi-auth-v1');
  });

  it('omits ip/userAgent from the JSON when not given', () => {
    const { npp } = buildSignedConsents({ typedName: 'A B', at: 'x' });
    expect(JSON.parse(JSON.stringify(npp))).toEqual({
      version: CONSENT_NPP_V1, legalVersion: LEGAL_VERSION, at: 'x', typedName: 'A B',
    });
  });

  it('returns independent objects', () => {
    const { npp, phi } = buildSignedConsents(input);
    expect(npp).not.toBe(phi);
  });
});

describe('copyEmailHtml', () => {
  it('includes both documents, escapes names, and carries the signature line', () => {
    const html = copyEmailHtml('A <b>', 'Jane "J" Doe', '2026-10-15T12:00:00.000Z');
    expect(html).toContain('Hello A &lt;b&gt;');
    expect(html).toContain('Jane &quot;J&quot; Doe');
    expect(html).toContain(NPP_HTML);
    expect(html).toContain(PATIENT_AUTH_HTML);
    expect(html).toContain("Don't lose your identity");
  });
});
