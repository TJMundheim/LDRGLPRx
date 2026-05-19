// Reads #audit=<base64-json> from the URL on first load and seeds the app's
// localStorage so a website-audit visitor lands inside the workbook with
// their top-3 priorities pre-filled. No-op when no hash is present.
//
// Hash payload shape (produced by website/src/pages/audit.astro):
//   { firstName, email, phone, scores: { gut, sleep, weight, ... 0-10 } }
//
// Website slug → App AuditCategory.id mapping. Update both sides if either
// taxonomy changes.

const SLUG_TO_APP_ID: Record<string, string> = {
  gut: 'gut-microbiome',
  sleep: 'sleep',
  weight: 'weight-body-fat',
  nutrition: 'nutrition',
  'erectile-dysfunction': 'erectile-dysfunction',
  environment: 'environment',
  cognitive: 'cognitive',
  hormones: 'hormone-balance',
};

export function ingestAuditHandoff(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (!hash.startsWith('#audit=')) return;

  try {
    const payload = JSON.parse(atob(decodeURIComponent(hash.slice('#audit='.length))));
    const scores: Record<string, number> = {};
    if (payload.scores && typeof payload.scores === 'object') {
      for (const [slug, value] of Object.entries(payload.scores)) {
        const appId = SLUG_TO_APP_ID[slug];
        if (appId && typeof value === 'number') scores[appId] = value;
      }
    }
    if (Object.keys(scores).length > 0) {
      localStorage.setItem('audit-v1', JSON.stringify({ scores }));
      localStorage.setItem('intake-complete-v1', '1');
    }
    // Seed basics-v1 with whatever we know so the dashboard greeting and any
    // basics-aware UI can render immediately. Stage1Basics will fill the rest.
    if (payload.firstName || payload.phone || payload.email) {
      const existingRaw = localStorage.getItem('basics-v1');
      const existing = existingRaw ? (() => { try { return JSON.parse(existingRaw); } catch { return {}; } })() : {};
      const merged = {
        ...existing,
        name: existing.name || String(payload.firstName ?? '').trim(),
        phone: existing.phone || String(payload.phone ?? '').trim(),
        email: existing.email || String(payload.email ?? '').trim(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('basics-v1', JSON.stringify(merged));
    }
    console.debug('[audit-handoff] ingested', { scoreKeys: Object.keys(scores), hasName: !!payload.firstName });
  } catch (e) {
    console.warn('[audit-handoff] failed to parse hash payload', e);
  } finally {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
