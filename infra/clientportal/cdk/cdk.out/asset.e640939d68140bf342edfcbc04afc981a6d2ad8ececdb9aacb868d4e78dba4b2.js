// Pipeline function 1: GetItem UserProfile by ctx.identity.sub
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const sub = ctx.identity.sub;
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({ id: sub }),
  };
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
