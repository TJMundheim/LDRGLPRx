// Coordinator-mode flag (TJ 2026-09-11 — INTERIM).
//
// While true, every front-door path — homepage hero + treatment cards,
// Navbar's top-level treatment links + Services "Prescription Therapies"
// menu, StickyMobileCta, and each /rx/*.astro page's CTA — routes to the
// free, no-card care-coordinator intake at /consult instead of straight
// into the Rx questionnaire + Stripe checkout flow. The questionnaires and
// Stripe flow stay fully built and are still reachable directly by URL;
// they are just unlinked from the front door while this is true.
//
// To revert to the direct-buy Rx front door, flip this back to `false`.
// That is the ONE flag — no other file needs to change.
export const COORDINATOR_MODE = true;

// Builds the /consult URL, optionally pre-selecting a treatment lane via
// ?lane=<slug> (consult.astro reads this on load to pre-check the matching
// "What are you curious about?" checkbox).
export const consultHref = (lane?: string): string =>
  lane ? `/consult?lane=${lane}` : '/consult';
