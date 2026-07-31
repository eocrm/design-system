# Shared Token Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one validated token source that deterministically generates the existing web token surface and a publishable Kotlin Multiplatform/Compose Maven artifact.

**Architecture:** `@eocrm/design-tokens` owns JSON source data, schema validation, generators, generated web Sass, generated Kotlin, and the Compose Gradle module. `@eocrm/design-system` remains the React DOM implementation and forwards its existing Sass entry points to the token package without changing consumer imports. Quality and release workflows validate and publish the npm and Maven contracts under one semantic version.

**Tech Stack:** Node.js 22, npm workspaces, JSON Schema draft 2020-12, Ajv 8, Node test runner, Sass, Kotlin 2.4.10, Compose Multiplatform 1.11.1, Android Gradle Plugin 9.1.0, Gradle 9.5, Java 21, GitHub Actions, GitHub Packages npm/Maven registries

## Global Constraints

- `packages/design-tokens/src/tokens.json` is the only editable source of token values.
- Preserve every existing public CSS custom-property name, value, theme selector, Sass entry-point path, and `@eocrm/design-system` consumer import.
- Keep React, DOM, CSS, SCSS modules, browser overlays, portals, and browser interaction logic out of the neutral token contract.
- Generated files are deterministic, committed, and contain no timestamps or machine-specific paths.
- Generated Kotlin contains no JSON parsing, JavaScript runtime, DOM, CSS, or Node dependency.
- Publish `@eocrm/design-tokens`, `@eocrm/design-system`, and `com.eocrm.design:design-tokens-compose` with one semantic version.
- Use Kotlin 2.4.10, Compose Multiplatform 1.11.1, Android Gradle Plugin 9.1.0, Gradle 9.5, and Java 21.
- Do not extract `design-core`, modify `eocrm/mobile`, or add Compose product components in this phase.
- Update repository and package README documentation before pushing.
- Any change under `packages/design-system/**` must complete the repository-local `.claude/skills/pre-push-review` workflow before push.

---

## File structure

### New token package

- `packages/design-tokens/package.json` — npm package metadata and token commands.
- `packages/design-tokens/README.md` — web and Compose consumer/contributor documentation.
- `packages/design-tokens/src/schema.json` — machine-readable structural schema.
- `packages/design-tokens/src/tokens.json` — authoritative versioned token dataset.
- `packages/design-tokens/scripts/lib/load-tokens.mjs` — parse and structural validation.
- `packages/design-tokens/scripts/lib/validate-tokens.mjs` — semantic validation and alias resolution.
- `packages/design-tokens/scripts/lib/names.mjs` — stable CSS/Kotlin name mapping.
- `packages/design-tokens/scripts/lib/render-web.mjs` — deterministic Sass renderer.
- `packages/design-tokens/scripts/lib/render-compose.mjs` — deterministic Kotlin renderer.
- `packages/design-tokens/scripts/generate.mjs` — writes every generated output.
- `packages/design-tokens/scripts/check-generated.mjs` — temp-generation drift check.
- `packages/design-tokens/scripts/check-web-compat.mjs` — compares generated web declarations with the migration fixture.
- `packages/design-tokens/test/*.test.mjs` — validator, renderer, determinism, and compatibility tests.
- `packages/design-tokens/test/fixtures/current-web-contract.json` — normalized pre-migration web contract.
- `packages/design-tokens/generated/web/tokens.scss` — generated light/theme-neutral declarations.
- `packages/design-tokens/generated/web/dark.scss` — generated dark selectors and overrides.
- `packages/design-tokens/generated/manifest.json` — schema/artifact contract metadata.

### Compose module

- `packages/design-tokens/compose/settings.gradle.kts` — isolated Gradle module setup.
- `packages/design-tokens/compose/build.gradle.kts` — KMP, Compose, Maven publication.
- `packages/design-tokens/compose/gradle.properties` — stable build settings and default development version.
- `packages/design-tokens/compose/gradlew`, `gradlew.bat`, and `gradle/wrapper/*` — Gradle 9.5 wrapper.
- `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/*.kt` — generated typed token API.
- `packages/design-tokens/compose/src/commonTest/kotlin/com/eocrm/design/tokens/TokenContractTest.kt` — light/dark contract smoke tests.

