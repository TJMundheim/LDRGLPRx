import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v5 as uuidv5 } from 'uuid';

const sendMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => sendMock(...args) }) },
  UpdateCommand: class UpdateCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
  QueryCommand: class QueryCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
  GetCommand: class GetCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  },
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const sqsSendMock = vi.fn();
vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: class { send = (...a: any[]) => sqsSendMock(...a); },
  SendMessageCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class { send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

// Cognito is mocked so the UserProfile (Users table) seed path actually runs.
const cognitoSendMock = vi.fn();
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: class { send = (...a: any[]) => cognitoSendMock(...a); },
  AdminGetUserCommand: class { input: any; constructor(i: any) { this.input = i; } },
  AdminCreateUserCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

// Spy on the real helper so tests see both the upsert input and the DDB writes.
vi.mock('@my4mlife/contact-upsert', async (orig) => {
  const actual: any = await orig();
  return { ...actual, upsertContact: vi.fn(actual.upsertContact) };
});

import { upsertContact } from '@my4mlife/contact-upsert';
import { handler, getRecommendedRx, NAMESPACE } from './handler';

// contactId is ALWAYS server-derived from email (audit #14) — a client-supplied
// contactId is ignored. Tests below that exercise the Contact-write path must
// supply an email and compare against this derived value.
const cidFor = (email: string) => uuidv5(email.trim().toLowerCase(), NAMESPACE);

describe('getRecommendedRx — email consult priority (locked 2026-06-21)', () => {
  const t = (id: string, score: number) => ({ id, label: id, slug: id, score });

  it('recommends regenerative whenever neurocognitive > 0, even if testosterone scores higher', () => {
    const scores = { 'already-diagnosed': 1, 'hormone-balance': 5 };
    const rec = getRecommendedRx(scores, [t('hormone-balance', 5), t('already-diagnosed', 1)]);
    expect(rec?.url).toContain('/rx/regenerative-medicine');
  });

  it('recommends weight/gut over testosterone when their scores are lower', () => {
    const scores = { 'hormone-balance': 5, 'weight-body-fat': 3, 'gut-microbiome': 2 };
    const rec = getRecommendedRx(scores, [t('hormone-balance', 5), t('weight-body-fat', 3), t('gut-microbiome', 2)]);
    expect(rec?.url).toContain('/rx/weight-loss');
  });

  it('picks the higher of weight vs gut', () => {
    expect(getRecommendedRx({ 'weight-body-fat': 2, 'gut-microbiome': 4 }, [])?.url).toContain('/rx/leaky-gut');
    expect(getRecommendedRx({ 'weight-body-fat': 4, 'gut-microbiome': 2 }, [])?.url).toContain('/rx/weight-loss');
  });

  it('recommends the non-zero one when the other is zero', () => {
    expect(getRecommendedRx({ 'weight-body-fat': 3, 'gut-microbiome': 0 }, [])?.url).toContain('/rx/weight-loss');
    expect(getRecommendedRx({ 'weight-body-fat': 0, 'gut-microbiome': 3 }, [])?.url).toContain('/rx/leaky-gut');
  });

  it('recommends the combined consult when weight and gut tie (both > 0)', () => {
    const rec = getRecommendedRx({ 'weight-body-fat': 3, 'gut-microbiome': 3 }, []);
    expect(rec?.label).toBe('Weight + Gut Repair Consult');
    expect(rec?.note).toContain('both');
  });

  it('falls back to testosterone only when weight, gut, and regen are all zero', () => {
    const scores = { 'weight-body-fat': 0, 'gut-microbiome': 0, 'already-diagnosed': 0, 'hormone-balance': 4 };
    const rec = getRecommendedRx(scores, [t('hormone-balance', 4), t('sleep', 5)]);
    expect(rec?.url).toContain('/rx/testosterone-ed');
  });

  it('returns null when nothing actionable scored', () => {
    expect(getRecommendedRx({ 'weight-body-fat': 0, 'gut-microbiome': 0 }, [t('sleep', 5)])).toBeNull();
  });
});

function evt(body: any) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {},
    requestContext: { http: { method: 'POST' } },
  } as any;
}

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({});
  (upsertContact as any).mockClear();
  sqsSendMock.mockReset();
  sqsSendMock.mockResolvedValue({ MessageId: 'm1' });
  lambdaSendMock.mockReset();
  lambdaSendMock.mockResolvedValue({});
  cognitoSendMock.mockReset();
  cognitoSendMock.mockResolvedValue({ UserAttributes: [{ Name: 'sub', Value: 'sub-123' }] });
  delete process.env.NURTURE_QUEUE_URL;
});

