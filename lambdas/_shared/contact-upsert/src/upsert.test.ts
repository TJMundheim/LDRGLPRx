import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { deriveContactId } from '@my4mlife/contact-id';
import { upsertContact, isPlaceholderPhone, PHI_KEYS } from './index';

// Contract: docs/plan/contact-upsert-2026-10-13.md "Helper contract".
// Assumptions the implementer must honour: opts.now is an ISO string (or Date / () => either);
// every write is a lib-dynamodb UpdateCommand sent via ddb.send; opts.table names the table.

const NOW = '2026-10-13T12:00:00.000Z';
const TABLE = 'ContactTest';
const EMAIL = 'Jane.Doe@Example.com ';
const CONTACT_ID = deriveContactId('jane.doe@example.com');

type Input = {
  Key: Record<string, unknown>;
  TableName?: string;
  UpdateExpression: string;
  ConditionExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
};

const send = vi.fn();
const ddb = { send };
const run = (input: Record<string, unknown>) =>
  upsertContact(ddb as never, { source: 'test', ...input } as never, { table: TABLE, now: NOW });

// Asserts a genuine rejection (not the stub's "not implemented").
const rejects = async (p: Promise<unknown>) => {
  const err = await p.then(() => undefined, (e: unknown) => e as Error);
  expect(err, 'expected the call to reject').toBeInstanceOf(Error);
  expect(err!.message).not.toMatch(/not implemented/);
};

const inputs = (): Input[] => send.mock.calls.map((c) => (c[0] as { input: Input }).input);

