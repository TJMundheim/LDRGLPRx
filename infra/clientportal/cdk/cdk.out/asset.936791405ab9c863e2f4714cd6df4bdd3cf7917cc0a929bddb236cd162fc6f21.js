// Pipeline function 2: PutItem UserProfile if previous step returned null
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  if (ctx.prev.result) {
    return { operation: 'GetItem', key: util.dynamodb.toMapValues({ id: ctx.identity.sub }) };
  }
  const sub = ctx.identity.sub;
  const email = ctx.identity.claims?.email ?? '';
  const now = util.time.nowISO8601();
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ id: sub }),
    attributeValues: util.dynamodb.toMapValues({
      owner: sub,
      primaryEmail: email,
      createdAt: now,
      updatedAt: now,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