### Existing files

- `package.json`, `package-lock.json` — workspace and root token commands.
- `packages/design-system/package.json` — token package dependency and unchanged style exports.
- `packages/design-system/src/styles/tokens.scss` — stable forwarding wrapper.
- `packages/design-system/src/styles/dark.scss` — stable forwarding wrapper.
- `packages/design-system/src/components/Badge/Badge.tokens.scss` — remove migrated literal ownership while retaining component import compatibility.
- `.github/workflows/quality.yml` — token and Gradle gates.
- `.github/workflows/release.yml` — synchronized npm/Maven publication.
- `README.md`, `packages/design-system/README.md` — repository and existing consumer documentation.

---

### Task 1: Scaffold the token package and structural schema validation

**Files:**

- Create: `packages/design-tokens/package.json`
- Create: `packages/design-tokens/src/schema.json`
- Create: `packages/design-tokens/scripts/lib/load-tokens.mjs`
- Create: `packages/design-tokens/test/schema.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces: `loadTokenDocument(path): Promise<TokenDocument>` that parses JSON and throws one `TokenValidationError` containing every Ajv structural error.
- Produces: root commands `tokens:validate`, `tokens:generate`, `tokens:check`, and `tokens:test`.

- [ ] **Step 1: Add a failing structural-validation test**

Create `packages/design-tokens/test/schema.test.mjs` using `node:test`. The first test writes an invalid document to a temporary directory, calls `loadTokenDocument()`, and asserts that the error contains both `/schemaVersion` and `/tokens` paths:

```js
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadTokenDocument } from '../scripts/lib/load-tokens.mjs';

