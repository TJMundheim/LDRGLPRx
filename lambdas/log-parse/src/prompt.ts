// Builds the strict-JSON Bedrock prompt for mapping a free-text daily log
// onto the caller-supplied action/field ids. No PHI is echoed into logs.
import type { LogParseRequest } from './validate';

export const SYSTEM_PROMPT = `You convert a short natural-language daily-log note into strict JSON.
Rules:
- Map the note onto ONLY the provided action ids and field ids. Never invent new ids.
- An action value is true (done), false (explicitly not done / skipped), or null (not mentioned).
- A field value is a number if mentioned (approximate wording like "about seven" is fine), or null if not mentioned.
- Clamp every field number to its given min/max range.
- Anything ambiguous or that you're not confident mapping goes into "unclear" as a short plain-language phrase — do not guess.
- "notes" is any leftover free text not captured by actions/fields, trimmed to 200 characters, or an empty string.
- Respond with ONLY a single JSON object, no prose, no markdown fences. Shape:
{"actions": {"<actionId>": true|false|null, ...}, "fields": {"<fieldId>": number|null, ...}, "notes": "string", "unclear": ["string", ...]}`;

export function buildUserPrompt(req: LogParseRequest): string {
  const actionsList = req.actions.map((a) => `- id="${a.id}" label="${a.label}"`).join('\n');
  const fieldsList = req.fields
    .map((f) => `- id="${f.id}" label="${f.label}"${f.unit ? ` unit="${f.unit}"` : ''}${f.min !== undefined ? ` min=${f.min}` : ''}${f.max !== undefined ? ` max=${f.max}` : ''}`)
    .join('\n');

  return `Date: ${req.date}

Actions to detect:
${actionsList || '(none)'}

Fields to detect:
${fieldsList || '(none)'}

Daily log note:
"""${req.text}"""

Return the JSON object now.`;
}
