// Single Bedrock InvokeModel call for coach-proxy. No direct Anthropic SDK
// per HIPAA standing rule — see lambdas/inbound-handler for the same pattern.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const DEFAULT_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

// Maps the client-facing model names coach.ts sends to Bedrock inference-profile ids.
// Unknown names fall back to DEFAULT_MODEL rather than failing the request.
const MODEL_MAP: Record<string, string> = {
  'claude-sonnet-4-6': 'us.anthropic.claude-sonnet-4-6-20260101-v1:0',
  'claude-opus-4-7': 'us.anthropic.claude-opus-4-7-20260101-v1:0',
};

export function resolveModel(name: string | undefined): string {
  if (name && MODEL_MAP[name]) return MODEL_MAP[name];
  return DEFAULT_MODEL;
}

const bedrock = new BedrockRuntimeClient({ region: REGION });

export interface ProxyMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Calls Bedrock once and returns the assistant's reply text. */
export async function invokeCoach(
  system: string,
  messages: ProxyMessage[],
  model: string | undefined,
  maxTokens: number,
): Promise<string> {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: resolveModel(model),
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  }));

  const body = JSON.parse(new TextDecoder().decode(res.body));
  return body.content?.[0]?.text ?? '';
}
