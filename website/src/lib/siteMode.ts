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
// `sex` ('female' | 'male') is carried through from the /women and /men doors
// (2026-09-22) so the consult intake can pre-fill it. Omit it everywhere else.
export const consultHref = (lane?: string, sex?: 'female' | 'male'): string => {
  const params = new URLSearchParams();
  if (lane) params.set('lane', lane);
  if (sex) params.set('sex', sex);
  const qs = params.toString();
  return qs ? `/consult?${qs}` : '/consult';
};

// Drafts awaiting TJ approval (Beasley partner band, founder coaching band and
// /coaching page, Running From Excuses block on /pillars/motivate). Normal
// builds hide them; build with PUBLIC_SHOW_DRAFTS=1 to preview.
// Spec: docs/plan/beasley-reciprocal-and-coaching-2026-10-17.md
export const SHOW_DRAFTS = import.meta.env.PUBLIC_SHOW_DRAFTS === '1';

// Randall Beasley partner section (Running From Excuses) — approved by TJ 2026-10-17, live.
export const SHOW_BEASLEY_PARTNER = true;

// The Captain's Table (/coaching + homepage band) — approved by TJ 2026-10-17, live.
export const SHOW_COACHING = true;

// Push Patch "What the testing showed" study section on /go/push-patch.
// OFF until TJ approves (docs/plan/overnight-2026-10-22.md). To go live set
// PP_STUDY_APPROVED = true. To preview without editing: build with
// PUBLIC_SHOW_PP_STUDY=1.
const PP_STUDY_APPROVED = false;
export const SHOW_PP_STUDY = PP_STUDY_APPROVED || import.meta.env.PUBLIC_SHOW_PP_STUDY === '1';
