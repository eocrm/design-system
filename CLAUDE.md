# CLAUDE.md — repo root

Monorepo for the EOCRM design system. Two packages, managed by npm workspaces.

## Layout

- `packages/design-system/` — `@eocrm/design-system`. The library that ships to the CRM via GitHub Packages.
- `packages/playground/` — local dev gallery + demo pages. **Never published.** The most realistic preview of how the library behaves when consumed.

Each package has its own `CLAUDE.md` with package-specific rules. Read them when working in that package.

## Core invariant (cross-package)

Adding a component to `@eocrm/design-system` is **not complete** until:

1. Unit tests exist alongside the component (`<Name>.test.tsx`)
2. A demo page exists in the playground (`packages/playground/src/pages/demo/<Name>Demo.tsx`)
3. The demo is wired into `App.tsx` (route), `AppShell.tsx` (sidebar nav), and `DemoIndex.tsx` (overview grid)
4. The component is re-exported from `packages/design-system/src/index.ts`
5. "When NOT to use / anti-patterns" prose is added to the component function's JSDoc (`@remarks` blocks) AND a one-section TL;DR is added to `packages/design-system/AGENTS.md`

Missing any of these = component does not exist as far as the design system is concerned. Don't merge half-built components.

## Conventions (apply everywhere)

- **Tokens, not raw values.** No raw colors / spacing / radii in any `.module.scss` outside `tokens.scss`. Stylelint enforces with `scale-unlimited/declaration-strict-value`.
- **Components don't own layout.** No `margin`, `position`, `top/left/right/bottom`, `flex: 1`, `width` (other than `100%` of intrinsic) inside a component's `.module.scss`. Layout is the parent's job. See `packages/design-system/CLAUDE.md` (Rule 4).
- **Use `Stack` / `Cluster` for layout**, not ad-hoc `display: flex` divs.
- **Imports in playground always use `@eocrm/design-system`**, never relative paths into the library. Only exception: demo `?raw` source-display imports via the `@lib-source/*` alias.

## Git workflow

**Code, configs, and workflows go through PRs — direct pushes to `main` are prohibited.**

Applies to:

- Source code (`*.ts`, `*.tsx`, `*.scss`, `*.css`, `*.js`)
- Build / lint / test config (`package.json`, `tsconfig*.json`, `.stylelintrc.json`, `vite.config.ts`, `vitest.*.ts`, `Makefile`)
- GitHub workflows (`.github/workflows/**`)
- `.gitignore`, `.npmignore`, `.npmrc`, anything that affects the build, test, or release pipeline

Process for those:

1. Branch off `main` (`git checkout -b <kind>/<short-description>`)
2. Commit + push the branch
3. Open a PR (`gh pr create`)
4. Wait for the `Quality / check` status check to pass
5. Merge (squash or merge commit — caller's choice)

**Standalone docs may be direct-pushed.** A `.md` change that is NOT bundled with a code/config/workflow change — typo fixes, restructures, new clarifications, JSDoc-style markdown — can go straight to `main`. Examples: editing root `README.md`, root `CLAUDE.md`, `packages/design-system/AGENTS.md`, `packages/design-system/guidance.md`. If the doc change is _part of_ a code change (e.g., adding a component AND its guidance.md entry), it goes through the same PR as the code.

**Explicit override**: the user may authorize a direct push for any specific change ("just push it", "no PR needed", etc.). When in doubt, default to branch + PR for code; default to direct-push for standalone docs.

## Git hooks

**Hooks MUST be installed.** A `pre-push` hook (managed by Husky) runs prettier, stylelint, and typecheck before every push. It exists because the CI quality gate runs the same checks — local failures are cheaper than a red PR.

Installation is automatic: `npm install` (or `make install`) triggers the `prepare` script which sets `core.hooksPath` to `.husky/_` and wires every hook in `.husky/`.

Before doing any work in this repo, verify:

```bash
git config --get core.hooksPath   # must print: .husky/_
test -x .husky/pre-push           # exit 0
```

If either fails, run `npm install` again — do not proceed with code changes until both pass.

**Never bypass with `--no-verify` on your own initiative.** If the hook blocks a push you believe is correct, the right move is to (a) fix the failing check, or (b) explain the failure to the user and let them decide whether to authorize the bypass. A hook bypass without authorization defeats the purpose of having the hook.

## Common commands

- `make up` — start playground at http://localhost:8080 (browser opens automatically)
- `make dev` — start playground without opening a browser
- `make build` — full build (typecheck + bundle the playground; smoke-tests the library too)
- `make build-lib` — typecheck the library alone
- `make lint` — stylelint over both packages

## Publishing

Library publishes to GitHub Packages via the manual `Publish library` workflow (`.github/workflows/publish.yml`). Auto-increments from the latest `v*` tag, refuses to overwrite existing tags. Chains the `Deploy playground` workflow on success.

See `packages/design-system/README.md` for the consumer-side install instructions and `packages/design-system/AGENTS.md` for the agent-facing component primer.
