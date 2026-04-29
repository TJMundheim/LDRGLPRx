import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const sub = ctx.identity.sub;
  const now = util.time.nowISO8601();
  const secondary = ctx.args.secondaryEmail ?? null;
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: sub }),
    update: {
      expression: 'SET #secondaryEmail = :secondaryEmail, #updatedAt = :updatedAt, #owner = if_not_exists(#owner, :owner)',
      expressionNames: {
        '#secondaryEmail': 'secondaryEmail',
        '#updatedAt': 'updatedAt',
        '#owner': 'owner',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':secondaryEmail': secondary,
        ':updatedAt': now,
        ':owner': sub,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
