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
