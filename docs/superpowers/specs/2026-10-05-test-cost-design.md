# Reduce test and verification cost — first slice (#614)

## Problem

Every PR runs one serial `Quality / check` job of ~9–15 minutes that performs
every verification stage, whatever the PR touches: Java + Android SDK setup,
the design-token contract, a Gradle Compose build, Prettier, typecheck, the
full Vitest suite, stylelint, a playground build, a Chromium install and the
Playwright focus-ring sweep. Locally, every Vitest file — including pure
algorithm and static source-analysis tests — boots jsdom. And a test pins the
SHA-256 of `packages/design-system/src/index.ts`, so any valid export addition
breaks it.

Issue #614 lists six batches. This spec is the **cheap, high-value slice**;
the rest becomes follow-up issues (see "Deferred").

## Baseline (measured 2026-10-05 on `main` @ 2424204c, 32-core WSL2, 3 runs)

| Measure                                  | Value                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Vitest wall clock                        | 59.7 / 60.3 / 64.8 s (230 files, 8 970 tests)                           |
| Vitest peak RSS                          | ~492 MB                                                                 |
| Vitest cumulative (all workers)          | environment 99 s · tests 81 s · import 27 s · setup 7 s · transform 7 s |
| `.test.ts` vs `.test.tsx` test-body time | ~4.6–5.3 s vs ~75–78 s                                                  |
| Token `npm test`                         | 8.1 / 8.3 / 10.3 s, peak RSS ~545–610 MB                                |

CI `Quality / check` per-step (three recent PR runs): Setup Java 7–11 s ·
Android SDK 10–36 s · token contract 78–101 s · Compose/Gradle 52–61 s ·
Prettier 19–21 s · Typecheck 24–26 s · Test 147–160 s · Stylelint 2–3 s ·
playground build 16–17 s · Chromium 24–33 s · focus sweep 137–144 s ·
tarball 2 s. Total job ≈ 9–15 min.

Expectation (honest): the Vitest environment split saves ~7 s local wall
clock (jsdom setup ≈ 0.43 s/file × ~65 files ÷ 4 workers); the big win is CI
parallelism + path selection.

## Decisions

| Question                     | Decision                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                        | Vitest Node/jsdom split; semantic export contract replacing the hash; CI split into parallel path-selected jobs with a `check` aggregator; test-authoring rules; before/after measurement |
| Node-vs-jsdom classification | Node by default for `*.test.ts`; jsdom for `*.test.tsx`; a `.test.ts` that needs the DOM opts in with a `// @vitest-environment jsdom` docblock                                           |
| Path detection               | `git diff --name-only` in a `changes` job (plain shell, no third-party action)                                                                                                            |
| Required status              | Final aggregator job keeps id `check` → status stays `Quality / check`                                                                                                                    |
| Release backstop             | Under `workflow_call` (release.yml) every stage runs                                                                                                                                      |
| Branch                       | `chore/614-test-cost`                                                                                                                                                                     |

## 1. Vitest projects

`packages/design-system/vitest.config.ts` defines two projects (Vitest
`test.projects`), sharing `globals: true`, the CSS-modules config and
`include` roots:

- **`unit`** — `include: ['src/**/*.test.ts']`, `environment: 'node'`,
  default worker count (no jsdom contention),
  `setupFiles: ['./vitest.setup.ts']`.
- **`dom`** — `include: ['src/**/*.test.tsx']`, `environment: 'jsdom'`,
  `setupFiles: ['./vitest.setup.ts']`, `maxWorkers: 4` (kept: the existing
  comment documents timeouts from jsdom contention).

A `.test.ts` file that needs DOM globals gets `// @vitest-environment jsdom`
as its first line (Vitest per-file override). `vitest.setup.ts` is used by
both projects and must be safe in both environments (it already guards
`window`; the jest-dom import is environment-agnostic).

Classification is by running: move everything `.test.ts` to Node, run, and
add the docblock to each file that fails for lack of DOM globals. No file is
classified by guesswork. `npm test` remains the entry point; CI and local
commands are unchanged.

## 2. Semantic public-API contract

- Delete the `index.ts` SHA-256 assertion from
  `packages/design-tokens/test/package-boundary.test.mjs` (keep its
  `exports` deep-equal and the packed-consumer test).
- Add `packages/design-system/src/publicApi.test.ts` (Node project):
  - every directory under `src/components/` that has an `index.ts`, except
    `_internal`, has at least one runtime export re-exported from
    `src/index.ts` (import the barrel and the component index; compare
    names);
  - no export name from `src/components/_internal/**` and no `WidgetShape`
    is exported from `src/index.ts`;
  - The `package.json` `exports` map stays owned by
    `package-boundary.test.mjs` (packaging owner) — not duplicated here.
- This must not assert a total export count.

## 3. CI workflow

`.github/workflows/quality.yml` (keeps both triggers) becomes:

