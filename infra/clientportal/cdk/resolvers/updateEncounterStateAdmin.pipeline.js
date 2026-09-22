// Pipeline before/after for updateEncounterStateAdmin.
// Functions: getRecordConsentsFn (stashes consents) -> updateEncounterStateFn.
export function request(ctx) {
  return {};
}

export function response(ctx) {
  return ctx.prev.result;
}
