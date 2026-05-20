# @eocrm/design-system

React 19 design system for the EOCRM. Source-distributed (consumers' bundlers process `.tsx` and `.module.scss` directly — no compile step in this package).

Component contracts live in **JSDoc on the components themselves** — hover any import in your editor. AI agents consuming this package should read **[AGENTS.md](./AGENTS.md)** first.

---

## Install

### 1. Configure npm to pull `@eocrm/*` from GitHub Packages

Create `.npmrc` at your consuming repo's root:

```
@eocrm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` must be a personal access token with `read:packages` scope. Set it in your shell (`export GITHUB_TOKEN=...`) or `.env`. **Never commit the token.**

### 2. Install

```bash
npm install @eocrm/design-system
```

### 3. Use

```ts
// Once, at the app's root (e.g. main.tsx):
import '@eocrm/design-system/styles/global.scss';

// Anywhere:
import {
  Avatar,
  Badge,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Input,
  Stack,
  Tabs,
} from '@eocrm/design-system';
```

---

## What `global.scss` does

Importing `@eocrm/design-system/styles/global.scss` once at your app root applies three things:

1. **Tokens** — defines every `--color-*`, `--space-*`, `--radius-*`, `--font-*`, `--shadow-*` etc. on `:root`. Required.
2. **Modern reset** — including `* { margin: 0 }`. **All default browser margins on every element are zeroed.** Headings, paragraphs, lists have no intrinsic vertical rhythm; space them via `Stack`/`Cluster` or with the parent's own margin in CSS.
3. **Base typography** — `body` font + size, `h1`–`h4` sizes, link color. Global rules, not scoped.

If you need only the tokens (you're providing your own reset), import `@eocrm/design-system/styles/tokens.scss` directly. Other available subpath imports: `./styles/reset.scss`, `./styles/typography.scss`, `./styles/mixins.scss`.

---

## Bundler notes

The package ships **source files** (`.tsx`, `.module.scss`). Your bundler compiles them.

- **Vite**: works out of the box.
- **Next.js**: add `transpilePackages: ['@eocrm/design-system']` to `next.config.js`.
- **Webpack 5**: ensure your TS/SCSS loaders don't `exclude: /node_modules/` for this package.
- **Create React App (ejected)**: same as Webpack.

If TypeScript can't resolve types, set `moduleResolution: "bundler"` (or `"node16"`) in your `tsconfig.json`.

---

## Components

| Component               | One-line                                                                                     | Detail                    |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------- |
| `<Button>`              | Action triggers                                                                              | Hover in editor for JSDoc |
| `<Input>`               | Single-line text                                                                             | Hover in editor for JSDoc |
| `<Card>`                | Bordered content container                                                                   | Hover in editor for JSDoc |
| `<Stack>`               | Vertical layout primitive                                                                    | Hover in editor for JSDoc |
| `<Cluster>`             | Horizontal layout (wraps)                                                                    | Hover in editor for JSDoc |
| `<Avatar>`              | Profile circle                                                                               | Hover in editor for JSDoc |
| `<Badge>`               | Status / category pill                                                                       | Hover in editor for JSDoc |
| `<Tabs>`                | Horizontal tab strip                                                                         | Hover in editor for JSDoc |
| `<DropdownMenu>`        | Action menu from a trigger                                                                   | Hover in editor for JSDoc |
| `<Tooltip>`             | Supplementary hint on hover/focus                                                            | Hover in editor for JSDoc |
| `<Popover>`             | Non-modal floating panel for arbitrary small surfaces (filters, mini-forms, quick pickers).  | Hover in editor for JSDoc |
| `<ConfirmationPopover>` | "Are you sure?" preset on top of Popover, with async-aware Confirm and Cancel-default focus. | Hover in editor for JSDoc |

Every prop and variant is JSDoc'd at the source. For a quick reference + canonical snippets + tokens table + anti-patterns, see [AGENTS.md](./AGENTS.md).

---

## Publishing a new version

The library publishes to GitHub Packages via a manual GitHub Actions workflow (`.github/workflows/publish.yml` at the repo root).

1. Push your changes.
2. **Actions → Publish library → Run workflow**.
3. Choose a bump (`patch` default) or set an explicit version.

The workflow:

- Reads the latest `v*` git tag and computes the next version (or uses your override).
- Refuses if the tag already exists.
- Runs `typecheck`, `test`, and a playground smoke build.
- Publishes to GitHub Packages with `NODE_AUTH_TOKEN = GITHUB_TOKEN`.
- Creates and pushes a `v<version>` git tag.
- Chains the playground deploy on success.

**One-time repo setup**: Settings → Actions → General → Workflow permissions → "Read and write permissions".

The package name `@eocrm/design-system` must match an organization (or user) you have publish access to on GitHub. If your org isn't `eocrm`, rename the package in `package.json` and the `scope:` in the workflow.

---

## Deploying the playground to GitHub Pages

The playground (live component gallery) deploys to GitHub Pages via a separate manual workflow. The site lives at `https://<owner>.github.io/<repo>/`.

1. **Actions → Deploy playground → Run workflow**.
2. Builds with `VITE_BASE_PATH=/<repo>/` and deploys via `actions/deploy-pages`.

**One-time setup**: Settings → Pages → Source = "GitHub Actions" (not "Deploy from a branch").

Private Pages requires **GitHub Pro / Team / Enterprise**.

The playground bakes the library's source via `?raw` imports into its bundle. With private Pages this is gated behind GitHub auth. **Never enable public Pages on this repo** unless you're OK with the library source being world-readable.

---

## Where docs live (so you don't have to grep)

- **README.md** (this file) — install, setup, bundler notes, publishing/deploy ops.
- **[AGENTS.md](./AGENTS.md)** — concise primer for AI coding agents. Token table, anti-patterns, per-component snippets.
- **JSDoc on each component** — full per-prop / per-variant contracts with `@example` blocks. Hover in your editor.
- **[CLAUDE.md](./CLAUDE.md)** — rules for someone **modifying this library** (not for consumers).
