// Bedrock InvokeModel call + defensive parse/coerce of the model's JSON reply.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import type { LogParseRequest } from './validate';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const bedrock = new BedrockRuntimeClient({ region: REGION });

export interface LogParseResult {
  actions: Record<string, boolean | null>;
  fields: Record<string, number | null>;
  notes: string;
  unclear: string[];
}

export async function parseLog(req: LogParseRequest): Promise<LogParseResult> {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 800,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(req) }],
    }),
  }));
  const body = JSON.parse(new TextDecoder().decode(res.body));
  const raw: string = body.content?.[0]?.text ?? '';
  return coerceResult(raw, req);
}

// Exported for unit testing without a live Bedrock call. Throws on unparsable/junk output.
export function coerceResult(raw: string, req: LogParseRequest): LogParseResult {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const obj = JSON.parse(stripped); // throws on junk -> handler maps to 502

  const actions: Record<string, boolean | null> = {};
  for (const a of req.actions) {
    const v = obj?.actions?.[a.id];
    actions[a.id] = v === true || v === false ? v : null;
  }

  const fields: Record<string, number | null> = {};
  for (const f of req.fields) {
    const v = obj?.fields?.[f.id];
    if (typeof v === 'number' && Number.isFinite(v)) {
      let n = v;
      if (f.min !== undefined) n = Math.max(f.min, n);
      if (f.max !== undefined) n = Math.min(f.max, n);
      fields[f.id] = n;
    } else {
      fields[f.id] = null;
    }
  }

  const notes = typeof obj?.notes === 'string' ? obj.notes.slice(0, 200) : '';
  const unclear = Array.isArray(obj?.unclear) ? obj.unclear.filter((u: unknown) => typeof u === 'string') : [];

  return { actions, fields, notes, unclear };
}
