# Teal pine accent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Teal pine as an opt-in second accent set (`data-accent="tealpine"` on web, `EocrmTealPine{Light,Dark}Tokens` on Compose) without dropping blue.

**Architecture:** A new top-level `accents` map in `tokens.json` holds overrides of existing themed colour tokens. The web generator appends higher-specificity `[data-accent='tealpine']` blocks to the existing `tokens.scss`/`dark.scss`; the Compose generator emits extra theme objects. AppProvider overrides are re-scoped to beat accent blocks; three components that used info for "selected" move to accent; the playground gets an accent toggle and a teal logo asset.

**Tech Stack:** Node ESM generators + `node:test` (design-tokens), Kotlin Multiplatform Compose (generated), React + SCSS modules + Vitest (design-system, playground).

**Spec:** `docs/superpowers/specs/2026-10-25-tealpine-accent-design.md`

## Global Constraints

- Blue token output with no `data-accent` stays byte-identical: existing generated declarations unchanged, only new blocks appended.
- Accent name: `tealpine`. Web attribute: `data-accent="tealpine"` on `<html>`. Compose objects: `EocrmTealPineLightTokens`, `EocrmTealPineDarkTokens`.
- Final Teal pine values (light accent family darkened in Task 6 to pass the WidgetPreview accent-mix 2.2 floor; hover steps clear 0.065). The LOGO keeps the landing brand `#17736D` (see logo line):

  | Token id                         | light     | dark      |
  | -------------------------------- | --------- | --------- |
  | `color.accent`                   | `#0b6d67` | `#6dcfc4` |
  | `color.accent.hover`             | `#085752` | `#9ddfd7` |
  | `color.accent.pressed`           | `#054440` | `#c6efea` |
  | `color.accent.foreground`        | `#ffffff` | `#1d2125` |
  | `color.accent.background.subtle` | `#ddeeec` | `#173f3c` |
  | `color.accent.subtle.background` | `#ddeeec` | `#173f3c` |
  | `ring.accent`                    | `#0b6d67` | `#6dcfc4` |

- `schemaVersion` stays `1`.
- The 0.065 hover gate in `contrast.test.ts` is NOT lowered. If any Teal pine value fails another existing gate, adjust the Teal pine value (record the measurement in the commit message), never the gate.
- Shared token values edited only in `packages/design-tokens/src/tokens.json`; never hand-edit generated Sass/Kotlin. Run `npm run tokens:check` after token changes.
- Logo asset: `packages/playground/src/assets/eocrm-logo-tealpine.svg`, geometry identical to `eocrm-logo.svg`; top chevron (`M160 40.4706…`) `#6DCFC4`, middle and bottom `#17736D`.
- One branch `feat/tealpine-accent` off fresh `main`; library-touching → `pre-push-review` skill loop before ready. Do not merge (user reviews visually first).

## Review Focus

1. Forced light (`data-theme='light'`) on an OS in dark mode with `data-accent='tealpine'` must show LIGHT teal, not dark teal — the media-query accent block must carry `:not([data-theme='light'])`. (Test in Task 2.)
2. `data-accent` set to an unknown value (e.g. `"blue"`, `""`) must fall back to blue with no partial overrides. (Test in Task 2: no selector matches other names.)
3. AppProvider `tokens={{'--color-accent': X}}` with `data-accent='tealpine'` in light, forced dark and OS dark must yield X. (Test in Task 4.)
4. Tokens that alias accent tokens (e.g. `--color-table-row-bg-selected` → `--color-accent-bg-subtle`) must follow teal via `var()` without their own overrides. (Test in Task 2: no extra declarations emitted for alias tokens.)
5. Accent override referencing a token without a Compose output (`ring.accent`) must not crash Compose rendering. (Test in Task 3.)

---

### Task 1: Schema + validation for `accents`

**Files:**

- Modify: `packages/design-tokens/src/schema.json`
- Modify: `packages/design-tokens/scripts/lib/validate-tokens.mjs`
- Test: `packages/design-tokens/test/schema.test.mjs`, `packages/design-tokens/test/validation.test.mjs`

**Interfaces:**

- Produces: document shape `document.accents?: Record<string, Record<tokenId, {light: string, dark: string}>>`; `validateTokens(document)` returns the document (unchanged contract) and throws `TokenSemanticError` with new issue codes below.

