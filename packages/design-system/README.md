# @eocrm/design-system

React 19 design system for the EOCRM. Source-distributed (consumers' bundlers process `.tsx` and `.module.scss` directly — no compile step in this package).

Its web tokens are generated and versioned by `@eocrm/design-tokens`. Existing
consumer imports remain unchanged: the design-system Sass entry points forward
to the token package.

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
2. **Modern reset** — including `* { margin: 0 }`. **All default browser margins on every element are zeroed.** Headings, paragraphs, lists have no intrinsic vertical rhythm; space them via `Stack`/`Cluster` or with the parent's own margin in CSS. The reset also applies `scrollbar-width: thin` + a token-colored `scrollbar-color` to every element, so **every** scroll container — library components and your own — gets a thin themed scrollbar instead of the OS default. (One deliberate exception: a collapsed `<Rail>` hides its bar entirely, since a gutter is about a quarter of the 56px rail's inner width.) It's declared at specificity 0-0-0; opt a scroller out with its own `scrollbar-width: auto` / `scrollbar-color: auto`. Note that Chromium ignores `::-webkit-scrollbar` rules on any scroller where these standard properties are set — if you already style scrollbars that way, they'll stop applying.
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

Grouped for navigation. Every prop and variant is JSDoc'd at the source — hover any import in your editor. For canonical snippets + tokens table + anti-patterns, see [AGENTS.md](./AGENTS.md), which carries the same roster with usage examples.

**Typography**

- `Title` — semantic heading
- `Text` — body / inline text
- `Code` — inline `<code>` chip
- `Kbd` — keyboard key hint

**Actions**

- `Button` — action triggers
- `ButtonGroup` — joined Buttons + segmented control
- `SocialButton` — provider sign-in button
- `Link` — polymorphic styled anchor
- `DropdownMenu` — action menu from a trigger

**Form controls**

- `Input` — single-line text
- `Textarea` — multi-line text
- `PasswordInput` — password field with eye toggle + optional warnings
- `PasswordStrengthMeter` — 4-segment strength visualization
- `Select` — value picker (single, multi, searchable, async, creatable)
- `OptionsPicker` — filter picker (multi/single, grouped, searchable)
- `Checkbox` — checkbox with native input + custom paint
- `Radio` / `RadioGroup` — single radio + fieldset wrapper
- `Switch` — binary toggle
- `Slider` — controlled slider (single + range, horizontal + vertical)
- `ColorPicker` — controlled HEX color picker (popover + inline)
- `FileUpload` — controlled file picker with dropzone
- `ImageCrop` — controlled image cropper

**Form layout**

- `Field` — labeled-control unit
- `FormSection` — titled group of fields
- `FormRow` — fields side by side

**Date & time**

- `Calendar` — month / week / day / agenda views
- `DatePicker` / `InlineDatePicker` — single-date input + popover, or in flow
- `DateRangePicker` / `InlineDateRangePicker` — date-range input + popover, or in flow
- `TimeField` — standalone time-of-day input

**Layout & structure**

- `Stack` — vertical layout
- `Cluster` — horizontal layout that wraps
- `Grid` — 2D layout primitive
- `Masonry` — height-balanced masonry layout
- `Constrain` — width / flex constraint
- `Divider` — separator primitive
- `Page` — page-root layout primitive
- `Screen` — full-bleed / centered screen layout
- `AppLayout` — viewport-filling app shell
- `PageHeader` — top-of-page heading area

**Navigation & app chrome**

- `Rail` — collapsible left-side navigation
- `TopBar` — sticky application top bar
- `Tabs` — horizontal tab strip
- `Breadcrumb` — navigation trail
- `Pagination` — numbered nav with windowing
- `CursorPagination` — prev / next for streams without a total

**Overlays**

- `Modal` — focus-locked dialog
- `Drawer` — edge-anchored slide-in panel
- `Popover` — non-modal floating panel for interactive content
- `ConfirmationPopover` — opinionated "Are you sure?" preset
- `Tooltip` — small floating label on hover / keyboard focus

