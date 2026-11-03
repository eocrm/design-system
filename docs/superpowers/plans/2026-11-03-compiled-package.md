# Compiled `@eocrm/design-system` Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@eocrm/design-system` as compiled ESM + `.d.ts` + CSS that works in any mainstream React bundler with zero config, ships only the locales a consumer imports, and is guarded by CI size budgets.

**Architecture:** Vite library mode with preserved modules emits one JS file per source module; a small inline plugin prepends `'use client'` to React-touching modules and injects each module's compiled CSS import. `tsc` emits declarations; a Sass script emits the global stylesheets. The playground keeps consuming source through a `source` export condition; realism of `dist/` moves to CI (dist tests + size guard).

**Tech Stack:** Vite 8 (rolldown), TypeScript 6, sass-embedded, Vitest 4, Node 24 test runner (design-tokens tooling), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-compiled-package-design.md`

## Global Constraints

- Release `0.7.0`: `BUMP: minor` in `.github/workflows/release.yml` on this branch; reset to `patch` in a follow-up PR after release.
- ESM only. No CommonJS output.
- No new runtime dependency. Build-only additions go to `devDependencies`, pinned to the latest npm version (`npm view <pkg> version`).
- `dist/` is never committed (root `.gitignore` already has `dist`).
- Published files: `dist/`, `docs/`, `AI-PRIMER.md` (+ README, LICENSE, package.json). Not `src/`.
- `@eocrm/design-system-mcp` reads `AI-PRIMER.md` and `docs/**` from the tarball — keep both at the same paths.
- Vitest (`npm test`), the manifest drift test, `build:docs` and playground `extract-props.mjs` keep reading `src/`.
- Library changes: PR + `pre-push-review` skill (DS Hard rule 8). Never `--no-verify`.
- Commit messages: plain, no `Co-Authored-By`, no session link.

## Review Focus

1. **Non-deterministic `dist/`** — `verify-published-version.mjs` compares a fresh `npm pack` integrity against the published one in the same job; `prepack` rebuilds, so two builds must be byte-identical. CSS-module hashes must not depend on the absolute checkout path. → Task 2 Step 6.
2. **Server-safe module marked `'use client'`** (e.g. `en`, `ru`, `deepMerge`, palette helpers) — a Next.js Server Component calling it would get a client reference instead of a value. → Task 2 shape test `pure modules carry no directive`.
3. **Component imported alone renders unstyled** — CSS import missing from a dist module whose source imports `*.module.scss` or a non-module `.scss` partial. → Task 2 shape test `every CSS-bearing module imports its css`; Task 4 size guard CSS budgets > 0.
4. **Playground or its typecheck silently resolves `dist/`** (stale or missing) instead of source. → Task 3 Step 5.
5. **Russian app upgrades without `messages={ru}`** and ships English unnoticed. → Task 1 test `logs console.error in production when locale is non-en without messages`.

---

### Task 1: Locale split — `I18nProvider` / `AppProvider` take `messages`

**Files:**

- Modify: `packages/design-system/src/i18n/I18nProvider.tsx`
- Modify: `packages/design-system/src/app/AppProvider.tsx`
- Test: `packages/design-system/src/i18n/useTranslation.test.tsx`, `packages/design-system/src/app/AppProvider.test.tsx` (create the latter only if absent)
- Docs: `packages/design-system/AI-PRIMER.md` (i18n section, lines ~28–62), `packages/design-system/docs/setup.md`, `packages/design-system/README.md` (add a "Migrating to 0.7" section stub that Task 3 extends)

**Interfaces:**

- Produces: `I18nProviderProps.messages?: Messages` and `AppProviderProps.messages?: Messages`. `I18nProvider.tsx` no longer imports `./ru`; `LOCALE_MAP` is deleted. Base = `messages ?? en`; `overrides` deep-merge over base. `Locale` type unchanged (`'en' | 'ru'`).

- [ ] **Step 1: Write the failing tests** in `useTranslation.test.tsx`

```tsx
it('returns ru strings inside <I18nProvider locale="ru" messages={ru}>', () => {
  // render a probe calling t('alert.dismiss'); expect(text).toBe(ru.alert.dismiss)
});
it('falls back to English and logs console.error when locale is non-en without messages', () => {
  // spy console.error; render <I18nProvider locale="ru">; expect t('alert.dismiss') === en.alert.dismiss
  // expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('messages={ru}'))
});
it('logs console.error in production when locale is non-en without messages', () => {
  // vi.stubEnv('NODE_ENV', 'production'); same assertion as above; vi.unstubAllEnvs()
});
it('does not log for locale="en" without messages', () => {
  /* errorSpy not called */
});
it('applies overrides over provided messages', () => {
  /* messages={ru} overrides={{alert:{dismiss:'X'}}} → 'X'; sibling ru key intact */
});
```

Update the existing `'returns the ru default inside <I18nProvider locale="ru">'` test to pass `messages={ru}`. Add an `AppProvider` test: `<AppProvider locale="ru" messages={ru}>` renders `ru.alert.dismiss` through a probe.

- [ ] **Step 2: Run** `cd packages/design-system && npx vitest run src/i18n src/app` — Expected: new tests FAIL (prop unknown / ru not used).

- [ ] **Step 3: Implement.** Error copy, exact: `` `[i18n] I18nProvider locale="${locale}" has no messages — falling back to English. Pass messages={${locale}}.` `` Logged from a `useEffect` keyed on `[locale, messages === undefined]`, all environments. `AppProvider` adds `messages` to props + JSDoc and passes it through; update the `locale` JSDoc ("selects the built-in message bundle") to say English is built in and other locales come via `messages`.

- [ ] **Step 4: Run** `npx vitest run src/i18n src/app` then `npm test` (from `packages/design-system`) — Expected: all PASS, including `src/publicApi.test.ts`.

- [ ] **Step 5: Docs.** AI-PRIMER examples become `<I18nProvider locale="ru" messages={ru}>` with `import { I18nProvider, ru } from '@eocrm/design-system'`; one line stating a missing `messages` for a non-en locale logs an error and renders English. Same in `docs/setup.md`. README: a `## Migrating to 0.7` heading with the i18n bullet.

