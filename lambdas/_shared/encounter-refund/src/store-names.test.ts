// Guards against DynamoDB's "unused ExpressionAttributeNames" ValidationException, which the mocked
// client in index.test.ts cannot catch: every name placeholder sent must appear in an expression.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sent: any[] = [];
vi.mock('@aws-sdk/lib-dynamodb', async (orig) => {
  const real: any = await orig();
  return { ...real, DynamoDBDocumentClient: { from: () => ({ send: async (c: any) => { sent.push(c.input); return {}; } }) } };
});

import { claim, rollback, finalize } from './store';

function assertNamesUsed(input: any) {
  const exprs = [input.UpdateExpression, input.ConditionExpression, input.ProjectionExpression, input.FilterExpression].filter(Boolean).join(' ');
  for (const k of Object.keys(input.ExpressionAttributeNames ?? {})) expect(exprs, `unused name ${k}`).toContain(k);
  for (const k of Object.keys(input.ExpressionAttributeValues ?? {})) expect(exprs, `unused value ${k}`).toContain(k);
}

describe('store expressions only send names/values they use', () => {
  beforeEach(() => { sent.length = 0; });
  it('claim', async () => { await claim('c', 'pp-x'); sent.forEach(assertNamesUsed); });
  it('rollback', async () => { await rollback('c', 'pp-x'); sent.forEach(assertNamesUsed); });
  it('finalize', async () => { await finalize({ contactId: 'c', encounterId: 'pp-x', refundId: 're_1', amountCents: 200, actor: 'a' }); sent.forEach(assertNamesUsed); });
});
