import { util } from '@aws-appsync/utils';

function isAdmin(ctx) {
  const g1 = ctx.identity.groups;
  const g2 = ctx.identity.claims ? ctx.identity.claims['cognito:groups'] : null;
  const groups = g1 ? g1 : (g2 ? g2 : []);
  return Array.isArray(groups) && groups.includes('Admins');
}

// Legal state-machine transitions: toState -> [allowed fromStates]
var TRANSITIONS = {
  'coordinator-reviewed': ['new'],
  'sent-to-provider':     ['coordinator-reviewed'],
  'script-written':       ['sent-to-provider'],
  'fulfilled':            ['script-written'],
  'declined':             ['new', 'coordinator-reviewed', 'sent-to-provider', 'script-written'],
};

export function request(ctx) {
  if (!isAdmin(ctx)) util.unauthorized();

  var toState = ctx.args.toState;
  var allowed = TRANSITIONS[toState];
  if (!allowed) {
    util.error('illegal target state: ' + toState, 'BadTransition');
  }

  var contactId = ctx.args.contactId;
  var encounterId = ctx.args.encounterId;
  var now = util.time.nowISO8601();

  // Build IN (:allowed0, :allowed1, ...) for the ConditionExpression.
  // APPSYNC_JS forbids `for` loops and `++`, so use array methods.
  var placeholders = allowed.map(function (s, i) {
    return ':allowed' + i;
  });
  var allowedRaw = {};
  allowed.forEach(function (s, i) {
    allowedRaw[':allowed' + i] = s;
  });

  var conditionExpr =
    'attribute_exists(contactId) AND #state IN (' + placeholders.join(', ') + ')';

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      contactId: contactId,
      sk: 'encounter#' + encounterId,
    }),
    update: {
      expression: 'SET #state = :toState, #updatedAt = :updatedAt',
      expressionNames: {
        '#state': 'state',
        '#updatedAt': 'updatedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':toState': toState,
        ':updatedAt': now,
      }),
    },
    condition: {
      expression: conditionExpr,
      expressionNames: { '#state': 'state' },
      expressionValues: util.dynamodb.toMapValues(allowedRaw),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    // ConditionalCheckFailed means: item not found OR state machine constraint violated.
    if (ctx.error.type === 'DynamoDB:ConditionalCheckFailedException') {
      util.error(
        'illegal transition or encounter not found (contactId=' +
          ctx.args.contactId + ', encounterId=' + ctx.args.encounterId +
          ', toState=' + ctx.args.toState + ')',
        'BadTransition',
      );
    }
    util.error(ctx.error.message, ctx.error.type);
  }

  var item = ctx.result;
  var sk = item.sk ? item.sk : '';
  var encId = sk.indexOf('encounter#') === 0 ? sk.slice('encounter#'.length) : ctx.args.encounterId;

  return {
    encounterId: encId,
    category: item.category ? item.category : null,
    state: item.state ? item.state : ctx.args.toState,
    visitType: item.visitType ? item.visitType : null,
    createdAt: item.createdAt ? item.createdAt : null,
    updatedAt: item.updatedAt ? item.updatedAt : null,
  };
}