- [ ] **Step 1: Failing tests.** In `schema.test.mjs`: a document with `accents: { tealpine: { 'color.accent': { light: '#17736d', dark: '#6dcfc4' } } }` validates against the schema; accent name `Teal` (uppercase) and a non-object value are rejected. In `validation.test.mjs`, test `rejects invalid accent overrides` asserting issue codes at these paths:
  - unknown token id → `/accents/tealpine/nope.token`, code `unknown-accent-token`
  - non-`color` token (e.g. `space.small`) → code `accent-non-color`
  - token whose base value is not themed → code `accent-unthemed`
  - value with an alias branch → code `accent-alias`
  - malformed colour literal (`'#12'`) → reuse the existing colour-validation code the file uses for color tokens
  - and `accepts a valid accent set` returning the document unchanged.
- [ ] **Step 2:** `cd packages/design-tokens && node --test test/schema.test.mjs test/validation.test.mjs` → new tests FAIL.
- [ ] **Step 3:** `schema.json`: add optional root property `accents` → `propertyNames` pattern `^[a-z][a-z0-9]*$`, values = object whose `propertyNames` use the token-id pattern and values `$ref: #/$defs/themeValue`. `validate-tokens.mjs`: after the per-token loops, iterate `document.accents ?? {}` and push the issues above via the existing `issue()` helper.
- [ ] **Step 4:** Same command → PASS; `npm test` in `packages/design-tokens` → PASS.
- [ ] **Step 5:** Commit `feat(tokens): accepts an accents override map in the token source`.

### Task 2: Web output + Teal pine source values

**Files:**

- Modify: `packages/design-tokens/scripts/lib/render-web.mjs`
- Modify: `packages/design-tokens/src/tokens.json` (add `accents.tealpine` with the Global Constraints values)
- Regenerate: `packages/design-tokens/generated/web/{tokens,dark}.scss` via the package's generate script
- Test: `packages/design-tokens/test/web-generator.test.mjs` (and update `test/fixtures/current-web-contract.json` only if `check-web-compat` requires it — base declarations must not change)

**Interfaces:**

- Consumes: `document.accents` from Task 1.
- Produces: in `tokensScss`, after the `:root {}` block, per accent (sorted by name):

  ```scss
  :root[data-accent='tealpine'] {
    <light overrides, sorted by web name>
  }
  ```

  In `darkScss`: after the `:root[data-theme='dark']` block, `:root[data-accent='tealpine'][data-theme='dark'] { <dark overrides> }`; inside the existing `@media` block, after the `:root:not([data-theme='light'])` rule, `:root[data-accent='tealpine']:not([data-theme='light']) { … }`. Overrides whose token has no web output are skipped. Dark block omits values equal to the light override (mirror existing logic).

- [ ] **Step 1: Failing test** `renders accent override blocks with higher specificity than the theme blocks`: fixture with `color.background` + `color.accent` (themed) + `color.accent.subtle` aliasing accent; `accents.tealpine` overriding only `color.accent`. Assert exact `tokensScss`/`darkScss` strings: the three blocks above, alias token NOT redeclared in any accent block (Review Focus 4), no selector containing `data-accent` other than `='tealpine'` (Review Focus 2), the media-query accent selector contains `:not([data-theme='light'])` (Review Focus 1). Also assert a document with no `accents` renders exactly as before (existing test stays green).
- [ ] **Step 2:** `node --test test/web-generator.test.mjs` → FAIL.
- [ ] **Step 3:** Implement in `renderWeb`; add `accents.tealpine` to `tokens.json`; run generate.
- [ ] **Step 4:** `npm test` and `npm run tokens:check` (repo root) → PASS; `git diff generated/web` shows only appended blocks.
- [ ] **Step 5:** Commit `feat(tokens): emits data-accent override blocks; adds the tealpine accent`.

### Task 3: Compose output

**Files:**

- Modify: `packages/design-tokens/scripts/lib/render-compose.mjs`
- Regenerate: `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/EocrmTokenContract.kt`
- Test: `packages/design-tokens/test/compose-generator.test.mjs`, `packages/design-tokens/compose/src/commonTest/kotlin/com/eocrm/design/tokens/TokenContractTest.kt`

**Interfaces:**

- Produces: `public object EocrmTealPineLightTokens` / `EocrmTealPineDarkTokens` in `EocrmTokenContract.kt`, same members as `EocrmLightTokens`/`EocrmDarkTokens`; `colors` uses accent overrides for tokens with a `colors` Compose output, everything else identical. Object name = `Eocrm${PascalCase(accentName)}${Light|Dark}Tokens` with `tealpine` → `TealPine` (explicit display-name map `{ tealpine: 'TealPine' }` in the renderer; unknown accent names fall back to first-letter capitalisation).

