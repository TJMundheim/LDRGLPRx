# Plan: Security dependency upgrade (2026-10-27)

## Context
Christian warned TJ about active vulnerabilities. Lambdas are already on nodejs24.x with Auto runtime patching (2026-10-23), and TJ's Mac is on Node 24.22.1. `pnpm audit --prod` (whole workspace) found 62 issues: 1 critical, 27 high, 30 moderate, 4 low.
- **Critical:** astro < 7.2.8 (RCE via AVIF image optimization). The site is static (S3/CloudFront), so the exposure is build-time.
- **High:** astro < 6.4.6 (SSRF), sharp, nodemailer, devalue, vite 7.x, js-yaml, linkify-it, nanoid, postcss, svgo, smol-toml, source-map-js, zod, http-cache-semantics.
- **Moderate:** qs (a stripe dependency), among others.

Goal: **0 critical and 0 high** in `pnpm audit --prod`, with no behavior change. Deploys happen only after review: website → clientportal app → affected lambdas.

## Tasks

### [P1] Upgrade dependencies (single builder: one lockfile)  [sequential]
model: sonnet
Use Node 24.22.1 (`PATH=$HOME/Library/pnpm/nodejs/24.22.1/bin:$PATH`).
1. Record a baseline first: `pnpm audit --prod --json` saved to the scratchpad; website `pnpm build` page count; the list of dist/*.html paths.
2. **Website:** upgrade astro to the latest 7.x (7.4.2) and @astrojs/* integrations to versions compatible with it. Follow Astro's v7 upgrade guide for any breaking changes the build hits, fixing the code minimally. Then:
   - the build must pass with the same set of HTML pages;
   - spot-check that the rendered HTML of /, /go/push-patch, /coaching, /consult, /assessment, /blog and /weekly-picks has the same main headings;
   - flagged sections (SHOW_* flags) must stay off.
3. **apps/clientportal:** update vite/svelte/devalue-chain packages to patched versions within compatible majors. `pnpm build` must pass; the vitest failure set must be no worse than the baseline (about 7 pre-existing failures in unchanged files).
4. **Lambdas + shared packages:**
   - Find each vulnerable package's path (`pnpm why -r <pkg>`).
   - Bump direct dependencies (for example nodemailer, stripe, zod) to patched versions within a compatible major where possible.
   - For transitive ones, use `overrides:` in pnpm-workspace.yaml (supported by pnpm 10), pinned to the patched ranges.
   - Re-run every lambda/shared package's tests and build scripts.
5. `pnpm install`, then run `pnpm audit --prod` again. The target is 0 critical / 0 high. List any remaining moderate/low issues with a reason each is acceptable or not fixable (for example a dev-only path or no upstream fix).
6. Report: every package version change, which Lambdas' bundles changed (they need a redeploy), test/build tables, audit before/after counts.

Rules: no deploys, no commits, no git stash/checkout/reset/restore; don't touch business logic beyond what a breaking API change forces; keep lambda modules < 100 lines.
✓ DONE WHEN: `pnpm audit --prod` reports 0 critical and 0 high, the website and clientportal build, and every touched package's tests pass, or fail only on documented pre-existing tests

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] Audit: 0 critical / 0 high, with the remaining issues justified
- [ ] Website: same page set; key pages render the same headings; flags still off; no new client JS errors
- [ ] Lambda/shared tests green; bundles build; no API behavior changes (Stripe SDK major unchanged unless required)
- [ ] The lockfile changes are consistent; no secrets
- [ ] Deploy list + order written for HANDOFF: website/deploy.sh → apps/clientportal/deploy.sh → changed lambdas (low-risk first, payment last), with smoke checks
✓ DONE WHEN: all checklist items checked and the commit is pushed to origin/main
