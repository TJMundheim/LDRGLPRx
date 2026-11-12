import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { reply, botCheck } from './http';
import { validate } from './validate';
import { saveEntry } from './store';
import { upsertEntryContact } from './contact';
import { notifyTJ } from './notify';

const DUPLICATE_MSG = 'You already entered this round. Reply to any challenge post if you need to fix it.';

/**
 * Pull-Up Challenge entry — POST /api/pullup-challenge-entry
 * Body: { name, email, phone, age, bodyweightLb, instagramUrl, round, rulesAccepted, smsOptIn, emailOptIn, consentVersion, hp?, t? }
 * Entry data (age, bodyweight, Instagram) lives only in PullUpChallengeEntries; Contact gets identity + explicit consent only.
 * Logs outcome codes only: never email, phone or name.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = (event.headers?.['origin'] ?? event.headers?.['Origin']) as string | undefined;
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(204, {}, origin);

  let body: any;
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return reply(400, { error: 'invalid JSON body' }, origin); }
  if (!body || typeof body !== 'object') return reply(400, { error: 'invalid JSON body' }, origin);

  const bot = botCheck(body);
  if (bot) { console.log(`[pullup-entry] bot-blocked ${bot}`); return reply(200, { ok: true }, origin); }

  const entry = validate(body);
  if (typeof entry === 'string') { console.log('[pullup-entry] invalid'); return reply(400, { error: entry }, origin); }

  try {
    if ((await saveEntry(entry, event.requestContext?.http?.sourceIp)) === 'duplicate') {
      console.log('[pullup-entry] duplicate');
      return reply(409, { error: DUPLICATE_MSG }, origin);
    }
  } catch { console.error('[pullup-entry] store-failed'); return reply(500, { error: 'Something went wrong. Please try again.' }, origin); }
  console.log(`[pullup-entry] stored ${entry.round}`);

  // The entry is saved; the rest is best effort and must not fail the request.
  try { await upsertEntryContact(entry); } catch { console.error('[pullup-entry] contact-failed'); }
  try { await notifyTJ(entry); } catch { console.error('[pullup-entry] notify-failed'); }
  return reply(200, { ok: true }, origin);
};
