import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const userId = ctx.identity.sub;
  const { dateFrom, dateTo } = ctx.args;
  return {
    operation: 'Query',
    query: {
      expression: '#pk = :pk AND #sk BETWEEN :from AND :to',
      expressionNames: { '#pk': 'userId', '#sk': 'dateActionId' },
      expressionValues: util.dynamodb.toMapValues({
        ':pk': userId,
        ':from': `${dateFrom}#`,
        ':to': `${dateTo}#zzz`,
      }),
    },
    limit: 1000,
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result.items ?? [];
}