- [ ] **Step 1: Failing test** `renders accent theme objects`: fixture accent overriding a `colors` token and a web-only token (`ring.accent`-like, Review Focus 5). Assert `EocrmTokenContract.kt` contains both objects, overridden colour as `Color(0xFF17736D)` in light, base objects unchanged, no crash for web-only override. Kotlin test: `EocrmTealPineLightTokens.colors.accent == Color(0xFF17736D)` and `EocrmTealPineDarkTokens.colors.accent == Color(0xFF6DCFC4)`, and every non-accent colour equals `EocrmLightTokens`/`EocrmDarkTokens`.
- [ ] **Step 2:** `node --test test/compose-generator.test.mjs` → FAIL.
- [ ] **Step 3:** Implement: `renderThemeObject(name, theme, groups, overrides = new Map())`, overrides applied in the `colors` mapping by token id.
- [ ] **Step 4:** Generate; `npm test`; `cd compose && ./gradlew allTests` (or the task the CI workflow uses — check `.github/workflows`) → PASS.
- [ ] **Step 5:** Commit `feat(tokens): Compose EocrmTealPine light/dark token objects`.

### Task 4: AppProvider overrides beat `data-accent`

**Files:**

- Modify: `packages/design-system/src/app/themeTokens.ts` (`buildThemeTokenCss`)
- Test: `packages/design-system/src/app/themeTokens.test.ts`
- Docs: `packages/design-system/docs/setup.md` (one sentence: AppProvider overrides win over `data-accent`)

**Interfaces:**

- `buildThemeTokenCss(tokens?, darkTokens?): string | null` — signature unchanged. Each scope gains an accent-aware selector that STRICTLY out-specifies the matching accent block (no reliance on `<style>` order):
  - light: `:root, :root:root[data-accent]` — (0,3,0) > accent light (0,2,0)
  - forced dark: `:root[data-theme='dark'], :root:root[data-accent][data-theme='dark']` — (0,4,0) > (0,3,0)
  - OS dark (inside the media query): `:root:not([data-theme='light']), :root:root[data-accent]:not([data-theme='light'])` — (0,4,0) > (0,3,0)
  - Invariant to keep: in dark, the dark scope (0,4,0) still beats the light scope (0,3,0), so `darkTokens` win in dark with an accent set. Comment this in the code.

