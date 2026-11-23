// Owner rule (TJ 2026-11-23): the full drug name for GLP-3 never appears on a public surface.
// Shared by scripts/build-index.mjs (index text) and the Lambda (model replies, link labels).
export const scrubReta = (s) => s.replace(/retatrutide/gi, 'Reta');
