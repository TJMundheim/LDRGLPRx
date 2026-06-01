import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  const now = util.time.nowISO8601();
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ eventId: ctx.args.eventId }),
    update: {
      expression: 'SET #recordingUrl = :recordingUrl, #updatedAt = :updatedAt',
      expressionNames: {
        '#recordingUrl': 'recordingUrl',
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':recordingUrl': ctx.args.recordingUrl,
        ':updatedAt': now,
      }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
