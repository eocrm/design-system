# Test cost follow-ups — batch #617–#620 (high-value slice of each)

## Problem

#614 (PRs #616, #621) cut CI wall clock by running stages in parallel and
skipping the ones a PR can't affect. Four follow-ups remain, each worth its
highest-value slice now:

- **#617** — `structure.test.ts` (2 203 lines) is a hand-written static
  analyser. Per-file TS/TSX policies belong in a linter; SCSS rule policies
  belong in stylelint.
- **#618** — the slow component suites. Profiling shows the cost is **not**
  pure logic re-tested through the DOM but **real-timer waits**: EntityChip's
  92 tests take 8.25 s, of which ~7.8 s are 15 tests sleeping through ~400 ms
  tooltip delays.
- **#619** — token verification has overlapping owners, a literal Compose
  inventory inline in a test, a hand-maintained deprecated-alias table, and
  two separate tarball checks.
- **#620** — release/workflow tooling tests run in every `tokens` job and use
  a hand-written YAML parser.

## Decisions

| Question                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                          | One branch `chore/batch-617-620`; slices below; the rest stays open on each issue                                                                                                                                                                                                                                                                                                                                                           |
| ESLint                         | Adopt ESLint **10** (latest, flat config) + `typescript-eslint` 8 (parser) at the repo root                                                                                                                                                                                                                                                                                                                                                 |
| Third-party ESLint plugins     | Register `eslint-plugin-react-hooks` and `typescript-eslint` so the 45 existing `eslint-disable-next-line` comments naming their rules resolve; **all their rules off**. `eslint-plugin-jsx-a11y` does not support ESLint 10 (peer ≤ 9): the 2 `jsx-a11y/alt-text` disable comments become plain explanatory comments. `reportUnusedDisableDirectives: "off"` (the rules are off by design). Enabling react-hooks/etc. is a follow-up issue |
| Which structure rules move now | Rule 12 (`??` in aria-label/valuetext) and 13 (`?? t()`) → ESLint; rule 2 (aria-busy needs an announcement) → ESLint; rule 6 (`:dir()`) → stylelint built-in; rule 10 (outline-offset beside `@include focus-ring`) → custom stylelint rule. Rules 1, 3, 4, 5, 7, 8, 9, 11, 14 stay in `structure.test.ts` (already Node; high-risk heuristics or cross-file)                                                                               |
| Compose inventory (#619)       | A closed contract (the published Compose API): keep exact equality, move the literal to `test/fixtures/compose-inventory.json`                                                                                                                                                                                                                                                                                                              |
| Deprecated Badge alias table   | Derive (fully regular: 6 tones × bg/fg)                                                                                                                                                                                                                                                                                                                                                                                                     |
| #618 slice                     | Fake timers for real-timer waits **across all suites** (survey → convert)                                                                                                                                                                                                                                                                                                                                                                   |
| YAML in tooling tests (#620)   | `yaml` (2.x, latest) as a devDependency of `@eocrm/design-tokens`; replace the bespoke parser                                                                                                                                                                                                                                                                                                                                               |

## 1. #620 — release/workflow tooling tests

- Move the five repo/release-tooling test files to
  `packages/design-tokens/test/tooling/`: `ci-changes-contract`,
  `compose-publication`, `node-runtime-contract`,
  `release-change-detection`, `release-version` (`.test.mjs`).
- `packages/design-tokens/package.json`: `test` keeps
  `node --test test/*.test.mjs` (domain only, the glob doesn't recurse);
  add `"test:tooling": "node --test test/tooling/*.test.mjs"`. Root
  `package.json`: `"test:tooling": "npm run test:tooling -w @eocrm/design-tokens"`.
- CI: new `tooling` job in `quality.yml` (Node setup + `npm ci` +
  `npm run test:tooling`), gated by a new `tooling` flag from
  `scripts/ci-changes.sh`: true when any path matches `^\.github/`,
  `^scripts/`, `^packages/design-tokens/scripts/`,
  `^packages/design-tokens/test/tooling/`, or the existing FORCE set
  (which already emits all-true). `check.needs` gains `tooling`. Release
  (`workflow_call`) runs it (all-true).
- Replace the hand-written YAML helpers in `node-runtime-contract` and the
  workflow-text assertions in `release-change-detection` (its L251–412) with
  `yaml`'s `parse()`: walk `jobs.*.steps[]`, find `uses` starting with
  `actions/setup-node@`, read `with['node-version']` / `with.cache`. Keep
  every EOCRM policy (Node 24 everywhere, `@v4`, detector setup before
  detection and uncached, npm cache on Quality's setup-node steps,
  concurrency/ordering assertions). Delete the parser's own negative
  self-tests that only proved the hand parser (block scalars, hidden names,
  `node-version` outside `with`) — a real parser makes them moot; keep a
  negative test per policy (non-24 version, wrong ref, cache on the
  detector).

## 2. #619 — token verification ownership + one tarball verifier

- `source.test.mjs`: move `expectedComposeInventory` to
  `test/fixtures/compose-inventory.json` (same structure), loaded by the
  test; comment: "the published Compose API — a removal is a breaking
  change; update deliberately". Replace `expectedDeprecatedBadgeAliases`
  with a derivation over the 6 tones × {background→bg, foreground→fg}
  (`deprecated.badge.<tone>.<role>` → `tone.<tone>.<role>`,
  `--color-badge-<tone>-<bg|fg>`), and assert the derived set equals the
  deprecated tokens actually present in `tokens.json` (both directions).
- Fold duplicate ownership: the repeat-render determinism checks for the
  web renderer move into `web-generator.test.mjs` (golden bytes + "two
  calls return identical bytes"); the Compose ordering case in
  `determinism.test.mjs` is dropped if `compose-generator.test.mjs`'s
  "stable public names" already pins the same ordering (verify; keep it if
  not). `determinism.test.mjs` keeps input-order independence and the drift
  report.
- One tarball verifier: `scripts/verify-package-contents.mjs` (repo root)
  — runs `npm pack --dry-run --json` for both workspaces, applies the
  existing deny-lists **verbatim** plus a minimal allow-list (each
  package's `exports` targets and `README.md` must be present), prints
  `::error::` lines on failure, exits non-zero. Quality's `package` job
  calls it instead of the inline script. `package-boundary.test.mjs`
  imports the same deny/allow lists from it (single source) — its
  packed-consumer build is unchanged.

## 3. #617 — ESLint + stylelint ports

- Root `eslint.config.mjs` (flat): `typescript-eslint` parser for
  `packages/*/src/**/*.{ts,tsx}`; plugins `react-hooks`, `@typescript-eslint`
  (all rules off), local plugin `eocrm` from `tools/eslint-plugin-eocrm/`
  (plain ESM, no build) with three rules, all `error`, scoped to
  `packages/design-system/src/**` non-test files:
  - `eocrm/no-nullish-accessible-name` (rule 12): any `??` inside the
    expression of a JSX `aria-label` / `aria-valuetext` attribute.
  - `eocrm/no-nullish-translation-fallback` (rule 13): a `??` whose right
    operand is a call to the identifier `t`.
  - `eocrm/aria-busy-needs-announcement` (rule 2): a file that renders
    `aria-busy` must also render a live region (`role="status"|"alert"` or
    `aria-live="polite"|"assertive"`, not on an element with
    `aria-live="off"`) or a `<VisuallyHidden>` / `styles.srOnly|hiddenLabel`
    element whose children contain a `t(...)` call. Same file-level
    semantics as today (an AST makes the opening-tag/`>` limits disappear —
    record new/lost offenders vs the current regex in the PR).
- Each rule ships `RuleTester` cases ported from the current self-tests
  (every positive and negative case listed in `structure.test.ts`), run by
  `node --test tools/eslint-plugin-eocrm/*.test.mjs`.
- Scripts: root `"lint:ts": "eslint ."`; `make lint` and the `static` CI job
  run it; `.husky/pre-push` runs it after stylelint. Ignore build output,
  `node_modules`, generated files, `.worktrees`, `.superpowers`.
- stylelint: add `"selector-pseudo-class-disallowed-list": ["dir"]` scoped
  to `packages/design-system/src/**/*.scss` (rule 6). New local plugin
  `tools/stylelint-plugin-eocrm/` with rule
  `eocrm/focus-ring-offset-via-mixin` (rule 10): in any rule (nested
  included — postcss sees nesting) that contains `@include focus-ring`, an
  `outline-offset` declaration in the same rule is an error with the
  current message. Tests via `stylelint`'s `lint()` API on fixtures
  (node:test), covering the current self-test cases, plus the nested case
  now caught.
- Remove rules 2, 6, 10, 12, 13 (and their self-tests/guards) from
  `structure.test.ts`. Prove equivalence: run the new lint rules on the
  current tree → 0 errors (same as the old tests); then re-introduce one
  real violation per rule on a temp edit → each linter fails.

## 4. #618 — fake timers for real-timer waits

- Survey: run the `dom` project with a per-test duration report; list every
  test ≥ 200 ms and classify the wait (tooltip/popover delay, debounce,
  `setTimeout` in a hook, `waitFor` polling real time, animation/rAF).
- Convert where the wait is a timer the test controls: `vi.useFakeTimers()`
  (scoped to the describe/test), `userEvent.setup({ advanceTimers:
vi.advanceTimersByTime })`, advance by the component's documented delay
  constant (import it — never a magic number), `vi.useRealTimers()` in
  cleanup. Keep a test on real timers when fake timers change what it
  proves (e.g. rAF/animation ordering, floating-ui async positioning) and
  note why in a one-line comment.
- Measure: `dom` project wall clock and the ≥200 ms test list before/after;
  identical per-file test counts; 0 failures; 5 consecutive green runs of
  every converted file (flake check).

## Measurement

Local (3 runs, idle machine): Vitest total + per project, token `npm test`,
`test:tooling`, `lint:ts`, `lint:css`. CI: per-job and total on the PR, and a
docs-only/tooling-only path dry run. Before = `main` @ dea315a7.

## Out of scope (stays on the issues)

#617: rules 3, 4 (i18n), 5, 7, 8, 9, 11, 14. #618: splitting pure engine
logic out of component suites (EntityChip has almost none). #619:
`source.test.mjs`'s design-system policy scans (L582, L707–757) — they
belong with design-system tests, separate move. Enabling react-hooks /
typescript-eslint rule sets (new issue).
