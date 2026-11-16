// node --test infra/scripts/push-patch-tracking-move.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, buildMove, movePlan } from './push-patch-tracking-move-lib.mjs';

test('parseArgs requires contact, from, to; apply defaults false', () => {
  const o = parseArgs(['--contact', 'c', '--from', 'encounter#a', '--to', 'encounter#b']);
  assert.deepEqual(o, { contact: 'c', from: 'encounter#a', to: 'encounter#b', apply: false });
  assert.equal(parseArgs(['--contact', 'c', '--from', 'a', '--to', 'b', '--apply']).apply, true);
  assert.throws(() => parseArgs(['--contact', 'c', '--from', 'a']), /--to/);
  assert.throws(() => parseArgs(['--contact', 'c', '--from', 'a', '--to', 'a']), /differ/);
});

test('movePlan refuses when from lacks tracking or to is not eligible', () => {
  const from = { trackingNumber: 'T', carrier: 'UPS', shippedAt: 'S', state: 'script-written' };
  assert.equal(movePlan(from, { state: 'script-written' }), null);
  assert.match(movePlan({ ...from, trackingNumber: undefined }, { state: 'script-written' }), /no tracking/);
  assert.match(movePlan(from, { state: 'script-written', trackingNumber: 'X' }), /already has tracking/);
  assert.match(movePlan(from, { state: 'declined' }), /script-written/);
  assert.match(movePlan(from, undefined), /not found/);
});

test('buildMove: conditional set on to, then marker + remove on from', () => {
  const [toP, fromP] = buildMove('c', 'encounter#a', 'encounter#b', { trackingNumber: 'T', carrier: 'UPS', shippedAt: 'S' }, '2026-11-16T00:00:00Z');
  assert.deepEqual(toP.Key, { contactId: 'c', sk: 'encounter#b' });
  assert.equal(toP.ConditionExpression, 'attribute_not_exists(trackingNumber) AND #st = :s');
  assert.equal(toP.ExpressionAttributeValues[':t'], 'T');
  assert.equal(toP.ExpressionAttributeValues[':a'], 'S');
  assert.deepEqual(fromP.Key, { contactId: 'c', sk: 'encounter#a' });
  assert.match(fromP.UpdateExpression, /REMOVE trackingNumber, carrier, shippedAt/);
  assert.match(fromP.UpdateExpression, /shippedUntracked = :u/);
  assert.equal(fromP.ConditionExpression, 'trackingNumber = :t');
  assert.equal(fromP.ExpressionAttributeValues[':u'], true);
});
