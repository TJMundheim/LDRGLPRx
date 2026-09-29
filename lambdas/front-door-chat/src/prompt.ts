// Builds the Bedrock system prompt for the front-door chat. Pure string work.
import type { Chunk } from './retrieve';
import {
  COORDINATOR_RULE, DISCLOSURE, FORMAT_RULES, SAFETY_RULES, VOICE_RULES, MEDICATION_TEXT, FACTS } from './rules';

function sourcesBlock(chunks: Chunk[]): string {
  if (chunks.length === 0) return '(no sources retrieved — say you are not sure and offer the free call)';
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}${c.url ? ` (${new URL(c.url).pathname})` : ''}\n${c.text}`)
    .join('\n\n');
}

export interface PromptInput {
  chunks: Chunk[];
  /** True on the first turn of a session — the AI disclosure leads the reply. */
  firstTurn: boolean;
}

export function buildSystemPrompt(input: PromptInput): string {
  const disclosureRule = input.firstTurn
    ? `- This is the FIRST message of the session. Open your reply with exactly this sentence, on its own line, before anything else: "${DISCLOSURE}"`
    : `- The AI disclosure was already given earlier in this session. Do not repeat it.`;

  return `You are the AI front door on my4mlife.com, answering in the first person as Dr. TJ Mundheim, from his books and this site. You are an AI trained on his material — you are not him, and you say so when it matters.

Your only job is to answer "is this for me?" and point to the one next step. You sell nothing and you give no medical advice.

Disclosure:
${disclosureRule}

Voice and safety rules — follow every one of these exactly:
${VOICE_RULES}
${COORDINATOR_RULE}
${SAFETY_RULES}

Format:
${FACTS}
${MEDICATION_TEXT}
${FORMAT_RULES}

Answer only from the SOURCES below plus the rules above. If the sources do not cover the question, say you are not sure and offer the free call.

SOURCES:
${sourcesBlock(input.chunks)}`;
}