test('reports every structural schema error with its JSON path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));
  const file = join(dir, 'tokens.json');
  await writeFile(file, JSON.stringify({ schemaVersion: 0, tokens: 'wrong' }));

  await assert.rejects(loadTokenDocument(file), (error) => {
    assert.match(error.message, /schemaVersion/);
    assert.match(error.message, /tokens/);
    return true;
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test packages/design-tokens/test/schema.test.mjs
```

Expected: FAIL because `load-tokens.mjs` does not exist.

- [ ] **Step 3: Add package metadata and JSON Schema**

Use this package contract:

```json
{
  "name": "@eocrm/design-tokens",
  "version": "0.0.0",
  "private": false,
  "type": "module",
  "files": ["generated", "README.md"],
  "exports": {
    "./styles/tokens.scss": "./generated/web/tokens.scss",
    "./styles/dark.scss": "./generated/web/dark.scss",
    "./manifest.json": "./generated/manifest.json",
    "./package.json": "./package.json"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "public"
  },
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "validate": "node scripts/generate.mjs --validate-only",
    "generate": "node scripts/generate.mjs",
    "check": "node scripts/check-generated.mjs"
  },
  "devDependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1"
  }
}
```

Define `schema.json` as draft 2020-12 with:

- `schemaVersion`: integer, minimum `1`;
- `contractVersion`: semantic-version string;
- `tokens`: non-empty array;
- each token requiring `id`, `type`, `value`, and `outputs`;
- `id` pattern `^[a-z][a-z0-9]*(\\.[a-z0-9]+)*$`;
- types `color`, `dimension`, `number`, `fontFamily`, `fontWeight`, `lineHeight`, `duration`, `shadow`, and `css`;
- `value` accepting a primitive, `{ "alias": "semantic.id" }`, or `{ "light": ..., "dark": ... }`;
- `outputs.web.name` requiring `^--[a-z0-9-]+$`;
- `outputs.compose.group` and `outputs.compose.name` requiring lower-camel identifiers; and
- `additionalProperties: false` at every defined object boundary.

- [ ] **Step 4: Implement structural loading**

Implement `TokenValidationError` and `loadTokenDocument()` with Ajv 2020 and `allErrors: true`. Sort formatted errors by `instancePath` then `keyword` so output is deterministic.

- [ ] **Step 5: Install workspace dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` includes the new workspace and Ajv dependencies; Husky remains installed.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -w @eocrm/design-tokens
```

Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json packages/design-tokens
git commit -m "feat(tokens): add schema validation package"
```

### Task 2: Add semantic validation and alias resolution

**Files:**

- Create: `packages/design-tokens/scripts/lib/validate-tokens.mjs`
- Create: `packages/design-tokens/scripts/lib/names.mjs`
- Create: `packages/design-tokens/test/validation.test.mjs`
- Modify: `packages/design-tokens/scripts/lib/load-tokens.mjs`

**Interfaces:**

- Produces: `validateTokens(document): ValidatedTokenDocument`.
- Produces: `resolveTokenValue(document, tokenId, theme): primitive`.
- Produces: `TokenSemanticError` with sorted `issues: { path, code, message }[]`.

- [ ] **Step 1: Write failing semantic-validation tests**

Add table-driven tests with literal documents for:

- duplicate IDs;
- duplicate web names;
- duplicate Compose names within a group;
- unknown aliases;
- two-token alias cycles;
- themed alias pointing to a theme-neutral incompatible shape;
- Compose color with invalid hex;
- Compose dimension without `px`;
- token with empty outputs; and
- a valid themed alias resolving different light/dark values.

Every failure test must assert its stable issue code, such as
`duplicate-id`, `duplicate-output`, `unknown-alias`, `alias-cycle`,
`theme-shape`, `invalid-compose-value`, or `missing-output`.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/validation.test.mjs
```

Expected: FAIL because semantic validation is absent.

- [ ] **Step 3: Implement deterministic semantic validation**

Build maps keyed by token ID, web name, and `${group}.${name}` Compose name.
Collect all independent issues, sort by `path`, then `code`, and throw once.
Resolve aliases with a DFS stack so the cycle message includes the full path,
for example `color.a -> color.b -> color.a`.

- [ ] **Step 4: Implement stable Kotlin naming**

`names.mjs` must convert dotted/kebab names to lower camel for properties and
UpperCamel for generated types without locale-sensitive operations. Add literal
tests:

```js
assert.equal(toKotlinProperty('color.background-subtle'), 'colorBackgroundSubtle');
assert.equal(toKotlinType('categorical-palette'), 'CategoricalPalette');
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -w @eocrm/design-tokens
```

Expected: all structural and semantic tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/design-tokens
git commit -m "feat(tokens): validate semantic token contracts"
```

### Task 3: Inventory the current web contract and create the authoritative dataset

**Files:**

- Create: `packages/design-tokens/scripts/capture-web-contract.mjs`
- Create: `packages/design-tokens/test/fixtures/current-web-contract.json`
- Create: `packages/design-tokens/src/tokens.json`
- Create: `packages/design-tokens/test/source.test.mjs`
- Read: `packages/design-system/src/styles/tokens.scss`
- Read: `packages/design-system/src/styles/dark.scss`
- Read: `packages/design-system/src/components/Badge/Badge.tokens.scss`

**Interfaces:**

- Consumes: current SCSS declarations before forwarding wrappers replace them.
- Produces: a fixture with `light`, `forcedDark`, `systemDark`, and
  `forcedLight` maps.
- Produces: the only editable token-value source.

- [ ] **Step 1: Write a failing inventory test**

The test loads `tokens.json`, validates it, and asserts literal representative
coverage:

```js
assert.equal(resolveTokenValue(tokens, 'color.background', 'light'), '#ffffff');
assert.equal(resolveTokenValue(tokens, 'color.background', 'dark'), '#1d2125');
assert.equal(resolveTokenValue(tokens, 'space.4', 'light'), '16px');
assert.equal(resolveTokenValue(tokens, 'radius.medium', 'light'), '4px');
assert.equal(resolveTokenValue(tokens, 'palette.red.background', 'dark'), '#482219');
assert.equal(resolveTokenValue(tokens, 'size.control.medium', 'light'), '32px');
```

Also assert that every current public CSS variable captured in the fixture maps
to exactly one web output.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/source.test.mjs
```

Expected: FAIL because the dataset and fixture do not exist.

- [ ] **Step 3: Capture and commit the normalized pre-migration contract**

Implement a narrow SCSS declaration parser that:

- reads only the two current global token files plus globally emitted Badge
  declarations;
- preserves declaration values after whitespace normalization;
- records selector/mixin provenance;
- expands the dark mixin into forced-dark and system-dark maps; and
- rejects duplicate declarations with different values in the same scope.

Run:

```bash
node packages/design-tokens/scripts/capture-web-contract.mjs
```

Review the fixture against `rg -- '--[a-z0-9-]+:'` counts from the source files.

- [ ] **Step 4: Populate `tokens.json`**

Migrate every captured value. Shared Compose groups must include:

- `colors`;
- `dimensions`;
- `typography`;
- `semanticTones`;
- `avatarPalette`; and
- `categoricalPalette`.

Keep z-index, transitions, CSS calculations, shadows that cannot map safely,
web measures, and web-only overlays as `outputs.web` only. Preserve deprecated
CSS aliases by representing them as semantic aliases.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm run validate -w @eocrm/design-tokens
npm test -w @eocrm/design-tokens
```

Expected: validation succeeds and every fixture variable maps exactly once.

- [ ] **Step 6: Commit**

```bash
git add packages/design-tokens
git commit -m "feat(tokens): inventory the shared visual contract"
```

### Task 4: Generate byte-stable web Sass and verify compatibility

**Files:**

- Create: `packages/design-tokens/scripts/lib/render-web.mjs`
- Create: `packages/design-tokens/scripts/generate.mjs`
- Create: `packages/design-tokens/scripts/check-generated.mjs`
- Create: `packages/design-tokens/scripts/check-web-compat.mjs`
- Create: `packages/design-tokens/test/web-generator.test.mjs`
- Create: `packages/design-tokens/test/determinism.test.mjs`
- Generate: `packages/design-tokens/generated/web/tokens.scss`
- Generate: `packages/design-tokens/generated/web/dark.scss`
- Generate: `packages/design-tokens/generated/manifest.json`

**Interfaces:**

- Produces: `renderWeb(document): { tokensScss, darkScss }`.
- Produces: `generate({ outputRoot }): Promise<void>`.
- Produces: CLI drift check with exit code `1` and changed file names.

- [ ] **Step 1: Write failing renderer tests**

Use a minimal literal document and assert complete output strings for:

- a theme-neutral dimension;
- a light/dark color;
- a web alias rendered as `var(--target)`;
- forced dark selector;
- system dark selector; and
- forced light selector.

Assert that rendering the same validated document twice produces identical
bytes and contains no ISO timestamp or absolute repository path.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/web-generator.test.mjs packages/design-tokens/test/determinism.test.mjs
```

Expected: FAIL because the renderer is absent.

- [ ] **Step 3: Implement web rendering and manifest generation**

The generated headers must be:

```scss
// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: 1
```

Render `:root`, `:root[data-theme='dark']`,
`@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`, and
`:root[data-theme='light']` with the same precedence as the current files.

Generate `manifest.json` with:

```json
{
  "schemaVersion": 1,
  "contractVersion": "0.0.0",
  "artifacts": {
    "npm": "@eocrm/design-tokens",
    "maven": "com.eocrm.design:design-tokens-compose"
  }
}
```

- [ ] **Step 4: Implement compatibility and drift checks**

`check-web-compat.mjs` compares normalized selector/declaration maps, reporting
missing, extra, and changed variables separately. `check-generated.mjs` uses
`mkdtemp`, generates all output there, recursively compares files, and cleans
the temporary directory in `finally`.

- [ ] **Step 5: Generate committed output**

Run:

```bash
npm run generate -w @eocrm/design-tokens
```

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test -w @eocrm/design-tokens
npm run check -w @eocrm/design-tokens
node packages/design-tokens/scripts/check-web-compat.mjs
```

Expected: all tests pass, no drift, and zero web-contract differences.

- [ ] **Step 7: Commit**

```bash
git add packages/design-tokens
git commit -m "feat(tokens): generate compatible web tokens"
```

### Task 5: Wire the React package to generated web tokens without API changes

**Files:**

- Modify: `packages/design-system/package.json`
- Modify: `packages/design-system/src/styles/tokens.scss`
- Modify: `packages/design-system/src/styles/dark.scss`
- Modify: `packages/design-system/src/components/Badge/Badge.tokens.scss`
- Create: `packages/design-tokens/test/package-boundary.test.mjs`

**Interfaces:**

- Consumes: `@eocrm/design-tokens/styles/tokens.scss` and `styles/dark.scss`.
- Preserves: `@eocrm/design-system/styles/tokens.scss`,
  `styles/dark.scss`, and `styles/global.scss`.

- [ ] **Step 1: Add failing package-boundary tests**

Create a temporary fixture package that imports all three existing
`@eocrm/design-system` Sass entry points, install from local `npm pack` tarballs,
and compile it with the repository's Sass toolchain. Assert compilation succeeds
without a monorepo-relative path.

Also assert the design-system package exports and root TypeScript exports are
unchanged from a committed pre-migration list.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/package-boundary.test.mjs
```

Expected: FAIL because the packed design-system does not depend on or forward
to the new token package.

- [ ] **Step 3: Add the runtime package dependency**

Add:

```json
"dependencies": {
  "@eocrm/design-tokens": "0.0.0"
}
```

alongside existing dependencies. Keep all current design-system exports.

- [ ] **Step 4: Replace global token files with stable wrappers**

`tokens.scss` retains the Badge compatibility import and forwards the generated
light file:

```scss
@use '../components/Badge/Badge.tokens';
@forward '@eocrm/design-tokens/styles/tokens.scss';
```

`dark.scss` forwards:

```scss
@forward '@eocrm/design-tokens/styles/dark.scss';
```

Remove migrated literal Badge values from `Badge.tokens.scss`; retain any
component-only aliases and its public import behavior.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm install
node packages/design-tokens/scripts/check-web-compat.mjs
node --test packages/design-tokens/test/package-boundary.test.mjs
npm test
npm run build
```

Expected: package boundary, all 4,282 existing tests, and playground build pass
without consumer import changes.

- [ ] **Step 6: Commit**

```bash
git add package-lock.json packages/design-system packages/design-tokens
git commit -m "refactor(tokens): consume generated web contract"
```

### Task 6: Generate the strongly typed Compose token API

**Files:**

- Create: `packages/design-tokens/scripts/lib/render-compose.mjs`
- Create: `packages/design-tokens/test/compose-generator.test.mjs`
- Modify: `packages/design-tokens/scripts/generate.mjs`
- Generate: `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/EocrmColors.kt`
- Generate: `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/EocrmDimensions.kt`
- Generate: `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/EocrmTypography.kt`
- Generate: `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/EocrmPalettes.kt`
- Generate: `packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens/EocrmTokenContract.kt`

**Interfaces:**

- Produces: `renderCompose(document): Map<string, string>`.
- Produces: public `EocrmLightTokens` and `EocrmDarkTokens`.

- [ ] **Step 1: Write failing complete-string Kotlin tests**

For a minimal source document, assert generated literals:

```kotlin
Color(0xFFFFFFFF)
16.dp
14.sp
FontWeight.SemiBold
```

Assert light/dark objects use named constructor arguments and stable public
property names. Assert web-only tokens are absent.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/compose-generator.test.mjs
```

Expected: FAIL because the Compose renderer is absent.

- [ ] **Step 3: Implement typed rendering**

Map:

- six-digit hex to opaque `Color(0xFFRRGGBB)`;
- eight-digit hex to `Color(0xAARRGGBB)`;
- pixel dimensions to numeric `.dp`;
- font-size pixels to numeric `.sp`;
- weights 400/500/600/700 to Regular/Medium/SemiBold/Bold;
- unitless line heights to `TextUnit` ratios represented in the typography
  role; and
- palette entries to named `EocrmPaletteColor(background, foreground)`.

Reject unsupported Compose conversions in semantic validation rather than
emitting raw strings.

- [ ] **Step 4: Generate committed Kotlin**

Run:

```bash
npm run generate -w @eocrm/design-tokens
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -w @eocrm/design-tokens
npm run check -w @eocrm/design-tokens
```

Expected: all generator and drift tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/design-tokens
git commit -m "feat(tokens): generate typed Compose tokens"
```

### Task 7: Build and test the Kotlin Multiplatform Maven module

**Files:**

- Create: `packages/design-tokens/compose/settings.gradle.kts`
- Create: `packages/design-tokens/compose/build.gradle.kts`
- Create: `packages/design-tokens/compose/gradle.properties`
- Create: Gradle 9.5 wrapper files
- Create: `packages/design-tokens/compose/src/commonTest/kotlin/com/eocrm/design/tokens/TokenContractTest.kt`
- Create: `packages/design-tokens/test/gradle-contract.test.mjs`

**Interfaces:**

- Produces: KMP publications under group `com.eocrm.design`.
- Produces: root multiplatform artifact `design-tokens-compose`.
- Consumes: `-Pversion=1.2.3`-shaped semantic versions, `GITHUB_ACTOR`, and `GITHUB_TOKEN` for publishing.

- [ ] **Step 1: Write a failing Gradle contract test**

The Node test invokes:

```bash
./gradlew --no-daemon jvmTest
```

and asserts exit code `0`. It must skip with an explicit message only when Java
is unavailable locally; CI never skips because Java 21 is provisioned.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/gradle-contract.test.mjs
```

Expected locally: explicit Java-unavailable skip. Expected in a Java 21
environment before setup: FAIL because no wrapper/build exists.

- [ ] **Step 3: Add the Gradle 9.5 wrapper**

Generate the wrapper from the official Gradle 9.5 distribution and commit
`gradle-wrapper.jar`, `gradle-wrapper.properties`, Unix script, and Windows
script. Verify the distribution SHA-256 against Gradle's published checksum.

- [ ] **Step 4: Configure the KMP module**

Use:

```kotlin
plugins {
    kotlin("multiplatform") version "2.4.10"
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.10"
    id("org.jetbrains.compose") version "1.11.1"
    id("com.android.kotlin.multiplatform.library") version "9.1.0"
    `maven-publish`
}

group = "com.eocrm.design"
version = providers.gradleProperty("version").orElse("0.0.0-dev").get()
```

Configure `jvm()`, `android { namespace = "com.eocrm.design.tokens"; compileSdk = 36; minSdk = 21 }`,
`iosArm64()`, `iosSimulatorArm64()`, and `iosX64()`. `commonMain` depends on
`compose.runtime` and `compose.ui`. Configure the GitHub Packages repository
only when credentials are present:

```kotlin
url = uri("https://maven.pkg.github.com/eocrm/design-system")
credentials {
    username = System.getenv("GITHUB_ACTOR")
    password = System.getenv("GITHUB_TOKEN")
}
```

- [ ] **Step 5: Add common contract tests**

Assert literal representative values from both themes:

```kotlin
assertEquals(Color(0xFFFFFFFF), EocrmLightTokens.colors.background)
assertEquals(Color(0xFF1D2125), EocrmDarkTokens.colors.background)
assertEquals(16.dp, EocrmDimensions.space4)
assertEquals(30, EocrmLightTokens.categoricalPalette.size)
assertEquals(1, EocrmTokenContract.schemaVersion)
```

- [ ] **Step 6: Verify GREEN with Java 21**

Run:

```bash
cd packages/design-tokens/compose
./gradlew --no-daemon clean jvmTest testAndroidHostTest assemble publishToMavenLocal
```

Expected: JVM and Android host tests pass and KMP publications are assembled
locally. On Linux, metadata for iOS targets is built without executing Apple
binaries.

- [ ] **Step 7: Commit**

```bash
git add packages/design-tokens
git commit -m "feat(tokens): add Compose multiplatform artifact"
```

### Task 8: Add root commands and CI quality gates

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `.gitignore` if Gradle output is not already excluded

**Interfaces:**

- Produces: one local `npm run tokens:check` gate.
- Produces: Java/Gradle CI validation before web tests publish.

- [ ] **Step 1: Add root scripts**

Add:

```json
"tokens:validate": "npm run validate -w @eocrm/design-tokens",
"tokens:generate": "npm run generate -w @eocrm/design-tokens",
"tokens:test": "npm test -w @eocrm/design-tokens",
"tokens:check": "npm run validate -w @eocrm/design-tokens && npm test -w @eocrm/design-tokens && npm run check -w @eocrm/design-tokens"
```

- [ ] **Step 2: Update the quality workflow**

After Node install:

- set up Temurin Java 21 with `actions/setup-java@v4`;
- provision Android SDK 36 with `android-actions/setup-android@v3`;
- run `npm run tokens:check`;
- run `./gradlew --no-daemon jvmTest testAndroidHostTest assemble` in
  `packages/design-tokens/compose`;
- retain all existing web checks;
- dry-run pack both npm packages; and
- assert neither tarball contains source JSON, tests, `CLAUDE.md`, Gradle build
  output, or monorepo-only paths.

- [ ] **Step 3: Verify the local commands and workflow syntax**

Run:

```bash
npm run tokens:check
npm run format:check
npm run typecheck
npm test
npm run lint:css
npm run build
```

With Java 21:

```bash
packages/design-tokens/compose/gradlew --no-daemon -p packages/design-tokens/compose jvmTest testAndroidHostTest assemble
```

Run `actionlint .github/workflows/quality.yml` when `actionlint` is installed;
otherwise validate the workflow through the pull-request Quality run before
merge. The behavior-bearing token and Gradle commands are covered directly by
their package tests rather than by grepping workflow source.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .github/workflows/quality.yml .gitignore packages/design-tokens
git commit -m "ci(tokens): verify generated web and Compose contracts"
```

### Task 9: Publish synchronized npm and Maven artifacts

**Files:**

- Create: `packages/design-tokens/scripts/set-release-version.mjs`
- Create: `packages/design-tokens/scripts/verify-published-version.mjs`
- Create: `packages/design-tokens/test/release-version.test.mjs`
- Modify: `.github/workflows/release.yml`

**Interfaces:**

- Consumes: one semver computed by the release workflow.
- Produces: aligned npm manifests, generated manifest, Gradle `-Pversion`, and
  final `vX.Y.Z` tag.

- [ ] **Step 1: Write failing release-version tests**

Copy package manifests and generated manifest to the test's temporary directory.
Invoke `set-release-version.mjs` with arguments `1.2.3`, `--root`, and that
directory, then assert:

- both npm package versions equal `1.2.3`;
- design-system depends on `@eocrm/design-tokens` version `1.2.3`;
- generated manifest contract version equals `1.2.3`; and
- invalid versions exit nonzero without modifying files.

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test packages/design-tokens/test/release-version.test.mjs
```

Expected: FAIL because the version script is absent.

- [ ] **Step 3: Implement atomic version synchronization**

Validate semver before writing. Render all changed JSON in memory, then write
only after every input parses and every required field exists. Re-run token
generation after updating contract version.

- [ ] **Step 4: Extend library-change detection**

Treat `packages/design-tokens/**` as a publishable library change. Preserve the
existing exclusion for `packages/design-system/CLAUDE.md`.

- [ ] **Step 5: Publish in dependency order**

The release job must:

1. compute the version once;
2. run the synchronization script;
3. run token drift/compatibility checks;
4. publish `@eocrm/design-tokens`;
5. publish `@eocrm/design-system`;
6. run Gradle Maven publication with the same `-Pversion`;
7. verify all expected registry versions or exact already-published versions;
8. create/push the git tag; and
9. summarize all three coordinates.

Use `GITHUB_TOKEN` with `packages: write`. Do not tag if any artifact is missing
or mismatched.

- [ ] **Step 6: Verify GREEN**

Run the version script against a temporary copy, then:

```bash
npm test -w @eocrm/design-tokens
npm run tokens:check
```

Validate workflow syntax with the repository's available YAML parser or
`actionlint` when installed.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/release.yml packages/design-tokens
git commit -m "ci(tokens): publish synchronized npm and Maven artifacts"
```

### Task 10: Document consumption, ownership, and contributor workflow

**Files:**

- Create: `packages/design-tokens/README.md`
- Modify: `README.md`
- Modify: `packages/design-system/README.md`
- Modify: `CLAUDE.md`
- Modify: `packages/design-system/CLAUDE.md`
- Create: `docs/shared-design-boundary.md`

**Interfaces:**

- Produces: complete web/Compose consumer instructions.
- Produces: contributor commands matching package scripts and CI.

- [ ] **Step 1: Write the documentation**

Root README must show the new package tree and link to the boundary document.

Token package README must include:

```kotlin
repositories {
    maven {
        url = uri("https://maven.pkg.github.com/eocrm/design-system")
        credentials {
            username = providers.gradleProperty("gpr.user").orNull
            password = providers.gradleProperty("gpr.key").orNull
        }
    }
}

dependencies {
    commonMainImplementation("com.eocrm.design:design-tokens-compose:1.2.3")
}
```

It must explain classic PAT `read:packages`, GitHub Actions repository access,
the npm import paths, and commands:

```bash
npm run tokens:validate
npm run tokens:generate
npm run tokens:test
npm run tokens:check
packages/design-tokens/compose/gradlew --no-daemon -p packages/design-tokens/compose jvmTest assemble
```

Design-system README must state that existing imports remain unchanged and that
tokens now come from `@eocrm/design-tokens`.

`docs/shared-design-boundary.md` must explain neutral-token, React, mobile
Compose, and native-platform ownership with examples of what belongs in each.

- [ ] **Step 2: Update agent instructions**

Root and package `CLAUDE.md` files must direct token changes to
`packages/design-tokens/src/tokens.json`, prohibit editing generated files, and
require `npm run tokens:check`.

- [ ] **Step 3: Verify documentation against implementation**

Run every documented local command. Search for stale instructions that still
tell contributors to edit `packages/design-system/src/styles/tokens.scss`:

```bash
rg -n "add it to .*tokens\\.scss|edit .*tokens\\.scss|Adding a token" README.md CLAUDE.md packages docs
```

Update every stale contributor instruction in scope.

- [ ] **Step 4: Format and commit**

```bash
npm run format:check
git add README.md CLAUDE.md packages/design-system/README.md packages/design-system/CLAUDE.md packages/design-tokens/README.md docs/shared-design-boundary.md
git commit -m "docs(tokens): document shared web and Compose contract"
```

### Task 11: Run final review gates and prepare the Issue #402 PR

**Files:**

- Verify: all changed files
- Update if required: generated outputs after final source changes

**Interfaces:**

- Produces: reviewed, clean branch ready for publication.

- [ ] **Step 1: Run generation and drift checks**

```bash
npm run tokens:generate
npm run tokens:check
git diff --exit-code -- packages/design-tokens/generated packages/design-tokens/compose/src/commonMain
```

- [ ] **Step 2: Run the complete web quality suite**

```bash
npm run format:check
npm run typecheck
npm test
npm run lint:css
npm run build
```

Expected: all commands pass with pristine output.

- [ ] **Step 3: Run the Gradle quality suite with Java 21**

```bash
packages/design-tokens/compose/gradlew --no-daemon -p packages/design-tokens/compose clean jvmTest testAndroidHostTest assemble publishToMavenLocal
```

Expected: all tasks succeed.

- [ ] **Step 4: Verify both npm tarballs as consumers**

Pack `@eocrm/design-tokens` and `@eocrm/design-system`, install them into a
temporary fixture, compile the public Sass entry points, and ensure no
workspace-relative resolution occurs.

- [ ] **Step 5: Run the mandatory repository pre-push review**

Read and follow:

```text
.claude/skills/pre-push-review/SKILL.md
```

Address all load-bearing findings and re-run affected checks.

- [ ] **Step 6: Request independent final review**

Review the complete `origin/main..HEAD` diff against:

```text
docs/superpowers/specs/2026-07-30-shared-token-contract-design.md
```

Require explicit verdicts on web compatibility, generated-code determinism,
Kotlin API stability, package boundaries, partial-publication recovery, README
completeness, and Issue #402 scope.

- [ ] **Step 7: Verify clean branch state**

```bash
git status --short
git diff --check origin/main..HEAD
```

Expected: no uncommitted files and no whitespace errors.

- [ ] **Step 8: Publish as a draft PR**

Use branch `agent/issue-402-shared-tokens`, push normally with hooks enabled,
and open a draft PR that links and partially closes Issue #402 while explicitly
listing the deferred `design-core` and external mobile-integration criteria.
