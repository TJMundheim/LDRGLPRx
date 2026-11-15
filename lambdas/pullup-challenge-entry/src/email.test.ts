import { describe, it, expect, beforeEach, vi } from 'vitest';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = invokeMock; constructor(_: any) {} },
  InvokeCommand: class { constructor(public input: any) {} },
}));

import { sendEntrantCode } from './email';
import { notifyTJ } from './notify';

const entry: any = {
  name: 'Jane <b>Doe</b>', email: 'jane@example.com', phone: '+18175550142',
  instagramUrl: 'https://www.instagram.com/p/ABC123/', round: 'start', smsOptIn: false, emailOptIn: true, consentVersion: 'pullup-v2',
};
const payload = (i = 0) => JSON.parse(Buffer.from(invokeMock.mock.calls[i][0].input.Payload).toString());

beforeEach(() => { invokeMock.mockReset(); invokeMock.mockResolvedValue({}); });

describe('sendEntrantCode', () => {
  it('sends from drtj to the entrant with code, consult link and 50%', async () => {
    await sendEntrantCode(entry, 'PULLUP-ABC234');
    const p = payload();
    expect(p).toMatchObject({ kind: 'info', from: 'drtj', to: 'jane@example.com' });
    expect(typeof p.subject).toBe('string');
    expect(p.subject.length).toBeGreaterThan(0);
    for (const f of ['text', 'html']) {
      expect(p[f]).toContain('PULLUP-ABC234');
      expect(p[f]).toContain('https://www.my4mlife.com/consult?lane=peptides&src=pullup');
      expect(p[f]).toContain('50%');
    }
  });
  it('escapes the name in html', async () => {
    await sendEntrantCode(entry, 'PULLUP-ABC234');
    expect(payload().html).not.toContain('<b>Doe</b>');
  });
  it('greets "there" when the first word of the name is not name-like (no links from user input)', async () => {
    await sendEntrantCode({ ...entry, name: 'https://evil.example/x Doe' }, 'PULLUP-ABC234');
    const p = payload();
    expect(p.text.startsWith('Hi there,')).toBe(true);
    expect(p.html).not.toContain('evil.example');
  });
  it('fine print: provider review, provider decides; no "approval"', async () => {
    await sendEntrantCode(entry, 'PULLUP-ABC234');
    const p = payload();
    expect(p.text).toContain("require a provider's review; the provider decides");
    expect(p.text.toLowerCase()).not.toContain('approval');
    expect(p.text).toContain("Don't lose your identity and your dignity while you still have a choice.");
  });
  it('throws when email-sender reports a FunctionError', async () => {
    invokeMock.mockResolvedValue({ FunctionError: 'Unhandled' });
    await expect(sendEntrantCode(entry, 'PULLUP-ABC234')).rejects.toBeTruthy();
  });
});

describe('notifyTJ', () => {
  it('goes to drtj@my4mlife.com and includes the code', async () => {
    await notifyTJ(entry, 'PULLUP-ABC234');
    const p = payload();
    expect(p).toMatchObject({ kind: 'info', from: 'drtj', to: 'drtj@my4mlife.com' });
    expect(p.text).toContain('PULLUP-ABC234');
    expect(p.text).toContain('instagram.com/p/ABC123');
    expect(p.text).not.toContain('Division');
    expect(p.text).not.toMatch(/Age:|Bodyweight/);
  });
  it('says "issue code by hand" when code is null', async () => {
    await notifyTJ(entry, null);
    expect(payload().text).toContain('issue code by hand');
    expect(payload().text).not.toContain('PULLUP-');
  });
});
