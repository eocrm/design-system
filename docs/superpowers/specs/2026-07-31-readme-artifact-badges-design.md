# README Artifact Badges Design

## Goal

Show the latest released version of each deployable library artifact in the root
README while retaining the existing CI and playground deployment badges.

## Design

Replace the generic package badge with three badges:

- `design-system`, linking to the `@eocrm/design-system` GitHub package
- `design-tokens`, linking to the `@eocrm/design-tokens` GitHub package
- `compose tokens`, linking to the Compose token package

Each badge displays the latest semantic `v*` Git tag. The release workflow
creates that tag only after it has published and verified all three artifacts,
so the tag is the repository's public certificate that the displayed version
was deployed successfully. This avoids registry-specific badge endpoints that
cannot reliably read authenticated GitHub Packages.

The existing CI badge and playground deployment badge remain unchanged.

## Verification

- Confirm all badge image URLs use the repository's filtered, semver-sorted
  latest-tag endpoint.
- Confirm each badge links to its corresponding artifact page.
- Run the repository formatting check.

