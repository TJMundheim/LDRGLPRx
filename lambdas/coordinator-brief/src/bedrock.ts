// Bedrock InvokeModel call + strict JSON parse of the brief.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const bedrock = new BedrockRuntimeClient({ region: REGION });

export interface Brief {
  summary: string;
  why_now: string;
  assessment_readout: Array<{ category: string; score: number | string; note: string }>;
  red_flags: string[];
  recommended_lanes: Array<{ lane: string; rationale: string; visit_type: string; price: string }>;
  questions_to_ask: string[];
  suggested_plan_outline: string[];
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

/** Parse the model's raw text into a Brief. Throws on invalid JSON — a
 *  malformed brief must never be stored or mailed silently.
 */
export function parseBriefJson(raw: string): Brief {
  const stripped = stripFences(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch {
    throw new Error('coordinator-brief: Bedrock response was not valid JSON');
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('coordinator-brief: Bedrock response was not a JSON object');
  }
  return obj as Brief;
}

/** Invoke Bedrock with the given system + user prompt and return the parsed Brief. */
export async function generateBrief(systemPrompt: string, userPrompt: string): Promise<Brief> {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  }));
  const body = JSON.parse(new TextDecoder().decode(res.body));
  const raw: string = body.content?.[0]?.text ?? '';
  return parseBriefJson(raw);
}
