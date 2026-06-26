import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  // Scan for items whose SK = 'record' (the top-level patient record rows).
  return {
    operation: 'Scan',
    limit: ctx.args.limit ? ctx.args.limit : 50,
    filter: {
      expression: '#sk = :record',
      expressionNames: { '#sk': 'sk' },
      expressionValues: { ':record': { S: 'record' } },
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  const items = ctx.result.items ? ctx.result.items : [];
  // Each item has no nested encounters/audit from this scan — return empty arrays
  // for those fields so the type contract is satisfied; getPatientRecordAdmin
  // fetches the full composite view.
  return items.map(function(item) {
    return {
      contactId: item.contactId ? item.contactId : '',
      demographics: item.demographics ? item.demographics : null,
      history: item.history ? item.history : null,
      screeningAnswers: item.screeningAnswers ? item.screeningAnswers : null,
      consents: item.consents ? item.consents : null,
      cardOnFile: item.cardOnFile ? item.cardOnFile : null,
      createdAt: item.createdAt ? item.createdAt : null,
      updatedAt: item.updatedAt ? item.updatedAt : null,
      encounters: [],
      audit: [],
    };
  });
}
