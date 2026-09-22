import { util } from '@aws-appsync/utils';

// First function in the updateEncounterStateAdmin pipeline. APPSYNC_JS unit
// resolvers can only touch one item, so this fetches the patient's root
// `record` item and stashes its `consents` map for the update function to
// gate on (sent-to-provider requires both HIPAA consents signed).
export function request(ctx) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      contactId: ctx.args.contactId,
      sk: 'record',
    }),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  var record = ctx.result;
  ctx.stash.consents = record && record.consents ? record.consents : {};
  return ctx.stash.consents;
}
