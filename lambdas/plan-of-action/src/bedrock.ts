// Single Bedrock InvokeModel call + strict JSON parse of the plan-of-action reply.
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_REGION ?? 'us-east-2';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const bedrock = new BedrockRuntimeClient({ region: REGION });

export interface PlanStep {
  step: string;
  why: string;
  link: string;
}

export interface PlanJson {
  subject: string;
  greeting: string;
  summary_of_call: string;
  plan_steps: PlanStep[];
  next_step_cta: { label: string; url: string };
  disclaimer: string;
}

/** Calls Bedrock once with the given system/user prompt and strictly parses the JSON reply. */
export async function draftPlan(system: string, user: string): Promise<PlanJson> {
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: BEDROCK_MODEL,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  }));

  const body = JSON.parse(new TextDecoder().decode(res.body));
  const raw: string = body.content?.[0]?.text ?? '';
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error('bedrock returned invalid JSON');
  }
  return parsed as PlanJson;
}
