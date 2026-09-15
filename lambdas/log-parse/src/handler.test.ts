import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Bedrock SDK mock ─────────────────────────────────────────────────────────

const bedrockSendMock = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class { send = (...a: any[]) => bedrockSendMock(...a); },
  InvokeModelCommand: class { input: any; constructor(i: any) { this.input = i; } },
}));

import { handler } from './handler';

function evt(body: any, method = 'POST', origin?: string) {
  return {
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: origin ? { origin } : {},
    requestContext: { http: { method } },
  } as any;
}

const ACTIONS = [
  { id: 'walk', label: 'Morning walk' },
  { id: 'strength', label: 'Strength training' },
];
const FIELDS = [
  { id: 'sleepHours', label: 'Sleep', unit: 'hours', min: 0, max: 14 },
  { id: 'proteinAfterWalk', label: 'Protein after walk', unit: 'g', min: 0, max: 300 },
];

const VALID_BODY = {
  text: 'did the walk, skipped strength, slept about seven, protein after',
  date: '2026-09-15',
  actions: ACTIONS,
  fields: FIELDS,
};

function bedrockReply(text: string) {
  return { body: new TextEncoder().encode(JSON.stringify({ content: [{ text }] })) };
}

beforeEach(() => {
  bedrockSendMock.mockReset();
});

describe('OPTIONS preflight', () => {
  it('returns 204 without calling Bedrock', async () => {
    const res: any = await handler(evt({}, 'OPTIONS'));
    expect(res.statusCode).toBe(204);
    expect(bedrockSendMock).not.toHaveBeenCalled();
  });
});

describe('Validation', () => {
  it('returns 400 when text is missing', async () => {
    const { text: _t, ...body } = VALID_BODY;
    const res: any = await handler(evt(body));
    expect(res.statusCode).toBe(400);
    expect(bedrockSendMock).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const res: any = await handler(evt('{bad json'));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on missing body', async () => {
    const res: any = await handler({ headers: {}, requestContext: { http: { method: 'POST' } } } as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when text exceeds 600 chars', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, text: 'a'.repeat(601) }));
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when date is malformed', async () => {
    const res: any = await handler(evt({ ...VALID_BODY, date: '09-15-2026' }));
    expect(res.statusCode).toBe(400);
  });
});

describe('Success — valid request', () => {
  it('returns mapped JSON with nulls for unmentioned ids', async () => {
    bedrockSendMock.mockResolvedValueOnce(bedrockReply(JSON.stringify({
      actions: { walk: true, strength: false },
      fields: { sleepHours: 7, proteinAfterWalk: null },
      notes: '',
      unclear: [],
    })));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.actions).toEqual({ walk: true, strength: false });
    expect(body.fields.sleepHours).toBe(7);
    expect(body.fields.proteinAfterWalk).toBeNull();
  });

  it('fills in null for an action id the model omitted', async () => {
    bedrockSendMock.mockResolvedValueOnce(bedrockReply(JSON.stringify({
      actions: { walk: true },
      fields: {},
      notes: '',
      unclear: [],
    })));
    const res: any = await handler(evt(VALID_BODY));
    const body = JSON.parse(res.body);
    expect(body.actions.strength).toBeNull();
    expect(body.fields.sleepHours).toBeNull();
  });
});

describe('Fenced JSON response', () => {
  it('still parses when model wraps JSON in markdown fences', async () => {
    const fenced = '```json\n' + JSON.stringify({
      actions: { walk: true, strength: true },
      fields: { sleepHours: 8, proteinAfterWalk: 35 },
      notes: 'felt good',
      unclear: [],
    }) + '\n```';
    bedrockSendMock.mockResolvedValueOnce(bedrockReply(fenced));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.actions.walk).toBe(true);
    expect(body.fields.proteinAfterWalk).toBe(35);
    expect(body.notes).toBe('felt good');
  });
});

describe('Model failure', () => {
  it('returns 502 with {error} when model returns unparsable junk', async () => {
    bedrockSendMock.mockResolvedValueOnce(bedrockReply('not json at all {{{'));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(typeof body.error).toBe('string');
  });

  it('returns 502 when the Bedrock call itself throws', async () => {
    bedrockSendMock.mockRejectedValueOnce(new Error('bedrock boom'));
    const res: any = await handler(evt(VALID_BODY));
    expect(res.statusCode).toBe(502);
  });
});

describe('Number clamping', () => {
  it('clamps an out-of-range field number to max', async () => {
    bedrockSendMock.mockResolvedValueOnce(bedrockReply(JSON.stringify({
      actions: { walk: true, strength: true },
      fields: { sleepHours: 22, proteinAfterWalk: -5 },
      notes: '',
      unclear: [],
    })));
    const res: any = await handler(evt(VALID_BODY));
    const body = JSON.parse(res.body);
    expect(body.fields.sleepHours).toBe(14); // clamped to max
    expect(body.fields.proteinAfterWalk).toBe(0); // clamped to min
  });
});

describe('CORS', () => {
  it('returns 204 with allowlisted origin reflected on OPTIONS', async () => {
    const res: any = await handler(evt({}, 'OPTIONS', 'https://app.my4mlife.com'));
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://app.my4mlife.com');
  });

  it('falls back to default origin for unknown origin', async () => {
    const res: any = await handler(evt({}, 'OPTIONS', 'https://evil.com'));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://my4mlife.com');
  });
});
