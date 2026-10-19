import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn();
vi.mock('@my4mlife/contact-upsert', () => ({ upsertContact: (...a: unknown[]) => upsert(...a) }));

import { captureFormContact } from './form-contact';

const ddb = { send: vi.fn() };
beforeEach(() => { upsert.mockReset(); upsert.mockResolvedValue(undefined); });

describe('captureFormContact', () => {
  it.each(['coaching-application', 'contact', 'referral', 'request-app-homepage'])(
    'allowlisted %s with a valid email makes one lead upsert',
    async (formId) => {
      const fields = formId === 'referral' ? { referrerEmail: 'a@b.com' } : { email: 'a@b.com' };
      await captureFormContact(ddb, { formId, fields });
      expect(upsert).toHaveBeenCalledTimes(1);
      const input = upsert.mock.calls[0][1];
      expect(input).toMatchObject({ email: 'a@b.com', source: `form:${formId}`, stage: 'lead' });
      expect(input.marketingConsent).toBeUndefined();
    },
  );

  it('passes first/last name and the captains-table tag for coaching, and nothing else', async () => {
    await captureFormContact(ddb, {
      formId: 'coaching-application',
      fields: { firstName: 'Pat', lastName: 'Lee', email: 'pat@x.com', phone: '+15125550100', whyNow: 'private health text', goals: ['x'], location: 'Austin' },
    });
    const input = upsert.mock.calls[0][1];
    expect(input).toEqual({ email: 'pat@x.com', source: 'form:coaching-application', stage: 'lead', firstName: 'Pat', lastName: 'Lee', tags: ['captains-table'] });
  });

  it('splits a single "name" into first and last on the first space', async () => {
    await captureFormContact(ddb, { formId: 'contact', fields: { name: 'Mary Ann van Dyke', email: 'm@x.com', message: 'hi', subject: 's' } });
    expect(upsert.mock.calls[0][1]).toEqual({ email: 'm@x.com', source: 'form:contact', stage: 'lead', firstName: 'Mary', lastName: 'Ann van Dyke' });
  });

  it('single-word name becomes firstName only; no tags for non-coaching forms', async () => {
    await captureFormContact(ddb, { formId: 'request-app-homepage', fields: { firstName: 'Sam', email: 's@x.com', source: 'request-app-homepage' } });
    expect(upsert.mock.calls[0][1]).toEqual({ email: 's@x.com', source: 'form:request-app-homepage', stage: 'lead', firstName: 'Sam' });
  });

  it('referral captures only the submitter (referrerEmail/referrerName)', async () => {
    await captureFormContact(ddb, { formId: 'referral', fields: { referrerName: 'Ann Ray', referrerEmail: 'ann@x.com', code: 'ABC12', link: 'my4mlife.com/ref/ABC12' } });
    expect(upsert.mock.calls[0][1]).toEqual({ email: 'ann@x.com', source: 'form:referral', stage: 'lead', firstName: 'Ann', lastName: 'Ray' });
  });

  it('normalises email case/whitespace', async () => {
    await captureFormContact(ddb, { formId: 'contact', fields: { email: '  Pat@X.com ' } });
    expect(upsert.mock.calls[0][1].email).toBe('pat@x.com');
  });

  it.each([
    ['other formId', { formId: 'consult-intake', fields: { email: 'a@b.com' } }],
    ['questionnaire formId', { formId: 'glp1-questionnaire', fields: { email: 'a@b.com' } }],
    ['missing email', { formId: 'contact', fields: { name: 'x' } }],
    ['invalid email', { formId: 'contact', fields: { email: 'nope' } }],
    ['non-string email', { formId: 'contact', fields: { email: 42 } }],
    ['null fields', { formId: 'contact', fields: null }],
  ])('%s makes no call', async (_n, form) => {
    await captureFormContact(ddb, form as any);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('swallows ddb errors and logs without the email address', async () => {
    upsert.mockRejectedValue(new Error('ddb down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(captureFormContact(ddb, { formId: 'contact', fields: { email: 'secret@x.com' } })).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    expect(JSON.stringify(err.mock.calls)).not.toContain('secret@x.com');
    err.mockRestore();
  });
});
