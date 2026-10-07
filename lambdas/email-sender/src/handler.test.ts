import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: class { send = async (c: { input: { SecretId: string } }) => ({ SecretString: SECRETS[c.input.SecretId] }); },
  GetSecretValueCommand: class { constructor(public input: { SecretId: string }) {} },
}));
const SECRETS: Record<string, string> = {
  'mailgun-api-key': JSON.stringify({ 'mailgun-send-key': 'k' }),
  'mailgun-email-addresses': JSON.stringify({ 'email-info': 'info@my4mlife.com', 'email-verification': 'verify@my4mlife.com' }),
  'form-recipients': JSON.stringify({ default: 'tj@x.com' }),
};

import { handler } from './handler';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: '<id-1>' }), text: async () => '' });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const run = async (payload: Record<string, unknown>) => {
  await handler({ kind: 'info', to: 'pat@x.com', subject: 'Hi', html: '<p>Hi</p>', ...payload }, {} as any, () => {});
  return new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
};

describe('info sender identity', () => {
  it("default: From is the info address and no Reply-To", async () => {
    const p = await run({});
    expect(p.get('from')).toBe('My4MLife <info@my4mlife.com>');
    expect(p.get('h:Reply-To')).toBeNull();
  });

  it("from: 'support' sends as My4MLife Support <support@my4mlife.com> with Reply-To support@my4mlife.com", async () => {
    const p = await run({ from: 'support' });
    expect(p.get('from')).toBe('My4MLife Support <support@my4mlife.com>');
    expect(p.get('h:Reply-To')).toBe('support@my4mlife.com');
  });

  it("from: 'drtj' sends as Dr. TJ <drtj@my4mlife.com> with Reply-To drtj@my4mlife.com", async () => {
    const p = await run({ from: 'drtj' });
    expect(p.get('from')).toBe('Dr. TJ <drtj@my4mlife.com>');
    expect(p.get('h:Reply-To')).toBe('drtj@my4mlife.com');
  });

  it.each(['evil@attacker.com', 'My4MLife <x@y.com>', 'SUPPORT', 'DRTJ', '', 42, null, {}])('ignores non-allowlisted from value %j', async (bad) => {
    const p = await run({ from: bad });
    expect(p.get('from')).toBe('My4MLife <info@my4mlife.com>');
    expect(p.get('h:Reply-To')).toBeNull();
  });

  it.each(['info', 'verification'])('public HTTP route rejects kind %s (no open relay)', async (kind) => {
    const res = await handler({ requestContext: {}, body: JSON.stringify({ kind, to: 'x@evil.com', subject: 's', html: 'h', from: 'support' }) }, {} as any, () => {});
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("from: 'support' on a verification email is ignored (info kind only)", async () => {
    const p = await run({ kind: 'verification', from: 'support' });
    expect(p.get('from')).toBe('My4MLife <verify@my4mlife.com>');
    expect(p.get('h:Reply-To')).toBeNull();
  });
});