- [ ] **Step 6: Commit** `feat(i18n): locales are passed in via messages; I18nProvider no longer bundles ru`

---

### Task 2: Library build — compiled JS, `'use client'`, per-module CSS, declarations, global stylesheets

**Files:**

- Create: `packages/design-system/vite.lib.config.ts`
- Create: `packages/design-system/tsconfig.build.json`
- Create: `packages/design-system/scripts/build-styles.mjs`
- Create: `packages/design-system/vitest.dist.config.ts`
- Create: `packages/design-system/dist-test/shape.test.ts`, `packages/design-system/dist-test/render.test.tsx`
- Modify: `packages/design-system/package.json` (scripts + `vite` devDependency only — exports/files are Task 3)
- Modify: `eslint.config.mjs` / `tsconfig.json` include only if lint/typecheck must see the new files (keep `dist-test` type-checked)

**Interfaces:**

- Produces: `npm run build -w @eocrm/design-system` → `dist/index.js`, `dist/**/*.js` mirroring `src/` paths, `dist/**/*.css`, `dist/**/*.d.ts`, `dist/styles/global.css`, `dist/styles/tokens.css`, `dist/styles.css`. `npm run test:dist` runs `dist-test/**` against `dist/`.
- Scripts (exact): `"build": "vite build -c vite.lib.config.ts && tsc -p tsconfig.build.json && node scripts/build-styles.mjs"`, `"test:dist": "vitest run -c vitest.dist.config.ts"`.

- [ ] **Step 1: Write failing dist tests.**

`dist-test/shape.test.ts` (node env):