- **`changes`** job: checks out with enough history
  (`fetch-depth: 0`), computes the changed file list
  `git diff --name-only "$BASE"..."$HEAD"` for `pull_request`
  (`BASE=github.event.pull_request.base.sha`,
  `HEAD=github.event.pull_request.head.sha`), and emits boolean outputs:
  `ds`, `tokens`, `compose`, `playground`, `package`. Rules:
  - **Force all true** when the event is not `pull_request` (the
    `workflow_call` release backstop) or when any changed path matches
    `.github/workflows/**`, `package.json`, `package-lock.json`,
    `.npmrc`, `tsconfig*.json`, `.prettierrc*`, `.prettierignore`,
    `.stylelintrc*`, `playwright.config.*`, `tests/**`, `Makefile`.
  - `ds` = `packages/design-system/**` or `packages/design-tokens/**`.
  - `tokens` = `packages/design-tokens/**` or `packages/design-system/**`
    (the token package's tests pack the design-system tarball).
  - `compose` = `packages/design-tokens/**`.
  - `playground` = `packages/design-system/**`, `packages/design-tokens/**`
    or `packages/playground/**`.
  - `package` = `packages/design-system/**` or `packages/design-tokens/**`.
    The rules live in one small script (`scripts/ci-changes.sh` or inline) —
    plain shell with `grep -E` over the file list; print the list and the
    decisions to the log.
- **`static`** (always): checkout, setup-node (cache npm), `npm ci`,
  `format:check`, `typecheck`, `lint:css`.
- **`test-ds`** (if `ds`): `npm test -w @eocrm/design-system`.
- **`tokens`** (if `tokens`): `npm run tokens:check` (includes the token
  Node tests).
- **`compose`** (if `compose`): Java + Android SDK setup, `npm ci` only if
  needed by the Gradle build, then the existing Gradle command.
- **`playground`** (if `playground`): `npm ci`, `npm run build`, Chromium
  install, focus sweep, report upload on failure.
- **`package`** (if `package`): `npm ci`, the existing tarball inspection
  script, unchanged.
- **`check`** (aggregator): `needs: [changes, static, test-ds, tokens,
compose, playground, package]`, `if: always()`; a step fails when any
  needed job's `result` is `failure` or `cancelled` (skipped passes). It
  also fails if `changes` itself did not succeed.

Constraints:

- `release.yml` uses `uses: ./.github/workflows/quality.yml` and
  `needs: quality` — the reusable workflow's overall result must stay
  correct (failure in any job fails the call).
- `packages/design-tokens/test/node-runtime-contract.test.mjs` parses the
  workflows to enforce Node setup conventions (Node 24, setup ordering,
  cache rules): every new `setup-node` step must satisfy it; update that
  test only where the convention itself is unchanged but its matcher
  assumed a single job.
- `release-change-detection.test.mjs` may reference workflow structure —
  keep it green.
- Action versions stay as currently used (`actions/checkout@v4`,
  `actions/setup-node@v4`, `actions/setup-java@v4`,
  `android-actions/setup-android@v3`, `actions/upload-artifact@v4`).

## 4. Test-authoring rules

Add a short "Test placement" section to `packages/design-system/CLAUDE.md`
(Hard rule 1 neighbourhood):

1. Cheapest environment wins: pure logic and static source analysis run in
   Node (`*.test.ts`, no docblock); jsdom only for DOM/component semantics
   (`*.test.tsx`, or the `@vitest-environment jsdom` docblock); Playwright
   only for real layout/geometry/focus that jsdom cannot prove.
2. One invariant, one primary owner — don't re-prove engine behaviour
   through component DOM tests.
3. No raw source hashes or formatting snapshots for public API; test
   exports/consumer behaviour semantically.
4. No exact counts on extensible registries/catalogs unless cardinality is
   the documented contract.
5. CI is path-selected: a new expensive stage gets a `changes` flag and is
   included in the `check` aggregator's `needs`.

## 5. Measurement

- Local: re-run the baseline script (3 × Vitest, 3 × token tests) on the
  branch; report wall clock, peak RSS, the Vitest cumulative breakdown,
  and per-project file counts.
- CI: record the per-job durations and the overall wall clock on this PR
  (which touches workflows → full run, but parallel), and — after merge —
  note one playground/docs-only PR when available.
- Results table goes in the PR body and as an issue comment.

## Deferred (new issues)

- Rewrite `structure.test.ts` into stylelint/ESLint rules + a Node checker.
- Profile and split the large component suites (DataTable, FlowCanvas,
  DropdownMenu, RichTextEditor, Select, DashboardCanvas…).
- Token inventory audit / one-owner-per-invariant for token tests;
  consolidate tarball verification.
- Move release/workflow tooling tests out of the token package's default
  test run; actionlint/YAML parser instead of the bespoke parser.

## Testing

- Full `npm test` green (both projects + token tests), `make build-lib`,
  `make lint`, `format:check`.
- Each `.test.ts` that needed the jsdom docblock: listed in the PR body.
- `publicApi.test.ts` proven to fail when an export is removed from
  `src/index.ts` and when an `_internal` symbol is exported (probe on a copy
  or temporarily, then revert).
- The `changes` rules: a small shell-level test is out of scope; instead the
  job prints its decisions and this PR's own run (workflow change → all
  true) plus a dry run of the script against two synthetic file lists
  (playground-only, docs-only) recorded in the PR body.
