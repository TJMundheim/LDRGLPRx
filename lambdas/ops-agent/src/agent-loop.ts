import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { dispatchTool, toolSchemas } from './tools.js';

const MAX_ITERATIONS = 15;

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  durationMs: number;
}

export interface AgentLoopResult {
  finalText: string;
  toolCalls: ToolCall[];
  status: 'succeeded' | 'failed' | 'awaiting-approval';
}

export async function runAgentLoop(opts: {
  client: BedrockRuntimeClient;
  modelId: string;
  systemPrompt: string;
  intent: string;
}): Promise<AgentLoopResult> {
  const { client, modelId, systemPrompt, intent } = opts;

  const messages: { role: 'user' | 'assistant'; content: unknown[] }[] = [
    { role: 'user', content: [{ text: intent }] },
  ];

  const toolCalls: ToolCall[] = [];
  let approvalRequested = false;
  let finalText = '';
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const res = await client.send(new ConverseCommand({
      modelId,
      system: [{ text: systemPrompt }],
      messages: messages as Parameters<typeof ConverseCommand>[0]['messages'],
      toolConfig: {
        tools: toolSchemas.map(s => ({ toolSpec: { name: s.name, description: s.description, inputSchema: s.inputSchema } })),
      },
    }));

    const output = res.output?.message;
    if (!output) break;

    messages.push({ role: 'assistant', content: output.content ?? [] });

    const toolUseBlocks = (output.content ?? []).filter((b: { toolUse?: unknown }) => b.toolUse);

    if (toolUseBlocks.length === 0) {
      // No tool use — final text response
      finalText = (output.content ?? [])
        .filter((b: { text?: string }) => b.text)
        .map((b: { text?: string }) => b.text)
        .join('\n');
      break;
    }

    const toolResults: unknown[] = [];
    for (const block of toolUseBlocks) {
      const { toolUseId, name, input } = block.toolUse as { toolUseId: string; name: string; input: Record<string, unknown> };
      const t0 = Date.now();
      let output: unknown;
      let isError = false;
      try {
        output = await dispatchTool(name, input);
        if (name === 'request_approval') approvalRequested = true;
      } catch (e: unknown) {
        output = { error: (e as Error).message };
        isError = true;
      }
      const durationMs = Date.now() - t0;
      toolCalls.push({ tool: name, input, output, durationMs });
      toolResults.push({ toolResult: { toolUseId, content: [{ text: JSON.stringify(output) }], status: isError ? 'error' : 'success' } });
    }

    messages.push({ role: 'user', content: toolResults });

    if (res.stopReason === 'end_turn') break;
  }

  if (iterations >= MAX_ITERATIONS && !finalText) {
    finalText = `[Loop capped at ${MAX_ITERATIONS} iterations]`;
  }

  const status: AgentLoopResult['status'] = approvalRequested
    ? 'awaiting-approval'
    : 'succeeded';

  return { finalText, toolCalls, status };
}
