import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const upsertContact = vi.fn();
vi.mock('../../../../lambdas/_shared/contact-upsert/src/index', () => ({
  upsertContact: (...args: unknown[]) => upsertContact(...args),
}));

const sesMock = mockClient(SESv2Client);
const { handler } = await import('../lambdas/lead-capture/send-app-link.js');

const call = (body: unknown) => handler({ body: JSON.stringify(body) });

beforeEach(() => {
  sesMock.reset();
  sesMock.on(SendEmailCommand).resolves({ MessageId: 'm1' });
  upsertContact.mockReset();
  upsertContact.mockResolvedValue(undefined);
});

describe('send-app-link Contact capture', () => {
  it('upserts email with source app-link-request and event, nothing else', async () => {
    const res = await call({ email: 'Lead@Example.com', firstName: 'Lee', source: 'hero' });
    expect(res.statusCode).toBe(200);
    expect(upsertContact).toHaveBeenCalledTimes(1);
    expect(upsertContact.mock.calls[0][1]).toEqual({
      email: 'Lead@Example.com',
      source: 'app-link-request',
      event: { type: 'app-link-request' },
    });
  });

  it('does not upsert for an invalid email', async () => {
    const res = await call({ email: 'nope' });
    expect(res.statusCode).toBe(400);
    expect(upsertContact).not.toHaveBeenCalled();
  });

  it('still sends the email and returns 200 when upsertContact rejects', async () => {
    upsertContact.mockRejectedValue(new Error('ddb down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({ email: 'lead@example.com' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('sent');
    expect(sesMock.commandCalls(SendEmailCommand)).toHaveLength(1);
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('lead@example.com');
    errSpy.mockRestore();
  });
});
