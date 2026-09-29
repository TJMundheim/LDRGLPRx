// Bedrock invoke module for the front door — adapted from lambdas/coach-proxy/src/bedrock.ts.
// No direct Anthropic SDK anywhere in production (HIPAA standing rule).
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { CHAT_MODEL, EMBED_MODEL, MAX_TOKENS, REGION, TEMPERATURE } from './config';

const bedrock = new BedrockRuntimeClient({ region: REGION, maxAttempts: 4 });

/** Bedrock on-demand capacity throttles under bursts; retry briefly before failing. */
async function send(command: InvokeModelCommand): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await bedrock.send(command);
    } catch (e: any) {
      lastErr = e;
      const throttled = e?.name === 'ThrottlingException' || /too many requests/i.test(e?.message ?? '');
      if (!throttled) throw e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastErr;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Calls Haiku once and returns the assistant's reply text. */
export async function invokeChat(system: string, messages: ChatMessage[]): Promise<string> {
  const res = await send(new InvokeModelCommand({
    modelId: CHAT_MODEL,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  }));

  const body = JSON.parse(new TextDecoder().decode(res.body));
  return body.content?.[0]?.text ?? '';
}

/** Embeds one query string with Titan v2. Dimension must match the index. */
export async function embedQuery(text: string, dims: number): Promise<number[]> {
  const res = await send(new InvokeModelCommand({
    modelId: EMBED_MODEL,
    body: JSON.stringify({ inputText: text, dimensions: dims, normalize: true }),
  }));

  const body = JSON.parse(new TextDecoder().decode(res.body));
  const vec = body.embedding;
  if (!Array.isArray(vec)) throw new Error('titan returned no embedding');
  return vec as number[];
}
