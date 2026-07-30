# Shared Token Contract Design

## Context

Issue #402 establishes a platform-neutral visual contract for the existing
React web design system and Kotlin Multiplatform/Compose consumers. The React
package remains the web implementation; React components, DOM types, SCSS
modules, portals, overlays, focus management, and browser interaction logic do
not become cross-platform.

This phase builds the token foundation entirely in this repository. It does not
modify or test `eocrm/mobile`, extract `design-core`, or implement Compose
product components.

## Goals

- Establish one authoritative, versioned source for light and dark semantic
  tokens.
- Preserve the current web CSS custom-property names, values, theme selectors,
  public Sass entry points, and consumer imports.
- Generate deterministic, strongly typed Kotlin/Compose tokens.
- Publish the Compose contract as a Kotlin Multiplatform Maven artifact through
  GitHub Packages.
- Validate the schema, aliases, generated output, web compatibility, and Gradle
  module in CI.
- Document the ownership boundary among neutral tokens, React components,
  Compose product UI, and native platform UI.

## Non-goals

- Extracting `design-core` or moving i18n, calendar, palette, avatar, or color
  helpers.
- Sharing TypeScript runtime code with Kotlin.
- Reusing React or DOM components in Compose.
- Adding EOCRM-specific Compose components.
- Modifying or compiling `eocrm/mobile`.
- Forcing identical rendering or interaction APIs across web, Android, and iOS.

## Repository architecture

The token package owns the neutral source, validation, generation, web output,
and Compose artifact:

```text
packages/
├── design-tokens/
│   ├── src/
│   │   ├── tokens.json
│   │   └── schema.json
│   ├── scripts/
│   ├── test/
│   ├── generated/
│   │   └── web/
│   ├── compose/
│   │   ├── build.gradle.kts
│   │   ├── settings.gradle.kts
│   │   └── src/commonMain/kotlin/
│   └── package.json
├── design-system/
└── playground/
```

`packages/design-system` remains the React DOM implementation and keeps its
existing public package name. Component-specific token aliases stay with their
React components because they describe web component internals rather than the
cross-platform visual language.

The web package's existing `src/styles/tokens.scss` and `src/styles/dark.scss`
paths remain stable forwarding entry points to generated web output. Published
package boundaries must include everything those entry points load, so a packed
consumer never depends on files outside its installed package.

## Token model

`tokens.json` is the only editable source of token values. Every token defines:

- a stable semantic identity;
- a declared value type;
- a value or light/dark values;
- an optional semantic alias;
- target metadata (`web`, `compose`, or both);
- explicit output names where CSS and Kotlin naming differ; and
- optional documentation used in generated comments or API documentation.

Supported value categories initially include:

- colors;
- dimensions;
- unitless numbers;
- font families;
- font weights;
- line heights;
- durations/easing;
- shadows; and
- semantic aliases.

Shared visual primitives generate to both targets: semantic colors, spacing,
radii, typography roles, control sizes, semantic tones, avatar colors, and
categorical palettes.

Browser-specific concepts remain web-targeted in the same authoritative source:
z-index layers, CSS transitions, web content measures, overlay/filter values,
CSS calculations, and other values without a safe Compose representation.

Theme-dependent shared tokens require both light and dark values. Theme-neutral
tokens use one value. Aliases reference stable semantic identities, not output
names or copied values.

## Validation

Validation runs before either generator and rejects:

- missing required light or dark counterparts;
- unknown aliases;
- alias cycles;
- duplicate semantic identities;
- duplicate output names within a target;
- invalid values for their declared type;
- theme-shape mismatches between an alias and its target;
- Compose-targeted values without a safe typed representation; and
- tokens with no output target.

Errors identify the semantic token path, invalid value, and reason. Validation
must be deterministic and must report all independently detectable errors in one
run rather than stopping at the first error.

## Deterministic generation

Generators use stable semantic ordering and fixed formatting. Generated files
contain a source path, schema version, and generated-file warning, but no
timestamps or machine-specific paths.

The generation command writes all outputs. The drift-check command generates
into a temporary directory and compares exact bytes with committed output. CI
fails when committed output differs.

Generator tests cover:

- valid source loading;
- each validation failure class;
- alias resolution and cycle detection;
- light/dark mapping;
- CSS and Kotlin name mapping;
- representative typed values;
- stable ordering; and
- byte-identical repeated generation.

## Web output and compatibility

Generated web output preserves:

- every current public custom-property name;
- resolved light values;
- forced-dark values;
- system-dark values;
- forced-light override behavior;
- aliases and deprecated compatibility names;
- Sass entry-point paths; and
- the existing `@eocrm/design-system` import surface.

