import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AWS SDK mocks — must be declared before any import of the module under test ──

const ddbSendMock = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...args: any[]) => ddbSendMock(...args) }) },
  GetCommand: class GetCommand { input: any; constructor(input: any) { this.input = input; } },
  PutCommand: class PutCommand { input: any; constructor(input: any) { this.input = input; } },
  QueryCommand: class QueryCommand { input: any; constructor(input: any) { this.input = input; } },
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

import { handler, type BriefResult } from './handler';

// ── Fixtures ───────────────────────────────────────────────────────────────

const RECORD_ITEM = {
  contactId: 'c1',
  sk: 'record',
  demographics: { firstName: 'Sam', lastName: 'Rivera', email: 'sam@example.com', phone: '+15550001111' },
};

const ENCOUNTER_ITEM = {
  contactId: 'c1',
  sk: 'encounter#e1',
  encounterId: 'e1',
  category: 'glp1-weight-loss',
  state: 'coordinator-reviewed',
  visitType: 'async',
};

const CONTACT_ITEM = {
  contactId: 'c1',
  firstName: 'Sam',
  email: 'sam@example.com',
  phone: '+15550001111',
  intakeAnswers: JSON.stringify({ sleep: 2, gut: 4 }),
  auditTop3: ['gut', 'sleep', 'weight'],
};

// Two care-coordinator encounters (coord2 is the latest by createdAt) plus one
// non-coordinator encounter that is more recent still — the query must filter
// by category, not just pick the newest item overall.
const COORDINATOR_ENCOUNTER_1 = {
  contactId: 'c1', sk: 'encounter#coord1', encounterId: 'coord1',
  category: 'care-coordinator', state: 'new', visitType: 'async', createdAt: '2026-09-01T10:00:00.000Z',
};
const COORDINATOR_ENCOUNTER_2 = {
  contactId: 'c1', sk: 'encounter#coord2', encounterId: 'coord2',
  category: 'care-coordinator', state: 'new', visitType: 'async', createdAt: '2026-09-05T10:00:00.000Z',
};
const OTHER_ENCOUNTER = {
  contactId: 'c1', sk: 'encounter#other1', encounterId: 'other1',
  category: 'glp1-weight-loss', state: 'new', visitType: 'async', createdAt: '2026-09-08T10:00:00.000Z',
};

const VALID_BRIEF = {
  summary: 'Sam is a strong GLP-1 candidate with gut concerns.',
  why_now: 'Top-3 audit concerns align with the GLP-1 + Gut-Brain Rx lanes.',
  assessment_readout: [{ category: 'gut', score: 4, note: 'elevated' }],
  red_flags: [],
  recommended_lanes: [{ lane: 'GLP-1 weight loss', rationale: 'top concern', visit_type: 'async', price: 'free' }],
  questions_to_ask: ['Any GI symptoms this week?'],
  suggested_plan_outline: ['Start GLP-1 async visit'],
};

function bedrockReply(text: string) {
  return { body: new TextEncoder().encode(JSON.stringify({ content: [{ text }] })) };
}

let contactItemOverride: Record<string, unknown> | undefined = CONTACT_ITEM;

beforeEach(() => {
  vi.clearAllMocks();
  contactItemOverride = CONTACT_ITEM;

  ddbSendMock.mockImplementation(async (command: any) => {
    const input = command.input;
    if (input.KeyConditionExpression) {
      // findLatestCoordinatorEncounter's Query on PatientRecords.
      return { Items: [COORDINATOR_ENCOUNTER_1, COORDINATOR_ENCOUNTER_2, OTHER_ENCOUNTER] };
    }
    if (input.Key) {
      if (input.TableName === 'Contact') return { Item: contactItemOverride };
      if (input.Key.sk === 'record') return { Item: RECORD_ITEM };
      if (input.Key.sk === 'encounter#e1') return { Item: ENCOUNTER_ITEM };
      if (input.Key.sk === 'encounter#coord2') return { Item: COORDINATOR_ENCOUNTER_2 };
      return {};
    }
    return {}; // PutCommand
  });

  bedrockSendMock.mockResolvedValue(bedrockReply(JSON.stringify(VALID_BRIEF)));
  lambdaSendMock.mockResolvedValue({ Payload: new TextEncoder().encode('{}') });
});

