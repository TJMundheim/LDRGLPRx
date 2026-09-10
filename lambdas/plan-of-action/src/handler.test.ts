import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks — must be declared before any import of the module under test ──

const ddbSendMock = vi.fn();
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  UpdateCommand: class UpdateCommand { input: any; constructor(input: any) { this.input = input; } },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class DynamoDBClient { constructor(_: any) {} },
}));

const bedrockSendMock = vi.fn();
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class BedrockRuntimeClient { constructor(_: any) {} send = (...a: any[]) => bedrockSendMock(...a); },
  InvokeModelCommand: class InvokeModelCommand { input: any; constructor(input: any) { this.input = input; } },
}));

const lambdaSendMock = vi.fn();
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: class LambdaClient { constructor(_: any) {} send = (...a: any[]) => lambdaSendMock(...a); },
  InvokeCommand: class InvokeCommand { input: any; constructor(input: any) { this.input = input; } },
}));

import { handler } from './handler';
import { renderPlan } from './render';
import { DISCLAIMER } from './prompt';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const RECORD_ITEM = {
  contactId: 'contact-abc',
  sk: 'record',
  demographics: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
};

const BRIEF_ITEM = {
  contactId: 'contact-abc',
  sk: 'brief#enc-1',
  json: { chiefComplaint: 'gut issues', callSummary: 'wants a gut-repair protocol' },
};

const VALID_PLAN = {
  subject: 'Your My4MLife plan of action',
  greeting: 'Hi Jane,',
  summary_of_call: 'We talked about your gut health goals.',
  plan_steps: [
    { step: 'Start the gut-repair protocol', why: 'It may help support gut lining repair.', link: 'https://www.my4mlife.com/rx/leaky-gut' },
  ],
  next_step_cta: { label: 'Take the next step', url: 'https://www.my4mlife.com/assessment' },
  disclaimer: DISCLAIMER,
};

function bedrockResponse(obj: unknown) {
  return { body: new TextEncoder().encode(JSON.stringify({ content: [{ text: JSON.stringify(obj) }] })) };
}

beforeEach(() => {
  process.env.PATIENT_RECORDS_TABLE = 'PatientRecords';
  process.env.EMAIL_SENDER_FN = 'my4mlife-email-sender';
  process.env.NOTIFY_TO = 'drtj@my4mlife.com';
  ddbSendMock.mockReset();
  bedrockSendMock.mockReset();
  lambdaSendMock.mockReset();
  lambdaSendMock.mockResolvedValue({});
});

// ── action: draft ────────────────────────────────────────────────────────────

describe('action: draft', () => {
  it('reads brief + record, calls Bedrock once with notes + brief, stores draft plan, returns it', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.Key?.sk === 'record') return { Item: RECORD_ITEM };
      if (cmd.input.Key?.sk === 'brief#enc-1') return { Item: BRIEF_ITEM };
      return {};
    });
    bedrockSendMock.mockResolvedValue(bedrockResponse(VALID_PLAN));

    const res: any = await handler({
      arguments: {
        action: 'draft', contactId: 'contact-abc', encounterId: 'enc-1',
        coordinatorNotes: 'Patient wants gut protocol, mentioned bloating.',
      },
    } as any);

    expect(bedrockSendMock).toHaveBeenCalledTimes(1);
    const bedrockCall = bedrockSendMock.mock.calls[0][0];
    const promptText = JSON.stringify(JSON.parse(bedrockCall.input.body));
    expect(promptText).toContain('bloating');
    expect(promptText).toContain('gut issues');

    const putCall = ddbSendMock.mock.calls.find((c: any) => c[0].input.Item?.sk === 'plan#enc-1');
    expect(putCall).toBeTruthy();
    expect(putCall![0].input.Item.state).toBe('draft');
    expect(putCall![0].input.Item.json.subject).toBe(VALID_PLAN.subject);

    expect(res.encounterId).toBe('enc-1');
    expect(res.state).toBe('draft');
    expect(res.json.subject).toBe(VALID_PLAN.subject);
    expect(res.sentAt).toBeNull();
    expect(typeof res.createdAt).toBe('string');
  });
});

// ── action: send ─────────────────────────────────────────────────────────────

describe('action: send', () => {
  it('emails the plan (with disclaimer), marks it sent, writes audit, notifies TJ', async () => {
    ddbSendMock.mockImplementation(async (cmd: any) => {
      if (cmd.input.Key?.sk === 'record') return { Item: RECORD_ITEM };
      return {};
    });

    const res: any = await handler({
      arguments: { action: 'send', contactId: 'contact-abc', encounterId: 'enc-1', planJson: VALID_PLAN },
    } as any);

    expect(lambdaSendMock).toHaveBeenCalledTimes(2);

    const firstPayload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[0][0].input.Payload).toString());
    expect(firstPayload.kind).toBe('info');
    expect(firstPayload.to).toBe('jane@example.com');
    expect(firstPayload.subject).toBe(VALID_PLAN.subject);
    expect(firstPayload.html).toContain(DISCLAIMER);
    expect(firstPayload.text).toContain(DISCLAIMER);

    const secondPayload = JSON.parse(Buffer.from(lambdaSendMock.mock.calls[1][0].input.Payload).toString());
    expect(secondPayload.to).toBe('drtj@my4mlife.com');
    expect(secondPayload.subject.startsWith('[Plan sent]')).toBe(true);

    const updateCall = ddbSendMock.mock.calls.find((c: any) => c[0].constructor?.name === 'UpdateCommand');
    expect(updateCall).toBeTruthy();
    expect(updateCall![0].input.Key.sk).toBe('plan#enc-1');

    const auditCall = ddbSendMock.mock.calls.find((c: any) => typeof c[0].input.Item?.sk === 'string' && c[0].input.Item.sk.startsWith('audit#'));
    expect(auditCall).toBeTruthy();

    expect(res.state).toBe('sent');
    expect(typeof res.sentAt).toBe('string');
  });

  it('throws "link not allowed" for a disallowed link and sends no email', async () => {
    const badPlan = { ...VALID_PLAN, next_step_cta: { label: 'Go', url: 'https://evil.example.com/steal' } };
    ddbSendMock.mockResolvedValue({});

    await expect(handler({
      arguments: { action: 'send', contactId: 'contact-abc', encounterId: 'enc-1', planJson: badPlan },
    } as any)).rejects.toThrow('link not allowed');

    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('throws when there is no plan item and no planJson', async () => {
    ddbSendMock.mockResolvedValue({});

    await expect(handler({
      arguments: { action: 'send', contactId: 'contact-abc', encounterId: 'enc-1' },
    } as any)).rejects.toThrow();

    expect(lambdaSendMock).not.toHaveBeenCalled();
  });
});

// ── renderPlan escaping ──────────────────────────────────────────────────────

describe('renderPlan', () => {
  it('escapes <script> in patient-controlled strings', () => {
    const plan = { ...VALID_PLAN, summary_of_call: '<script>alert(1)</script>' };
    const { html } = renderPlan(plan as any, 'Jane');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
