import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

function cap(s) {
  const t = typeof s === 'string' ? s.trim() : '';
  return t ? t.substring(0, 1).toUpperCase() + t.substring(1).toLowerCase() : '';
}

// Returns ONLY contactId + "First L." — never email, phone or any health data.
export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  const tag = ctx.args.tag;
  if (typeof tag !== 'string' || !(tag === 'talk' || tag.startsWith('talk-'))) util.error('tag must be talk or start with talk-', 'BadRequest');
  return {
    operation: 'Scan',
    limit: 1000,
    filter: {
      expression: '(contains(#s, :t) OR #fs = :t) AND (attribute_not_exists(#ls) OR #ls <> :banned)',
      expressionNames: { '#s': 'sources', '#fs': 'firstSource', '#ls': 'lifecycleStage' },
      expressionValues: { ':t': { S: tag }, ':banned': { S: 'banned' } },
    },
  };
}

function words(s) {
  const t = typeof s === 'string' ? s.trim() : '';
  return t ? t.split(' ').filter(function(w) { return w !== ''; }) : [];
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  const rawItems = ctx.result.items ? ctx.result.items : [];
  return rawItems.map(function(item) {
    // The assessment asks for a first name only, but people often type "Tom Smith":
    // keep the first word, and use the last word as the initial when lastName is absent.
    const fw = words(item.firstName);
    const lw = words(item.lastName);
    const first = cap(fw.length ? fw[0] : '');
    const last = cap(lw.length ? lw[lw.length - 1] : (fw.length > 1 ? fw[fw.length - 1] : ''));
    let display = first ? first : 'Guest';
    if (first && last) display = first + ' ' + last.substring(0, 1) + '.';
    return { contactId: item.contactId, display: display };
  });
}
