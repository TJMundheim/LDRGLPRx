import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();
  // Query all items for this contactId (record, encounter#*, audit#*, brief#*,
  // plan#*) in one shot.
  return {
    operation: 'Query',
    query: {
      expression: '#pk = :contactId',
      expressionNames: { '#pk': 'contactId' },
      expressionValues: { ':contactId': { S: ctx.args.contactId } },
    },
    limit: 1000,
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);

  const items = ctx.result.items ? ctx.result.items : [];

  // Partition items by SK prefix. APPSYNC_JS forbids `for` loops and `++`.
  const recordItems = items.filter(function (item) {
    return (item.sk ? item.sk : '') === 'record';
  });
  const recordItem = recordItems.length ? recordItems[0] : null;

  const encounters = items
    .filter(function (item) {
      return (item.sk ? item.sk : '').indexOf('encounter#') === 0;
    })
    .map(function (item) {
      return {
        encounterId: item.sk.slice('encounter#'.length),
        category: item.category ? item.category : null,
        state: item.state ? item.state : 'new',
        visitType: item.visitType ? item.visitType : null,
        lane: item.lane ? item.lane : null,
        laneLabel: item.laneLabel ? item.laneLabel : null,
        priceCents: item.priceCents ? item.priceCents : null,
        providerSentTo: item.providerSentTo ? item.providerSentTo : null,
        providerSentAt: item.providerSentAt ? item.providerSentAt : null,
        packetKey: item.packetKey ? item.packetKey : null,
        amountCents: item.amountCents ? item.amountCents : (item.priceCents ? item.priceCents : null),
        refundStatus: item.refundStatus ? item.refundStatus : null,
        refundDueBy: item.refundDueBy ? item.refundDueBy : null,
        refundedAt: item.refundedAt ? item.refundedAt : null,
        genesisOrderSentAt: item.genesisOrderSentAt ? item.genesisOrderSentAt : null,
        decidedAt: item.decidedAt ? item.decidedAt : null,
        decidedBy: item.decidedBy ? item.decidedBy : null,
        testOrder: item.testOrder === true ? true : null,
        createdAt: item.createdAt ? item.createdAt : null,
        updatedAt: item.updatedAt ? item.updatedAt : null,
      };
    });

  const auditEntries = items
    .filter(function (item) {
      return (item.sk ? item.sk : '').indexOf('audit#') === 0;
    })
    .map(function (item) {
      return {
        at: item.at ? item.at : null,
        action: item.action ? item.action : '',
        detail: item.detail ? item.detail : null,
        actor: item.actor ? item.actor : null,
      };
    });

  const briefs = items
    .filter(function (item) {
      return (item.sk ? item.sk : '').indexOf('brief#') === 0;
    })
    .map(function (item) {
      return {
        encounterId: item.sk.slice('brief#'.length),
        json: item.json ? item.json : null,
        createdAt: item.createdAt ? item.createdAt : null,
      };
    });

  const plans = items
    .filter(function (item) {
      return (item.sk ? item.sk : '').indexOf('plan#') === 0;
    })
    .map(function (item) {
      return {
        encounterId: item.sk.slice('plan#'.length),
        state: item.state ? item.state : 'draft',
        json: item.json ? item.json : null,
        createdAt: item.createdAt ? item.createdAt : null,
        sentAt: item.sentAt ? item.sentAt : null,
      };
    });

  if (!recordItem) return null;

  return {
    contactId: recordItem.contactId ? recordItem.contactId : ctx.args.contactId,
    demographics: recordItem.demographics ? recordItem.demographics : null,
    history: recordItem.history ? recordItem.history : null,
    screeningAnswers: recordItem.screeningAnswers ? recordItem.screeningAnswers : null,
    consents: recordItem.consents ? recordItem.consents : null,
    cardOnFile: recordItem.cardOnFile ? recordItem.cardOnFile : null,
    createdAt: recordItem.createdAt ? recordItem.createdAt : null,
    updatedAt: recordItem.updatedAt ? recordItem.updatedAt : null,
    encounters: encounters,
    audit: auditEntries,
    briefs: briefs,
    plans: plans,
  };
}
