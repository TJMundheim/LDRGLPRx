import { v5 as uuidv5 } from 'uuid';

// Must match lambdas/protege-signup and lambdas/audit-complete. All Contact-
// writing surfaces derive the PK identically so a purchase never creates an
// orphan Contact row separate from the Protégé row.
export const NAMESPACE = 'f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0';

export function deriveContactId(email: string): string {
  return uuidv5(email.trim().toLowerCase(), NAMESPACE);
}

// Resolution order for Stripe handlers:
//   1. metadata.contactId set by create-checkout-session (most reliable)
//   2. derived from email
// Returns null if neither is available — caller should reject the event.
export function resolveContactId(opts: { metadataContactId?: string | null; email?: string | null }): string | null {
  const meta = opts.metadataContactId?.trim();
  if (meta) return meta;
  const email = opts.email?.trim().toLowerCase();
  if (email) return deriveContactId(email);
  return null;
}