- [ ] **Step 1: Failing test** `out-specifies data-accent blocks in every theme` (Review Focus 3): assert the emitted CSS contains the three accent-aware selectors above, and `darkTokens with an accent set still beat tokens in dark` (dark selector specificity > light selector specificity, via a small attribute/pseudo-class counting helper in the test). Update existing exact-string tests.
- [ ] **Step 2:** `cd packages/design-system && npx vitest run src/app/themeTokens.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Commit `feat(AppProvider): token overrides win over data-accent`.

### Task 5: Selection states use accent, not info

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tokens.scss:37-39`
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tokens.scss:13`
- Modify: `packages/design-system/src/components/StagePath/StagePath.tokens.scss:26-27`
- Test: `packages/design-system/src/styles/contrast.test.ts` (existing StagePath and accent-tint rows), component tests if they pin token names

**Interfaces:** mirror Select (`Select.tokens.scss:82-83`):

- `--dropdown-menu-item-bg-checked: var(--color-accent-subtle-bg)`; `--dropdown-menu-item-fg-checked: var(--color-fg)`; `--dropdown-menu-item-accent-checked: var(--color-accent)`
- `--options-picker-row-bg-selected: var(--color-accent-subtle-bg)`
- `--stage-path-done-bg: var(--color-accent-subtle-bg)`; `--stage-path-done-fg: var(--color-fg)`. If StagePath's hovered-fill AA gate (`contrast.test.ts` "StagePath hovered fills keep their text at AA") fails, pick the nearest accent-family token pair that passes and record the ratio in the commit.

Leave TopBar indicator, Card/LinkCard stripe, LiquidEditor filter, Badge/Alert/Banner/Toast/Dot info on info.

- [ ] **Step 1:** Make the token edits.
- [ ] **Step 2:** `npx vitest run src/styles/contrast.test.ts src/components/DropdownMenu src/components/OptionsPicker src/components/StagePath` → PASS (fix per above if not).
- [ ] **Step 3:** Commit `fix: DropdownMenu/OptionsPicker/StagePath selected states use accent, not info`.

### Task 6: Contrast gates cover Teal pine

**Files:**

- Modify: `packages/design-system/src/styles/contrast.test.ts`

**Interfaces:**

- Add a helper `accentScope(source: string, accent: string, theme: 'light' | 'dark'): string` that returns the text of the accent block(s) for that theme (light → `:root[data-accent='X']` block in TOKENS; dark → the `[data-theme='dark']` accent block in DARK). Resolve teal values by layering: look in the accent scope first, then fall back to the normal theme resolution (`tokenValue`). Do not change `tokenValue`/`declaredValue` semantics for existing callers (`declaredValue` throws on differing duplicates — scope inputs must be single blocks).
- Parameterise the existing accent-keyed checks over `accent ∈ ['default', 'tealpine']`: accent WCAG rows (`accent text on accent tint`, `accent-fg on solid accent`, muted on accent tint, ring rows), the "every -hover stays a visible step" gate (accent tone only for tealpine), table accent-cell hover, `--widget-preview-accent` mix, ring-on-event-fill, selection rows from Task 5.
- Add one test asserting the OS-dark media-query accent block equals the forced-dark accent block (same declarations).
- AI-PRIMER binding: Teal pine figures are not stated in docs unless Task 8 adds them; if it does, bind them here.

- [ ] **Step 1:** Write the parameterisation; run `npx vitest run src/styles/contrast.test.ts` (run vitest from `packages/design-system`).
- [ ] **Step 2:** Any tealpine failure → adjust the value in `tokens.json` (Task 2 file), regenerate, `npm run tokens:check`, re-run. Never lower a floor.
- [ ] **Step 3:** Full `npm test` in `packages/design-system` → PASS.
- [ ] **Step 4:** Commit `test: contrast gates cover the tealpine accent`.

### Task 7: Playground — accent toggle + Teal pine logo

**Files:**

- Create: `packages/playground/src/assets/eocrm-logo-tealpine.svg`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (toggle beside the theme toggle, ~line 245)
- Modify: `packages/playground/src/pages/components/LogoDemo.tsx` (one example with the teal asset)
- Modify: `packages/playground/src/pages/mockups/Login/Login.tsx` (+ any other mockup/AppShell importing `eocrm-logo.svg` as a brand logo — `grep -rn eocrm-logo packages/playground/src`; QrCodeDemo masks the logo so leave it)

**Interfaces:**

- `ACCENT_KEY = 'eocrm-playground-accent'`; state `'blue' | 'tealpine'`, default `'blue'`; effect sets `document.documentElement.dataset.accent = 'tealpine'` or `delete …dataset.accent`. Expose current accent to mockups via a tiny `useAccent()` hook in `packages/playground/src/layout/AppShell/` (read `document.documentElement.dataset.accent` with a `MutationObserver` on the attribute) so Login can pick the logo asset. Toggle: DS `IconButton` + `Tooltip` like the theme toggle; label "Accent: Blue" / "Accent: Teal pine".

- [ ] **Step 1:** Create the SVG per Global Constraints.
- [ ] **Step 2:** Implement toggle + hook + LogoDemo example + mockup swap.
- [ ] **Step 3:** `npm run typecheck` and playground tests (`npx vitest run --project <playground project>` — see root vitest config) → PASS.
- [ ] **Step 4:** Visual check: start playground on port 8090+ (`npm run dev -- --port 8090` in `packages/playground`), Playwright screenshot of a Button/Select/DropdownMenu/StagePath demo and Login mockup in tealpine light, tealpine dark, and blue; kill Playwright Chrome afterwards.
- [ ] **Step 5:** Commit `feat(playground): accent toggle and Teal pine logo`.

### Task 8: Docs

**Files:**

- Modify: `packages/design-system/README.md` — "Accent" section: set `data-accent="tealpine"` on `<html>` (omit for blue), works with `data-theme`, AppProvider overrides win, Compose `EocrmTealPineLightTokens`/`EocrmTealPineDarkTokens`; known issue: Teal pine vs `--color-success` light OKLab ΔE 0.060 (< 0.065 floor) — review visually before switching.
- Modify: `packages/design-system/AI-PRIMER.md` — one index line pointing to the README section.
- Modify: `packages/design-tokens/README.md` — document the `accents` source key and validation rules.
- Modify: `packages/design-system/docs/components/DropdownMenu.md`, `OptionsPicker.md`, `StagePath.md` only if they mention info-coloured selection.

- [ ] **Step 1:** Write docs. Any ratio stated in AI-PRIMER/docs must be bound in `contrast.test.ts` (AI-PRIMER binding test) — prefer not stating ratios.
- [ ] **Step 2:** `npm test` (design-system, includes AI-PRIMER binding + manifest drift) and `npx prettier --check` on changed files → PASS.
- [ ] **Step 3:** Commit `docs: tealpine accent`.

### Task 9: PR

- [ ] Push branch, run the `pre-push-review` skill (library variant) through to "clean enough to stop", wait for `Quality / check` green. Leave PR ready but unmerged; report link + screenshots to the user.
