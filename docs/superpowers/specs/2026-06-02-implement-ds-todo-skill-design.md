# `implement-ds-todo` skill — design

**Date:** 2026-06-02
**Status:** Approved (brainstorm) → ready for implementation plan
**Artifact:** a Claude Code skill at `.claude/skills/implement-ds-todo/SKILL.md` (design-system repo)

## Problem / goal

The consumer app (`eocrm`) tracks design-system gaps in `/Users/dpws/projects/eocrm/DS-TODO.md`: each row is a missing component/prop, bridged by a local shim under `apps/web/src/shared/ds-shims/`. Resolving one is a long, multi-repo chore — build the real component in the library to the full Core-invariant standard, get it published, then tell the consumer which version shipped it.

This skill encodes that chore end-to-end so a single invocation takes one gap from "filed" to "shipped + recorded", with the human in the loop only at the one decision point that matters (which gap) and only pausing further if the gap is underspecified.

**Non-goal:** the consumer-side _migration_ (delete the shim, repoint imports). That's a separate adoption task owned by the consumer; this skill only records the version that makes migration possible.

## Verified environment facts (the skill depends on these)

- **Consumer TODO:** `/Users/dpws/projects/eocrm/DS-TODO.md`. Shims: `/Users/dpws/projects/eocrm/apps/web/src/shared/ds-shims/`.
- **Library repo:** `/Users/dpws/projects/design-system`. Package: `@eocrm/design-system` (GitHub Packages, `publishConfig.access=public`).
- **Publish is automatic on merge to `main`.** `.github/workflows/release.yml` triggers on push to `main` touching `packages/**`; it patch-bumps from the latest `v*` git tag (currently `v0.1.10` → `0.1.11`), sets the package version, `npm publish`es to GitHub Packages, pushes the new `v*` tag, and chains the playground deploy. There is **no** manual publish workflow (the `publish.yml` referenced in README/CLAUDE.md is stale). **Merging the PR is deploying.** The shipped version = the new tag.
  - The publish job is **skipped** if the merge didn't touch `packages/design-system/**` or the release-related workflows, and it tolerates a 409 (already-published) by still advancing tags. The skill must confirm the publish job actually _ran and succeeded_ before trusting a version.
- **eocrm has no git remote and no git hooks.** Branches present: `main` and the active dev branch (e.g. `feat/cross-region-outbox`, checked out in the main working dir). Therefore:
  - "Push directly to main" = a **local commit on the `main` branch** (no remote to push to; if an `origin`+`main` ever exists, push doc-only, best-effort).
  - Because `main` is **not** the checked-out branch and there's active dev in the main working dir, committing to `main` **requires a git worktree** — this is the user's "always use a worktree" instruction.
  - No hooks → no `--no-verify` needed. "Ignore all eocrm workflows" = no PR, no CI, no feature-branch flow — just the local doc commit on `main`.
  - `main`'s `DS-TODO.md` currently equals the working-tree copy (no divergence), but the skill edits whatever is actually on `main` in the worktree, so divergence is handled naturally.

## Decisions (from brainstorming)

1. **Skill location:** design-system repo, `.claude/skills/implement-ds-todo/SKILL.md`, added via a normal PR.
2. **Item selection:** the skill lists open gaps with a per-item feasibility note and asks the user to pick one. An optional invocation arg (`#N` or a gap name) skips the prompt.
3. **Design depth:** shim-as-spec — derive the API/behavior from the shim + its consumer import sites and go straight to plan + subagent-driven build; brainstorm only the specific open questions when the shim is ambiguous/underspecified.
4. **Merge & deploy:** fully autonomous after `Quality / check` is green — squash-merge, watch the `Release` run, capture the published version, then record it back in the consumer's DS-TODO.md.

## The flow (phases)

### Phase 0 — Preconditions + pick

- Assert the DS repo is clean and on `main` (the skill creates its own feature branch; refuse to start from a dirty tree). Verify hooks: `git config --get core.hooksPath` = `.husky/_` and `test -x .husky/pre-push`; run `npm install` if not.
- Parse `DS-TODO.md`: collect rows in the gap table that are **not** yet marked resolved (no ✅ / no `## Resolved` entry). For each open gap, resolve its shim path and skim the shim to gauge scope (what component, what props, how big).
- **Present the open gaps** to the user with a one-line feasibility note each, and ask which to implement. If an arg was supplied, select that gap and skip the prompt. Exactly **one** gap per invocation.

### Phase 1 — Spec the fix (shim-as-spec)

- Read the chosen shim and grep its import sites in the consumer (`apps/web/src/**`) to derive the real component's API surface, props, slots, and behavior.
- If the shim fully defines the component → proceed. If anything is ambiguous (naming, prop shape, responsive behavior, token mapping), **brainstorm just those open questions** with the user and capture a short spec; otherwise the shim _is_ the spec.
- Expand the work to the **library Core invariant** (root `CLAUDE.md`) — a component is not done until all exist:
  1. `<Name>.test.tsx` beside the component.
  2. Demo page `packages/playground/src/pages/demo/<Name>Demo.tsx` (real component, exercising real states).
  3. Demo wired into `App.tsx` (route), `AppShell.tsx` (sidebar nav), `DemoIndex.tsx` (overview grid).
  4. Re-export from `packages/design-system/src/index.ts`.
  5. JSDoc `@remarks` "when NOT to use / anti-patterns" on the component fn **and** a TL;DR section in `packages/design-system/AGENTS.md`.
  - Plus the **manifest step** (not in the CLAUDE.md checklist): add a CLUSTERS entry in `_meta/manifest.ts` **and** `scripts/generate-manifest.mjs`, then `npm run build:manifest`.
