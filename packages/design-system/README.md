# @eocrm/design-system

React 19 design system for the EOCRM. Ships compiled ESM (`dist/`: JavaScript, `.d.ts` types and plain CSS) — no Sass, TypeScript or transpile configuration needed in the consumer.

Its web tokens are generated and versioned by `@eocrm/design-tokens`; the
compiled token CSS is bundled into this package, so consumers install only
`@eocrm/design-system`.

Component contracts live in **[`docs/components/<Name>.md`](./docs/components)** (props table, anti-patterns). AI agents consuming this package should read **[AI-PRIMER.md](./AI-PRIMER.md)** first.

**Live playground** (every component, demoed against `main`): <https://eocrm.github.io/design-system/components>

---

## Install

### 1. Registry

`@eocrm/design-system` is public on npmjs, so no `.npmrc` or token is needed.
If your `.npmrc` still maps `@eocrm` to another registry, remove that line.

### 2. Install

```bash
npm install @eocrm/design-system
```

### 3. Use

```ts
// Once, at the app's root (e.g. main.tsx):
import '@eocrm/design-system/styles/global.css';

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

## What `global.css` does

Importing `@eocrm/design-system/styles/global.css` once at your app root applies three things:

1. **Tokens** — defines every `--color-*`, `--space-*`, `--radius-*`, `--font-*`, `--shadow-*` etc. on `:root`. Required.
2. **Modern reset** — including `* { margin: 0 }`. **All default browser margins on every element are zeroed.** Headings, paragraphs, lists have no intrinsic vertical rhythm; space them via `Stack`/`Cluster` or with the parent's own margin in CSS. The document background uses `--document-background` (default `var(--color-bg-subtle)`) so route transitions between full-screen surfaces do not flash a different base color; override that token after the global import for a different application canvas. The reset also applies `scrollbar-width: thin` + a token-colored `scrollbar-color` to every element, so **every** scroll container — library components and your own — gets a thin themed scrollbar instead of the OS default. (One deliberate exception: a collapsed `<Rail>` hides its bar entirely, since a gutter is about a quarter of the 56px rail's inner width.) It's declared at specificity 0-0-0; opt a scroller out with its own `scrollbar-width: auto` / `scrollbar-color: auto`. Note that Chromium ignores `::-webkit-scrollbar` rules on any scroller where these standard properties are set — if you already style scrollbars that way, they'll stop applying.
3. **Base typography** — `body` font + size, `h1`–`h4` sizes, link color. Global rules, not scoped.

If you need only the tokens (you're providing your own reset), import `@eocrm/design-system/styles/tokens.css` directly. Sass variables and mixins come from `@eocrm/design-tokens`.

---

## Accent

The accent family defaults to blue. To switch the whole app to another accent, set `data-accent` on `<html>` (omit the attribute for blue):

```html
<html data-accent="tealpine" data-theme="dark"></html>
```

| `data-accent` | Hue              | Compose objects                                        |
| ------------- | ---------------- | ------------------------------------------------------ |
| _(none)_      | Blue (default)   | `EocrmLightTokens` / `EocrmDarkTokens`                 |
| `tealpine`    | Teal pine        | `EocrmTealPineLightTokens` / `EocrmTealPineDarkTokens` |
| `indigo`      | Indigo           | `EocrmIndigoLightTokens` / `EocrmIndigoDarkTokens`     |
| `grape`       | Purple           | `EocrmGrapeLightTokens` / `EocrmGrapeDarkTokens`       |
| `berry`       | Magenta-pink     | `EocrmBerryLightTokens` / `EocrmBerryDarkTokens`       |
| `slate`       | Neutral graphite | `EocrmSlateLightTokens` / `EocrmSlateDarkTokens`       |
| `ocean`       | Cyan-blue        | `EocrmOceanLightTokens` / `EocrmOceanDarkTokens`       |
| `moss`        | Olive green      | `EocrmMossLightTokens` / `EocrmMossDarkTokens`         |

Each accent swaps `--color-accent`, `-hover`, `-pressed`, `-fg`, `-bg-subtle`, `-subtle-bg` and `--ring-accent`, plus the default `Link` colour (`--color-link-fg` / `-hover`), in light, forced dark (`data-theme="dark"`) and OS dark. They ship in the existing `tokens.css` / `global.css`, so there is no new import. `AppProvider`'s `tokens` / `darkTokens` overrides win over `data-accent` in every theme (see [docs/setup.md](docs/setup.md)). Info colours stay blue under any accent; DropdownMenu checked items, the OptionsPicker selected row and StagePath done states follow the accent. In light theme, Teal pine's default `Link`s use a slightly brighter teal than the accent (`#007676`, AA on every grey surface) at medium weight (not inside headings, `<strong>` or `<th>`), because the accent alone sits too close to the navy body text to read as a link. Slate's default `Link`s are medium weight for the same reason. Indigo and Berry also set a slightly different link colour from their accent (`#4342c4`, `#a82c68`) to keep links at AA on every grey surface.

