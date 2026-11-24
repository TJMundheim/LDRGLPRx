// Owner rule (TJ 2026-11-23): the full drug name for GLP-3 never appears on a public surface.
// Shared by scripts/build-index.mjs (index text) and the Lambda (model replies, link labels).
export const scrubReta = (s) => s.replace(/retatrutide/gi, 'Reta');

// GLP exit (TJ 2026-11-23): the answer's button goes to /go/glp-1, so no sentence may point at the
// care coordinator call, and none may promise a lab review (the GLP-1 path needs no labs).
const OFF_PATH = /coordinator|\/consult|\blabs?\b/i;
export const dropCoordinatorMentions = (s) => s.split(/\n{2,}/)
  .map((p) => (p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [p]).filter((x) => !OFF_PATH.test(x)).join('').trim())
  .filter(Boolean).join('\n\n');
