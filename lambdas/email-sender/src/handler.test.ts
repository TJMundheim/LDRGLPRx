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

const capture = vi.fn();
vi.mock('./form-contact', () => ({ captureFormContact: (...a: unknown[]) => capture(...a), contactDdb: () => ({}) }));

import { handler } from './handler';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  capture.mockReset();
  capture.mockResolvedValue(undefined);
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

describe('form confirmation routing', () => {
  const form = async (formId: string, fields: Record<string, unknown>) => {
    await handler({ kind: 'form', formId, fields }, {} as any, () => {});
    return fetchMock.mock.calls.map((c) => new URLSearchParams(c[1].body as string));
  };

  it('coaching-application: internal relay unchanged, confirmation from Dr. TJ with Reply-To, not generic', async () => {
    const [relay, conf, ...rest] = await form('coaching-application', { email: 'sam@x.com', firstName: 'Sam', goals: ['Energy'], start: 'Next month' });
    expect(rest).toHaveLength(0);
    expect(relay.get('from')).toBe('My4MLife <info@my4mlife.com>');
    expect(relay.get('to')).toBe('tj@x.com');
    expect(relay.get('subject')).toBe('[Form: coaching-application] from sam@x.com');
    expect(conf.get('from')).toBe('Dr. TJ <drtj@my4mlife.com>');
    expect(conf.get('h:Reply-To')).toBe('drtj@my4mlife.com');
    expect(conf.get('to')).toBe('sam@x.com');
    expect(conf.get('subject')).toBe("Your application for The Captain's Table");
    expect(conf.get('html')).toContain('Hi Sam,');
    expect(conf.get('text')).toContain('You said energy matter');
    expect(conf.get('html')).not.toContain('My4MLife care team');
  });

  it('other formIds keep the generic confirmation from the info address', async () => {
    const [relay, conf] = await form('contact', { email: 'sam@x.com' });
    expect(relay.get('to')).toBe('tj@x.com');
    expect(conf.get('from')).toBe('My4MLife <info@my4mlife.com>');
    expect(conf.get('h:Reply-To')).toBeNull();
    expect(conf.get('subject')).toBe("We've received your message — My4MLife");
  });
});

describe('form contact capture wiring', () => {
  it('captures the form before sending, and the notification still sends', async () => {
    await handler({ kind: 'form', formId: 'contact', fields: { email: 'sam@x.com' } }, {} as any, () => {});
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][1]).toMatchObject({ formId: 'contact' });
    expect(fetchMock).toHaveBeenCalled();
  });
  it('does not capture for info/verification sends', async () => {
    await handler({ kind: 'info', to: 'a@b.com', subject: 's', html: 'h' }, {} as any, () => {});
    expect(capture).not.toHaveBeenCalled();
  });
});

describe('newsletter signups send no email', () => {
  it.each(['email-capture:footer', 'email-capture:blog', 'email-capture:'])('formId %s is skipped: no mailgun call, no capture', async (formId) => {
    const out = await handler({ kind: 'form', formId, fields: { email: 'victim@x.com', source: 'footer' } }, {} as any, () => {});
    expect(out).toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
  it('skips over the public HTTP route too (200 with skipped)', async () => {
    const res: any = await handler({ requestContext: {}, body: JSON.stringify({ kind: 'form', formId: 'email-capture:footer', fields: { email: 'v@x.com' } }) }, {} as any, () => {});
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
  it('other formIds are unaffected', async () => {
    await handler({ kind: 'form', formId: 'contact', fields: { email: 'sam@x.com' } }, {} as any, () => {});
    expect(fetchMock).toHaveBeenCalled();
    expect(capture).toHaveBeenCalled();
  });
});
