# Compiled `@eocrm/design-system` package — design

Date: 2026-11-03
Branch: `perf/reduce-bundle-size`
Target release: `0.7.0` (breaking; currently `v0.6.21`)

## Intent

`@eocrm/design-system` will be consumed by third parties, not only the eocrm CRM.
The original ask was "reduce bundle size". Measurement (below) showed size is
mostly fine — tree-shaking works — but the package **ships raw `.ts` + `.scss`
source with no build step**, which only works painlessly in Vite. The project is
therefore reframed: **ship a compiled, bundler-agnostic package where a consumer
pays only for what they import, and guard that in CI.**

## Baseline (measured 2026-11-03, scratch Vite consumer, gzip -9)

| Import                                         | JS gz    | CSS gz  |
| ---------------------------------------------- | -------- | ------- |
| `Button`                                       | 1.4 KB   | 1.2 KB  |
| `Button, Stack, Input, Select, Modal, Tooltip` | 30.8 KB  | 5.7 KB  |
| `DataTable`                                    | 32.8 KB  | 5.2 KB  |
| `RichTextEditor`                               | 71.9 KB  | 9.0 KB  |
| `I18nProvider, Button`                         | 13.9 KB  | —       |
| `import * as DS` (everything)                  | 315.9 KB | 69.5 KB |
| `styles/global.scss`                           | —        | 4.9 KB  |

Findings:

- `sideEffects` is declared, no top-level side effects, heavy deps (d3, dnd-kit,
  libphonenumber, prism, qrcode) are confined to their components. Tree-shaking
  works **in Vite**.
- `src/i18n/I18nProvider.tsx` builds `LOCALE_MAP = { en, ru }`, so every app that
  mounts `I18nProvider` / `AppProvider` ships the Russian dictionary (~21 KB raw,
  ~6–7 KB gz) even if it never uses Russian. Every future locale would add to
  every consumer.
- Raw-source shipping breaks or burdens non-Vite consumers: Next.js/webpack don't
  transpile TS in `node_modules` by default; Sass is only a devDependency so
  consumers must install + configure it; `types` points at `.ts` source so the
  consumer's `tsc` type-checks our code under _their_ tsconfig (`skipLibCheck`
  does not cover `.ts` files).
- `@eocrm/design-tokens` is only consumed via Sass `@forward` (in
  `src/styles/tokens.scss`, `src/styles/dark.scss`) — build-time only.

## Goals

1. The package installs and builds in mainstream React setups (Vite, Next.js
   app router, webpack 5) with **zero extra consumer config**: no
   `transpilePackages`, no Sass, no type-checking our source.
2. A consumer pays only for what they import — JS, CSS, and locales.
3. CI fails when that regresses.

## Non-goals

- Per-component translation splitting (max saving ≈5 KB gz of English strings;
  costs N-components × N-locales files and a worse override API). Revisit only if
  the English dictionary grows large.
- Slimming individual heavy components (`Select` ≈48 KB raw, `RichTextEditor`).
  Separate work if the size guard flags them.
- CommonJS output. ESM only (React 19 peer; all target bundlers handle ESM).

## Anti-goals

- Slower library inner loop: editing library code must still hot-reload in the
  playground instantly.
- A consumer import that silently renders unstyled (CSS must arrive with the JS
  without manual per-component imports).
- Two parallel styling surfaces to maintain (no shipped `.scss` API).

## Decisions (made by the user)

1. **Compiled `dist/`**: ESM, one output module per source module (preserve
   modules, so consumer tree-shaking keeps working), `.d.ts` declarations,
   compiled CSS. `files` ships `dist/`, `docs/`, `AI-PRIMER.md`; not `src/`.
2. **CSS delivery**: each compiled component module imports its own compiled
   `.css` file (CSS tree-shakes with JS). Additionally ship one full
   `dist/styles.css` for no-bundler setups. `sideEffects` must keep `*.css`
   listed so bundlers don't drop those imports.
3. **Styles exports**: replace `./styles/*.scss` exports with compiled CSS —
   `./styles/global.css` (tokens + dark + reset + typography, what
   `global.scss` produces today) and `./styles.css` (global + all components).
   No `.scss` exports remain. Sass-variable users go to `@eocrm/design-tokens`.
   The CRM only imports components + `global.scss`, so its migration is one
   import line.
4. **Locale split**: `I18nProvider` stops importing `ru`. English stays the
   built-in default; other locales are passed in explicitly. `en`/`ru` remain
   root exports — unused ones tree-shake away once nothing internal imports them.
5. **Size guard**: a small script (no new dependency) that builds a scratch Vite
   consumer against the **compiled `dist/`** for a fixed set of representative
   imports, gzips each output, and compares against budgets in a committed JSON
   file. Runs in the `Quality / check` CI job; exceeding a budget fails it.
   Raising a budget is a deliberate one-line diff in the PR.
6. **Playground consumes source** via a custom export condition: `exports["."]`
   gets a `"source": "./src/index.ts"` condition (listed first), enabled only in
   the playground's Vite config through `resolve.conditions`. Realism of the
   shipped artifact moves to CI (size guard + dist smoke test). Update
   `packages/playground/CLAUDE.md`'s "imports exactly as the CRM does" wording
   accordingly.
