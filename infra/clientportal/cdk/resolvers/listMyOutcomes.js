import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const sub = ctx.identity.sub;
  return {
    operation: 'Query',
    index: 'byOwner',
    query: {
      expression: '#owner = :owner',
      expressionNames: { '#owner': 'owner' },
      expressionValues: util.dynamodb.toMapValues({ ':owner': sub }),
    },
    limit: ctx.args.limit ?? 50,
    nextToken: ctx.args.nextToken,
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return { items: ctx.result.items ?? [], nextToken: ctx.result.nextToken };
}
