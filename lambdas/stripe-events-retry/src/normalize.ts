export type RetryPayload = { id: string; type: string; livemode: boolean; attemptCount: number };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

// SQS body -> RetryPayload, or null if unusable. Accepts (1) a raw EventBridge envelope from the
// DLQ ({detail:{id,type,livemode,...}} = full Stripe event; attemptCount starts at 0) or
// (2) the flat {id,type,livemode,attemptCount} shape. Never throws.
export function normalizePayload(raw: unknown): RetryPayload | null {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    try { v = JSON.parse(raw); } catch { return null; }
  }
  if (!isObj(v)) return null;
  const d = v['detail'];
  if (isObj(d) && isStr(d['id']) && isStr(d['type'])) {
    return { id: d['id'], type: d['type'], livemode: d['livemode'] === true, attemptCount: 0 };
  }
  if (isStr(v['id']) && isStr(v['type'])) {
    const n = Number(v['attemptCount']);
    return { id: v['id'], type: v['type'], livemode: v['livemode'] === true, attemptCount: Number.isFinite(n) && n >= 0 ? n : 0 };
  }
  return null;
}
