import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AWS SDKs before imports
vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const send = vi.fn();
  return {
    BedrockRuntimeClient: vi.fn(() => ({ send })),
    ConverseCommand: vi.fn(x => x),
    __send: send,
  };
});

vi.mock('@aws-sdk/client-dynamodb', () => {
  const send = vi.fn().mockResolvedValue({});
  return {
    DynamoDBClient: vi.fn(() => ({ send })),
    PutItemCommand: vi.fn(x => x),
    UpdateItemCommand: vi.fn(x => x),
    GetItemCommand: vi.fn(x => x),
    QueryCommand: vi.fn(x => x),
    __send: send,
  };
});

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(x => x),
  unmarshall: vi.fn(x => x),
}));

vi.mock('@aws-sdk/client-lambda', () => {
  const send = vi.fn();
  return {
    LambdaClient: vi.fn(() => ({ send })),
    InvokeCommand: vi.fn(x => x),
    __send: send,
  };
});

import { runAgentLoop } from './agent-loop.js';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

function makeConverseResponse(toolUses: { name: string; input: Record<string, unknown> }[], stopReason = 'tool_use') {
  return {
    output: {
      message: {
        content: toolUses.map((t, i) => ({ toolUse: { toolUseId: `tu-${i}`, name: t.name, input: t.input } })),
      },
    },
    stopReason,
  };
}

function makeFinalResponse(text: string) {
  return {
    output: { message: { content: [{ text }] } },
    stopReason: 'end_turn',
  };
}

describe('runAgentLoop', () => {
  let bedrockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error accessing mock internals
    bedrockSend = new BedrockRuntimeClient({}).send;
  });

  it('happy path: 2 tool iterations then final text', async () => {
    // Iteration 1: returns zoom_list_meetings tool call
    bedrockSend
      .mockResolvedValueOnce(makeConverseResponse([{ name: 'zoom_list_meetings', input: {} }]))
      // Iteration 2: returns ddb_put_item then final
      .mockResolvedValueOnce(makeConverseResponse([{ name: 'ddb_put_item', input: { tableName: 'Events', item: { id: '1' } } }]))
      .mockResolvedValueOnce(makeFinalResponse('Done scheduling.'));

    // Mock tool dispatches
    vi.mock('./tools.js', () => ({
      toolSchemas: [],
      dispatchTool: vi.fn().mockResolvedValue({ ok: true }),
    }));

    const { dispatchTool } = await import('./tools.js');
    (dispatchTool as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const client = new BedrockRuntimeClient({});
    const result = await runAgentLoop({ client, modelId: 'test-model', systemPrompt: 'sys', intent: 'schedule a meeting' });

    expect(result.status).toBe('succeeded');
    expect(result.finalText).toBe('Done scheduling.');
  });

  it('caps loop at 15 iterations', async () => {
    // Always return a tool use — loop should cap
    bedrockSend.mockResolvedValue(makeConverseResponse([{ name: 'zoom_list_meetings', input: {} }]));

    const { dispatchTool } = await import('./tools.js');
    (dispatchTool as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const client = new BedrockRuntimeClient({});
    const result = await runAgentLoop({ client, modelId: 'test-model', systemPrompt: 'sys', intent: 'loop forever' });

    expect(bedrockSend).toHaveBeenCalledTimes(15);
    expect(result.finalText).toContain('15 iterations');
  });

  it('returns awaiting-approval when request_approval is called', async () => {
    bedrockSend
      .mockResolvedValueOnce(makeConverseResponse([{ name: 'request_approval', input: { action: 'send mass email', reason: 'weekly digest' } }]))
      .mockResolvedValueOnce(makeFinalResponse('Approval requested.'));

    const { dispatchTool } = await import('./tools.js');
    (dispatchTool as ReturnType<typeof vi.fn>).mockResolvedValue({ approvalId: 'abc', status: 'pending' });

    const client = new BedrockRuntimeClient({});
    const result = await runAgentLoop({ client, modelId: 'test-model', systemPrompt: 'sys', intent: 'send mass email to members' });

    expect(result.status).toBe('awaiting-approval');
  });

  it('captures tool error and marks isError', async () => {
    bedrockSend
      .mockResolvedValueOnce(makeConverseResponse([{ name: 'ddb_get_item', input: { tableName: 'Events', key: { id: '1' } } }]))
      .mockResolvedValueOnce(makeFinalResponse('Handled error.'));

    const { dispatchTool } = await import('./tools.js');
    (dispatchTool as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DDB timeout'));

    const client = new BedrockRuntimeClient({});
    const result = await runAgentLoop({ client, modelId: 'test-model', systemPrompt: 'sys', intent: 'get event' });

    expect(result.toolCalls[0].output).toEqual({ error: 'DDB timeout' });
    expect(result.status).toBe('succeeded');
  });
});
