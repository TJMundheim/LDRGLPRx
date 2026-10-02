import type { StoredScreening } from './screening';

type Fields = Record<string, unknown>;
type Input = {
  UpdateExpression: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues: Fields;
};

/** Present = not undefined/null/empty string. Arrays (even empty) are real answers and are kept. */
const present = (v: unknown) => v !== undefined && v !== null && v !== '';

/**
 * Two non-destructive UpdateItem inputs (DynamoDB forbids overlapping paths in one expression):
 *  1. create any missing top-level maps with if_not_exists (never replaces an existing map)
 *  2. SET only the specific nested fields this intake provides
 * Nothing the record already holds (height, weight, other demographics, other consents, other
 * lanes' screening answers) is ever removed.
 */
export function buildRecordUpdates(a: {
  demographics: Fields; history: Fields; screening: StoredScreening; consentKey: string; consent: Fields; ts: string;
}): [Input, Input] {
  const ensure: Input = {
    UpdateExpression: 'SET demographics = if_not_exists(demographics, :e), history = if_not_exists(history, :e), '
      + 'screeningAnswers = if_not_exists(screeningAnswers, :e), consents = if_not_exists(consents, :e), '
      + 'createdAt = if_not_exists(createdAt, :ts)',
    ExpressionAttributeValues: { ':e': {}, ':ts': a.ts },
  };
  const names: Record<string, string> = {};
  const values: Fields = { ':ts': a.ts };
  const sets: string[] = ['updatedAt = :ts'];
  const add = (map: string, field: string, value: unknown) => {
    const i = sets.length;
    names[`#m${i}`] = map;
    names[`#f${i}`] = field;
    values[`:v${i}`] = value;
    sets.push(`#m${i}.#f${i} = :v${i}`);
  };
  for (const [k, v] of Object.entries(a.demographics)) if (present(v)) add('demographics', k, v);
  for (const [k, v] of Object.entries(a.history)) if (present(v)) add('history', k, v);
  add('screeningAnswers', 'pushPatch', a.screening);
  add('consents', a.consentKey, a.consent);
  return [ensure, { UpdateExpression: `SET ${sets.join(', ')}`, ExpressionAttributeNames: names, ExpressionAttributeValues: values }];
}