```ts
test('every src module reachable from index has a dist .js twin'); // walk dist/index.js imports recursively; all resolve on disk
test('no dist module imports node: builtins or ./src paths');
test('modules importing react/react-dom start with "use client"'); // first statement === "'use client';"
test('pure modules carry no directive'); // dist/i18n/en.js, dist/i18n/ru.js, dist/i18n/format.js, dist/index.js, every dist/palette/*.js
test('every CSS-bearing module imports its css'); // for each src *.tsx|*.ts importing *.scss, its dist twin (or the module dist emits for it) has `import "./<x>.css"` and that file exists
test('declarations exist for index and a component'); // dist/index.d.ts, dist/components/Button/index.d.ts
test('global stylesheets exist and are non-empty'); // styles/global.css contains --color-accent and a reset rule; styles/tokens.css contains --color-accent and [data-theme="dark"] but no reset; styles.css contains global.css content + a Button class
```

`dist-test/render.test.tsx` (jsdom): import `Button`, `Select`, `Modal`, `I18nProvider` from `../dist/index.js`; render each; assert role/text present and `className` non-empty.

`vitest.dist.config.ts`: two projects mirroring `vitest.config.ts` (`dist-unit` node: `dist-test/**/*.test.ts`; `dist-dom` jsdom: `dist-test/**/*.test.tsx`), `css: true`.

- [ ] **Step 2: Run** `npm run test:dist -w @eocrm/design-system` — Expected: FAIL (no `dist/`).

- [ ] **Step 3: `vite.lib.config.ts`.** `build.lib` entry `src/index.ts`, `formats: ['es']`; `rollupOptions.output`: `preserveModules: true`, `preserveModulesRoot: 'src'`, `entryFileNames: '[name].js'`, `assetFileNames: '[name][extname]'`; `external`: every `dependencies` + `peerDependencies` name and its subpaths, plus `react/jsx-runtime`; `cssCodeSplit: true`; `minify: false` (consumers minify); no sourcemaps (ponytail: add when a consumer asks). `css.modules.generateScopedName(local, filename)` → `` `${basename}__${local}__${hash}` `` where `basename` is the file name without `.module.scss` and `hash` = first 5 chars of base64url sha256 of `<path relative to src>:<local>` (path-independent → deterministic). Inline plugin `renderChunk(code, chunk)`: prepend `'use client';\n` iff `chunk.imports` includes `react`, `react-dom` or `react/jsx-runtime`; then prepend `import "./<css>";` for each file in `chunk.viteMetadata.importedCss` (relative to the chunk). Directive must end up as the very first statement.

- [ ] **Step 4: `tsconfig.build.json`** extends `./tsconfig.json`: `noEmit: false`, `declaration: true`, `emitDeclarationOnly: true`, `outDir: dist`, `rootDir: src`, `types: []`, `include: ["src", "types"]`, `exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.testutil.ts", "src/_meta/**"]` (drop `_meta` only if nothing public imports it — verify).

- [ ] **Step 5: `scripts/build-styles.mjs`** with `sass-embedded` `compileString`: `dist/styles/global.css` from `@use 'global'`; `dist/styles/tokens.css` from `@use 'tokens'; @use 'dark';` (load path `src/styles` + `node_modules`); `dist/styles.css` = `global.css` + every other `dist/**/*.css` concatenated in sorted path order. Style `compressed`? No — `expanded`, consumers minify.

- [ ] **Step 6: Verify.** `npm run build -w @eocrm/design-system && npm run test:dist -w @eocrm/design-system` — Expected: PASS. Determinism: run build twice, `find dist -type f | sort | xargs sha256sum | sha256sum` identical both times. Then `npm run typecheck && npm run lint:ts` — Expected: clean.

- [ ] **Step 7: Commit** `build(design-system): compile to ESM + d.ts + CSS with use-client and per-module css imports`

---

### Task 3: Package surface — exports, files, dependencies, release tooling, playground source condition, docs

**Files:**

- Modify: `packages/design-system/package.json`
- Modify: `scripts/verify-package-contents.mjs`
- Modify: `packages/design-tokens/scripts/set-release-version.mjs`, `packages/design-tokens/test/tooling/release-version.test.mjs`
- Modify: `packages/design-tokens/test/package-boundary.test.mjs`
- Modify: `packages/playground/vite.config.ts`, `packages/playground/tsconfig.json`, `packages/playground/src/main.tsx`
- Docs: `packages/design-system/README.md` (intro line 3, Install/Use, "What `global.scss` does" → `global.css`, "Bundler notes" rewrite incl. Next.js + Jest recipe, "Migrating to 0.7"), `packages/design-system/CLAUDE.md` (line 3 + "Shipping TS source" section), `packages/playground/CLAUDE.md` (intro "exactly the way the CRM will import it" + Hard rule 2 example `global.css`)

