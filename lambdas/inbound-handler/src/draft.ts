// Bedrock call + defensive JSON parse of the concierge's structured reply.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { CONCIERGE_SYSTEM_PROMPT } from './system-prompt';
import type { HistoryItem } from './store';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const bedrock = new BedrockRuntimeClient({ region: REGION });

export interface DraftResult {
  category: string;
  confidence: number;
  escalate: boolean;
  reply: string;
  internalNote: string;
  raw: string;
}

export async function draftReply(history: HistoryItem[], inboundBody: string, isProspect: boolean): Promise<DraftResult> {
  const messages = history.map((m) => ({ role: m.direction === 'in' ? 'user' : 'assistant', content: m.body ?? '' }));
  const userContent = isProspect
    ? `[No member record for this sender — treat as a prospect.]\n\n${inboundBody}`
    : inboundBody;
  messages.push({ role: 'user', content: userContent });

  const res = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1500,
      system: CONCIERGE_SYSTEM_PROMPT,
      messages,
    }),
  }));
  const body = JSON.parse(new TextDecoder().decode(res.body));
  const raw: string = body.content?.[0]?.text ?? '';
  return parseDraftJson(raw);
}

// Exported for unit testing without a live Bedrock call.
export function parseDraftJson(raw: string): DraftResult {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    const obj = JSON.parse(stripped);
    return {
      category: typeof obj.category === 'string' ? obj.category : 'other',
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
      escalate: obj.escalate !== false,
      reply: typeof obj.reply === 'string' ? obj.reply : raw,
      internalNote: typeof obj.internal_note === 'string' ? obj.internal_note : '',
      raw,
    };
  } catch {
    return { category: 'other', confidence: 0, escalate: true, reply: raw, internalNote: '', raw };
  }
}
