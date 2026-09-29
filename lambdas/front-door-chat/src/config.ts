// Shared constants + env wiring for the AI front-door chat.
// Nothing here does I/O; every module reads its knobs from this file so the
// deploy script has a single list of env vars to set.

export const REGION = process.env.AWS_REGION ?? 'us-east-2';

/** Haiku via the cross-region inference profile — HIPAA rule: Bedrock only. */
export const CHAT_MODEL =
  process.env.BEDROCK_MODEL ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

/** Titan Text Embeddings v2 — must match the model the index was built with. */
export const EMBED_MODEL = process.env.EMBED_MODEL ?? 'amazon.titan-embed-text-v2:0';

export const MAX_TOKENS = 400;
export const TEMPERATURE = 0.3;

/** Retrieval: cosine top-k before title dedupe. */
export const TOP_K = 6;

/** Local index path; falls back to S3 when INDEX_S3_BUCKET/KEY are set. */
export const INDEX_PATH = process.env.INDEX_PATH ?? './index/chunks.json';
export const INDEX_S3_BUCKET = process.env.INDEX_S3_BUCKET ?? '';
export const INDEX_S3_KEY = process.env.INDEX_S3_KEY ?? '';

/** Anonymous transcript store (30-day TTL, redacted). */
export const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE ?? 'Conversations';
export const TRANSCRIPT_TTL_DAYS = 30;

/** Browser-facing limits — mirrored in the widget. */
export const MAX_MESSAGE_CHARS = 600;
export const MAX_HISTORY_TURNS = 6;
export const MAX_HISTORY_CHARS = 4000;

export const ALLOWED_ORIGINS = ['https://my4mlife.com', 'https://www.my4mlife.com'];

/** The two exits. Nothing else is a destination. */
export const ASSESSMENT_PATH = '/assessment';
export const CONSULT_PATH = '/consult';

/** Shown when the guard rejects a model reply outright. */
export const SAFE_FALLBACK =
  "That one I'd rather not answer from a web page — it depends on your record, and I'm an AI, not your physician. " +
  'The fastest route is the free care coordinator call: you talk to a real person, and if a treatment lane makes ' +
  'sense your record goes to one of our network’s licensed physicians for review. Nothing to pay for the call.';
