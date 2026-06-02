# `implement-issue` skill — design

**Date:** 2026-06-02
**Status:** Approved (brainstorm) → ready for implementation plan
**Artifact:** a Claude Code skill at `.claude/skills/implement-issue/SKILL.md` (design-system repo)

## Problem / goal

The design system takes work as **GitHub issues** in the `eocrm/design-system`
repo — bug fixes, new props, whole new components, docs. Resolving one is a
repetitive end-to-end chore: pick an issue, build the change to the library's
standards, get it merged + auto-published, then tell the filer which version
carries the fix and close the issue.

This skill is a **general GitHub-issue worker**: a single invocation takes one
open issue from "open" to "shipped + closed", with the human in the loop only at
the one decision that matters (which issue) and only pausing further if the issue
is underspecified.

**Out of scope:** nothing in any consumer app. The skill operates entirely on the
design-system repo + its GitHub issues. (An earlier draft tracked gaps in a
consumer's `DS-TODO.md` via a worktree — that approach is dropped; GitHub issues
are the sole source of work.)

## Verified environment facts (the skill depends on these)

- **Repo:** `/Users/dpws/projects/design-system` (local), package
  `@eocrm/design-system`, GitHub `eocrm/design-system`. The `eocrm` org owns the
  design system; `eocrm/design-system` is this repo, not a consumer app.
- **Issues:** filed in `eocrm/design-system` on GitHub — the unit of work. The
  repo currently carries the default label set (`bug`, `enhancement`,
  `documentation`, …); no special "consumer" label convention, so the skill lists
  all open issues and the user picks.
- **Publish is automatic on merge to `main`.** `.github/workflows/release.yml`
  triggers on push to `main` touching `packages/**`; it patch-bumps from the
  newest `v*` git tag (currently `v0.1.10` → `0.1.11`), `npm publish`es to GitHub
  Packages, pushes the new tag, and chains the playground deploy. There is **no**
  manual publish step — **merging the PR is releasing.** The shipped version = the
  new `v*` tag. Run jobs: `quality`, `detect-library-changes`, `publish`,
  `deploy-playground`. Two no-version-bump cases: the merge touched **neither**
  `packages/**` nor `.github/workflows/**` → **no Release run is created at all**;
  or a run is created but `publish` is **skipped** because the diff matched neither
  `^packages/design-system/` nor the `release`/`quality`/`deploy-playground`
  workflow files (e.g. a `packages/playground`-only change). The required PR status
  check is `Quality / check`.
- **Gates:** `make test`, `make build-lib`, `make lint` (root Makefile);
  `npm run format:check` (root); a Husky pre-push hook runs prettier + stylelint +
  typecheck. Manifest: CLUSTERS maps in **both** `packages/design-system/src/_meta/manifest.ts`
  and `packages/design-system/scripts/generate-manifest.mjs` (kept in sync) →
  `components.manifest.json` via `npm run build:manifest`. Demos live at
  `packages/playground/src/pages/components/<Name>Demo.tsx` + `ComponentsIndex.tsx`
  (the root CLAUDE.md's `pages/demo/`+`DemoIndex.tsx` names are stale — the skill
  references the canonical checklist, not these paths).

## Decisions

1. **Skill location:** design-system repo, `.claude/skills/implement-issue/SKILL.md`,
   added via a normal PR.
2. **Issue selection:** the skill lists open issues with a one-line read of each
   and asks the user to pick one. An optional invocation arg (`#N`) skips the
   prompt. Exactly one issue per invocation.
3. **Design depth:** issue-as-spec — derive the change from the issue body +
   comments and go straight to plan + subagent-driven build; brainstorm only the
   open questions when the issue is ambiguous.
4. **Merge & release:** fully autonomous after `Quality / check` is green —
   squash-merge, watch the `Release` run, capture the published version, then
   comment it on the issue and close the issue.

## The flow (phases)

- **Phase 0 — Preconditions + pick.** Assert the repo is clean and on `main`;
  verify Husky hooks (`npm install` if missing). `gh issue list` the open issues,
  present them, user picks one; `gh issue view <N> --comments` to read it fully.
- **Phase 1 — Spec (issue-as-spec).** The issue body is the spec. Brainstorm only
  if ambiguous. If the work adds/changes a component, expand to the **Core
  invariant** (CLAUDE.md) + the manifest step; a pure bug fix is the fix + a
  regression test. Honor the Hard rules (tokens, no-layout, forwardRef+spread,
  i18n).
- **Phase 2 — Build.** Branch `<kind>/<short-desc>` off `origin/main` →
  writing-plans → subagent-driven TDD → full gates → Hard-rule-8 adversarial
  review-fix loop (Workflow-orchestrated under ultracode).
- **Phase 3 — PR + release.** Record the pre-merge tag (`PREV`); push; `gh pr
create` with **"Addresses #N"** (never a closing keyword — the skill closes the
  issue itself once it has the version); wait for `Quality / check`; squash-merge;
  watch the `Release` run; read the `publish` job conclusion; capture the new tag
  (`NEW`). `publish: success` + `NEW != PREV` → version `NEW` sans `v`; no Release
  run or `publish: skipped` → no version bump; `publish: failure` or `NEW == PREV`
  when a bump was expected → stop, report, don't close.
- **Phase 4 — Comment + close.** `gh issue comment <N>` with the published version
  (or a "merged, no version bump" note), then `gh issue close <N> --reason
completed`. Only after the merge.
- **Phase 5 — Report.** Issue, PR + merge SHA, published version + tag (or none),
  playground redeploy, issue-closed confirmation.

## Error handling (must be in the skill)

- Repo dirty / not on `main` → stop before any work.
- Hooks missing after `npm install` → stop.
- Issue not actionable as code (`question`/`invalid`/`wontfix`) → confirm intent
  with the user first.
- `Quality / check` red → never merge; iterate Phase 2.
- `publish` failed, or an expected bump didn't happen → do not comment a version,
  do not close; report the run URL.
- Close the issue ONLY after the PR is merged.

## Skill file shape

`.claude/skills/implement-issue/SKILL.md` — YAML frontmatter (`name: implement-issue`,
a trigger-oriented `description`) + a body documenting the five phases as an
ordered runbook with the exact `git`/`gh`/`make`/`npm` commands, decision points,
and stop conditions. Process-doc style; the agent fills issue-specific detail at
runtime.

## Verification

- The skill is a process document; "tests" = the phase gates it enforces and a
  self-consistent, resolvable command set (frontmatter parses; every referenced
  script/path exists; prettier clean).
- First real exercise (separate, not part of creating the skill): point it at the
  first real issue the team files.

## Files

- **Create:** `.claude/skills/implement-issue/SKILL.md`.
- **Create (brainstorm output):** this spec; the implementation plan under
  `docs/superpowers/plans/`.
- Delivered on branch `chore/ds-todo-skill` via a PR to `main`.
