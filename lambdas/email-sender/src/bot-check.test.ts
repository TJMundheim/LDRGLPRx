import { describe, it, expect } from 'vitest';
import { isBot } from './bot-check';

describe('isBot', () => {
  it('flags a filled honeypot', () => expect(isBot({ hp: 'x', t: 9000 })).toBe(true));
  it('flags a submit faster than 3000ms', () => expect(isBot({ hp: '', t: 2999 })).toBe(true));
  it('passes a human-paced submit', () => expect(isBot({ hp: '', t: 3000 })).toBe(false));
  it('flags a missing or non-numeric timing value', () => {
    expect(isBot({})).toBe(true);
    expect(isBot({ hp: '', t: 'fast' })).toBe(true);
  });
});