Compose: each accent's Light / Dark objects sit beside `EocrmLightTokens` / `EocrmDarkTokens`; only accent colours differ. The link colour tokens are web-only (Compose has no `Link`), so Compose links keep the accent colour.

There is deliberately no red, orange or yellow accent: a primary button in those hues reads as a danger or warning action.

**Known issue:** in light theme, Teal pine and Moss sit close to `--color-success` in hue. Review success/accent pairings visually before switching the CRM to either.

---

## Bundler notes

The package ships **compiled ESM** (`dist/`) with `.d.ts` types and plain CSS. No Sass, TypeScript or transpile configuration is needed.

- **Vite / Webpack 5 / Rollup**: work out of the box. Import `@eocrm/design-system/styles/global.css` once at the app root.
- **Next.js (app router)**: works as-is, no `transpilePackages`. Client-bound modules carry `'use client'`, so components can be imported directly from Server Components.
- Set `moduleResolution: "bundler"` (or `"node16"`) in your `tsconfig.json` if TypeScript can't resolve types.

**Tests.** Vitest works out of the box. Jest (CommonJS) needs to transform this ESM package and its ESM-only dependencies (`d3-*`, `internmap`, used by `Chart`), and stub `.css` imports:

```js
// jest.config.js — the pattern covers npm/yarn and pnpm (node_modules/.pnpm/<name>@<version>/…) layouts
transformIgnorePatterns: [
  '/node_modules/(?!(\\.pnpm/)?(@eocrm[/+]design-system|d3-[^/@]+|internmap)[/@])',
],
moduleNameMapper: { '\\.css$': '<rootDir>/emptyModule.js' },
```

- `emptyModule.js` is an empty file (`module.exports = {};`).
- The transformer must convert ESM to CommonJS inside `node_modules`: `babel-jest` with a root `babel.config.js` (a `.babelrc` does not apply to `node_modules`) using `@babel/preset-env` (`targets: { node: 'current' }`), or `ts-jest` with `preset: 'ts-jest/presets/js-with-ts'`, `allowJs: true` and `module: 'commonjs'`.

---

## Components

Grouped for navigation. Per-component contracts are in `docs/components/<Name>.md`; [AI-PRIMER.md](./AI-PRIMER.md) indexes them with the tokens table.

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
- `OtpInput` — one-time-code entry, single-character boxes
- `PasswordInput` — password field with eye toggle + optional warnings
- `PasswordStrengthMeter` — 4-segment strength visualization
- `Select` — value picker (single, multi, searchable, async, creatable)
- `OptionsPicker` — filter picker (multi/single, grouped, searchable)
- `Checkbox` — checkbox with native input + custom paint
- `Radio` / `RadioGroup` — single radio + fieldset wrapper
- `Switch` — binary toggle
- `Slider` — controlled slider (single + range, horizontal + vertical)
- `ColorPicker` — controlled HEX color picker (popover + inline)
- `IconPicker` — controlled icon picker with a popover radio grid
- `FileUpload` — controlled file picker with dropzone
- `ImageCrop` — controlled image cropper

**Form layout**