**Feedback & status**

- `Alert` — persistent in-flow notification
- `Toast` (`ToastViewport` + `toast`) — transient notifications
- `Progress` — linear progress bar
- `CircularProgress` — circular progress / spinner
- `Skeleton` — loading placeholder
- `EmptyState` — "nothing here" container
- `ErrorState` — page-level status / result screen
- `Badge` — status / category pill
- `FilterChip` — dismissible "active filter" pill

**Data display**

- `Card` — bordered container
- `LinkCard` — clickable, full-surface Card
- `DefinitionList` — semantic key/value pairs (`dl` / `dt` / `dd`)
- `Table` — tabular data primitive
- `DataTable` — server-driven data table with column features
- `Accordion` — vertically-stacked collapsible panels
- `Kanban` — multi-column board (drag-to-reorder + cross-column drag)
- `Sortable` — drag-to-reorder list (single column)
- `Image` — image with loading + error states

**Identity & media**

- `Avatar` / `AvatarGroup` — profile circle / Slack-style stacked row
- `PersonDisplay` — Avatar + name (+ optional description lines)
- `Logo` — brand logo lockup
- `BrandIcon` — third-party brand marks
- `IconTile` — palette-colored icon frame

> The library also ships an `AppProvider` (theme + i18n + locale wiring), `LocaleProvider` / `I18nProvider`, the `useTranslation` / `useLocale` hooks, the `palette` helpers, and Calendar primitive hooks (`useMonth`, `useWeek`, `useDay`, `useAgenda`). See [AGENTS.md](./AGENTS.md) for those.

---

## Releasing a new version

Releases are **automatic**. Merging to `main` triggers the `Release` workflow (`.github/workflows/release.yml`), which:

1. Runs the quality gate (typecheck, test, lint, build, tarball-contents check).
2. If the library actually changed, computes the next version from the latest `v*` git tag (patch bump by default) and refuses if that tag already exists.
3. Synchronizes `@eocrm/design-tokens`, `@eocrm/design-system`, and the generated token contract to one version.
4. Publishes the token npm package, then the design-system npm package, then `com.eocrm.design:design-tokens-compose`.
5. Verifies all three registry versions before creating and pushing the `v<version>` git tag.
6. Re-deploys the playground (see below).

There is no manual "Run workflow" button — merging to `main` is the only way to release. Playground-only changes skip the publish step (no version bump for a demo tweak) but still redeploy the playground.

**Forcing a minor/major bump**: edit `BUMP` (`patch` → `minor` / `major`) in `release.yml` on a branch and merge. There is no other override by design.

**One-time repo setup**: Settings → Actions → General → Workflow permissions → "Read and write permissions".

The package name `@eocrm/design-system` must match an organization (or user) you have publish access to on GitHub. If your org isn't `eocrm`, rename the package in `package.json` and the `scope:` in the workflow.

---

## Playground deployment

The playground (live component gallery) deploys to GitHub Pages automatically as the final step of the `Release` workflow, so the live site at <https://eocrm.github.io/design-system/> always reflects `main`. It redeploys whenever the quality gate passes — even on playground-only changes, and even if a publish hiccups.

**This repo and its Pages site are public.** The playground bakes the library's source into its bundle via `?raw` imports, so the source is world-readable — that's intentional for a source-distributed library.

**One-time setup**: Settings → Pages → Source = "GitHub Actions" (not "Deploy from a branch").

---

## Where docs live (so you don't have to grep)

- **README.md** (this file) — install, setup, bundler notes, publishing/deploy ops.
- **[AGENTS.md](./AGENTS.md)** — concise primer for AI coding agents. Token table, anti-patterns, per-component snippets.
- **JSDoc on each component** — full per-prop / per-variant contracts with `@example` blocks. Hover in your editor.
- **[CLAUDE.md](./CLAUDE.md)** — rules for someone **modifying this library** (not for consumers).
