import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  // planJson is AWSJSON — AppSync parses it into an object before the resolver
  // runs. Pass it through untouched; the Lambda accepts an object or a string.
  return {
    operation: 'Invoke',
    payload: {
      arguments: {
        action: 'send',
        contactId: ctx.arguments.contactId,
        encounterId: ctx.arguments.encounterId,
        planJson: ctx.arguments.planJson,
      },
      identity: ctx.identity,
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
