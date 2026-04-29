import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const sub = ctx.identity.sub;
  const id = util.autoId();
  const now = util.time.nowISO8601();
  const input = ctx.args.input;
  const item = {
    id,
    owner: sub,
    weekISO: input.weekISO,
    month: input.month,
    week: input.week,
    scores: input.scores,
    freeText: input.freeText ?? null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ id }),
    attributeValues: util.dynamodb.toMapValues(item),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
