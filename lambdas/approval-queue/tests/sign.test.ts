import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../src/sign.js';

const SECRET = 'test-secret-32-bytes-padded-xxxx';

describe('signToken / verifyToken', () => {
  it('round-trips approve', () => {
    const token = signToken('abc-123', 'approve', SECRET);
    const result = verifyToken(token, SECRET);
    expect(result).toEqual({ approvalId: 'abc-123', action: 'approve' });
  });

  it('round-trips deny', () => {
    const token = signToken('xyz-789', 'deny', SECRET);
    expect(verifyToken(token, SECRET)).toEqual({ approvalId: 'xyz-789', action: 'deny' });
  });

  it('rejects tampered signature', () => {
    const token = signToken('abc-123', 'approve', SECRET);
    // flip last char
    const bad = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(() => verifyToken(bad, SECRET)).toThrow();
  });

  it('rejects wrong secret', () => {
    const token = signToken('abc-123', 'approve', SECRET);
    expect(() => verifyToken(token, 'wrong-secret')).toThrow('invalid token signature');
  });

  it('rejects garbage token', () => {
    expect(() => verifyToken('not-base64!!', SECRET)).toThrow();
  });

  it('rejects token with invalid action', () => {
    // craft a token with an invalid action manually
    const payload = Buffer.from('abc.badaction.fakesig').toString('base64url');
    expect(() => verifyToken(payload, SECRET)).toThrow();
  });
});
