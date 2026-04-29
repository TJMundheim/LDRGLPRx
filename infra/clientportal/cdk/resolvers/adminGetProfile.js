import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const groups = ctx.identity.groups ?? ctx.identity.claims?.['cognito:groups'] ?? [];
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id: ctx.args.userId }),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
