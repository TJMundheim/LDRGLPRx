// Pure helpers for push-patch-tracking-move.mjs.
export function parseArgs(argv) {
  const o = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--apply') o.apply = true;
    else if (['--contact', '--from', '--to'].includes(argv[i])) o[argv[i].slice(2)] = argv[++i];
    else throw new Error(`unknown arg ${argv[i]}`);
  }
  for (const k of ['contact', 'from', 'to']) if (!o[k]) throw new Error(`--${k} is required`);
  if (o.from === o.to) throw new Error('--from and --to must differ');
  return { contact: o.contact, from: o.from, to: o.to, apply: o.apply };
}

/** null when the move is allowed, otherwise a reason string. */
export function movePlan(from, to) {
  if (!from) return 'from encounter not found';
  if (!from.trackingNumber) return 'from encounter has no tracking to move';
  if (!to) return 'to encounter not found';
  if (to.trackingNumber) return 'to encounter already has tracking';
  if (to.state !== 'script-written') return 'to encounter is not script-written';
  return null;
}

/** [updateTo, updateFrom] DynamoDB UpdateCommand inputs. Apply in this order: to first, so tracking is never lost. */
export function buildMove(contactId, fromSk, toSk, t, now) {
  return [
    {
      Key: { contactId, sk: toSk },
      UpdateExpression: 'SET trackingNumber = :t, carrier = :k, shippedAt = :a, updatedAt = :n',
      ConditionExpression: 'attribute_not_exists(trackingNumber) AND #st = :s',
      ExpressionAttributeNames: { '#st': 'state' },
      ExpressionAttributeValues: { ':t': t.trackingNumber, ':k': t.carrier, ':a': t.shippedAt, ':n': now, ':s': 'script-written' },
    },
    {
      Key: { contactId, sk: fromSk },
      UpdateExpression: 'SET shippedUntracked = :u, updatedAt = :n REMOVE trackingNumber, carrier, shippedAt',
      ConditionExpression: 'trackingNumber = :t',
      ExpressionAttributeValues: { ':u': true, ':n': now, ':t': t.trackingNumber },
    },
  ];
}
