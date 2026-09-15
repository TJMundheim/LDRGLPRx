import { describe, it, expect, beforeEach, vi } from 'vitest';

const bedrockSendMock = vi.fn();
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class BedrockRuntimeClient { constructor(_: any) {} send = (...a: any[]) => bedrockSendMock(...a); },
  InvokeModelCommand: class InvokeModelCommand { input: any; constructor(input: any) { this.input = input; } },
}));

import { handler } from './handler';

function bedrockResponse(text: string) {
  return { body: new TextEncoder().encode(JSON.stringify({ content: [{ text }] })) };
}

function makeEvent(body: unknown, method = 'POST') {
  return {
    requestContext: { http: { method } },
    body: JSON.stringify(body),
  } as any;
}

beforeEach(() => {
  bedrockSendMock.mockReset();
});

describe('handler — happy path', () => {
  it('calls Bedrock and returns { content } in the shape coach.ts expects', async () => {
    bedrockSendMock.mockResolvedValue(bedrockResponse('Hi there — keep up the great work.'));

    const res: any = await handler(makeEvent({
      system: 'You are a coach.',
      messages: [{ role: 'user', content: 'How am I doing?' }],
      model: 'claude-sonnet-4-6',
      maxTokens: 512,
    }));

    expect(bedrockSendMock).toHaveBeenCalledTimes(1);
    const call = bedrockSendMock.mock.calls[0][0];
    expect(call.input.modelId).toBe('us.anthropic.claude-sonnet-4-6-20260101-v1:0');
    const sentBody = JSON.parse(call.input.body);
    expect(sentBody.anthropic_version).toBe('bedrock-2023-05-31');
    expect(sentBody.system).toBe('You are a coach.');
    expect(sentBody.messages).toEqual([{ role: 'user', content: 'How am I doing?' }]);
    expect(sentBody.max_tokens).toBe(512);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ content: 'Hi there — keep up the great work.' });
  });

  it('maps claude-opus-4-7 to its Bedrock inference-profile id', async () => {
    bedrockSendMock.mockResolvedValue(bedrockResponse('ok'));
    await handler(makeEvent({
      system: 's',
      messages: [{ role: 'user', content: 'hi' }],
      model: 'claude-opus-4-7',
    }));
    const call = bedrockSendMock.mock.calls[0][0];
    expect(call.input.modelId).toBe('us.anthropic.claude-opus-4-7-20260101-v1:0');
  });
});

describe('handler — bad JSON', () => {
  it('returns 400 for invalid JSON body', async () => {
    const res: any = await handler({
      requestContext: { http: { method: 'POST' } },
      body: '{not valid json',
    } as any);

    expect(res.statusCode).toBe(400);
    expect(bedrockSendMock).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const res: any = await handler(makeEvent({ messages: [] }));
    expect(res.statusCode).toBe(400);
  });
});

describe('handler — Bedrock failure', () => {
  it('returns 502 when Bedrock throws', async () => {
    bedrockSendMock.mockRejectedValue(new Error('Bedrock unavailable'));

    const res: any = await handler(makeEvent({
      system: 's',
      messages: [{ role: 'user', content: 'hi' }],
      model: 'claude-sonnet-4-6',
    }));

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('Bedrock unavailable');
  });
});

describe('handler — CORS preflight', () => {
  it('responds to OPTIONS without touching Bedrock', async () => {
    const res: any = await handler(makeEvent({}, 'OPTIONS'));
    expect(res.statusCode).toBe(204);
    expect(bedrockSendMock).not.toHaveBeenCalled();
  });
});
