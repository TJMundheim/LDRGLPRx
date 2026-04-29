import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const groups = ctx.identity.groups ?? ctx.identity.claims?.['cognito:groups'] ?? [];
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  return {
    operation: 'Scan',
    limit: ctx.args.limit ?? 50,
    nextToken: ctx.args.nextToken,
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return { items: ctx.result.items ?? [], nextToken: ctx.result.nextToken };
}