**Interfaces:**

- Consumes: Task 2 `build` script and `dist/` layout.
- Produces (exact `package.json`):

```json
"main": "./dist/index.js",
"types": "./dist/index.d.ts",
"sideEffects": ["**/*.css", "**/*.scss"],
"exports": {
  ".": { "source": "./src/index.ts", "types": "./dist/index.d.ts", "import": "./dist/index.js", "default": "./dist/index.js" },
  "./styles/global.css": { "source": "./src/styles/global.scss", "default": "./dist/styles/global.css" },
  "./styles/tokens.css": "./dist/styles/tokens.css",
  "./styles.css": "./dist/styles.css",
  "./package.json": "./package.json"
},
"files": ["dist", "AI-PRIMER.md", "docs"],
"scripts": { "prepack": "npm run build", ... }
```

`module` field removed. `@eocrm/design-tokens` → `devDependencies`. `@types/d3-scale` / `@types/d3-shape` → `devDependencies` iff `grep -r "d3-" dist/**/*.d.ts` finds nothing.

- [ ] **Step 1: Update failing tests first.**
  - `package-boundary.test.mjs` `'preserves the design-system package…'`: `deepEqual` against the exports above.
  - `'packed Sass entry points…'` → rename `'packed CSS entry points build in a plain Vite consumer'`: fixture installs **only** the DS tarball (no tokens tarball, no Sass); `main.js` imports `@eocrm/design-system/styles/global.css`, `styles/tokens.css`, `styles.css`, and `import { Button } from '@eocrm/design-system'`; `vite build` succeeds. Assert `designSystemPackage.devDependencies['@eocrm/design-tokens'] === tokenPackage.version`.
  - `'shared tarball verifier…'`: add a case where `exports` has a `source` condition pointing at `./src/index.ts` and `src/` is absent → no `missing` problem for it.
  - `release-version.test.mjs:35`: expect `devDependencies['@eocrm/design-tokens']`.

- [ ] **Step 2: Run** `npm run tokens:test && npm run test:tooling` — Expected: the four changed tests FAIL.

- [ ] **Step 3: Implement.** `package.json` per Interfaces. `requiredPaths` skips values under a `source` key. `set-release-version.mjs` requires and bumps `devDependencies['@eocrm/design-tokens']` (error message updated to match). Add `src/` to the DS `forbidden` list in `verify-package-contents.mjs` (`/(?:^|\/)src\//`).

- [ ] **Step 4: Run** `npm run tokens:test && npm run test:tooling && node scripts/verify-package-contents.mjs` — Expected: PASS; DS tarball has no `src/`.

- [ ] **Step 5: Playground on source.** `vite.config.ts`: `resolve.conditions: ['source', ...defaultClientConditions]` (import `defaultClientConditions` from `vite`). `tsconfig.json`: `"customConditions": ["source"]`. `main.tsx`: `import '@eocrm/design-system/styles/global.css';`. Verify with `rm -rf packages/design-system/dist && npm run typecheck && npm run build` — Expected: both pass **without** a `dist/` (proves source resolution); `make up`-style dev on port 8090+ hot-reloads an edit to `Button.module.scss`.

- [ ] **Step 6: Docs** per the Files list. README "Bundler notes": compiled ESM, no Sass/transpile config; Next.js app router works from Server Components; Jest recipe: `moduleNameMapper: { '\\.css$': '<rootDir>/emptyModule.js' }` + ESM transform note (replace the TSX/`.module.scss` recipe); "Migrating to 0.7": `global.scss` → `global.css`, removed `tokens/reset/typography/mixins.scss` subpaths (use `styles/tokens.css`; Sass variables via `@eocrm/design-tokens`), `messages={ru}`. DS `CLAUDE.md` "Shipping TS source" → "Shipping compiled output": `@types/*` belong in `dependencies` only when emitted `.d.ts` reference them.