- `Field` — labeled-control unit
- `FormSection` — titled group of fields
- `FormRow` — fields side by side
- `SettingRow` / `SettingRow.List` — settings-screen row with a shared label column, adornments and a footer slot

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
- `Constrain` — width / height / flex constraint
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

> The library also ships an `AppProvider` (theme + i18n + locale wiring), `LocaleProvider` / `I18nProvider`, the `useTranslation` / `useLocale` hooks, the `palette` helpers, and Calendar primitive hooks (`useMonth`, `useWeek`, `useDay`, `useAgenda`). See [AI-PRIMER.md](./AI-PRIMER.md) for those.

---

## Migrating to 0.7

- **Stylesheet:** `@eocrm/design-system/styles/global.scss` is now `@eocrm/design-system/styles/global.css`. `styles.css` bundles every component's CSS; per-component CSS is also imported automatically by the JS chunks.
- **Removed subpaths:** `styles/tokens.scss`, `styles/reset.scss`, `styles/typography.scss` and `styles/mixins.scss` are gone. Use `styles/tokens.css` for tokens only; for Sass variables/mixins install `@eocrm/design-tokens` and `@use` it directly.
- **Compiled output:** the package no longer ships `src/`; drop `transpilePackages` and any Sass/TSX loader rules for it.
- **i18n:** `I18nProvider` / `AppProvider` no longer bundle Russian. Pass the catalog: `<I18nProvider locale="ru" messages={ru}>` with `import { ru } from '@eocrm/design-system'`. A non-`en` locale without `messages` logs a `console.error` and renders English.

## Releasing a new version

Releases are **automatic**. Merging to `main` triggers the `Release` workflow (`.github/workflows/release.yml`), which:

1. Runs the quality gate (typecheck, test, lint, build, tarball-contents check).
2. If the library actually changed, computes the next version from the latest `v*` git tag (patch bump by default) and refuses if that tag already exists.
3. Synchronizes `@eocrm/design-tokens`, `@eocrm/design-system`, and the generated token contract to one version.
4. Publishes the token npm package, then the design-system npm package, to npmjs (trusted publishing), then `com.eocrm.design:design-tokens-compose` to GitHub Packages (Maven).
5. Verifies all three registry versions before creating and pushing the `v<version>` git tag.
6. Re-deploys the playground (see below).

There is no manual "Run workflow" button — merging to `main` is the only way to release. Playground-only changes skip the publish step (no version bump for a demo tweak) but still redeploy the playground.

**Forcing a minor/major bump**: edit `BUMP` (`patch` → `minor` / `major`) in `release.yml` on a branch and merge. There is no other override by design.

**One-time repo setup**: Settings → Actions → General → Workflow permissions → "Read and write permissions".

The package name `@eocrm/design-system` must match an organization (or user) you have publish access to on GitHub. If your org isn't `eocrm`, rename the package in `package.json` and the `scope:` in the workflow.

---

## Playground deployment

The playground (live component gallery) deploys to GitHub Pages automatically as the final step of the `Release` workflow, so the live site at <https://eocrm.github.io/design-system/> always reflects `main`. It redeploys whenever the quality gate passes — even on playground-only changes, and even if a publish hiccups.

**This repo and its Pages site are public.** The playground bakes the library's source into its bundle via `?raw` imports, so the source is world-readable — that's intentional for an open-source library.

**One-time setup**: Settings → Pages → Source = "GitHub Actions" (not "Deploy from a branch").

---

## Where docs live (so you don't have to grep)

- **README.md** (this file) — install, setup, bundler notes, publishing/deploy ops.
- **[AI-PRIMER.md](./AI-PRIMER.md)** — concise primer for AI coding agents. Token table and component index.
- **`docs/components/<Name>.md`** — per-component contract: props table, examples, anti-patterns. Also `docs/setup.md`, `docs/theming.md`, `docs/transient-state.md`.
- **[CLAUDE.md](./CLAUDE.md)** — rules for someone **modifying this library** (not for consumers).

## License

[Apache License 2.0](./LICENSE).
