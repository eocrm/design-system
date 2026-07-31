# Node 24 migration design

## Goal

Make Node.js 24 the single supported development and CI runtime for the
repository. Local version selection, package metadata, and every GitHub
workflow must agree on the same major version, and the complete repository
gate must pass on Node 24 without weakening test assertions.

## Runtime contract

- Add a root `.nvmrc` containing `24` so local version managers select the
  latest installed Node 24 patch release.
- Add `engines.node` to the root `package.json` as `>=24 <25`. The repository
  deliberately accepts security and patch updates within Node 24 but does not
  claim support for untested future majors.
- Change the Node setup step in `quality.yml`, `release.yml`, and
  `deploy-playground.yml` from Node 22 to Node 24.
- Add an explicit Node 24 setup step to Release's `detect-library-changes` job
  before it invokes the repository's Node-based detector; it must not inherit
  the runner's unspecified system Node.
- Do not pin an exact patch version. CI and developers should receive Node 24
  maintenance releases without repository churn.

## Token-test compatibility

The earlier apparent Node 24 failures in the Gradle contract and release-change
tests were caused by the restricted execution sandbox returning `EPERM` for
nested child processes. An unrestricted run on Node 24.14.0 proved that both
tests pass unchanged, including the real Gradle contract and all release
detector assertions. The only remaining failure in the fresh worktree was an
expected missing `node_modules/.bin/vite` before dependency installation.

The migration therefore will not alter or weaken the token tests. After
`npm install`, the existing suite is the compatibility contract for Node 24.
If a genuine runtime-specific failure appears in CI or an unrestricted local
run, implementation stops for a new diagnosis rather than adding speculative
environment sanitization.

Runtime and token behavioral assertions remain unchanged. The existing release
workflow-structure assertion that requires npm and Gradle caches is
intentionally scoped to the publish job: the newly explicit detector setup is
uncached because it only runs the Node-based change detector and performs no
dependency installation. This distinguishes the new detector runtime setup
from the established publish behavior without weakening either contract.

## Scope

This migration changes only runtime/tooling configuration. It does not change
token generation or tests, package APIs, design-system components, workflow
topology, release versioning, or package contents.

Because workflow files are release-sensitive in this repository, merging the
PR will run the normal Release workflow. The change does not intentionally
alter a published package, but the workflow's existing change detector remains
authoritative about whether publication is needed.

## Validation

Validation runs under Node 24 and includes:

1. the focused design-token tests that previously failed;
2. the complete `make test` suite;
3. `make build-lib` and `make lint`;
4. `npm run format:check`;
5. the design-system package dry-run audit;
6. the Husky pre-push checks;
7. the GitHub `Quality / check` job after all workflows use Node 24.

The PR must demonstrate that the token tests pass without modifications or
skips and that all three workflows select Node 24.

## Non-goals

- Supporting Node 25 or later before it has its own migration.
- Pinning a specific Node 24 patch release.
- Upgrading npm, Gradle, Java, Android, actions, or application dependencies.
- Refactoring unrelated token tests or workflow steps.
