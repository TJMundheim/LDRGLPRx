import { describe, expect, it } from 'vitest';
import { fromCognitoUser, fromPatientRecord, fromStripeCustomer, prepare } from './map';

describe('fromStripeCustomer', () => {
  it('maps paid customer with stage customer and splits name', () => {
    expect(fromStripeCustomer({ id: 'cus_1', email: 'A@B.com', name: 'Ann Lee Smith', hasPaid: true })).toEqual({
      email: 'A@B.com', firstName: 'Ann', lastName: 'Lee Smith', stripeCustomerId: 'cus_1',
      source: 'backfill:stripe', stage: 'customer',
    });
  });
  it('omits stage when never paid and never sets amountUSD', () => {
    const r = fromStripeCustomer({ id: 'cus_2', email: 'a@b.com', hasPaid: false });
    expect(r).not.toHaveProperty('stage');
    expect(r).not.toHaveProperty('amountUSD');
    expect(r).not.toHaveProperty('firstName');
  });
});

describe('fromStripeCustomer (guest charge)', () => {
  it('a paid guest charge with no Customer id omits stripeCustomerId', () => {
    expect(fromStripeCustomer({ id: '', email: 'g@h.com', name: 'Gus', hasPaid: true })).toEqual({
      email: 'g@h.com', firstName: 'Gus', source: 'backfill:stripe', stage: 'customer',
    });
  });
});

describe('fromCognitoUser', () => {
  it('maps email, given_name, family_name', () => {
    const u = { Attributes: [{ Name: 'email', Value: 'x@y.com' }, { Name: 'given_name', Value: 'Xi' }, { Name: 'family_name', Value: 'Yu' }, { Name: 'phone_number', Value: '+15125551212' }] };
    expect(fromCognitoUser(u)).toEqual({ email: 'x@y.com', firstName: 'Xi', lastName: 'Yu', source: 'backfill:cognito' });
  });
});

describe('fromPatientRecord', () => {
  it('passes only demographics email/firstName/lastName', () => {
    const item = { contactId: 'c', demographics: { email: 'p@q.com', firstName: 'Pat', lastName: 'Q', phone: '5125551212', dob: '1970-01-01', sex: 'F' }, dob: '1970-01-01' };
    const r = fromPatientRecord(item);
    expect(r).toEqual({ email: 'p@q.com', firstName: 'Pat', lastName: 'Q', source: 'backfill:patient-record' });
    expect(Object.keys(r).sort()).toEqual(['email', 'firstName', 'lastName', 'source']);
  });
  it('tolerates missing demographics', () => {
    expect(fromPatientRecord({ contactId: 'c' }).email).toBe('');
  });
});

describe('prepare', () => {
  const s = 'backfill:stripe';
  it('dedupes by lowercased email and source, keeping the first and filling gaps', () => {
    const { rows } = prepare([
      { email: 'A@b.com', source: s },
      { email: 'a@B.com', source: s, firstName: 'Ann', stage: 'customer' },
      { email: 'a@b.com', source: 'backfill:cognito' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ email: 'a@b.com', source: s, firstName: 'Ann', stage: 'customer' });
  });
  it('drops invalid emails and counts them', () => {
    const r = prepare([{ email: '', source: s }, { email: 'nope', source: s }, { email: 'ok@ok.com', source: s }]);
    expect(r.rows).toHaveLength(1);
    expect(r.invalid).toBe(2);
  });
  it('counts test addresses as skippedTest, not invalid', () => {
    const r = prepare([
      { email: 'me+contactsmoke@gmail.com', source: s }, { email: 'me+captainstest@gmail.com', source: s },
      { email: 'x@example.com', source: s }, { email: 'me+test@gmail.com', source: s }, { email: 'real@ok.com', source: s },
    ]);
    expect(r.skippedTest).toBe(4);
    expect(r.invalid).toBe(0);
    expect(r.rows.map((x) => x.email)).toEqual(['real@ok.com']);
  });
});
