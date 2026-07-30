# @eocrm/design-tokens

Shared EOCRM visual tokens for web and Kotlin Multiplatform/Compose. The npm
package contains generated Sass; the Maven artifact contains a generated,
strongly typed Compose API. Both are published with the same version as
`@eocrm/design-system`.

## Web

Configure npm for GitHub Packages, then install the package:

```text
@eocrm:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @eocrm/design-tokens
```

Import the light/theme-neutral contract and dark-theme overrides:

```scss
@use '@eocrm/design-tokens/styles/tokens.scss';
@use '@eocrm/design-tokens/styles/dark.scss';
```

Existing `@eocrm/design-system/styles/*.scss` imports remain the recommended
entry points for React consumers. They forward to this package, so applications
do not need an import migration.

## Kotlin Multiplatform and Compose

GitHub Packages requires authentication even for public Maven packages. For
local development, use a classic personal access token with `read:packages`;
keep `gpr.user` and `gpr.key` in your user-level `~/.gradle/gradle.properties`,
not in a repository. In GitHub Actions, grant the consuming repository access
to the package and use the workflow's `GITHUB_TOKEN`.

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

Use the generated theme objects directly:

```kotlin
import com.eocrm.design.tokens.EocrmDarkTokens
import com.eocrm.design.tokens.EocrmLightTokens

val background = EocrmLightTokens.colors.background
val darkBackground = EocrmDarkTokens.colors.background
val spacing = EocrmLightTokens.dimensions.space4
```

The artifact supports JVM, Android, iOS device (`iosArm64`), and Apple Silicon
iOS simulator (`iosSimulatorArm64`). It intentionally does not publish an
Intel `iosX64` target.

## Contributing

`src/tokens.json` is the only editable source of token values. Do not edit
anything under `generated/` or generated Kotlin files under
`compose/src/commonMain`; regeneration replaces them.

```bash
npm run tokens:validate
npm run tokens:generate
npm run tokens:test
npm run tokens:check
packages/design-tokens/compose/gradlew --no-daemon -p packages/design-tokens/compose jvmTest assemble
```

Commit generated outputs alongside source changes. `tokens:check` validates the
schema and semantic contract, runs tests, and fails on generated drift.

See [Shared design ownership](../../docs/shared-design-boundary.md) for the
boundary between neutral tokens, React components, Compose product UI, and
native platform behavior.
