---
name: implement-issue
description: Use when asked to work a GitHub issue in the design-system repo end-to-end — pick an open issue, implement the fix or feature in @eocrm/design-system, open & merge a PR, let the release publish, then comment the published version on the issue and close it. Triggers on "work an issue", "implement an issue", "ship an issue", "fix a DS issue", "pick up an issue".
---

# Implement a GitHub issue (issue → shipped → closed)

Take ONE open issue in the design-system repo from "open" to a published
`@eocrm/design-system` version, then comment that version on the issue and close
it. The issue can be anything actionable — a bug fix, a new prop, a whole new
component, a docs change.

**Announce at start:** "I'm using the implement-issue skill."

## Environment (verified)

- **Repo:** `/Users/dpws/projects/design-system` — local path. Package
  `@eocrm/design-system`. GitHub repo `eocrm/design-system` (the `eocrm` org owns
  the design system; this is NOT a separate consumer app).
- **Issues** live in `eocrm/design-system` on GitHub and are the unit of work.
- **Publishing is automatic on merge to `main`.** `.github/workflows/release.yml`
  runs on any push to `main` touching `packages/**`: it patch-bumps from the
  newest `v*` git tag, `npm publish`es to GitHub Packages, pushes the new tag, and
  redeploys the playground. **There is no manual publish step — merging the PR IS
  releasing.** The shipped version is the new `v*` tag. The `publish` job is
  **skipped** when the merge didn't touch `packages/design-system/**` (e.g. a
  root-docs-only change) — then there is no new version to report.
- **Gates:** `make test`, `make build-lib`, `make lint` (root Makefile);
  `npm run format:check` (root). A Husky pre-push hook runs prettier + stylelint +
  typecheck. The required PR status check is **`Quality / check`**.

## Scope

Exactly ONE issue per invocation.

## Phase 0 — Preconditions + pick

1. **Repo sane** — clean tree on `main`:
   ```bash
   git -C /Users/dpws/projects/design-system fetch origin -q --prune
   git -C /Users/dpws/projects/design-system status --porcelain   # must be empty
   git -C /Users/dpws/projects/design-system rev-parse --abbrev-ref HEAD   # main
   ```
   If dirty or not on `main`, stop and ask the user to resolve it.
2. **Hooks installed:**
   ```bash
   git -C /Users/dpws/projects/design-system config --get core.hooksPath   # .husky/_
   test -x /Users/dpws/projects/design-system/.husky/pre-push
   ```
   If either fails, run `npm install` in the repo and re-check; else stop.
3. **List open issues and pick:**
   ```bash
   gh issue list --repo eocrm/design-system --state open --limit 30 \
     --json number,title,labels,updatedAt
   ```
   Present them to the user (number, title, labels, a one-line read of what each
   asks). Ask which to work. If the invocation named an issue (`#N`), select that
   and skip the prompt. Confirm exactly one.
4. **Read it fully** (body + discussion):
   ```bash
   gh issue view <N> --repo eocrm/design-system --comments
   ```

## Phase 1 — Spec the work (issue-as-spec)

1. The issue body (+ comments) is the spec. Decide exactly what to change: a bug
   fix, a new prop, a new component, a docs change, etc.
2. If the issue is ambiguous or underspecified for a clean implementation, invoke
   `superpowers:brainstorming` for ONLY the open questions, then continue.
3. **If the work adds or changes a component**, it is not done until it satisfies
   the **Core invariant** in `/Users/dpws/projects/design-system/CLAUDE.md` and the
   package Hard rules in `packages/design-system/CLAUDE.md` — read both now, don't
   rely on memory. That checklist covers: tests beside the component, a playground
   demo page + wiring (route + sidebar nav + overview grid), the `src/index.ts`
   re-export, JSDoc `@remarks` anti-patterns, and an `AGENTS.md` TL;DR. **Plus one
   step not in CLAUDE.md:** add a CLUSTERS entry in
   `packages/design-system/scripts/generate-manifest.mjs`, then regenerate:
   ```bash
   cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest
   ```
   For a pure bug fix, scope to the fix plus a regression test. Honor the Hard
   rules: tokens-only SCSS, components don't own layout, `forwardRef` + prop
   spread, i18n via `useTranslation`.

## Phase 2 — Build

1. Branch off fresh `main` (`<kind>` = `fix` / `feat` / `docs` to match the issue):
   ```bash
   git -C /Users/dpws/projects/design-system checkout -B <kind>/<short-desc> origin/main
   ```
2. Implement via `superpowers:writing-plans` → `superpowers:subagent-driven-development`
   (TDD per task).