7. **Next.js Server Components can import components directly.** The build
   prepends `'use client'` to every compiled module that uses hooks, context,
   refs, event handlers or browser APIs (source has none today; Rollup/Vite strip
   module directives, so this must be added post-build or via a plugin and
   verified in `dist/`). Pure modules (`en`, `ru`, palette, format helpers, types)
   stay directive-free and server-safe. The root `index.js` barrel itself carries
   no directive — it only re-exports. The manual Next.js check imports a hook-using
   component (e.g. `Select`) from a Server Component.
8. **Missing locale messages fail loudly.** If `locale !== 'en'` and `messages` is
   omitted, `I18nProvider` falls back to English **and** logs `console.error` in
   all environments (not dev-only), once per provider mount. The 0.7.0 release
   notes and README carry a migration note: Russian apps must pass
   `messages={ru}` (the CRM may run Russian).

## Decisions (my calls — flag if wrong)

- **Build tool**: Vite library mode (already in the repo) with preserved modules
  and CSS Modules compiled to plain `.css`; declarations from `tsc` with a
  `tsconfig.build.json` (`emitDeclarationOnly`), no dts plugin.
- **CSS Modules class names** in dist: `[name]__[local]__[hash:base64:5]` (same
  as playground). Readable for debugging; gzip absorbs the repetition. Class
  names are not public API.
- **`I18nProvider` API**: add optional `messages?: Messages` (the locale's full
  dictionary). Default = `en`. `overrides` merges over `messages`. Missing
  `messages` for a non-English locale → see decision 8. `AppProvider` (`src/app/AppProvider.tsx`) passes `messages`
  through. Usage: `<I18nProvider locale="ru" messages={ru}>`.
- **`@eocrm/design-tokens`** moves to `devDependencies` (build-time Sass only;
  `palette.ts` only mentions it in a comment). **Same PR must update**
  `packages/design-tokens/scripts/set-release-version.mjs` (lines ~31–42 throw
  unless `dependencies["@eocrm/design-tokens"]` exists) and its tooling tests to
  accept/bump the devDependency instead — otherwise the release breaks.
- **Styles subpaths**: ship `./styles/tokens.css` (tokens + dark, no reset) in
  addition to `./styles/global.css` and `./styles.css`, so consumers with their
  own reset keep a tokens-only import. `reset`/`typography` are not split out.
  `mixins.scss` is dropped with no replacement — listed as a breaking change in
  the 0.7.0 notes and README.
- **Jest / test runners**: not "zero config". Rewrite the README Jest section as
  a short recipe (map `\.css$` to an empty module, ESM handling). Not covered by
  automated tests; Vitest consumers need nothing.
- **`BUMP`**: set to `minor` on this branch; a follow-up PR resets it to
  `patch` immediately after the 0.7.0 release. `@eocrm/design-tokens` also
  becomes 0.7.0 (`set-release-version.mjs` keeps both in lockstep).
- **`@types/d3-scale`, `@types/d3-shape`**: stay in `dependencies` only if the
  emitted `.d.ts` reference them; otherwise move to `devDependencies`.
- **Size-guard entries + initial budgets** (budget = measured-on-dist + ~10%
  headroom, rounded): `Button`; `Button+Stack+Input+Select+Modal+Tooltip`;
  `DataTable`; `RichTextEditor`; `I18nProvider+Button` (must show `ru` gone);
  `import *` (everything); `styles/global.css`. JS and CSS budgeted separately.
- **Dist smoke test**: a Vitest test (or script in the same CI job) that imports a
  handful of components from the built `dist/` (not source), renders them, and
  asserts a compiled CSS import exists for each. Builder picks the placement
  per the "Test placement" rules in `packages/design-system/CLAUDE.md`.

## Constraints

- Release: `.github/workflows/release.yml` must build the library before
  publishing and before the post-publish verification step; check every step
  that assumes `src/` is the published entry. Version bump must be **minor**
  (`0.7.0`) — edit `BUMP` in `release.yml` on this branch per root `CLAUDE.md`.
- `dist/` is gitignored and never committed.
- `@eocrm/design-system-mcp` (in progress, see
  `docs/superpowers/specs/2026-11-03-design-system-mcp-design.md`) extracts
  `AI-PRIMER.md` and `docs/**` from the published tarball — both must keep
  shipping at the same paths. It does not read `src/`.
- Vitest keeps testing source; the manifest drift test, docs generator, and
  `extract-props.mjs` keep reading `src/`.
- Library changes go through `pre-push-review` (Hard rule 8) and a PR; no direct
  push.
- Docs to update: `packages/design-system/README.md` (install: no Sass, import
  `@eocrm/design-system/styles/global.css`, locale usage),
  `AI-PRIMER.md` i18n section, `packages/design-system/CLAUDE.md` if it describes
  source shipping, `packages/playground/CLAUDE.md` (decision 6).
- Packages pinned to latest when anything is added (user preference) — but the
  design adds no new dependency.

## Left to the builder

- Exact Vite lib config (rollup/rolldown `preserveModules`, `preserveModulesRoot`,
  externals = all `dependencies` + `peerDependencies` + `react/jsx-runtime`).
- How per-module CSS imports are emitted (e.g. Vite `cssCodeSplit` with
  preserved modules, or a small post-build step injecting `import './X.css'`).
  Must be verified in the dist output, not assumed.
- Size-guard script location and the CI wiring.
- Verifying consumption in at least Vite + Next.js app router once, manually,
  before the PR is marked ready (no permanent Next.js fixture).
