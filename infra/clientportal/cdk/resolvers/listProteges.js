import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  return {
    operation: 'Scan',
    limit: ctx.args.limit ?? 50,
    nextToken: ctx.args.nextToken,
    filter: {
      // Membership = completed the assessment: stage 'protege' OR the protegeSince flag
      // (a customer who later took the assessment keeps lifecycleStage 'customer').
      expression: '#ls = :protege OR attribute_exists(#ps)',
      expressionNames: { '#ls': 'lifecycleStage', '#ps': 'protegeSince' },
      expressionValues: { ':protege': { S: 'protege' } },
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  const nowMs = util.time.nowEpochMilliSeconds();
  const rawItems = ctx.result.items ? ctx.result.items : [];
  const items = rawItems.map(function(item) {
    const createdAt = item.createdAt ? item.createdAt : '';
    const since = item.protegeSince ? item.protegeSince : createdAt;
    let daysAsProtege = 0;
    if (since) {
      const sinceMs = util.time.parseISO8601ToEpochMilliSeconds(since);
      const diff = nowMs - sinceMs;
      daysAsProtege = diff > 0 ? Math.floor(diff / 86400000) : 0;
    }
    return {
      contactId: item.contactId ? item.contactId : '',
      email: item.email ? item.email : '',
      firstName: item.firstName ? item.firstName : null,
      phone: item.phone ? item.phone : null,
      createdAt: createdAt,
      daysAsProtege: daysAsProtege,
    };
  });
  return { items: items, nextToken: ctx.result.nextToken };
}