- [ ] **Step 7: Run** `npm test && npm run format:check && npm run lint:css` — Expected: PASS. **Commit** `feat(design-system)!: ship dist/ (ESM, d.ts, CSS); css exports replace scss`

---

### Task 4: Size guard + CI wiring + release bump

**Files:**

- Create: `packages/design-system/scripts/size-guard.mjs`, `packages/design-system/size-budgets.json`
- Create: `packages/design-system/scripts/size-guard.test.mjs` (node:test, pure function only)
- Modify: `packages/design-system/package.json` (`"size": "node scripts/size-guard.mjs"`)
- Modify: `.github/workflows/quality.yml` (`test-ds` job), `.github/workflows/release.yml` (`BUMP: minor`)
- Docs: `packages/design-system/README.md` "Releasing" (one line on budgets)

**Interfaces:**

- Consumes: `dist/` via the package name (no `source` condition → resolves `dist/`).
- Produces: `size-budgets.json` shape `{ "<entry>": { "code": "<consumer main.js source>", "jsGzip": <bytes>, "cssGzip": <bytes>, "mustNotContain"?: ["<string>"] } }`; exported `compare(measured, budgets) → string[]` (one message per overshoot or forbidden string, empty = pass).

- [ ] **Step 1: Failing test** `size-guard.test.mjs`: `compare` returns `[]` within budget; one message naming entry + metric + measured/budget bytes when over; a message when `mustNotContain` string appears in output.

- [ ] **Step 2: Run** `node --test packages/design-system/scripts/size-guard.test.mjs` — Expected: FAIL.

- [ ] **Step 3: Implement** `size-guard.mjs`: for each entry, write a temp Vite project (os tmpdir, `node_modules` symlinked to repo root `node_modules`), `vite build` (default minify), gzip level 9 JS and CSS, collect; `compare`; non-zero exit + table on failure, table on success. Entries (exact): `button` (`Button`), `typical` (`Button, Stack, Input, Select, Modal, Tooltip`), `datatable` (`DataTable`), `rte` (`RichTextEditor`), `i18n-en` (`I18nProvider, Button`; `mustNotContain: [ru.alert.dismiss value]`), `all` (`import * as DS`), `global-css` (`import '@eocrm/design-system/styles/global.css'`). Budgets = first measured value × 1.1, rounded up to the next 100 bytes.

- [ ] **Step 4: Run** `npm run build -w @eocrm/design-system && npm run size -w @eocrm/design-system && node --test packages/design-system/scripts/size-guard.test.mjs` — Expected: PASS; `i18n-en` JS gz ≈ 7–8 KB (baseline 13.9 KB).

- [ ] **Step 5: CI.** `quality.yml` `test-ds`, after Test: `npm run build -w @eocrm/design-system`, `npm run test:dist -w @eocrm/design-system`, `npm run size -w @eocrm/design-system`, `node --test packages/design-system/scripts/size-guard.test.mjs`. `release.yml`: `BUMP: minor` (check `test:tooling` for a test pinning `BUMP`; update it if present). `npm publish` and the verify step's `npm pack` build via `prepack` — no extra release step.

- [ ] **Step 6: Commit** `ci(design-system): size budgets and dist tests in Quality; bump 0.7.0`

---

### Task 5: Manual consumer verification + PR

- [ ] **Step 1:** `npm pack -w @eocrm/design-system` into the scratchpad. Fresh Vite React app and fresh Next.js app-router app (scratchpad, latest versions, dev ports 8090+): install the tarball (+ react peers, lucide-react), import `styles/global.css` in the root layout, render `Select` **directly in a Server Component page**, `next build` and `vite build` succeed, Select is styled and opens in the browser (Playwright screenshot). Kill Playwright Chrome afterwards.
- [ ] **Step 2:** `pre-push-review` skill (library variant) → draft PR from `perf/reduce-bundle-size`, review-fix loop until clean, mark ready, wait for `Quality / check`.
- [ ] **Step 3:** PR body lists the breaking changes (Migrating to 0.7) and the follow-up: reset `BUMP` to `patch` after the 0.7.0 release. Hand to the user before merge.
