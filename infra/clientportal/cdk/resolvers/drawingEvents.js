import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

// Distinct `talk-*` event tags seen in Contact within the last 14 days, with entrant counts.
// Contact is ~tens of rows; a Scan is fine. Entrant = Contact whose `sources` contains the tag
// (written by audit-complete) OR whose `firstSource` is the tag.
export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  return {
    operation: 'Scan',
    limit: 1000,
    filter: {
      expression: '(attribute_exists(#s) OR begins_with(#fs, :p)) AND (attribute_not_exists(#ls) OR #ls <> :banned)',
      expressionNames: { '#s': 'sources', '#fs': 'firstSource', '#ls': 'lifecycleStage' },
      expressionValues: { ':p': { S: 'talk-' }, ':banned': { S: 'banned' } },
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  const cutoff = util.time.nowEpochMilliSeconds() - 14 * 86400000;
  const rawItems = ctx.result.items ? ctx.result.items : [];
  const byTag = {};
  rawItems.forEach(function(item) {
    const tags = [];
    const src = Array.isArray(item.sources) ? item.sources : [];
    src.forEach(function(s) {
      if (typeof s === 'string' && s.startsWith('talk-') && tags.indexOf(s) < 0) tags.push(s);
    });
    if (typeof item.firstSource === 'string' && item.firstSource.startsWith('talk-') && tags.indexOf(item.firstSource) < 0) {
      tags.push(item.firstSource);
    }
    const at = item.updatedAt ? item.updatedAt : '';
    tags.forEach(function(t) {
      if (!byTag[t]) byTag[t] = { tag: t, entrantCount: 0, lastEntryAt: '' };
      byTag[t].entrantCount += 1;
      if (at && (!byTag[t].lastEntryAt || util.time.parseISO8601ToEpochMilliSeconds(at) > util.time.parseISO8601ToEpochMilliSeconds(byTag[t].lastEntryAt))) {
        byTag[t].lastEntryAt = at;
      }
    });
  });
  return Object.keys(byTag)
    .map(function(k) { return byTag[k]; })
    .filter(function(e) {
      return e.lastEntryAt !== '' && util.time.parseISO8601ToEpochMilliSeconds(e.lastEntryAt) >= cutoff;
    });
}