- Honor DS Hard rules: tokens-only SCSS, components don't own layout, `forwardRef` + prop spread, i18n via `useTranslation` (no inlined user-facing strings).

### Phase 2 — Build

- Branch `feat/<component>` (or `fix/<gap>`) off `origin/main`.
- Use **writing-plans** to produce a task-by-task plan, then **subagent-driven-development** (TDD per task) to execute it.
- Run the full gates and fix until green:
  - `make test`, `make build-lib`, `make lint`, `npm run format:check`, the manifest meta-test, and a tarball test-leak check (`npm pack --dry-run` shows zero `*.test.*`).
- Run the **Hard-rule-8 pre-push library review-fix loop**: fresh-context adversarial reviewers across lenses (correctness/types, tests, a11y, API/packaging) until clean. Under ultracode this is Workflow-orchestrated (parallel finders → adversarial verify → fix loop).

### Phase 3 — PR + deploy (autonomous)

- Push the branch; `gh pr create --base main` with a Summary + Test-plan body.
- Record the pre-merge latest tag: `PREV=$(git ls-remote --tags origin 'v*' | … newest)` (or fetch tags and read newest) — used later to prove the version advanced.
- Wait for `Quality / check`: `gh pr checks <pr> --watch`. If it fails, **do not merge** — surface failures and iterate (back to Phase 2).
- **Squash-merge** the PR (`gh pr merge <pr> --squash`).
- The merge triggers `Release`. Find that run on the merge commit and watch it: `gh run list --workflow=Release --branch=main` → `gh run watch <id>`.
- **Verify the publish job ran and succeeded** (not `skipped`): inspect the run's jobs. If publish was skipped or failed → **abort the version-recording step** and report (no version to record).
- **Capture the version:** `git fetch --tags --force`; `NEW=$(git tag --list 'v*' --sort=-v:refname | head -1)`; assert `NEW` is strictly greater than `PREV` (semver). Cross-check against the Release run's `## Published` summary. Strip the leading `v` for the package version (`0.1.11`).

### Phase 4 — Record in the consumer (worktree → `main`, doc-only)

- Create a worktree on `main` so the active dev working tree is untouched:
  `git -C /Users/dpws/projects/eocrm worktree add /Users/dpws/projects/eocrm/.worktrees/ds-todo main`
  (prune/reuse if the path exists).
- In the worktree, edit **only** `DS-TODO.md`:
  - Mark the resolved row in the gap table (e.g. `#` cell `1` → `1 ✅`).
  - Append (creating it if absent) a `## Resolved` section with a dated log line:
    `- #1 AppLayout — shipped in \`@eocrm/design-system@0.1.11\` (DS PR eocrm/design-system#NNN, 2026-06-02). Migration pending: remove \`apps/web/src/shared/ds-shims/AppLayout.tsx\` + update import sites.`
  - **Keep** the row (the entry's own instructions say the consumer removes it during adoption).
- Commit to `main` with **only** `DS-TODO.md` staged — assert `git status --porcelain` lists nothing else. No PR, no CI. (No remote → the local `main` commit is the delivery; if `origin/main` exists, `git push origin main` doc-only, best-effort.)
- Remove the worktree (`git worktree remove`), even on failure (cleanup in a trap-like finally).

### Phase 5 — Report

Summarize: gap resolved; DS PR link + squash-merge SHA; published version + `v*` tag; playground redeploy; the eocrm `main` commit SHA touching DS-TODO.md; and the explicit remaining consumer step (remove shim + repoint imports).

## Error handling (must be in the skill)

- DS repo dirty or not on `main` → stop before any work.
- Hooks missing → `npm install`, re-verify, else stop.
- Gap already marked resolved → skip it in the picker.
- Shim missing/empty → flag; ask the user to confirm scope (fall back to brainstorm).
- `Quality / check` red → never merge; iterate.
- Release publish `skipped`/`failed`, or new tag not `> PREV` → do **not** record a version; report the run URL and stop at Phase 3.
- eocrm worktree: always cleaned up; the eocrm commit touches **only** DS-TODO.md (assert before commit).

## Skill file shape

`.claude/skills/implement-ds-todo/SKILL.md` — YAML frontmatter (`name: implement-ds-todo`, a trigger-oriented `description`) + a body documenting the five phases as an explicit, ordered checklist with the exact commands above, the decision points, and the error-handling rules. Process-doc style (like the superpowers skills): imperative steps, the agent fills in component-specific detail at runtime.

## Verification

- The skill is a process document; "tests" = the phase gates it enforces and a self-consistent command set.
- First real exercise (separate, not part of creating the skill): run it against gap **#1 AppLayout** — the shim defines `topBar`/`sidebar`/`children` slots + full-height flex; expected to need no brainstorm, produce a `<AppLayout>` component, publish `v0.1.11`, and annotate row #1.

## Files

- **Create:** `.claude/skills/implement-ds-todo/SKILL.md`.
- **Create (this brainstorm output):** this spec; the implementation plan under `docs/superpowers/plans/`.
- Delivered on branch `chore/ds-todo-skill` via a PR to `main`.
