# 4M Client Portal

Svelte 5 + Vite + TypeScript (strict). Single-page client workbook for the 4M
brain-optimization cohort program.

## Scripts

```
pnpm dev        # Vite dev server
pnpm build      # → dist/
pnpm preview    # preview built output
pnpm check      # svelte-check type verification (zero errors expected)
```

## Architecture

```
src/
  App.svelte                root — owns $state workbook + routing
  main.ts                   Svelte mount
  app.css                   design system (ported verbatim from style.css)
  lib/
    components/             Svelte 5 runes components
    content/                typed workbook content (factors, supplements, ...)
    data/schema.ts          Workbook + related domain types
    storage/                storage abstraction (LocalStorageAdapter default)
    integrations/           auth / payments / telemed stubs
    renderer.ts             HTML-string page renderer (ported from legacy app.js)
```

Pages currently render via `{@html}` driven by `renderer.ts`, which consumes the
typed `content/*.ts` files. This preserves the v1 visual design 1:1 while the
content shape and state model are already in their final typed form. As the
design-system componentization proceeds, individual `renderX()` functions are
replaced by dedicated `.svelte` views without touching content or storage.

Storage access always goes through `storage.saveWorkbook(...)` — never
`localStorage` directly. Swapping to Supabase means changing only
`src/lib/storage/index.ts`.

## Deploy — Cloudflare Pages

Static build. Connect this directory as a CF Pages project:

- **Build command:** `pnpm -C apps/clientportal build`
- **Build output directory:** `apps/clientportal/dist`
- **Root directory (advanced):** repo root
- **Node version:** 24

`public/_redirects` + `public/_headers` are emitted into `dist/` automatically.

### Environment variables (set per CF Pages environment when ready)

```
# PUBLIC_SUPABASE_URL=
# PUBLIC_SUPABASE_ANON_KEY=
# PUBLIC_STRIPE_PUBLISHABLE_KEY=
# PUBLIC_TELEMED_PROVIDER=
```

## Legacy reference files

`src/app.js.legacy`, `src/main.js.legacy`, `src/style.css.legacy` are preserved
during the Svelte polish pass — safe to delete once all pages are componentized.
