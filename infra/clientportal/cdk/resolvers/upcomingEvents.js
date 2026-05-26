import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const now = util.time.nowISO8601();
  return {
    operation: 'Scan',
    filter: {
      expression: '#status = :scheduled AND #startsAt >= :now',
      expressionNames: { '#status': 'status', '#startsAt': 'startsAt' },
      expressionValues: util.dynamodb.toMapValues({
        ':scheduled': 'scheduled',
        ':now': now,
      }),
    },
    limit: ctx.args.limit ? ctx.args.limit : 20,
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result.items ? ctx.result.items : [];
}