function putItems() {
  return ddbSendMock.mock.calls.map((c) => c[0].input).filter((i: any) => i.Item);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('coordinator-brief handler', () => {
  it('direct invoke: gathers, calls Bedrock once, stores brief + audit, emails coordinator', async () => {
    const result = await handler({ kind: 'coordinator-notify', contactId: 'c1', encounterId: 'e1' } as any) as BriefResult;

    expect(bedrockSendMock).toHaveBeenCalledTimes(1);

    const items = putItems();
    const briefItem = items.find((i: any) => i.Item.sk === 'brief#e1');
    expect(briefItem).toBeDefined();
    // Stored as a map, not a JSON string — AWSJSON double-encodes strings.
    expect(typeof briefItem!.Item.json).toBe('object');
    expect(briefItem!.Item.json.summary).toBe(VALID_BRIEF.summary);

    const auditItem = items.find((i: any) => i.Item.action === 'brief.generated');
    expect(auditItem).toBeDefined();
    expect(auditItem!.Item.actor).toBe('system');

    expect(lambdaSendMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(lambdaSendMock.mock.calls[0][0].input.Payload.toString());
    expect(payload.kind).toBe('info');
    expect(payload.to).toBe('drtj@my4mlife.com');
    expect(payload.subject.startsWith('[Pre-call brief]')).toBe(true);

    expect(result.encounterId).toBe('e1');
  });

  it('AppSync-shaped invoke returns { encounterId, json, createdAt } with json as an object', async () => {
    const result = await handler({ arguments: { contactId: 'c1', encounterId: 'e1' }, identity: {} } as any) as BriefResult;

    expect(result.encounterId).toBe('e1');
    expect(typeof result.json).toBe('object');
    expect(result.json.summary).toBe(VALID_BRIEF.summary);
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
  });

  it('falls back to screeningAnswers.bestTime for the call-time in the email subject', async () => {
    contactItemOverride = undefined;
    ddbSendMock.mockImplementation(async (command: any) => {
      const input = command.input;
      if (input.Key) {
        if (input.TableName === 'Contact') return { Item: undefined };
        if (input.Key.sk === 'record') {
          return { Item: { ...RECORD_ITEM, screeningAnswers: { bestTime: 'weekday mornings' } } };
        }
        if (input.Key.sk === 'encounter#e1') return { Item: ENCOUNTER_ITEM };
        return {};
      }
      return {};
    });

    await handler({ kind: 'coordinator-notify', contactId: 'c1', encounterId: 'e1' } as any);

    const payload = JSON.parse(lambdaSendMock.mock.calls[0][0].input.Payload.toString());
    expect(payload.subject).toContain('weekday mornings');
  });

  it('throws and stores nothing when Bedrock returns non-JSON', async () => {
    bedrockSendMock.mockResolvedValue(bedrockReply('not json at all'));

    await expect(handler({ kind: 'coordinator-notify', contactId: 'c1', encounterId: 'e1' } as any)).rejects.toThrow();

    expect(putItems().length).toBe(0);
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it('still generates a brief when the Contact item is missing, with "assessment: not taken" in the prompt', async () => {
    contactItemOverride = undefined;

    await handler({ kind: 'coordinator-notify', contactId: 'c1', encounterId: 'e1' } as any);

    const invokeInput = bedrockSendMock.mock.calls[0][0].input;
    const body = JSON.parse(invokeInput.body);
    const userContent = body.messages[0].content as string;
    expect(userContent).toContain('assessment: not taken');
  });
});

describe('assessment-complete event (MindSpan assessment finishes after intake)', () => {
  it('picks the latest care-coordinator encounter, regenerates the brief, stores it, and emails with the MindSpan subject prefix', async () => {
    const result = await handler({ kind: 'assessment-complete', contactId: 'c1' } as any);

    const queryCall = ddbSendMock.mock.calls.find((c: any) => c[0].input.KeyConditionExpression);
    expect(queryCall).toBeDefined();
    expect(queryCall![0].input.TableName).toBe('PatientRecords');
    expect(queryCall![0].input.KeyConditionExpression).toContain("contactId = :c");
    expect(queryCall![0].input.KeyConditionExpression).toContain("begins_with(sk, :prefix)");
    expect(queryCall![0].input.ExpressionAttributeValues).toEqual({ ':c': 'c1', ':prefix': 'encounter#' });

    expect(bedrockSendMock).toHaveBeenCalledTimes(1);

    const items = putItems();
    const briefItem = items.find((i: any) => i.Item.sk === 'brief#coord2');
    expect(briefItem).toBeDefined();
    expect(briefItem!.Item.json.summary).toBe(VALID_BRIEF.summary);

    expect(lambdaSendMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(lambdaSendMock.mock.calls[0][0].input.Payload.toString());
    expect(payload.subject.startsWith('[Pre-call brief — updated with MindSpan]')).toBe(true);

    expect(result).toEqual(expect.objectContaining({ encounterId: 'coord2' }));
  });

  it('returns {skipped:true} with no Bedrock call, no store, and no email when there is no care-coordinator encounter', async () => {
    ddbSendMock.mockImplementation(async (command: any) => {
      const input = command.input;
      if (input.KeyConditionExpression) return { Items: [OTHER_ENCOUNTER] };
      return {};
    });

    const result = await handler({ kind: 'assessment-complete', contactId: 'c1' } as any);

    expect(result).toEqual({ skipped: true });
    expect(bedrockSendMock).not.toHaveBeenCalled();
    expect(putItems().length).toBe(0);
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });
});
