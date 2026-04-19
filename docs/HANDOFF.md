# LDRGLPRx — Handoff

## Repo layout
```
LDRGLPRx/
  website/           Astro (marketing site) — static output
  website_legacy/    Pre-Astro static HTML (reference; safe to delete)
  apps/clientportal/ Svelte 5 + Vite + TS (4M workbook / client portal)
  docs/              HANDOFF.md, plan/
```
- Git remote: `github.com/TJMundheim/LDRGLPRx`, branch `main`
- Package manager: **pnpm** (standalone; `$PNPM_HOME=/Users/thomasmundheim/Library/pnpm`, Node 24 managed by pnpm)

## Marketing site — `website/`
Astro static output, TypeScript strict. 13 pages + 404 + auto sitemap.
- Shared components: `Navbar`, `Footer`, `SEO`, `JsonLd`, `CookieBanner`, `MedicalDisclaimer`
- Per-page JSON-LD (Organization, MedicalBusiness, MedicalWebPage, FAQPage, etc.)
- `@astrojs/sitemap` auto-emits `dist/sitemap-index.xml`
- `public/robots.txt` has explicit allows for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.
- Dev: `cd website && pnpm dev` · Build: `pnpm build` → `dist/`
- Canonical domain: `https://ldrglprx.com` — **not yet registered**
- Deployment: pending domain purchase; planned `deploy.sh` → S3 + CloudFront + ACM (not written)

## Client portal — `apps/clientportal/`
Beta-prep port of the 2160-line vanilla-JS 4M workbook → Svelte 5 + Vite + TS strict. **Uncommitted at end of this session.**

```
src/
  main.ts, App.svelte, app.css
  lib/
    components/     Sidebar, WeekBanner, StatCard, ScoreButtons,
                    FactorCard, MorningTracker, SupplementCard, TrainingLog
    content/        factors.ts, supplements.ts, morningProtocol.ts,
                    nutrition.ts, weeks.ts, cognitive.ts  (all typed)
    data/schema.ts  Workbook + related types (maps to future Supabase schema)
    storage/        Storage interface + LocalStorageAdapter
                    (300ms debounce, keys 4m:workbook:<id> / 4m:index:<userId>)
    integrations/   telemed.ts, payments.ts, auth.ts — stubbed, typed contracts,
                    throw "Not implemented"
    renderer.ts     Typed port of legacy rendering, consumes content/*.
                    HTML strings injected via {@html}. Inline handlers call
                    window.portalAction / window.portalField, bridged in App.svelte.
src/*.legacy        Old vanilla JS/CSS kept as reference
public/_redirects, _headers   Cloudflare Pages config
README.md           dev/build/deploy instructions
vite.config.js      PWA preserved; Svelte plugin added
```

- Dev: `pnpm dev` · Build: `pnpm build` · Typecheck: `pnpm check`
- Build: **passes clean.** Typecheck: **0 errors**, 5 a11y warnings (non-blocking: click-on-div / form-label).
- Hardcoded `userId = "local-user"`, `workbookId = "local-workbook"` until auth lands.
- Placeholder portal domain: `app.ldrglprx.com`. User wants a better product name — suggestions offered: **fourm.app** (top pick), fourm.health, meridian, lodestar, apogee, vanguard.club, keystone, prologue, sentinel.

### Architectural decisions made
- Svelte 5 with runes (`$state`, `$derived`, `$effect`) — no stores unless needed
- No router library — sidebar-driven `currentView` state in App.svelte
- Storage is abstracted behind an interface so Supabase swap = one file change
- Integration seams (telemed/payments/auth) exist as stubs with typed contracts
- Weeks 2/3/4 currently use condensed stubs in renderer; full content still in `src/app.js.legacy` for progressive migration
- PWA manifest preserved from pre-port config

## What's blocking beta-testability
User is gathering (1–2 days):
- Telemed provider (Healthie / Spruce / iframe / other) → `integrations/telemed.ts`
- Stripe model: one-time vs subscription; self-checkout vs invoice → `integrations/payments.ts`
- Auth model: self-signup vs cohort-invite → `integrations/auth.ts`
- Coach/admin view: does TJ see clients' progress? separate app or role flag?
- Cohort mechanics (group chat? see each other?)
- Email/SMS nudges
- Additional content + outbound video links (add to `content/*.ts`)
- HIPAA posture if PHI stored

### When info arrives, next steps
1. Pick auth/data backend — **Supabase** recommended (swap `LocalStorageAdapter` for `SupabaseAdapter`)
2. Implement `auth.ts` / `payments.ts` / `telemed.ts` against chosen vendors
3. Componentize remaining renderer page functions (bring week 2/3/4 full content over from `app.js.legacy`)
4. Coach/admin view against mock data
5. Connect CF Pages project — build `pnpm -C apps/clientportal build`, output `apps/clientportal/dist`
6. Register chosen product domain, wire DNS

## Deferred / editorial
- Workbook PDF content issues flagged earlier (supplement count "4" vs 5 actual, box-breathing cadence "4-4" vs "4-4-4-4", loneliness/cold-shower citation accuracy, layout bugs on pages 5+21) — **user said skip**. Revisit during polish.
- BPC-157 / "Doctor TJ Special" — legal handled per user; do NOT flag as risk again.
- `website_legacy/` — delete once confident in Astro parity.

## User preferences (durable)
- Terse responses, no emojis
- Confirm scope before big refactors
- Don't over-engineer; no premature abstractions
- Deployment for marketing site via `deploy.sh`, not direct CLI or CloudFormation
- pnpm, not npm/yarn
- No llms.txt

## Git — recent commits
```
40ee252 Port static site to Astro with shared components and layouts
386f7c6 Trim project CLAUDE.md
717ac44 Migrate to Vite PWA (clientportal), Astro (website), add project rules
73daad3 Split blog into listing + 3 article pages, add AEO bot allow-lines
cefb6fb Add comprehensive JSON-LD structured data and FAQ sections for SEO/AEO
```

## Session-end TODO
- Review and commit the Svelte port of `apps/clientportal/` (currently ~30 new/modified files, build passes)
- Verify dev server looks right in a browser before committing (not done this session — build only)

## User instruction at session end
User was about to supply (days later): telemed provider choice, Stripe model, auth model, coach-view requirements, cohort mechanics, additional content + video links, and any other integrations. Pick up there.
