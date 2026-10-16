import { describe, it, expect } from 'vitest';
import {
  ENCOUNTER_STATES,
  TERMINAL_STATES,
  canTransition,
  forcedVisitType,
  encounterSk,
  auditSk,
  RECORD_SK,
  CONSENT_NPP_V1,
  CONSENT_PHI_AUTH_V1,
  hasProviderConsents,
  signedConsentLine,
  type EncounterState,
} from './index.js';

describe('canTransition', () => {
  it('allows the immediate forward step', () => {
    expect(canTransition('new', 'coordinator-reviewed')).toBe(true);
    expect(canTransition('coordinator-reviewed', 'sent-to-provider')).toBe(true);
    expect(canTransition('sent-to-provider', 'script-written')).toBe(true);
    expect(canTransition('script-written', 'fulfilled')).toBe(true);
  });

  it('rejects skipping ahead on the linear path', () => {
    expect(canTransition('new', 'script-written')).toBe(false);
    expect(canTransition('new', 'sent-to-provider')).toBe(false);
    expect(canTransition('new', 'fulfilled')).toBe(false);
  });

  it('allows declining from every non-terminal state', () => {
    const nonTerminal = ENCOUNTER_STATES.filter(
      (s) => !(TERMINAL_STATES as readonly EncounterState[]).includes(s),
    );
    for (const state of nonTerminal) {
      expect(canTransition(state, 'declined')).toBe(true);
    }
  });

  it('allows reopening a declined encounter to new', () => {
    expect(canTransition('declined', 'new')).toBe(true);
  });

  it('declined may not transition to anything other than new', () => {
    expect(canTransition('declined', 'coordinator-reviewed')).toBe(false);
    expect(canTransition('declined', 'sent-to-provider')).toBe(false);
    expect(canTransition('declined', 'script-written')).toBe(false);
    expect(canTransition('declined', 'fulfilled')).toBe(false);
    expect(canTransition('declined', 'declined')).toBe(false);
  });

  it('fulfilled is fully terminal — no outgoing transitions', () => {
    expect(canTransition('fulfilled', 'new')).toBe(false);
    for (const to of ENCOUNTER_STATES) {
      expect(canTransition('fulfilled', to)).toBe(false);
    }
  });

  it('forbids self-transitions', () => {
    expect(canTransition('new', 'new')).toBe(false);
    for (const s of ENCOUNTER_STATES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it('forbids backward transitions', () => {
    expect(canTransition('coordinator-reviewed', 'new')).toBe(false);
    expect(canTransition('script-written', 'sent-to-provider')).toBe(false);
  });
});

describe('forcedVisitType', () => {
  it('forces audio-visual only for testosterone-ed', () => {
    expect(forcedVisitType('testosterone-ed')).toBe('audio-visual');
  });

  it('forces audio-visual for menopause-hrt', () => {
    expect(forcedVisitType('menopause-hrt')).toBe('audio-visual');
  });

  it('defaults gh-peptide to async', () => {
    expect(forcedVisitType('gh-peptide')).toBe('async');
  });

  it('defaults everything else to async', () => {
    expect(forcedVisitType('glp1')).toBe('async');
    expect(forcedVisitType('gut')).toBe('async');
  });
});

describe('dynamodb key helpers', () => {
  it('builds the record sort key', () => {
    expect(RECORD_SK).toBe('record');
  });

  it('builds an encounter sort key', () => {
    expect(encounterSk('abc')).toBe('encounter#abc');
  });

  it('builds a zero-padded audit sort key', () => {
    expect(auditSk('2026-06-26T00:00:00.000Z', 1)).toBe(
      'audit#2026-06-26T00:00:00.000Z#0001',
    );
  });
});

describe('consent constants', () => {
  it('exposes the locked consent version ids', () => {
    expect(CONSENT_NPP_V1).toBe('consent-npp-v1');
    expect(CONSENT_PHI_AUTH_V1).toBe('consent-phi-auth-v1');
  });
});

describe('hasProviderConsents', () => {
  it('returns false when consents is undefined', () => {
    expect(hasProviderConsents(undefined)).toBe(false);
  });

  it('returns false when consents is empty', () => {
    expect(hasProviderConsents({})).toBe(false);
  });

  it('returns false when only one of the two required consents is present', () => {
    expect(hasProviderConsents({ [CONSENT_NPP_V1]: { agreed: true } })).toBe(false);
    expect(hasProviderConsents({ [CONSENT_PHI_AUTH_V1]: { agreed: true } })).toBe(false);
  });

  it('returns true when both required consents are present', () => {
    expect(
      hasProviderConsents({
        [CONSENT_NPP_V1]: { agreed: true },
        [CONSENT_PHI_AUTH_V1]: { agreed: true },
      }),
    ).toBe(true);
  });

  it('ignores unrelated consent keys', () => {
    expect(
      hasProviderConsents({
        'some-other-consent': { agreed: true },
        [CONSENT_NPP_V1]: { agreed: true },
        [CONSENT_PHI_AUTH_V1]: { agreed: true },
      }),
    ).toBe(true);
  });
});

describe('signedConsentLine', () => {
  const at = '2026-10-15T23:30:00.000Z'; // 6:30 PM Central, same calendar day
  const s = (name: string) => JSON.stringify({ typedName: name, at });

  it('names the typed name and the Central date when both consents are signed (JSON strings or objects)', () => {
    const line = 'Privacy notice acknowledged + Authorization signed \u2014 Jane Q Doe, Oct 15, 2026';
    expect(signedConsentLine({ [CONSENT_NPP_V1]: s('Jane Q Doe'), [CONSENT_PHI_AUTH_V1]: s('Jane Q Doe') })).toBe(line);
    expect(signedConsentLine({
      [CONSENT_NPP_V1]: { typedName: 'Jane Q Doe', at }, [CONSENT_PHI_AUTH_V1]: { typedName: 'Jane Q Doe', at },
    })).toBe(line);
  });

  it('says not recorded when either consent is missing or unreadable', () => {
    const none = 'Privacy notice/Authorization: not recorded';
    expect(signedConsentLine(undefined)).toBe(none);
    expect(signedConsentLine({})).toBe(none);
    expect(signedConsentLine({ [CONSENT_NPP_V1]: s('A B') })).toBe(none);
    expect(signedConsentLine({ [CONSENT_NPP_V1]: 'not json', [CONSENT_PHI_AUTH_V1]: s('A B') })).toBe(none);
  });
});
