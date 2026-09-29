// Anonymous 30-day transcript write, for tuning only. Never logged, always redacted.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CONVERSATIONS_TABLE, REGION, TRANSCRIPT_TTL_DAYS } from './config';
import type { Exit } from './guard';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g;
// 10+ consecutive digits catch-all (unformatted phone / account numbers).
const LONG_DIGITS_RE = /\b\d{10,}\b/g;

/** Strips anything that could identify a visitor before it is persisted. */
export function redact(text: string): string {
  return text
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(PHONE_RE, '[redacted-phone]')
    .replace(LONG_DIGITS_RE, '[redacted-number]');
}

export interface TranscriptTurn {
  sessionId: string;
  question: string;
  answer: string;
  exit: Exit;
}

/** Best-effort write — a store failure must never fail the visitor's answer. */
export async function saveTurn(turn: TranscriptTurn): Promise<void> {
  const now = new Date();
  try {
    await ddb.send(new PutCommand({
      TableName: CONVERSATIONS_TABLE,
      Item: {
        contactId: `chat#${turn.sessionId}`,
        sk: now.toISOString(),
        q: redact(turn.question),
        a: redact(turn.answer),
        exit: turn.exit,
        ttl: Math.floor(now.getTime() / 1000) + TRANSCRIPT_TTL_DAYS * 86400,
      },
    }));
  } catch (e) {
    // Metadata only — never the question or the answer.
    console.warn('front-door-chat transcript write failed', e instanceof Error ? e.name : 'unknown');
  }
}
