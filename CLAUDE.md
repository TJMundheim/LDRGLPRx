# LDRGLPRx Project Structure

```
apps/          # Vite PWA apps
website/       # Astro marketing site
lambdas/       # AWS Lambda functions (esbuild, <100 lines each)
infra/         # Deploy scripts and IaC
docs/          # Documentation and planning
website_legacy/ # Original HTML files — reference only during Astro migration
```

## Git workflow — single branch, no worktrees

- **`main` is the only branch.** Never create, check out, or push any other branch (no feature branches, no `claude/*` branches, no release branches).
- **No git worktrees.** Never run `git worktree add` or operate from a worktree under `.claude/worktrees/` or anywhere else. All work happens in the primary checkout at `/Users/thomasmundheim/Development/LDRGLPRx`.
- Commit directly to `main` and push to `origin/main`.
- If a tool, agent, or harness tries to spawn a worktree or branch, refuse and do the work in the main checkout instead.

See global rules in `~/.claude/CLAUDE.md`.