// --- expression helpers (resolve #aliases so tests don't care about naming style) ---
const resolveNames = (i: Input, expr: string) =>
  expr.replace(/#\w+/g, (n) => i.ExpressionAttributeNames?.[n] ?? n);
const expr = (i: Input) => resolveNames(i, i.UpdateExpression);
const clause = (e: string, kw: 'SET' | 'ADD'): string => {
  const m = e.match(new RegExp(`\\b${kw}\\b([\\s\\S]*?)(?=\\b(?:SET|ADD|REMOVE|DELETE)\\b|$)`));
  return m ? m[1].trim() : '';
};
const splitTop = (s: string): string[] => {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
const setItems = (i: Input) => splitTop(clause(expr(i), 'SET'));
const addItems = (i: Input) => splitTop(clause(expr(i), 'ADD'));
const setRhs = (i: Input, attr: string) =>
  setItems(i).find((s) => new RegExp(`^${attr}\\s*=`).test(s))?.replace(/^[^=]+=\s*/, '');
const addRef = (i: Input, attr: string) =>
  addItems(i).find((s) => new RegExp(`^${attr}\\s`).test(s))?.split(/\s+/)[1];
const val = (i: Input, ref: string | undefined) => (ref ? i.ExpressionAttributeValues?.[ref] : undefined);
const refIn = (rhs: string | undefined) => rhs?.match(/:\w+/g)?.pop();
const setValue = (i: Input, attr: string) => val(i, refIn(setRhs(i, attr)));
const asArr = (v: unknown) => (v instanceof Set ? [...v] : Array.isArray(v) ? v : []);
const first = () => inputs()[0];
const IDENTITY = ['email', 'firstName', 'lastName', 'phone', 'createdAt', 'firstSeenAt', 'firstSource', 'stripeCustomerId'];
const FULL = {
  email: EMAIL, firstName: 'Jane', lastName: 'Doe', phone: '+15125551234', source: 'purchase:x',
  tags: ['gut', 'cys'], skus: ['biome-ns-ultra'], amountUSD: 49, stripeCustomerId: 'cus_123',
};

// --- minimal DynamoDB ConditionExpression evaluator (supports =, <>, IN, AND/OR/NOT, attribute_[not_]exists) ---
function evalCondition(i: Input, current: string | undefined): boolean {
  const src = resolveNames(i, i.ConditionExpression ?? '');
  const toks = src.match(/<>|=|\(|\)|,|:\w+|[A-Za-z_][\w.]*/g) ?? [];
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const operand = (t: string): unknown => (t.startsWith(':') ? i.ExpressionAttributeValues?.[t] : t === 'lifecycleStage' ? current : undefined);
  const or = (): boolean => { let l = and(); while (peek()?.toUpperCase() === 'OR') { next(); const r = and(); l = l || r; } return l; };
  const and = (): boolean => { let l = not(); while (peek()?.toUpperCase() === 'AND') { next(); const r = not(); l = l && r; } return l; };
  const not = (): boolean => { if (peek()?.toUpperCase() === 'NOT') { next(); return !not(); } return atom(); };
  const atom = (): boolean => {
    const t = next();
    if (t === '(') { const v = or(); next(); return v; }
    if (t === 'attribute_not_exists' || t === 'attribute_exists') {
      next(); const a = next(); next();
      const exists = a === 'lifecycleStage' ? current !== undefined : false;
      return t === 'attribute_exists' ? exists : !exists;
    }
    const left = operand(t); const op = next();
    if (op === 'IN') {
      next(); const vals: unknown[] = [];
      while (peek() !== ')') { const x = next(); if (x !== ',') vals.push(operand(x)); }
      next(); return vals.includes(left);
    }
    const right = operand(next());
    if (op === '=') return left === right;
    if (op === '<>') return left !== right;
    throw new Error(`unsupported condition operator: ${op}`);
  };
  return or();
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({});
});

describe('exports', () => {
  it.each(['+10000000000', '+10000000000 ', '0000000000', '+0000000000000', '', '   ', '123', '+1 (512) 555', '555-1234', undefined, null])(
    'isPlaceholderPhone(%j) is true', (p) => { expect(isPlaceholderPhone(p as never)).toBe(true); },
  );
  it.each(['+15125551234', '5125551234', '(512) 555-1234', '+44 20 7946 0958'])(
    'isPlaceholderPhone(%j) is false', (p) => { expect(isPlaceholderPhone(p)).toBe(false); },
  );
  it('PHI_KEYS lists every denylisted key', () => {
    for (const k of ['intakeAnswers', 'answers', 'conditions', 'medications', 'allergies', 'dob', 'sex', 'auditTop3']) {
      expect(PHI_KEYS).toContain(k);
    }
  });
});

describe('key and table', () => {
  it('keys the row on deriveContactId(lowercased, trimmed email) in the given table', async () => {
    await run(FULL);
    expect(first().Key).toEqual({ contactId: CONTACT_ID });
    expect(first().TableName).toBe(TABLE);
  });
  it('same contactId regardless of email casing/whitespace', async () => {
    await run({ email: '  JANE.DOE@EXAMPLE.COM' });
    expect(first().Key).toEqual({ contactId: CONTACT_ID });
  });
  it('stores the normalized (lowercased, trimmed) email', async () => {
    await run(FULL);
    expect(setValue(first(), 'email')).toBe('jane.doe@example.com');
  });
});

describe('identity fields are write-once (if_not_exists only)', () => {
  it.each(IDENTITY)('%s uses if_not_exists on itself', async (attr) => {
    await run(FULL);
    const rhs = setRhs(first(), attr);
    expect(rhs, `${attr} missing from SET`).toBeDefined();
    expect(rhs).toMatch(new RegExp(`if_not_exists\\(\\s*${attr}\\s*,`));
  });
  it('carries the provided identity values', async () => {
    await run(FULL);
    const i = first();
    expect(setValue(i, 'firstName')).toBe('Jane');
    expect(setValue(i, 'lastName')).toBe('Doe');
    expect(setValue(i, 'phone')).toBe('+15125551234');
    expect(setValue(i, 'stripeCustomerId')).toBe('cus_123');
    expect(setValue(i, 'firstSource')).toBe('purchase:x');
    expect(setValue(i, 'createdAt')).toBe(NOW);
    expect(setValue(i, 'firstSeenAt')).toBe(NOW);
  });
  it('omits optional identity fields that were not passed (never writes blanks)', async () => {
    await run({ email: 'a@b.co' });
    const i = first();
    for (const a of ['firstName', 'lastName', 'phone', 'stripeCustomerId']) expect(setRhs(i, a), a).toBeUndefined();
  });
  it('still sets email/createdAt/firstSeenAt/firstSource when only email+source given', async () => {
    await run({ email: 'a@b.co', source: 'newsletter' });
    for (const a of ['email', 'createdAt', 'firstSeenAt', 'firstSource']) expect(setRhs(first(), a), a).toMatch(/if_not_exists/);
  });
  it('never plain-assigns identity fields anywhere in the update', async () => {
    await run(FULL);
    for (const i of inputs()) {
      for (const a of IDENTITY) {
        const rhs = setRhs(i, a);
        if (rhs !== undefined) expect(rhs, a).toMatch(/if_not_exists/);
      }
    }
  });
});

describe('placeholder phones are ignored', () => {
  it.each(['+10000000000', '0000000000', '+0000000000', '12345', ''])('omits phone %j', async (phone) => {
    await run({ email: 'a@b.co', phone });
    expect(setRhs(first(), 'phone')).toBeUndefined();
    expect(Object.values(first().ExpressionAttributeValues ?? {})).not.toContain(phone || '__none__');
  });
  it('keeps a real phone', async () => {
    await run({ email: 'a@b.co', phone: '+15125551234' });
    expect(setValue(first(), 'phone')).toBe('+15125551234');
  });
});

describe('additive set/number fields', () => {
  it('ADDs sources as a string set containing the source', async () => {
    await run(FULL);
    const v = val(first(), addRef(first(), 'sources'));
    expect(v).toBeInstanceOf(Set);
    expect(asArr(v)).toEqual(['purchase:x']);
  });
  it('ADDs tags as a string set', async () => {
    await run(FULL);
    expect(asArr(val(first(), addRef(first(), 'tags'))).sort()).toEqual(['cys', 'gut']);
  });
  it('ADDs skusPurchased from skus as a string set', async () => {
    await run(FULL);
    const v = val(first(), addRef(first(), 'skusPurchased'));
    expect(v).toBeInstanceOf(Set);
    expect(asArr(v)).toEqual(['biome-ns-ultra']);
  });
  it('does not touch tags / skusPurchased when none passed (no empty sets)', async () => {
    await run({ email: 'a@b.co' });
    expect(addRef(first(), 'tags')).toBeUndefined();
    expect(addRef(first(), 'skusPurchased')).toBeUndefined();
    expect(addRef(first(), 'sources')).toBeDefined();
  });
  it('tags / skus / sources are never SET (that would clobber)', async () => {
    await run(FULL);
    for (const a of ['sources', 'tags', 'skusPurchased']) expect(setRhs(first(), a), a).toBeUndefined();
  });
  it('ADDs lifetimeValueUSD when amountUSD > 0', async () => {
    await run(FULL);
    expect(val(first(), addRef(first(), 'lifetimeValueUSD'))).toBe(49);
    expect(setRhs(first(), 'lifetimeValueUSD')).toBeUndefined();
  });
  it.each([0, -5, undefined])('does not touch lifetimeValueUSD when amountUSD is %s', async (amountUSD) => {
    await run({ email: 'a@b.co', amountUSD });
    expect(addRef(first(), 'lifetimeValueUSD')).toBeUndefined();
    expect(setRhs(first(), 'lifetimeValueUSD')).toBeUndefined();
  });
});

describe('lastEvent / updatedAt / consent', () => {
  it('SETs updatedAt to now', async () => {
    await run(FULL);
    expect(setValue(first(), 'updatedAt')).toBe(NOW);
    expect(setRhs(first(), 'updatedAt')).not.toMatch(/if_not_exists/);
  });
  it('SETs lastEvent {type, at, source} from event + source', async () => {
    await run({ ...FULL, event: { type: 'purchase', at: '2026-10-01T00:00:00.000Z' } });
    expect(setValue(first(), 'lastEvent')).toEqual({ type: 'purchase', at: '2026-10-01T00:00:00.000Z', source: 'purchase:x' });
  });
  it('lastEvent.at defaults to now when event.at is omitted', async () => {
    await run({ ...FULL, event: { type: 'signup' } });
    expect(setValue(first(), 'lastEvent')).toEqual({ type: 'signup', at: NOW, source: 'purchase:x' });
  });
  it('still SETs a lastEvent (at=now, source) when no event passed', async () => {
    await run({ email: 'a@b.co', source: 'newsletter' });
    const le = setValue(first(), 'lastEvent') as { at: string; source: string };
    expect(le.at).toBe(NOW);
    expect(le.source).toBe('newsletter');
  });
  it('marketingConsent is absent unless passed', async () => {
    await run(FULL);
    for (const i of inputs()) {
      expect(expr(i)).not.toMatch(/marketingConsent/);
      expect(Object.values(i.ExpressionAttributeValues ?? {}).some((v) => JSON.stringify(v)?.includes('opted_in'))).toBe(false);
    }
  });
  it('SETs marketingConsent when passed', async () => {
    await run({ ...FULL, marketingConsent: { status: 'opted_in', source: 'lead-capture' } });
    const v = setValue(first(), 'marketingConsent') as Record<string, unknown>;
    expect(v).toMatchObject({ status: 'opted_in', source: 'lead-capture' });
  });
  it('SETs an explicit opt-out too', async () => {
    await run({ ...FULL, marketingConsent: { status: 'opted_out', source: 'unsubscribe' } });
    expect(setValue(first(), 'marketingConsent')).toMatchObject({ status: 'opted_out', source: 'unsubscribe' });
  });
});

describe('lifecycle stage', () => {
  it('first UpdateItem sets lifecycleStage via if_not_exists defaulting to lead', async () => {
    await run({ email: 'a@b.co' });
    expect(setRhs(first(), 'lifecycleStage')).toMatch(/if_not_exists\(\s*lifecycleStage\s*,/);
    expect(setValue(first(), 'lifecycleStage')).toBe('lead');
  });
  it('first write has no ConditionExpression', async () => {
    await run({ ...FULL, stage: 'customer' });
    expect(first().ConditionExpression).toBeUndefined();
  });
  it.each([undefined, 'lead'])('stage=%s makes exactly one UpdateItem (no promotion)', async (stage) => {
    await run({ email: 'a@b.co', stage });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each(['protege', 'customer'])('stage=%s adds a second, conditional UpdateItem on the same key', async (stage) => {
    await run({ email: 'a@b.co', stage });
    expect(send).toHaveBeenCalledTimes(2);
    const p = inputs()[1];
    expect(p.Key).toEqual({ contactId: deriveContactId('a@b.co') });
    expect(p.TableName).toBe(TABLE);
    expect(p.ConditionExpression).toBeTruthy();
    expect(setValue(p, 'lifecycleStage')).toBe(stage);
    expect(setRhs(p, 'lifecycleStage')).not.toMatch(/if_not_exists/);
  });
  it('promote call does not repeat the additive writes (no double LTV / sets)', async () => {
    await run({ ...FULL, stage: 'customer' });
    const p = inputs()[1];
    for (const a of ['sources', 'tags', 'skusPurchased', 'lifetimeValueUSD']) expect(addRef(p, a), a).toBeUndefined();
  });

  // Semantic check of the promote ConditionExpression: rank lead < protege < customer, banned untouchable.
  const cases: Array<['protege' | 'customer', Array<[string | undefined, boolean]>]> = [
    ['protege', [[undefined, true], ['lead', true], ['customer', false], ['banned', false]]],
    ['customer', [[undefined, true], ['lead', true], ['protege', true], ['banned', false]]],
  ];
  for (const [target, rows] of cases) {
    for (const [current, allowed] of rows) {
      it(`promote to ${target} ${allowed ? 'is allowed' : 'is blocked'} when current stage is ${current ?? '(missing)'}`, async () => {
        await run({ email: 'a@b.co', stage: target });
        expect(evalCondition(inputs()[1], current)).toBe(allowed);
      });
    }
  }

  it('swallows ConditionalCheckFailedException from the promote call', async () => {
    send.mockResolvedValueOnce({});
    send.mockRejectedValueOnce(new ConditionalCheckFailedException({ message: 'no', $metadata: {} }));
    await expect(run({ email: 'a@b.co', stage: 'customer' })).resolves.not.toThrow();
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('swallows a ConditionalCheckFailed-named error (name-based match)', async () => {
    send.mockResolvedValueOnce({});
    send.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }));
    await expect(run({ email: 'a@b.co', stage: 'protege' })).resolves.not.toThrow();
  });
  it('rethrows any other error from the promote call', async () => {
    send.mockResolvedValueOnce({});
    send.mockRejectedValueOnce(Object.assign(new Error('throttled'), { name: 'ProvisionedThroughputExceededException' }));
    await expect(run({ email: 'a@b.co', stage: 'customer' })).rejects.toThrow('throttled');
  });
  it('rethrows errors from the first write and does not attempt promotion', async () => {
    send.mockRejectedValueOnce(new Error('boom'));
    await expect(run({ email: 'a@b.co', stage: 'customer' })).rejects.toThrow('boom');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not swallow ConditionalCheckFailed from the first write', async () => {
    send.mockRejectedValueOnce(new ConditionalCheckFailedException({ message: 'no', $metadata: {} }));
    await rejects(run({ email: 'a@b.co' }));
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('protege flag (protegeSince, independent of lifecycleStage)', () => {
  it('protege:true sets protegeSince via if_not_exists with now', async () => {
    await run({ email: 'a@b.co', protege: true });
    expect(setRhs(first(), 'protegeSince')).toMatch(/if_not_exists\(\s*protegeSince\s*,/);
    expect(setValue(first(), 'protegeSince')).toBe(NOW);
  });
  it.each([undefined, false])('protege=%s never writes protegeSince', async (protege) => {
    await run({ email: 'a@b.co', protege });
    expect(setRhs(first(), 'protegeSince')).toBeUndefined();
  });
  it('protege:true alone does not promote or change the call count', async () => {
    await run({ email: 'a@b.co', protege: true });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('protege:true with stage customer still writes protegeSince on the first update and promotes to customer', async () => {
    await run({ email: 'a@b.co', protege: true, stage: 'customer' });
    expect(send).toHaveBeenCalledTimes(2);
    expect(setValue(inputs()[0], 'protegeSince')).toBe(NOW);
    expect(setValue(inputs()[1], 'lifecycleStage')).toBe('customer');
    expect(setRhs(inputs()[1], 'protegeSince')).toBeUndefined();
  });
  it('protege:true with stage protege writes both the flag and the promotion', async () => {
    await run({ email: 'a@b.co', protege: true, stage: 'protege' });
    expect(setValue(inputs()[0], 'protegeSince')).toBe(NOW);
    expect(setValue(inputs()[1], 'lifecycleStage')).toBe('protege');
  });
});

describe('PHI denylist', () => {
  const keys = ['intakeAnswers', 'answers', 'conditions', 'medications', 'allergies', 'dob', 'sex', 'auditTop3', 'screening', 'screeningAnswers', 'screeningScore'];
  it.each(keys)('throws when input has %s', async (k) => {
    await rejects(run({ email: 'a@b.co', [k]: { x: 1 } }));
    expect(send).not.toHaveBeenCalled();
  });
  it('throws even when the PHI value is empty/undefined-looking', async () => {
    await rejects(run({ email: 'a@b.co', answers: {} }));
    await rejects(run({ email: 'a@b.co', dob: '' }));
    expect(send).not.toHaveBeenCalled();
  });
  it('does not throw for non-PHI keys like tags/skus/stage', async () => {
    await expect(run({ email: 'a@b.co', tags: ['x'], stage: 'lead' })).resolves.not.toThrow();
  });
});

describe('email validation', () => {
  it.each([undefined, null, '', '   ', 'not-an-email', 'a@', '@b.co', 123])('throws for email %j and writes nothing', async (email) => {
    await rejects(run({ email }));
    expect(send).not.toHaveBeenCalled();
  });
});
