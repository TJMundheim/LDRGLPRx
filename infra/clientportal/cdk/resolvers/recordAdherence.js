import { util } from '@aws-appsync/utils';

// Known action ids the app scores (audit #31 — reject typos / stale client
// versions / arbitrary ids so no invisible-effort rows can be minted).
const ALLOWED_ACTIONS = {
  'biome-ns-ultra': true, 'eating-window': true, 'protein-breakfast': true,
  'fasted-walk': true, 'strength': true, 'morning-routine': true,
  'move-pantry-purge': true, 'move-intensity': true, 'move-sleep-protocol': true,
  'move-name-your-face': true, 'move-heat-cold': true, 'move-book-labs': true,
  'move-retake-assessment': true,
  // Numeric measurements (stored with `value`, averaged per week on the dash).
  'measure-sys': true, 'measure-dia': true, 'measure-pulse': true,
  'measure-spo2': true, 'measure-weight': true, 'measure-waist': true,
};

export function request(ctx) {
  const userId = ctx.identity.sub;
  const { date, actionId, completed, value, notes } = ctx.args.input;
  if (!ALLOWED_ACTIONS[actionId]) {
    util.error(`unknown actionId: ${actionId}`, 'BadRequest');
  }
  // AWSDate is format-validated by AppSync; block future-dated writes so the
  // grid can't be pre-logged from the console.
  const todayStr = util.time.nowISO8601().slice(0, 10);
  if (date > todayStr) {
    util.error('cannot log a future date', 'BadRequest');
  }
  const dateActionId = `${date}#${actionId}`;
  const key = util.dynamodb.toMapValues({ userId, dateActionId });

  if (completed === false) {
    return { operation: 'DeleteItem', key };
  }

  const now = util.time.nowISO8601();
  const attrs = { completedAt: now };
  if (value !== null && value !== undefined) attrs.value = value;
  if (notes !== null && notes !== undefined) attrs.notes = notes;

  return {
    operation: 'PutItem',
    key,
    attributeValues: util.dynamodb.toMapValues(attrs),
  };
}

export function response(ctx) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  const { date, actionId, completed, value, notes } = ctx.args.input;
  if (completed === false) return null;
  return {
    userId: ctx.identity.sub,
    dateActionId: `${date}#${actionId}`,
    completedAt: ctx.result?.completedAt ?? util.time.nowISO8601(),
    value: value ?? null,
    notes: notes ?? null,
  };
}
