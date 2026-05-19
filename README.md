# EOCRM Design System

[![CI](https://img.shields.io/github/actions/workflow/status/eocrm/design-system/release.yml?branch=main&label=ci)](https://github.com/eocrm/design-system/actions/workflows/release.yml)
[![Package](https://img.shields.io/github/v/tag/eocrm/design-system?sort=semver&filter=v*&label=package)](https://github.com/eocrm/design-system/pkgs/npm/design-system)
[![Playground](https://img.shields.io/github/deployments/eocrm/design-system/github-pages?label=playground)](https://eocrm.github.io/design-system/)

React 19 component library for the EOCRM. Source-distributed via GitHub Packages, opinionated tokens, Atlassian-inspired aesthetic, **designed to be consumed primarily by AI coding agents**.

- **Live playground**: <https://eocrm.github.io/design-system/>
- **Package**: `@eocrm/design-system` on GitHub Packages
- **Source distribution**: consumers' bundlers compile `.tsx` and `.module.scss` directly — no build step in the package

---

## Quickstart (consuming the library)

In your CRM's repo root, create `.npmrc`:

```
@eocrm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Install:

```bash
npm install @eocrm/design-system
```

Use:

```ts
// app root, once
import '@eocrm/design-system/styles/global.scss';

// anywhere
import { Button, Stack, Cluster, Card, Input, Avatar, Badge, Tabs } from '@eocrm/design-system';
```

Full install + bundler notes: [`packages/design-system/README.md`](./packages/design-system/README.md).
Per-component contracts: hover any import for JSDoc; see [`packages/design-system/AGENTS.md`](./packages/design-system/AGENTS.md) for an agent-targeted primer.

---

## Quickstart (contributing)

```bash
make install          # npm install (sets up workspaces)
make up               # dev server at http://localhost:8080 + opens browser
make test             # Vitest (library only)
make lint             # stylelint
make build            # production build of playground (also typechecks library)
```

Repo conventions live in [`CLAUDE.md`](./CLAUDE.md) (cross-package) and [`packages/design-system/CLAUDE.md`](./packages/design-system/CLAUDE.md) (library-specific rules).

---

## Repo layout

```
eocrm/design-system/
├── packages/
│   ├── design-system/   ← @eocrm/design-system — the library that ships
│   │   ├── README.md    ← install + bundler notes
│   │   ├── AGENTS.md    ← agent primer: tokens, components, anti-patterns
│   │   └── CLAUDE.md    ← rules for modifying the library
│   └── playground/      ← dev gallery (deployed to GH Pages, never published to npm)
├── .github/workflows/
│   ├── quality.yml             ← typecheck + test + lint + build (on PR, callable)
│   ├── release.yml             ← on push to main: quality → publish → deploy-playground
│   └── deploy-playground.yml   ← reusable, called by release.yml
└── CLAUDE.md            ← cross-package monorepo conventions
```

---

## CI/CD

| Trigger | What runs |
|---|---|
| **Pull request** | `quality.yml` — typecheck + test + lint + build + tarball-contents check |
| **Push to `main`** | `release.yml` → quality, then auto-bumps patch version, publishes `@eocrm/design-system` to GitHub Packages, creates `vX.Y.Z` git tag, deploys the playground to GitHub Pages |

Every release is gated by quality. There are no manual workflow buttons — the only way to release is to merge to `main`. To force a minor/major bump, edit `BUMP` in `release.yml` on a branch and merge.

---

## Components shipped

Avatar · Badge · Button · Card · Cluster · Input · Stack · Tabs. Each one is unit-tested, JSDoc'd with `@example` and `@remarks` blocks, demoed in the playground, and listed in [`AGENTS.md`](./packages/design-system/AGENTS.md).

The "what's next" wishlist (Select, Modal, Toast, DatePicker, Table, etc.) lives in [`packages/design-system/CLAUDE.md`](./packages/design-system/CLAUDE.md#components-we-dont-have-yet).
