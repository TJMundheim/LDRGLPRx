import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const sub = ctx.identity.sub;
  const email = ctx.identity.claims?.email ?? '';
  const now = util.time.nowISO8601();
  const input = ctx.args.input ?? {};
  // Entitlement/billing fields are backend-only — a signed-in user must never
  // self-escalate these via this self-service mutation (audit 2026-07-07).
  const PRIVILEGED = { tier: true, hasActiveSubscription: true, stripeCustomerId: true };
  const setExpr = ['#owner = :owner', '#updatedAt = :updatedAt'];
  const names = { '#owner': 'owner', '#updatedAt': 'updatedAt' };
  const values = { ':owner': sub, ':updatedAt': now };
  for (const [k, v] of Object.entries(input)) {
    if (PRIVILEGED[k]) continue;
    if (v !== undefined && v !== null) {
      setExpr.push(`#${k} = :${k}`);
      names[`#${k}`] = k;
      values[`:${k}`] = v;
    }
  }
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: sub }),
    update: {
      expression: `SET ${setExpr.join(', ')}, #primaryEmail = if_not_exists(#primaryEmail, :primaryEmail), #createdAt = if_not_exists(#createdAt, :createdAt)`,
      expressionNames: { ...names, '#primaryEmail': 'primaryEmail', '#createdAt': 'createdAt' },
      expressionValues: util.dynamodb.toMapValues({ ...values, ':primaryEmail': email, ':createdAt': now }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  return ctx.result;
}