3. **Gates — all must pass:**
   ```bash
   cd /Users/dpws/projects/design-system
   make test && make build-lib && make lint && npm run format:check
   npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -c '\.test\.'   # expect 0
   ```
   (The manifest meta-test runs inside `make test`; if it complains, re-run
   `npm run build:manifest` and commit the regenerated JSON.)
4. Run the **Hard-rule-8** pre-push library review-fix loop: fresh-context
   adversarial reviewers across correctness/types, tests, a11y, and API/packaging,
   fixing every Critical/Important finding, until a pass is clean. (When ultracode
   is on, orchestrate with the Workflow tool: parallel finders → adversarial
   verify → fix loop.)

## Phase 3 — PR + release (autonomous after the gate is green)

1. **Record the pre-merge version** (to detect whether the release bumped it):
   ```bash
   git -C /Users/dpws/projects/design-system fetch --tags --force origin -q
   PREV=$(git -C /Users/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```
2. **Push + open the PR.** Reference the issue but do NOT use a closing keyword —
   the skill closes the issue itself in Phase 4, after the version is known:

   ```bash
   git -C /Users/dpws/projects/design-system push -u origin <kind>/<short-desc>
   gh pr create --repo eocrm/design-system --base main --head <kind>/<short-desc> \
     --title "<kind>: <summary> (#<N>)" \
     --body "Addresses #<N>.

   ## Summary
   <what changed>

   ## Test plan
   <how it was verified>"
   ```

   Use "Addresses #N", never "Closes/Fixes #N" (a closing keyword would auto-close
   the issue at merge, before we have the version).

3. **Wait for the gate**; never merge on red (iterate Phase 2 instead):
   ```bash
   gh pr checks <pr> --repo eocrm/design-system --watch
   ```
4. **Squash-merge:**
   ```bash
   gh pr merge <pr> --repo eocrm/design-system --squash --delete-branch
   ```
5. **Watch the Release run** on the merge commit and read the `publish` outcome:
   ```bash
   git -C /Users/dpws/projects/design-system fetch origin main -q
   MERGE_SHA=$(git -C /Users/dpws/projects/design-system rev-parse origin/main)
   # find the Release run whose headSha == MERGE_SHA, then:
   gh run list --repo eocrm/design-system --workflow=Release --branch=main \
     --limit 8 --json databaseId,headSha,status
   gh run watch <run-id> --repo eocrm/design-system
   gh run view <run-id> --repo eocrm/design-system --json jobs \
     --jq '.jobs[] | "\(.name): \(.conclusion)"'
   ```
6. **Resolve the version from the publish outcome:**

   ```bash
   git -C /Users/dpws/projects/design-system fetch --tags --force origin -q
   NEW=$(git -C /Users/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```

   - `publish: success` and `NEW != PREV` → shipped version is `NEW` without the
     leading `v` (e.g. `v0.1.11` → `0.1.11`). Cross-check against the run's
     `## Published` summary.
   - `publish: skipped` (the change didn't touch the publishable library) → there
     is NO new version; carry a "merged, no version bump" note into Phase 4.
   - `publish: failure`, or `NEW == PREV` when a bump was expected → STOP, report
     the run URL, and do NOT close the issue.

## Phase 4 — Comment the version and close the issue

```bash
# When a version shipped:
gh issue comment <N> --repo eocrm/design-system \
  --body "Resolved in \`@eocrm/design-system@<version>\` (PR #<pr>, tag \`v<version>\`). Bump your dependency to pick up the fix."

# When the change shipped but bumped no package version (non-library change):
gh issue comment <N> --repo eocrm/design-system \
  --body "Resolved in PR #<pr> (merged to main; no package version change)."

gh issue close <N> --repo eocrm/design-system --reason completed
```

Only close the issue AFTER the PR is merged (and the version captured, when a
publish was expected).

## Phase 5 — Report

Summarize: the issue; the PR link + squash-merge SHA; the published version + `v*`
tag (or "no version bump"); the playground redeploy; and confirmation the issue
was commented and closed.

## Error handling (stop conditions)

- Repo dirty / not on `main` → stop before any work.
- Hooks missing after `npm install` → stop.
- Issue is a `question` / `invalid` / `wontfix`, or otherwise not actionable as
  code → confirm intent with the user before building.
- `Quality / check` red → never merge; iterate Phase 2.
- `publish` failed, or an expected version bump didn't happen → STOP, report the
  run URL, do NOT close the issue.
- Close the issue ONLY after the PR is merged.
