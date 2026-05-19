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

## Common commands

- `make up` — start playground at http://localhost:8080 (browser opens automatically)
- `make dev` — start playground without opening a browser
- `make build` — full build (typecheck + bundle the playground; smoke-tests the library too)
- `make build-lib` — typecheck the library alone
- `make lint` — stylelint over both packages

## Publishing

Library publishes to GitHub Packages via the manual `Publish library` workflow (`.github/workflows/publish.yml`). Auto-increments from the latest `v*` tag, refuses to overwrite existing tags. Chains the `Deploy playground` workflow on success.

See `packages/design-system/README.md` for the consumer-side install instructions and `packages/design-system/AGENTS.md` for the agent-facing component primer.
