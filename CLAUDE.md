# LDRGLPRx Project Rules

## Stack
- **Apps** (`apps/`): Vite + pnpm. Use `pnpm` — never `npm` or `yarn`.
- **Websites** (`website/`): Astro + pnpm.
- **Lambdas**: esbuild only. Each lambda must be **under 100 lines** and thin (single responsibility, no business logic bundled in).

## Deploys
All deploys must go through a **deploy script** (infrastructure as code). Never deploy manually via console or CLI one-liners. Deploy scripts live in `infra/` or alongside the resource they deploy.

## Project Structure
```
apps/          # Vite PWA apps
website/       # Astro marketing site
lambdas/       # AWS Lambda functions (esbuild, <100 lines each)
infra/         # Deploy scripts and IaC
docs/          # Documentation and planning
```