Before migration, a checked-in compatibility fixture records the current custom
property names and normalized values from `tokens.scss` and `dark.scss`. Tests
compare generated declarations against that fixture for light, forced dark,
system dark, and forced light. Ordering and comments may change only where they
are not consumer-observable; names, selectors, values, and precedence may not.

Generated files consumed by `@eocrm/design-system` must live within or be copied
into that package's published boundary. A dry-run package test verifies that a
consumer receives every referenced Sass file.

## Compose output

The generator emits Kotlin common code with stable public names:

- `EocrmColors`;
- `EocrmDimensions`;
- `EocrmTypography`;
- categorical palette types;
- light and dark token objects; and
- contract metadata containing schema and artifact versions.

Compose-facing values use appropriate types at the adapter boundary:

- `Color` for colors;
- `Dp` for physical dimensions and control sizes;
- `TextUnit` for font sizes and line heights where appropriate;
- numeric font-weight mapping; and
- typed structures for semantic tone and palette groups.

Web-only tokens are omitted from the Kotlin API. Generated Kotlin contains no
JSON parsing, JavaScript runtime, DOM, CSS, or Node dependency.

## Gradle module and Maven publication

`packages/design-tokens/compose` is a Kotlin Multiplatform module using Kotlin
DSL and `maven-publish`. It compiles generated common sources and exposes the
Compose-typed contract.

Initial publication coordinates:

```text
groupId: com.eocrm.design
artifactId: design-tokens-compose
repository: https://maven.pkg.github.com/eocrm/design-system
```

The artifact version matches the shared release version used by the web token
package and React design-system package. The module provides Android/JVM and iOS
variants appropriate for Compose Multiplatform consumers.

GitHub Actions publishes with the repository `GITHUB_TOKEN`. External
consumers authenticate according to GitHub Packages' Gradle registry rules.

## npm packages and published boundaries

The workspace adds `@eocrm/design-tokens` as a publishable npm package for web
token consumers. `@eocrm/design-system` keeps its existing name and import
paths. The release process assigns the same semantic version to:

- `@eocrm/design-tokens`;
- `@eocrm/design-system`; and
- `com.eocrm.design:design-tokens-compose`.

The web design-system package must not refer to an unpublished workspace
version. Release-time package metadata and dry-run tarball tests verify that
the installed artifacts resolve without access to the monorepo.

## CI and release flow

The quality workflow adds:

1. token-schema validation;
2. generator tests;
3. generated-output drift verification;
4. web compatibility tests;
5. Gradle module compilation/tests;
6. the existing format, typecheck, test, Stylelint, and playground build;
7. npm tarball validation for both web packages; and
8. verification that `@eocrm/design-system` consumer imports are unchanged.

The release workflow computes one next semantic version, applies it to all three
artifacts, and publishes npm plus Maven packages. The git tag is created only
after all required artifact publications succeed.

Recovery from partial publication is explicit. A rerun may recognize an
already-published artifact of the exact expected version and content, but must
not silently tag a release when registries contain different contract versions
or mismatched outputs.

## Documentation boundary

Repository documentation will explain:

- neutral tokens own semantic identity, tone, and shared visual values;
- React owns DOM rendering, browser behavior, and web component APIs;
- mobile-owned Compose components consume the Maven token contract;
- native platform UI remains preferred for system-owned flows when platform
  integration or accessibility materially benefits; and
- semantic consistency does not require pixel-identical rendering.

## Failure reporting

Commands and CI steps distinguish:

- schema-validation errors;
- invalid or cyclic aliases;
- generated-output drift;
- web compatibility mismatches;
- npm packaging failures;
- Gradle compilation/test failures;
- Maven publication failures; and
- cross-registry version mismatches.

Each failure reports the affected token, output, or artifact and an actionable
next command.

## Acceptance for this phase

This phase is complete when:

- the documented ownership boundary exists;
- one authoritative light/dark token source exists;
- generated web declarations preserve current behavior and public paths;
- generated Kotlin exposes stable strongly typed light/dark tokens;
- the Compose module compiles in this repository;
- npm and Maven contracts share a version and manifest;
- CI validates schema, references, deterministic output, drift, web
  compatibility, packaging, and Gradle compilation;
- existing `@eocrm/design-system` consumer imports remain unchanged; and
- release automation publishes both npm packages and the Maven artifact before
  tagging.

The Issue #402 criteria for `design-core` extraction and an
`eocrm/mobile`-owned integration test remain intentionally deferred to later
work.