describe('audit-complete handler', () => {
  it('rejects missing contactId/email with 400, without firing any downstream invoke', async () => {
    const res: any = await handler(evt({ scores: { gut: 3 }, top3: ['gut'] }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('ignores a client-supplied contactId with no email and still rejects with 400 (contactId is server-derived from email only)', async () => {
    const res: any = await handler(evt({ contactId: 'client-supplied-id', top3: [] }));
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('rejects invalid json with 400', async () => {
    const res: any = await handler(evt('{not json'));
    expect(res.statusCode).toBe(400);
  });

  it('writes the Contact via upsertContact: email-derived key, slugs only, no stage, assessment-complete event', async () => {
    const email = 'Audit-Write-Test@example.com';
    const scores = { gut: 4, weight: 2, hormones: 3 };
    const top3 = [
      { id: 'gut-microbiome', label: 'Gut', slug: 'gut', score: 5 },
      { id: 'sleep', label: 'Sleep', slug: 'sleep', score: 4 },
      { id: 'cognitive', label: 'Cognitive', slug: 'cognitive', score: 3 },
    ];
    const res: any = await handler(evt({ email, firstName: 'Sam', phone: '+15551234567', scores, top3 }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ ok: true });

    expect(upsertContact).toHaveBeenCalledTimes(1);
    const input = (upsertContact as any).mock.calls[0][1];
    expect(input).toEqual({
      email: email.toLowerCase(),
      source: 'assessment',
      firstName: 'Sam',
      phone: '+15551234567',
      tags: ['gut', 'sleep', 'cognitive'],
      event: { type: 'assessment-complete', at: expect.any(String) },
    });
    expect(input).not.toHaveProperty('stage');

    const contactCalls = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Contact');
    expect(contactCalls).toHaveLength(1); // upsert only: no promote, no consent update
    const cmd = contactCalls[0][0];
    expect(cmd.input.Key).toEqual({ contactId: cidFor(email) });
    expect(cmd.input.UpdateExpression).toContain('if_not_exists(#lifecycleStage, :lifecycleStage)');
    expect(cmd.input.ExpressionAttributeValues[':lifecycleStage']).toBe('lead');
  });

  it('keeps answers, scores, top3 objects and consent JSON off the Contact write', async () => {
    const consent = { consentedAt: 'x', aiComms: { agreed: true, version: 'v1', text: 't' }, protegeTerms: { agreed: true, version: 'v1', text: 't' } };
    await handler(evt({
      email: 'phi-free@example.com', firstName: 'Pat',
      scores: { gut: 4 }, top3: [{ id: 'gut-microbiome', label: 'Gut', slug: 'gut', score: 5 }], consent,
    }));
    const contactCalls = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Contact');
    const upsertCmd = contactCalls[0][0];
    const blob = JSON.stringify(upsertCmd.input);
    for (const banned of ['intakeAnswers', 'auditTop3', 'auditCompletedAt', 'consentedAt', 'aiCommsConsent', 'protegeConsent', 'score', '"gut":4']) {
      expect(blob).not.toContain(banned);
    }
    expect(Object.values(upsertCmd.input.ExpressionAttributeNames)).not.toContain('consent');
    expect(upsertCmd.input.ExpressionAttributeValues[':tags']).toEqual(new Set(['gut']));
  });

  it('still stores the answers, top3 and completion time on the Users table', async () => {
    const scores = { gut: 4 };
    const top3 = [{ id: 'gut-microbiome', label: 'Gut', slug: 'gut', score: 5 }];
    await handler(evt({ email: 'users-keeps@example.com', scores, top3 }));
    const users = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Users');
    expect(users).toHaveLength(1);
    const v = users[0][0].input.ExpressionAttributeValues;
    expect(JSON.parse(v[':intakeAnswers'])).toEqual(scores);
    expect(JSON.parse(v[':auditTop3'])).toEqual(top3);
    expect(typeof v[':auditCompletedAt']).toBe('string');
  });

  it('omits placeholder phones and blank names from the upsert input', async () => {
    await handler(evt({ email: 'ph@example.com', phone: '+10000000000', top3: [] }));
    const input = (upsertContact as any).mock.calls[0][1];
    expect(input.firstName).toBeUndefined();
    // The helper drops the placeholder phone before it reaches DynamoDB.
    const cmd = sendMock.mock.calls.find((c: any) => c[0].input.TableName === 'Contact')![0];
    expect(cmd.input.ExpressionAttributeNames['#phone']).toBeUndefined();
  });

  it('uses the request src (body field) as the contact source', async () => {
    await handler(evt({ email: 'src-body@example.com', src: 'Uninsured-Decade', top3: [] }));
    expect((upsertContact as any).mock.calls[0][1].source).toBe('uninsured-decade');
  });

  it('falls back to the ?src= query param, then to "assessment", and rejects junk values', async () => {
    const withQuery = { ...evt({ email: 'src-query@example.com', top3: [] }), queryStringParameters: { src: 'advisor-print' } };
    await handler(withQuery);
    expect((upsertContact as any).mock.calls[0][1].source).toBe('advisor-print');
    await handler(evt({ email: 'src-junk@example.com', src: '<script>alert(1)</script>', top3: [] }));
    expect((upsertContact as any).mock.calls[1][1].source).toBe('assessment');
    await handler(evt({ email: 'src-none@example.com', top3: [] }));
    expect((upsertContact as any).mock.calls[2][1].source).toBe('assessment');
  });

  it('never passes a stage, so existing protege/customer rows are not touched (no promote call)', async () => {
    await handler(evt({ email: 'stage@example.com', top3: [] }));
    expect(sendMock.mock.calls.filter((c: any) => c[0].input.ConditionExpression)).toHaveLength(0);
  });

  it('writes sex to the UserProfile when the payload carries female', async () => {
    const res: any = await handler(evt({ email: 'sex-female@example.com', scores: {}, top3: [], sex: 'female' }));
    expect(res.statusCode).toBe(200);
    const profileCalls = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Users');
    expect(profileCalls).toHaveLength(1);
    const cmd = profileCalls[0][0];
    expect(cmd.input.UpdateExpression).toContain('#sex = :sex');
    expect(cmd.input.ExpressionAttributeNames['#sex']).toBe('sex');
    expect(cmd.input.ExpressionAttributeValues[':sex']).toBe('female');
  });

  it('writes sex to the UserProfile when the payload carries male', async () => {
    await handler(evt({ email: 'sex-male@example.com', scores: {}, top3: [], sex: 'male' }));
    const cmd = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Users')[0][0];
    expect(cmd.input.ExpressionAttributeValues[':sex']).toBe('male');
  });

  it('omits sex from the UserProfile write when absent or not female/male', async () => {
    await handler(evt({ email: 'sex-none@example.com', scores: {}, top3: [] }));
    await handler(evt({ email: 'sex-bad@example.com', scores: {}, top3: [], sex: 'Other; DROP' }));
    const profileCalls = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Users');
    expect(profileCalls).toHaveLength(2);
    for (const call of profileCalls) {
      expect(call[0].input.UpdateExpression).not.toContain('#sex');
      expect(call[0].input.ExpressionAttributeValues[':sex']).toBeUndefined();
    }
  });

  it('persists the consent record (text + version + timestamp + flags) to the Contact, only if_not_exists', async () => {
    const consent = {
      consentedAt: '2026-06-21T12:00:00.000Z',
      protegeTerms: { agreed: true, version: 'consent-protege-v1', text: 'I agree to the Protégé terms (free account; no purchase required).' },
      aiComms: { agreed: true, version: 'consent-ai-comms-v1', text: 'I consent to receive AI-assisted health communications from My4MLife. I understand I may opt out at any time.' },
    };
    const email = 'consent-test@example.com';
    const res: any = await handler(evt({ email, scores: { gut: 3 }, top3: [], consent }));
    expect(res.statusCode).toBe(200);
    const contactCalls = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Contact');
    expect(contactCalls).toHaveLength(2); // upsert + consent
    const cmd = contactCalls.map((c: any) => c[0]).find((c: any) => c.input.ExpressionAttributeValues[':c'] !== undefined);
    expect(cmd.input.Key).toEqual({ contactId: cidFor(email) });
    const expr: string = cmd.input.UpdateExpression;
    for (const attr of ['#c', '#at', '#ai', '#pr']) expect(expr).toContain(`${attr} = if_not_exists(${attr},`);
    expect(expr.match(/=/g)!.length).toBe(4); // every assignment is if_not_exists
    expect(cmd.input.ExpressionAttributeNames).toEqual({ '#c': 'consent', '#at': 'consentedAt', '#ai': 'aiCommsConsent', '#pr': 'protegeConsent' });
    // Consent timestamp is always server-stamped, never the client's value.
    const storedConsentAt = cmd.input.ExpressionAttributeValues[':at'];
    expect(storedConsentAt).not.toBe(consent.consentedAt);
    expect(new Date(storedConsentAt).toISOString()).toBe(storedConsentAt);
    expect(cmd.input.ExpressionAttributeValues[':ai']).toBe(true);
    expect(cmd.input.ExpressionAttributeValues[':pr']).toBe(true);
    expect(JSON.parse(cmd.input.ExpressionAttributeValues[':c']).aiComms.version).toBe('consent-ai-comms-v1');
  });

  it('skips the consent write entirely when no consent is provided', async () => {
    const res: any = await handler(evt({ email: 'no-consent-test@example.com', scores: { gut: 3 }, top3: [] }));
    expect(res.statusCode).toBe(200);
    const contactCalls = sendMock.mock.calls.filter((c: any) => c[0].input.TableName === 'Contact');
    expect(contactCalls).toHaveLength(1);
    const names = Object.values(contactCalls[0][0].input.ExpressionAttributeNames);
    for (const attr of ['consent', 'consentedAt', 'aiCommsConsent', 'protegeConsent']) expect(names).not.toContain(attr);
  });

  it('derives contactId from email and invokes email-sender with correct payload', async () => {
    const top3 = [
      { id: 'gut-microbiome', label: 'Gut health / leaky gut', slug: 'gut', score: 5 },
      { id: 'sleep', label: 'Sleep / sleep optimization', slug: 'sleep', score: 4 },
      { id: 'cognitive', label: 'Cognitive / brain fog', slug: 'cognitive', score: 3 },
    ];
    const res: any = await handler(evt({
      email: 'Test-Debug@my4mlife.com',
      firstName: 'Sam',
      phone: '+15551234567',
      scores: { 'gut-microbiome': 5 },
      top3,
    }));
    expect(res.statusCode).toBe(200);

    // DDB write happened
    const ddbCmd = sendMock.mock.calls.find((c: any) => c[0].input.TableName === 'Contact')![0];
    expect(typeof ddbCmd.input.Key.contactId).toBe('string');
    expect(ddbCmd.input.Key.contactId.length).toBeGreaterThan(10);
    expect((upsertContact as any).mock.calls[0][1].email).toBe('test-debug@my4mlife.com');

    // Email-sender invoked (alongside the unconditional coordinator-brief invoke)
    expect(lambdaSendMock).toHaveBeenCalledTimes(2);
    const invokeCmd = lambdaSendMock.mock.calls.find((c: any) => c[0].input.FunctionName === 'my4mlife-email-sender')![0];
    expect(invokeCmd.input.FunctionName).toBe('my4mlife-email-sender');
    expect(invokeCmd.input.InvocationType).toBe('Event');
    const payload = JSON.parse(Buffer.from(invokeCmd.input.Payload).toString('utf8'));
    expect(payload.kind).toBe('info');
    expect(payload.to).toBe('test-debug@my4mlife.com');
    expect(payload.subject).toContain('Welcome to My4MLife');
    expect(payload.html).toContain('Gut health');
    expect(payload.html).toContain('Your Top 3 Priorities');
    expect(payload.html).toContain('Open the My4MLife App');
    // COORDINATOR_MODE defaults true — no intake on file, so the CTA is the
    // free coordinator call, never a direct link into an /rx solution.
    expect(payload.html).toContain('Book your free care coordinator call');
    expect(payload.html).not.toContain('Leaky Gut Repair Consult');
    expect(payload.html).not.toContain('Testosterone');
    expect(payload.html).not.toContain('protege-signup?');
    // Week 1 stack card: links to the hosted /stack page, never to Amazon.
    expect(payload.html).toContain('Your Week 1 Stack');
    expect(payload.html).toContain('https://my4mlife.com/stack?utm_source=welcome');
    expect(payload.html).toContain('See Your Stack');
    // Meals card: links to the hosted /meals/week-1 page, never to Amazon.
    expect(payload.html).toContain('Your meals for the month');
    expect(payload.html).toContain('https://my4mlife.com/meals/week-1?utm_source=welcome');
    expect(payload.html).toContain('See Your Meals');
    // HARD RULE (Amazon Associates ToS): no Amazon link in any email body.
    expect(payload.html.toLowerCase()).not.toContain('amazon.com');
  });

  it('does not fail the request when email-sender invoke throws', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.FunctionName === 'my4mlife-email-sender') throw new Error('boom');
      return {};
    });
    const res: any = await handler(evt({
      email: 'x@example.com',
      firstName: 'X',
      top3: [],
    }));
    expect(res.statusCode).toBe(200);
  });

  it('fires coordinator-brief with the assessment-complete payload after a successful score store', async () => {
    const email = 'brief-fires@example.com';
    const res: any = await handler(evt({ email, scores: { gut: 3 }, top3: [] }));
    expect(res.statusCode).toBe(200);

    const invokeCmd = lambdaSendMock.mock.calls.find((c: any) => c[0].input.FunctionName === 'my4mlife-coordinator-brief')?.[0];
    expect(invokeCmd).toBeDefined();
    expect(invokeCmd.input.InvocationType).toBe('Event');
    const payload = JSON.parse(Buffer.from(invokeCmd.input.Payload).toString('utf8'));
    expect(payload).toEqual({ kind: 'assessment-complete', contactId: cidFor(email) });

    // Fired after the Contact score store, not before.
    const ddbCallOrder = sendMock.mock.invocationCallOrder[0];
    const briefCallOrder = lambdaSendMock.mock.invocationCallOrder[
      lambdaSendMock.mock.calls.findIndex((c: any) => c[0].input.FunctionName === 'my4mlife-coordinator-brief')
    ];
    expect(briefCallOrder).toBeGreaterThan(ddbCallOrder);
  });

  it('does not change the HTTP response when the coordinator-brief invoke fails', async () => {
    lambdaSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.FunctionName === 'my4mlife-coordinator-brief') throw new Error('coordinator-brief down');
      return {};
    });
    const email = 'brief-fails@example.com';
    const res: any = await handler(evt({ email, scores: { gut: 3 }, top3: [] }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ ok: true, contactId: cidFor(email) });
  });

  it('returns CORS headers with allowlisted origin (default fallback)', async () => {
    const res: any = await handler(evt({ contactId: 'x', scores: {}, top3: [] }));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
    expect(res.headers['Vary']).toBe('Origin');
  });

  it('enqueues SQS nurture stage-1 with DelaySeconds 900 when NURTURE_QUEUE_URL set', async () => {
    process.env.NURTURE_QUEUE_URL = 'https://sqs.us-east-2.amazonaws.com/123/my4mlife-nurture-queue';
    const email = 'nurture-1@example.com';
    const res: any = await handler(evt({ email, scores: {}, top3: [] }));
    expect(res.statusCode).toBe(200);
    expect(sqsSendMock).toHaveBeenCalledTimes(1);
    const cmd = sqsSendMock.mock.calls[0][0];
    expect(cmd.input.QueueUrl).toBe(process.env.NURTURE_QUEUE_URL);
    expect(cmd.input.DelaySeconds).toBe(900);
    expect(JSON.parse(cmd.input.MessageBody)).toEqual({ contactId: cidFor(email), stage: 1 });
  });

  it('skips SQS enqueue gracefully when NURTURE_QUEUE_URL unset', async () => {
    const res: any = await handler(evt({ email: 'nurture-2@example.com', scores: {}, top3: [] }));
    expect(res.statusCode).toBe(200);
    expect(sqsSendMock).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight without writing', async () => {
    const res: any = await handler({
      headers: {},
      requestContext: { http: { method: 'OPTIONS' } },
    } as any);
    expect(res.statusCode).toBe(204);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// COORDINATOR_MODE (TJ punch list item 3) — the welcome email's CTA is
// intake-aware while the care coordinator is the only path into treatment.
describe('audit-complete handler — COORDINATOR_MODE CTA (TJ punch list 3)', () => {
  function getEmailHtml(): string {
    const invokeCmd = lambdaSendMock.mock.calls.find((c: any) => c[0].input.FunctionName === 'my4mlife-email-sender')![0];
    return JSON.parse(Buffer.from(invokeCmd.input.Payload).toString('utf8')).html;
  }

  it('shows the intake-confirmation CTA (no button) when a care-coordinator intake exists', async () => {
    sendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.TableName === 'PatientRecords' && cmd.input.KeyConditionExpression) {
        return { Items: [{ contactId: 'x', sk: 'encounter#1', category: 'care-coordinator', createdAt: '2026-09-01T00:00:00.000Z' }] };
      }
      if (cmd.input.TableName === 'PatientRecords') {
        return { Item: { screeningAnswers: { bestTime: 'weekday mornings' } } };
      }
      return {};
    });
    const email = 'intake-on-file@example.com';
    const res: any = await handler(evt({ email, scores: { gut: 5 }, top3: [] }));
    expect(res.statusCode).toBe(200);
    const html = getEmailHtml();
    expect(html).toContain('Your intake is in');
    expect(html).toContain('weekday mornings');
    expect(html).not.toContain('questionnaire');
    expect(html).not.toContain('Book your free care coordinator call');
    expect(html).not.toContain('Leaky Gut Repair Consult');
  });

  it('shows the single "book a call" CTA when no care-coordinator intake exists', async () => {
    sendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.TableName === 'PatientRecords') return { Items: [] };
      return {};
    });
    const email = 'no-intake@example.com';
    const res: any = await handler(evt({ email, scores: { gut: 5 }, top3: [] }));
    expect(res.statusCode).toBe(200);
    const html = getEmailHtml();
    expect(html).toContain('Book your free care coordinator call');
    expect(html).toContain('/consult');
    expect(html).not.toContain('Your intake is in');
    expect(html).not.toContain('questionnaire');
  });

  it('still sends the email with the no-intake CTA when the PatientRecords query throws', async () => {
    sendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.TableName === 'PatientRecords') throw new Error('PatientRecords unreachable');
      return {};
    });
    const email = 'patientrecords-down@example.com';
    const res: any = await handler(evt({ email, scores: { gut: 5 }, top3: [] }));
    expect(res.statusCode).toBe(200);
    const html = getEmailHtml();
    expect(html).toContain('Book your free care coordinator call');
  });

  it('retains the old direct-to-consult CTA when COORDINATOR_MODE=false', async () => {
    vi.resetModules();
    process.env.COORDINATOR_MODE = 'false';
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
    lambdaSendMock.mockReset();
    lambdaSendMock.mockResolvedValue({});
    try {
      const { handler: handlerFalseMode } = await import('./handler.js');
      const email = 'coordinator-mode-off@example.com';
      const res: any = await handlerFalseMode(evt({ email, scores: { 'gut-microbiome': 5 }, top3: [] }));
      expect(res.statusCode).toBe(200);
      const invokeCmd = lambdaSendMock.mock.calls.find((c: any) => c[0].input.FunctionName === 'my4mlife-email-sender')![0];
      const html = JSON.parse(Buffer.from(invokeCmd.input.Payload).toString('utf8')).html;
      expect(html).toContain('Leaky Gut Repair Consult');
      expect(html).toContain('Schedule with a Care Coordinator');
      expect(html).not.toContain('Book your free care coordinator call');
      expect(html).not.toContain('Your intake is in');
      // PatientRecords must never be queried in the old mode.
      expect(sendMock.mock.calls.some((c: any) => c[0].input.TableName === 'PatientRecords')).toBe(false);
    } finally {
      delete process.env.COORDINATOR_MODE;
      vi.resetModules();
    }
  });
});
