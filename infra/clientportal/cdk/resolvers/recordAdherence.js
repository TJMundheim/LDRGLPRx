import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const userId = ctx.identity.sub;
  const { date, actionId, completed, value, notes } = ctx.args.input;
  const dateActionId = `${date}#${actionId}`;
  const key = util.dynamodb.toMapValues({ userId, dateActionId });

  if (completed === false) {
    return { operation: 'DeleteItem', key };
  }

  const now = util.time.nowISO8601();
  const attrs = { completedAt: now };
  if (value !== null && value !== undefined) attrs.value = value;
  if (notes !== null && notes !== undefined) attrs.notes = notes;

  return {
    operation: 'PutItem',
    key,
    attributeValues: util.dynamodb.toMapValues(attrs),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  const { date, actionId, completed, value, notes } = ctx.args.input;
  if (completed === false) return null;
  return {
    userId: ctx.identity.sub,
    dateActionId: `${date}#${actionId}`,
    completedAt: ctx.result?.completedAt ?? util.time.nowISO8601(),
    value: value ?? null,
    notes: notes ?? null,
  };
}
