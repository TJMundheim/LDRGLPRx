import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const contactId = ctx.identity.sub;
  const { eventId, status } = ctx.args;
  const now = util.time.nowISO8601();
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ eventId, contactId }),
    attributeValues: util.dynamodb.toMapValues({
      status,
      rsvpedAt: now,
    }),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
